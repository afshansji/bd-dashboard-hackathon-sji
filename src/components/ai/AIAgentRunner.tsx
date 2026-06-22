import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { useRunAIAgent } from "@/hooks/useRunAIAgent";
import { useLatestAIAgentRun } from "@/hooks/useLatestAIAgentRun";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface AIAnalysisResponse {
  summary: string;
  key_findings: string[];
  recommendations: string[];
  action_items: Array<{
    type: 'task';
    description: string;
    priority: 'high' | 'medium' | 'low';
    assignee?: string;
    due_date?: string;
    confidence: number;
  }>;
  metrics: {
    total_items_analyzed: number;
    anomalies_found: number;
    high_priority_issues: number;
  };
  confidence_score?: number;
}

interface AIAgentRunnerProps {
  agentId: string;
  agentName: string;
  agentDescription: string;
  category: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'expense': return <DollarSign className="h-4 w-4" />;
    case 'income': return <TrendingUp className="h-4 w-4" />;
    case 'cash_flow': return <BarChart3 className="h-4 w-4" />;
    default: return <BarChart3 className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'expense': return 'destructive';
    case 'income': return 'default';
    case 'cash_flow': return 'secondary';
    default: return 'outline';
  }
};

export function AIAgentRunner({ agentId, agentName, agentDescription, category }: AIAgentRunnerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTimeframe, setSelectedTimeframe] = useState('current_month');
  
  const runAIAgent = useRunAIAgent();
  const { data: latestRun, isLoading: runLoading } = useLatestAIAgentRun(agentId);

  const handleRunAnalysis = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to run AI analysis.",
        variant: "destructive",
      });
      return;
    }

    try {
      await runAIAgent.mutateAsync({
        agent_id: agentId,
        execution_context: {
          timeframe: selectedTimeframe,
          filters: { month: selectedTimeframe },
          user_id: user.id,
        }
      });

      toast({
        title: "Analysis Complete",
        description: `${agentName} analysis has been completed successfully.`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to run AI analysis. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCategoryIcon(category)}
            <CardTitle>{agentName}</CardTitle>
            <Badge variant={getCategoryColor(category) as "default" | "secondary" | "destructive" | "outline"}>
              {category.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{agentDescription}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger>
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="current_quarter">Current Quarter</SelectItem>
                <SelectItem value="last_quarter">Last Quarter</SelectItem>
                <SelectItem value="current_year">Current Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleRunAnalysis}
            disabled={runAIAgent.isPending}
            className="flex items-center gap-2"
          >
            {runAIAgent.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {runAIAgent.isPending ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>

        {runLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {latestRun && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Latest Analysis</h4>
              <span className="text-sm text-muted-foreground">
                {formatDate(latestRun.created_at)}
              </span>
            </div>

            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg">
              <h5 className="font-medium mb-2">Summary</h5>
              <p className="text-sm">
                {(latestRun.ai_summary as unknown as AIAnalysisResponse)?.summary || 'No summary available'}
              </p>
            </div>

            {/* Key Findings */}
            {(latestRun.ai_summary as unknown as AIAnalysisResponse)?.key_findings && 
             (latestRun.ai_summary as unknown as AIAnalysisResponse).key_findings.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Key Findings</h5>
                <ul className="space-y-1">
                  {(latestRun.ai_summary as unknown as AIAnalysisResponse).key_findings.map((finding: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="font-medium text-primary">•</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {(latestRun.ai_summary as unknown as AIAnalysisResponse)?.recommendations && 
             (latestRun.ai_summary as unknown as AIAnalysisResponse).recommendations.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Recommendations</h5>
                <ul className="space-y-1">
                  {(latestRun.ai_summary as unknown as AIAnalysisResponse).recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="font-medium text-green-600">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metrics */}
            {(latestRun.ai_summary as unknown as AIAnalysisResponse)?.metrics && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {(latestRun.ai_summary as unknown as AIAnalysisResponse).metrics.total_items_analyzed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Items Analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(latestRun.ai_summary as unknown as AIAnalysisResponse).metrics.anomalies_found || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Anomalies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {(latestRun.ai_summary as unknown as AIAnalysisResponse).metrics.high_priority_issues || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">High Priority</div>
                </div>
              </div>
            )}

            {/* Action Items */}
            {latestRun.generated_tasks && Array.isArray(latestRun.generated_tasks) && latestRun.generated_tasks.length > 0 && (
              <div>
                <h5 className="font-medium mb-2">Generated Tasks</h5>
                <div className="space-y-2">
                  {(latestRun.generated_tasks as any[]).map((task: any, index: number) => (
                    <div key={index} className="bg-background border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{task.description}</span>
                        <Badge 
                          variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary' as "default" | "secondary" | "destructive" | "outline"}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      {task.confidence && (
                        <div className="text-xs text-muted-foreground">
                          Confidence: {Math.round(task.confidence * 100)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}