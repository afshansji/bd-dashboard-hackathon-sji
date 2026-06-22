import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, Sparkles, CheckCircle2, XCircle, ArrowRight, RefreshCw } from "lucide-react";

interface CampaignStats {
  id: string;
  name: string;
  status: string;
  total_contacts: number;
  enriched_contacts: number;
  pending_contacts: number;
  avg_quality_score: number | null;
}

interface ContactPreview {
  id: string;
  contact_name: string;
  contact_company: string | null;
  contact_title: string | null;
  contact_email: string | null;
  contact_linkedin_url: string | null;
}

interface EnrichmentResult {
  contact_id: string;
  contact_name: string;
  success: boolean;
  quality_score?: number;
  enriched_fields?: string[];
  error?: string;
}

interface EnrichmentSummary {
  total: number;
  successful: number;
  failed: number;
  score_distribution?: {
    high: number;
    medium: number;
    low: number;
  };
  avg_score?: number | null;
}

type Step = "select" | "preview" | "running" | "complete";

export function LeadEnrichmentAgentRunner() {
  const [step, setStep] = useState<Step>("select");
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState("25");
  const [previewContacts, setPreviewContacts] = useState<ContactPreview[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [summary, setSummary] = useState<EnrichmentSummary | null>(null);
  const [progress, setProgress] = useState(0);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-enrich-leads", {
        body: { mode: "analyze" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setCampaigns(data.campaigns);
      toast.success(`Found ${data.total_campaigns} campaigns with ${data.total_pending} contacts pending enrichment`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const selectAll = () => {
    const campaignsWithPending = campaigns.filter(c => c.pending_contacts > 0);
    setSelectedCampaigns(campaignsWithPending.map(c => c.id));
  };

  const loadPreview = async () => {
    if (selectedCampaigns.length === 0) {
      toast.error("Please select at least one campaign");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-enrich-leads", {
        body: { 
          mode: "preview", 
          campaign_ids: selectedCampaigns,
          batch_size: parseInt(batchSize)
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setPreviewContacts(data.contacts);
      setTotalPending(data.total_pending);
      setStep("preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to preview contacts");
    } finally {
      setLoading(false);
    }
  };

  const runEnrichment = async () => {
    setStep("running");
    setProgress(0);
    setResults([]);

    try {
      const contactIds = previewContacts.map(c => c.id);
      
      // Simulate progress during enrichment
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke("auto-enrich-leads", {
        body: { 
          mode: "execute",
          contact_ids: contactIds,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setResults(data.results);
      setSummary(data.summary);
      setStep("complete");
      toast.success(`Successfully enriched ${data.summary.successful} contacts!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enrichment failed");
      setStep("preview");
    }
  };

  const reset = () => {
    setStep("select");
    setSelectedCampaigns([]);
    setPreviewContacts([]);
    setResults([]);
    setSummary(null);
    setProgress(0);
    loadCampaigns();
  };

  const getScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    if (score >= 70) return <Badge className="bg-green-500/20 text-green-400">High ({score})</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500/20 text-yellow-400">Medium ({score})</Badge>;
    return <Badge className="bg-red-500/20 text-red-400">Low ({score})</Badge>;
  };

  // Initial load
  if (campaigns.length === 0 && step === "select" && !loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Lead Auto-Enrichment Agent
          </CardTitle>
          <CardDescription>
            Automatically enrich campaign contacts with company data, LinkedIn info, and lead quality scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadCampaigns} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
            Analyze Campaigns
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Campaign Selection
  if (step === "select") {
    const selectedPending = campaigns
      .filter(c => selectedCampaigns.includes(c.id))
      .reduce((sum, c) => sum + c.pending_contacts, 0);

    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Select Campaigns to Enrich
          </CardTitle>
          <CardDescription>
            Choose which campaigns to process. Contacts without enrichment data will be analyzed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All with Pending
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Batch size:</span>
              <Select value={batchSize} onValueChange={setBatchSize}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {campaigns.map(campaign => (
              <div
                key={campaign.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  selectedCampaigns.includes(campaign.id) ? "border-primary bg-primary/5" : "border-border"
                } ${campaign.pending_contacts === 0 ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedCampaigns.includes(campaign.id)}
                    onCheckedChange={() => toggleCampaign(campaign.id)}
                    disabled={campaign.pending_contacts === 0}
                  />
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.enriched_contacts}/{campaign.total_contacts} enriched
                      {campaign.avg_quality_score && ` • Avg score: ${campaign.avg_quality_score}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{campaign.status}</Badge>
                  {campaign.pending_contacts > 0 ? (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      {campaign.pending_contacts} pending
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500/20 text-green-400">All enriched</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedCampaigns.length} campaigns selected • {selectedPending} contacts pending
            </p>
            <Button onClick={loadPreview} disabled={loading || selectedCampaigns.length === 0}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Preview Contacts
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Preview
  if (step === "preview") {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Preview Contacts to Enrich
          </CardTitle>
          <CardDescription>
            {previewContacts.length} of {totalPending} pending contacts will be processed in this batch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {previewContacts.map(contact => (
              <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium">{contact.contact_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {contact.contact_title || "Unknown role"} at {contact.contact_company || "Unknown company"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {contact.contact_email && <Badge variant="outline">Email</Badge>}
                  {contact.contact_linkedin_url && <Badge variant="outline">LinkedIn</Badge>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep("select")}>
              Back
            </Button>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Est. time: ~{Math.ceil(previewContacts.length * 3 / 60)} min
              </p>
              <Button onClick={runEnrichment}>
                <Sparkles className="mr-2 h-4 w-4" />
                Start Enrichment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Running
  if (step === "running") {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            Enriching Contacts...
          </CardTitle>
          <CardDescription>
            Processing {previewContacts.length} contacts. Please wait...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground">{progress}% complete</p>
        </CardContent>
      </Card>
    );
  }

  // Step 4: Complete
  if (step === "complete" && summary) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Enrichment Complete
          </CardTitle>
          <CardDescription>
            Successfully processed {summary.total} contacts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-2xl font-bold text-green-400">{summary.successful}</p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-2xl font-bold text-red-400">{summary.failed}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-2xl font-bold text-primary">{summary.avg_score || "N/A"}</p>
              <p className="text-sm text-muted-foreground">Avg Score</p>
            </div>
          </div>

          {/* Score Distribution */}
          {summary.score_distribution && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Score Distribution</p>
              <div className="flex gap-2">
                <Badge className="bg-green-500/20 text-green-400">
                  High (70+): {summary.score_distribution.high}
                </Badge>
                <Badge className="bg-yellow-500/20 text-yellow-400">
                  Medium (40-69): {summary.score_distribution.medium}
                </Badge>
                <Badge className="bg-red-500/20 text-red-400">
                  Low (&lt;40): {summary.score_distribution.low}
                </Badge>
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {results.map(result => (
              <div key={result.contact_id} className="flex items-center justify-between p-2 rounded border border-border">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">{result.contact_name}</span>
                </div>
                {result.success ? (
                  getScoreBadge(result.quality_score)
                ) : (
                  <span className="text-xs text-red-400">{result.error}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Enrich More Contacts
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
