import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Users,
  Copy,
  Lightbulb,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BDChatMessage, RepInsight, MetricAnalysis, ActionItem } from "@/hooks/useRunBDManagerChat";

interface BDManagerChatMessagesProps {
  messages: BDChatMessage[];
  weekContext?: string;
}

export function BDManagerChatMessages({ messages, weekContext }: BDManagerChatMessagesProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const getStatusColor = (status: RepInsight["status"]) => {
    switch (status) {
      case "excelling":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "on_track":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "at_risk":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "off_track":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTrendIcon = (trend: MetricAnalysis["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: ActionItem["priority"]) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">BD Manager Assistant</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Ask questions about team performance, individual rep progress, weekly metrics, or get coaching recommendations.
        </p>
        {weekContext && (
          <Badge variant="outline" className="mb-4">
            <Clock className="h-3 w-3 mr-1" />
            Analyzing: Week of {weekContext}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={`max-w-[85%] ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2"
                  : "space-y-4"
              }`}
            >
              {message.role === "user" ? (
                <p>{message.content}</p>
              ) : (
                <>
                  {/* Summary */}
                  {message.structuredData?.summary && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm leading-relaxed">{message.structuredData.summary}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-8 w-8"
                            onClick={() => copyToClipboard(message.structuredData?.summary || "")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Rep Insights */}
                  {message.structuredData?.rep_insights && message.structuredData.rep_insights.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Rep Performance</span>
                        </div>
                        <div className="space-y-3">
                          {message.structuredData.rep_insights.map((rep, i) => (
                            <div key={i} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{rep.rep_name}</span>
                                <Badge className={getStatusColor(rep.status)}>
                                  {rep.status.replace("_", " ")}
                                </Badge>
                              </div>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {rep.highlights.map((highlight, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    {highlight}
                                  </li>
                                ))}
                              </ul>
                              {rep.metrics && (
                                <div className="flex gap-4 mt-2 text-xs">
                                  {rep.metrics.dhs_rate !== undefined && (
                                    <span>DHS: {rep.metrics.dhs_rate}%</span>
                                  )}
                                  {rep.metrics.eod_rate !== undefined && (
                                    <span>EOD: {rep.metrics.eod_rate}%</span>
                                  )}
                                  {rep.metrics.goal_progress !== undefined && (
                                    <span>Goals: {rep.metrics.goal_progress}%</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Metrics Analysis */}
                  {message.structuredData?.metrics_analysis && message.structuredData.metrics_analysis.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Metrics Overview</span>
                        </div>
                        <div className="grid gap-2">
                          {message.structuredData.metrics_analysis.map((metric, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-2">
                                {getTrendIcon(metric.trend)}
                                <span className="text-sm font-medium">{metric.metric}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold">{metric.value}</span>
                                {metric.change_percent !== undefined && (
                                  <span
                                    className={`text-xs ml-2 ${
                                      metric.change_percent > 0
                                        ? "text-green-600"
                                        : metric.change_percent < 0
                                        ? "text-red-600"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {metric.change_percent > 0 ? "+" : ""}
                                    {metric.change_percent}%
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* WIG Highlights */}
                  {message.structuredData?.wig_highlights && message.structuredData.wig_highlights.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-sm">WIG Meeting Highlights</span>
                        </div>
                        <ul className="space-y-2">
                          {message.structuredData.wig_highlights.map((highlight, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Action Items */}
                  {message.structuredData?.action_items && message.structuredData.action_items.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="font-medium text-sm">Recommended Actions</span>
                        </div>
                        <div className="space-y-2">
                          {message.structuredData.action_items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-2 rounded-lg border"
                            >
                              <Badge variant={getPriorityColor(item.priority)} className="shrink-0 mt-0.5">
                                {item.priority}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{item.action}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <span>{item.owner}</span>
                                  <span>•</span>
                                  <span>{item.timeline}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Fallback for plain text response */}
                  {!message.structuredData && message.content && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>

            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
