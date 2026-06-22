import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, User, AlertTriangle, TrendingUp, CheckSquare, FileText, Copy, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: any;
  timestamp: Date;
  mode?: "quick" | "deep";
}

interface IntelligenceChatMessagesProps {
  messages: Message[];
  clientId: string;
}

export function IntelligenceChatMessages({ messages, clientId }: IntelligenceChatMessagesProps) {
  const navigate = useNavigate();

  const handleCopyToClipboard = (content: any) => {
    const text = typeof content === 'string' 
      ? content 
      : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleCreateFollowup = (actionItem: any) => {
    // Navigate to deals page with pre-filled followup
    toast.success("Follow-up created", {
      description: actionItem.action,
    });
    // You could also create it directly via API if needed
  };

  const handleCreateTask = (actionItem: any) => {
    toast.success("Task created", {
      description: `${actionItem.action} - ${actionItem.priority} priority`,
    });
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Ask About Your Client</h3>
            <p className="text-sm text-muted-foreground">
              Get AI-powered insights from deals, documents, and historical data.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-left">
            <div className="text-xs text-muted-foreground border rounded-lg p-2">
              "What are the main risks with this client?"
            </div>
            <div className="text-xs text-muted-foreground border rounded-lg p-2">
              "Summarize recent deal activity"
            </div>
            <div className="text-xs text-muted-foreground border rounded-lg p-2">
              "What opportunities should we pursue?"
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-6">
      <div className="space-y-6">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-4 ${message.role === "user" ? "justify-end" : ""}`}>
            {message.role === "assistant" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Brain className="h-4 w-4 text-primary" />
              </div>
            )}
            
            <div className={`max-w-[85%] space-y-2 ${message.role === "user" ? "text-right" : ""}`}>
              {message.role === "user" ? (
                <div className="inline-flex items-center gap-2">
                  {message.mode && (
                    <Badge variant="outline" className="text-xs">
                      {message.mode === "quick" ? "Quick" : "Deep"} Mode
                    </Badge>
                  )}
                  <Card className="inline-block p-4 bg-primary text-primary-foreground">
                    <p className="text-sm">{message.content}</p>
                  </Card>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  {message.content.summary && (
                    <Card className="p-4 bg-accent/50">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Summary
                        </h4>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => handleCopyToClipboard(message.content.summary)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm">{message.content.summary}</p>
                    </Card>
                  )}

                  {/* Key Findings */}
                  {message.content.key_findings?.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">Key Findings</h4>
                      <div className="space-y-2">
                        {message.content.key_findings.map((finding: any, idx: number) => (
                          <div key={idx} className="text-sm border-l-2 border-primary pl-3 py-1">
                            <p className="font-medium">{finding.finding}</p>
                            <p className="text-muted-foreground text-xs mt-1">{finding.evidence}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{finding.source_type}</Badge>
                              <Badge variant={
                                finding.confidence === "high" ? "default" :
                                finding.confidence === "medium" ? "secondary" : "outline"
                              } className="text-xs">
                                {finding.confidence} confidence
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Risks */}
                  {message.content.risks?.length > 0 && (
                    <Card className="p-4 border-destructive/50">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Risks
                      </h4>
                      <div className="space-y-2">
                        {message.content.risks.map((risk: any, idx: number) => (
                          <div key={idx} className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={risk.severity === "high" ? "destructive" : "secondary"}>
                                {risk.severity}
                              </Badge>
                              <p className="font-medium">{risk.risk_description}</p>
                            </div>
                            <p className="text-muted-foreground text-xs pl-16">{risk.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Opportunities */}
                  {message.content.opportunities?.length > 0 && (
                    <Card className="p-4 border-green-500/50">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Opportunities
                      </h4>
                      <div className="space-y-2">
                        {message.content.opportunities.map((opp: any, idx: number) => (
                          <div key={idx} className="text-sm space-y-1">
                            <p className="font-medium">{opp.opportunity}</p>
                            <p className="text-muted-foreground text-xs">{opp.value_estimate}</p>
                            <p className="text-xs">Next: {opp.next_steps}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Action Items */}
                  {message.content.action_items?.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Action Items
                      </h4>
                      <div className="space-y-3">
                        {message.content.action_items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-sm group">
                            <Badge variant={item.priority === "high" ? "destructive" : "outline"} className="text-xs mt-0.5 shrink-0">
                              {item.priority}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{item.action}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.owner} • {item.timeline}
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6"
                                onClick={() => handleCreateTask(item)}
                                title="Create Task"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6"
                                onClick={() => handleCreateFollowup(item)}
                                title="Create Follow-up"
                              >
                                <Calendar className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-4 pt-3 border-t">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCopyToClipboard(message.content)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy All
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Data Quality */}
                  {message.content.data_quality && (
                    <Card className="p-3 bg-muted/50">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">Data Coverage:</span>
                        <Badge variant={message.content.data_quality.coverage_score >= 50 ? "default" : "secondary"}>
                          {message.content.data_quality.coverage_score}%
                        </Badge>
                        {message.content.data_quality.missing_data?.length > 0 && (
                          <span className="text-muted-foreground">
                            Missing: {message.content.data_quality.missing_data.slice(0, 2).join(", ")}
                          </span>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Sources Cited */}
                  {message.content.sources_cited?.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Sources: </span>
                      {message.content.sources_cited.map((src: any, idx: number) => (
                        <span key={idx}>
                          {typeof src === 'string' ? src : `${src.type}: ${src.name}`}
                          {idx < message.content.sources_cited.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}