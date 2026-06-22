import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  CalendarDays, 
  Play, 
  TrendingUp, 
  Target, 
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  ArrowRight,
  Loader2,
  RefreshCw,
  Sparkles,
  Calendar
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

type Step = "configure" | "running" | "complete";

interface WeeklyInsightsResult {
  summary: string;
  keyWins: string[];
  opportunities: string[];
  recommendations: string[];
  actionItems: string[];
  metrics: {
    contactsReached: number;
    responsesReceived: number;
    meetingsBooked: number;
    dealsGenerated: number;
  };
  trends: {
    direction: "up" | "down" | "stable";
    percentage: number;
    description: string;
  };
}

interface BDWeeklyInsightsRunnerProps {
  agentId: string;
}

const BDWeeklyInsightsRunner: React.FC<BDWeeklyInsightsRunnerProps> = ({ agentId }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("configure");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<"7" | "14" | "30" | "90">("7");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WeeklyInsightsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaigns (active, planning, and completed)
  const { data: campaigns, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["bd-campaigns-for-insights"],
    queryFn: async () => {
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("bd_campaigns")
        .select("id, name, slug, status")
        .in("status", ["active", "planning", "completed"])
        .order("created_at", { ascending: false });
      
      if (campaignsError) throw campaignsError;
      if (!campaignsData || campaignsData.length === 0) return [];

      // Fetch contact counts per campaign
      const { data: contactStats, error: contactsError } = await supabase
        .from("campaign_contacts")
        .select("campaign_id, status")
        .in("campaign_id", campaignsData.map(c => c.id));

      if (contactsError) throw contactsError;

      // Calculate stats for each campaign
      const statsMap: Record<string, { total: number; meetings: number; responses: number; deals: number }> = {};
      (contactStats || []).forEach((contact) => {
        if (!statsMap[contact.campaign_id]) {
          statsMap[contact.campaign_id] = { total: 0, meetings: 0, responses: 0, deals: 0 };
        }
        statsMap[contact.campaign_id].total += 1;
        if (contact.status === "meeting_booked") statsMap[contact.campaign_id].meetings += 1;
        if (contact.status === "responded") statsMap[contact.campaign_id].responses += 1;
        if (contact.status === "won") statsMap[contact.campaign_id].deals += 1;
      });

      // Merge campaigns with stats
      return campaignsData.map(c => ({
        ...c,
        actual_contacts_reached: statsMap[c.id]?.total || 0,
        meetings_booked: statsMap[c.id]?.meetings || 0,
        responses_received: statsMap[c.id]?.responses || 0,
        deals_generated: statsMap[c.id]?.deals || 0,
      }));
    },
  });

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const selectAllCampaigns = () => {
    if (campaigns) {
      setSelectedCampaigns(campaigns.map(c => c.id));
    }
  };

  const unselectAllCampaigns = () => {
    setSelectedCampaigns([]);
  };

  const allCampaignsSelected = campaigns && campaigns.length > 0 && selectedCampaigns.length === campaigns.length;

  const getDateRangeLabel = () => {
    const days = parseInt(dateRange);
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
  };

  const runInsightsAnalysis = async () => {
    if (selectedCampaigns.length === 0) {
      toast({
        title: "No campaigns selected",
        description: "Please select at least one campaign to analyze.",
        variant: "destructive",
      });
      return;
    }

    setStep("running");
    setIsRunning(true);
    setProgress(10);
    setError(null);

    try {
      // Get campaign data for selected campaigns
      const selectedCampaignData = campaigns?.filter(c => selectedCampaigns.includes(c.id)) || [];
      
      setProgress(30);

      // Calculate aggregate metrics
      const metrics = {
        contactsReached: selectedCampaignData.reduce((sum, c) => sum + (c.actual_contacts_reached || 0), 0),
        responsesReceived: selectedCampaignData.reduce((sum, c) => sum + (c.responses_received || 0), 0),
        meetingsBooked: selectedCampaignData.reduce((sum, c) => sum + (c.meetings_booked || 0), 0),
        dealsGenerated: selectedCampaignData.reduce((sum, c) => sum + (c.deals_generated || 0), 0),
      };

      setProgress(50);

      // Call the run-ai-agent function
      const { data: runResult, error: runError } = await supabase.functions.invoke("run-ai-agent", {
        body: {
          agent_id: agentId,
          user_context: JSON.stringify({
            dateRange: dateRange,
            dateRangeLabel: getDateRangeLabel(),
            campaigns: selectedCampaignData.map(c => ({
              name: c.name,
              status: c.status,
              contactsReached: c.actual_contacts_reached || 0,
              responsesReceived: c.responses_received || 0,
              meetingsBooked: c.meetings_booked || 0,
              dealsGenerated: c.deals_generated || 0,
            })),
            aggregateMetrics: metrics,
          }),
        },
      });

      setProgress(80);

      if (runError) {
        throw new Error(runError.message || "Failed to run insights analysis");
      }

      // Parse the AI response
      let insights: WeeklyInsightsResult;
      try {
        const aiOutput = runResult?.response?.output || runResult?.output || runResult;
        const parsedOutput = typeof aiOutput === "string" ? JSON.parse(aiOutput) : aiOutput;
        
        insights = {
          summary: parsedOutput.summary || parsedOutput.executive_summary || "Weekly BD activity analysis complete.",
          keyWins: parsedOutput.keyWins || parsedOutput.key_wins || parsedOutput.wins || [],
          opportunities: parsedOutput.opportunities || parsedOutput.missed_opportunities || [],
          recommendations: parsedOutput.recommendations || parsedOutput.strategic_recommendations || [],
          actionItems: parsedOutput.actionItems || parsedOutput.action_items || parsedOutput.next_steps || [],
          metrics,
          trends: parsedOutput.trends || {
            direction: metrics.meetingsBooked > 3 ? "up" : metrics.meetingsBooked > 0 ? "stable" : "down",
            percentage: metrics.responsesReceived > 0 ? Math.round((metrics.meetingsBooked / metrics.responsesReceived) * 100) : 0,
            description: "Based on meeting conversion rate",
          },
        };
      } catch (parseErr) {
        // Fallback if parsing fails
        insights = {
          summary: typeof runResult === "string" ? runResult : "Analysis completed. Review the metrics below.",
          keyWins: [],
          opportunities: [],
          recommendations: ["Review individual campaign performance", "Focus on high-response campaigns"],
          actionItems: ["Follow up on pending responses", "Schedule team review meeting"],
          metrics,
          trends: {
            direction: "stable",
            percentage: 0,
            description: "Trend analysis pending",
          },
        };
      }

      setResult(insights);
      setProgress(100);
      setStep("complete");

      toast({
        title: "Analysis Complete",
        description: "Weekly BD insights have been generated successfully.",
      });

    } catch (err) {
      console.error("Error running insights:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setStep("configure");
      toast({
        title: "Analysis Failed",
        description: err instanceof Error ? err.message : "Failed to generate insights",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const resetRunner = () => {
    setStep("configure");
    setResult(null);
    setProgress(0);
    setError(null);
  };

  const getTrendIcon = () => {
    if (!result?.trends) return null;
    switch (result.trends.direction) {
      case "up":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "down":
        return <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />;
      default:
        return <ArrowRight className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loadingCampaigns) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>BD Weekly Insights</CardTitle>
              <CardDescription>
                Generate AI-powered insights from your BD activity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step: Configure */}
      {step === "configure" && (
        <div className="space-y-4">
          {/* Time Period Selection - Compact */}
          <Card className="border-border/50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm">Time Period</span>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={dateRange} onValueChange={(v) => setDateRange(v as "7" | "14" | "30" | "90")}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="14">Last 14 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 3 months</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {getDateRangeLabel()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Selection - Main Area */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <span>Select Campaigns</span>
                  <Badge variant="secondary" className="ml-2">
                    {selectedCampaigns.length} selected
                  </Badge>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={allCampaignsSelected ? unselectAllCampaigns : selectAllCampaigns}
                  className="text-xs"
                >
                  {allCampaignsSelected ? "Unselect All" : "Select All"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[300px]">
                <div className="space-y-1 pr-4">
                  {campaigns?.map((campaign) => (
                    <div
                      key={campaign.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedCampaigns.includes(campaign.id) 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'border-transparent hover:bg-muted/50'
                      }`}
                      onClick={() => toggleCampaign(campaign.id)}
                    >
                      <Checkbox
                        checked={selectedCampaigns.includes(campaign.id)}
                        onCheckedChange={() => toggleCampaign(campaign.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.actual_contacts_reached || 0} contacts • {campaign.meetings_booked || 0} meetings
                        </p>
                      </div>
                      <Badge variant={campaign.status === "active" ? "default" : "outline"} className="text-xs">
                        {campaign.status}
                      </Badge>
                    </div>
                  ))}
                  {(!campaigns || campaigns.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No campaigns found
                    </p>
                  )}
                </div>
              </ScrollArea>
              
              {/* Generate Button Inside Card */}
              <div className="pt-4 mt-4 border-t">
                <Button
                  onClick={runInsightsAnalysis}
                  disabled={isRunning || selectedCampaigns.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Insights...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Weekly Insights
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Running */}
      {step === "running" && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-6">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Analyzing BD Activity...</h3>
                <p className="text-muted-foreground">
                  Generating insights from {selectedCampaigns.length} campaigns
                </p>
              </div>
              <Progress value={progress} className="max-w-md mx-auto" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Complete - Results */}
      {step === "complete" && result && (
        <div className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.metrics.contactsReached}</p>
                  <p className="text-sm text-muted-foreground">Contacts Reached</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.metrics.responsesReceived}</p>
                  <p className="text-sm text-muted-foreground">Responses</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.metrics.meetingsBooked}</p>
                  <p className="text-sm text-muted-foreground">Meetings Booked</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.metrics.dealsGenerated}</p>
                  <p className="text-sm text-muted-foreground">Deals Generated</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary & Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Executive Summary
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getTrendIcon()}
                  <span className="text-sm font-medium">
                    {result.trends.percentage}% conversion
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{result.summary}</p>
            </CardContent>
          </Card>

          {/* Key Wins & Opportunities */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Key Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.keyWins.length > 0 ? (
                    result.keyWins.map((win, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-1">•</span>
                        {typeof win === "string" ? win : (win as any)?.description || JSON.stringify(win)}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">No specific wins identified this period</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-5 w-5" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.opportunities.length > 0 ? (
                    result.opportunities.map((opp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-500 mt-1">•</span>
                        {typeof opp === "string" ? opp : (opp as any)?.description || JSON.stringify(opp)}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-muted-foreground">Review campaign performance for opportunities</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">{idx + 1}.</span>
                    {typeof rec === "string" ? rec : (rec as any)?.description || JSON.stringify(rec)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Action Items for This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm p-2 bg-muted/50 rounded-lg">
                    <Checkbox />
                    {typeof item === "string" ? item : (item as any)?.description || JSON.stringify(item)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Analysis Failed</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {step === "complete" && (
          <Button variant="outline" onClick={resetRunner}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Run Again
          </Button>
        )}
        {step === "configure" && (
          <Button 
            onClick={runInsightsAnalysis} 
            disabled={isRunning || selectedCampaigns.length === 0}
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Generate Insights
          </Button>
        )}
      </div>
    </div>
  );
};

export default BDWeeklyInsightsRunner;
