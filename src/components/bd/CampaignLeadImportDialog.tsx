import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertCircle, Calendar as CalendarIcon, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { BDCampaign } from "@/hooks/useBDCampaigns";
import { supabase } from "@/integrations/supabase/client";

interface CampaignLeadImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: BDCampaign;
  onImportComplete: () => void;
}

const EXA_COST_PER_LEAD = 0.10;

export function CampaignLeadImportDialog({
  open,
  onOpenChange,
  campaign,
  onImportComplete,
}: CampaignLeadImportDialogProps) {
  // Required filter fields
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [jobTitleInput, setJobTitleInput] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [customIndustryInput, setCustomIndustryInput] = useState("");
  const [country, setCountry] = useState("US");
  const [city, setCity] = useState("");
  const [companySize, setCompanySize] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [technologyInput, setTechnologyInput] = useState("");
  
  // Optional filter fields
  const [customKeywords, setCustomKeywords] = useState("");
  const [maxResults, setMaxResults] = useState(25);
  const [userLocation, setUserLocation] = useState("US");
  const [isImporting, setIsImporting] = useState(false);
  const [jobStatus, setJobStatus] = useState<{
    id: string;
    status: "pending" | "running" | "completed" | "failed";
    progress?: string;
    result?: { imported: number; updated: number };
    errorMessage?: string;
  } | null>(null);

  const estimatedCost = useMemo(() => {
    return maxResults * EXA_COST_PER_LEAD;
  }, [maxResults]);

  const finalKeywords = useMemo(() => {
    const custom = customKeywords
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);
    return Array.from(new Set(custom));
  }, [customKeywords]);
  
  // Search preview
  const previewQuery = useMemo(() => {
    if (jobTitles.length === 0 || industries.length === 0) {
      return "Add job titles and industries to see search preview...";
    }
    
    const titlePart = jobTitles.length > 1
      ? `(${jobTitles.join(" OR ")})`
      : jobTitles[0];
    
    const industryPart = industries.length > 1
      ? `${industries.join(" OR ")} industry`
      : `${industries[0]} industry`;
    
    const locationPart = city
      ? `in ${city}, ${country}`
      : `in ${country}`;
    
    const sizePart = companySize.length > 0
      ? companySize.join(" or ")
      : "";
    
    const techPart = technologies.length > 0
      ? `using ${technologies.join(", ")}`
      : "";
    
    const parts = [
      titlePart,
      "at",
      industryPart,
      "companies",
      locationPart,
      sizePart,
      techPart,
      finalKeywords.length > 0 ? finalKeywords.join(" ") : ""
    ].filter(Boolean);
    
    return parts.join(" ");
  }, [jobTitles, industries, country, city, companySize, technologies, finalKeywords]);

  const handleImport = async () => {
    // Validation
    if (jobTitles.length === 0) {
      return; // Show error in UI
    }
    
    if (industries.length === 0) {
      return; // Show error in UI
    }
    
    if (companySize.length === 0) {
      return; // Show error in UI
    }

    setIsImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-lead-import", {
        body: {
          campaignId: campaign.id,
          jobTitles,
          industries,
          country,
          city: city || undefined,
          companySize,
          technologies: technologies.length > 0 ? technologies : undefined,
          keywords: finalKeywords.length > 0 ? finalKeywords : undefined,
          maxResults,
          userLocation,
        },
      });

      if (error) throw error;

      // Store job info and start polling
      setJobStatus({ id: data.job_id, status: "pending" });
      startPollingJobStatus(data.job_id);
    } catch (error) {
      console.error("Lead import failed:", error);
      setIsImporting(false);
    }
  };

  const startPollingJobStatus = (jobId: string) => {
    let pollCount = 0;
    const maxPolls = 150; // 5 minutes max (150 * 2s)

    const pollInterval = setInterval(async () => {
      pollCount++;

      const { data: job } = await supabase
        .from("lead_import_jobs")
        .select("status, imported_count, error_details")
        .eq("id", jobId)
        .single();

      if (!job) return;

      const statusMap: Record<string, string> = {
        pending: "Queued for processing...",
        running: "Searching LinkedIn profiles...",
        completed: "Import complete!",
        failed: "Import failed",
      };

      setJobStatus({
        id: jobId,
        status: job.status as any,
        progress: statusMap[job.status] || job.status,
        result: job.status === "completed" ? { imported: job.imported_count, updated: 0 } : undefined,
        errorMessage: job.status === "failed" ? job.error_details : undefined,
      });

      if (job.status === "completed" || job.status === "failed" || pollCount >= maxPolls) {
        clearInterval(pollInterval);
        setIsImporting(false);

        if (job.status === "completed") {
          onImportComplete();
          setTimeout(() => onOpenChange(false), 2000);
        }
      }
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add LinkedIn Leads to Campaign</DialogTitle>
          <DialogDescription>
            Search for and import LinkedIn profiles using Exa.ai
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Campaign Context */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium">Campaign: {campaign.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Type: {campaign.campaign_type?.replace("_", " ") || "N/A"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Source: LinkedIn Profiles Only
            </p>
          </div>

          {/* Required Target Criteria */}
          <div className="space-y-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">🎯 Target Criteria (Required)</h3>
            </div>
            
            {/* Job Titles */}
            <div className="space-y-2">
              <Label htmlFor="job-titles">Job Titles *</Label>
              <div className="flex gap-2">
                <input
                  id="job-titles"
                  type="text"
                  placeholder="e.g., CTO, VP Engineering"
                  value={jobTitleInput}
                  onChange={(e) => setJobTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && jobTitleInput.trim()) {
                      setJobTitles([...jobTitles, jobTitleInput.trim()]);
                      setJobTitleInput("");
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border rounded-md"
                />
                <Button 
                  type="button" 
                  size="sm"
                  onClick={() => {
                    if (jobTitleInput.trim()) {
                      setJobTitles([...jobTitles, jobTitleInput.trim()]);
                      setJobTitleInput("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {jobTitles.map((title, idx) => (
                  <Badge key={idx} variant="default">
                    {title}
                    <X 
                      className="ml-1 h-3 w-3 cursor-pointer" 
                      onClick={() => setJobTitles(jobTitles.filter((_, i) => i !== idx))}
                    />
                  </Badge>
                ))}
              </div>
              {jobTitles.length === 0 && (
                <p className="text-xs text-destructive">At least one job title is required</p>
              )}
            </div>

            {/* Industries */}
            <div className="space-y-2">
              <Label htmlFor="industries">Industry/Niche *</Label>
              
              {/* Quick Select Dropdown */}
              <Select value="" onValueChange={(value) => {
                if (!industries.includes(value)) {
                  setIndustries([...industries, value]);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Quick select from common industries..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SaaS">SaaS</SelectItem>
                  <SelectItem value="FinTech">FinTech</SelectItem>
                  <SelectItem value="HealthTech">HealthTech</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="AI/ML">AI/ML</SelectItem>
                  <SelectItem value="EdTech">EdTech</SelectItem>
                  <SelectItem value="MarTech">MarTech</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Industry Input */}
              <div className="flex gap-2">
                <input
                  id="custom-industry"
                  type="text"
                  placeholder="Or type custom industry/niche (e.g., Legal Tech, PropTech)"
                  value={customIndustryInput}
                  onChange={(e) => setCustomIndustryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customIndustryInput.trim()) {
                      if (!industries.includes(customIndustryInput.trim())) {
                        setIndustries([...industries, customIndustryInput.trim()]);
                        setCustomIndustryInput("");
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border rounded-md"
                />
                <Button 
                  type="button" 
                  size="sm"
                  onClick={() => {
                    if (customIndustryInput.trim()) {
                      if (!industries.includes(customIndustryInput.trim())) {
                        setIndustries([...industries, customIndustryInput.trim()]);
                        setCustomIndustryInput("");
                      }
                    }
                  }}
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {industries.map((industry, idx) => (
                  <Badge key={idx} variant="default">
                    {industry}
                    <X 
                      className="ml-1 h-3 w-3 cursor-pointer" 
                      onClick={() => setIndustries(industries.filter((_, i) => i !== idx))}
                    />
                  </Badge>
                ))}
              </div>
              {industries.length === 0 && (
                <p className="text-xs text-destructive">At least one industry is required</p>
              )}
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="UK">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City (Optional)</Label>
                <input
                  id="city"
                  type="text"
                  placeholder="e.g., San Francisco"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md"
                />
              </div>
            </div>

            {/* Company Size */}
            <div className="space-y-2">
              <Label htmlFor="company-size">Company Size *</Label>
              <Select value={companySize[0] || undefined} onValueChange={(value) => !companySize.includes(value) && setCompanySize([...companySize, value])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company sizes..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Startup (1-50)">Startup (1-50 employees)</SelectItem>
                  <SelectItem value="Small (51-200)">Small (51-200 employees)</SelectItem>
                  <SelectItem value="Medium (201-1000)">Medium (201-1,000 employees)</SelectItem>
                  <SelectItem value="Large (1001-5000)">Large (1,001-5,000 employees)</SelectItem>
                  <SelectItem value="Enterprise (5000+)">Enterprise (5,000+ employees)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {companySize.map((size, idx) => (
                  <Badge key={idx} variant="default">
                    {size}
                    <X 
                      className="ml-1 h-3 w-3 cursor-pointer" 
                      onClick={() => setCompanySize(companySize.filter((_, i) => i !== idx))}
                    />
                  </Badge>
                ))}
              </div>
              {companySize.length === 0 && (
                <p className="text-xs text-destructive">At least one company size is required</p>
              )}
            </div>

            {/* Technology Stack */}
            <div className="space-y-2">
              <Label htmlFor="technologies">Technology Stack (Optional)</Label>
              <div className="flex gap-2">
                <input
                  id="technologies"
                  type="text"
                  placeholder="e.g., React, AWS, Python"
                  value={technologyInput}
                  onChange={(e) => setTechnologyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && technologyInput.trim()) {
                      setTechnologies([...technologies, technologyInput.trim()]);
                      setTechnologyInput("");
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border rounded-md"
                />
                <Button 
                  type="button" 
                  size="sm"
                  onClick={() => {
                    if (technologyInput.trim()) {
                      setTechnologies([...technologies, technologyInput.trim()]);
                      setTechnologyInput("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {technologies.map((tech, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tech}
                    <X 
                      className="ml-1 h-3 w-3 cursor-pointer" 
                      onClick={() => setTechnologies(technologies.filter((_, i) => i !== idx))}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Search Preview */}
            <div className="rounded-md bg-muted/50 p-3 border">
              <p className="text-xs font-medium text-muted-foreground mb-1">💡 Search Preview:</p>
              <p className="text-sm font-mono">{previewQuery}</p>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">📊 Additional Filters (Optional)</h3>

          {/* Custom Keywords */}
          <div className="space-y-3">
            <Label htmlFor="custom-keywords">Additional Keywords</Label>
            <Textarea
              id="custom-keywords"
              placeholder="Enter additional keywords separated by commas..."
              value={customKeywords}
              onChange={(e) => setCustomKeywords(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Example: SaaS CEO, AI Startup Founder, Series A CTO
            </p>
          </div>

          {/* User Location */}
          <div className="space-y-3">
            <Label>User Location</Label>
            <Select value={userLocation} onValueChange={setUserLocation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="FR">France</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Maximum Results: {maxResults}</Label>
              <span className="text-sm text-muted-foreground">
                10 - 100 leads
              </span>
            </div>
            <Slider
              value={[maxResults]}
              onValueChange={([value]) => setMaxResults(value)}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
          </div>

          {/* Job Status */}
          {jobStatus && (
            <Alert variant={jobStatus.status === "failed" ? "destructive" : "default"}>
              <Loader2 className={`h-4 w-4 ${jobStatus.status === "running" || jobStatus.status === "pending" ? "animate-spin" : ""}`} />
              <AlertTitle>
                {jobStatus.status === "completed" && "Import Complete!"}
                {jobStatus.status === "failed" && "Import Failed"}
                {jobStatus.status === "running" && "Import in Progress"}
                {jobStatus.status === "pending" && "Queued for Processing"}
              </AlertTitle>
              <AlertDescription>
                {jobStatus.progress}
                {jobStatus.errorMessage && (
                  <div className="mt-2 text-sm whitespace-pre-wrap">
                    <strong>Error:</strong> {jobStatus.errorMessage}
                  </div>
                )}
                {jobStatus.result && (
                  <div className="mt-2 text-sm">
                    Imported <strong>{jobStatus.result.imported}</strong> new LinkedIn contacts
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Cost Estimate */}
          {!jobStatus && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cost Estimate</AlertTitle>
              <AlertDescription>
                This import will cost approximately{" "}
                <strong className="text-primary">${estimatedCost.toFixed(2)}</strong> in
                Exa.ai credits ({maxResults} leads × ${EXA_COST_PER_LEAD.toFixed(2)} per
                lead)
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || jobTitles.length === 0 || industries.length === 0}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {maxResults} Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
