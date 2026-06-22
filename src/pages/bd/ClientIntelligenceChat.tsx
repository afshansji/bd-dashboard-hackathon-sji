import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Brain, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useClientBySlug } from "@/hooks/useClientBySlug";
import { useRunClientIntelligence } from "@/hooks/useRunClientIntelligence";
import { useIntelligenceSessions, useSaveIntelligenceSession } from "@/hooks/useIntelligenceSessions";
import { useClientHealthStats } from "@/hooks/useClientHealthStats";
import { IntelligenceChatInput } from "@/components/intelligence/IntelligenceChatInput";
import { IntelligenceChatMessages } from "@/components/intelligence/IntelligenceChatMessages";
import { IntelligenceHistorySidebar } from "@/components/intelligence/IntelligenceHistorySidebar";
import { QuickInsightCards } from "@/components/intelligence/QuickInsightCards";
import { ClientHealthPanel } from "@/components/intelligence/ClientHealthPanel";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: any;
  timestamp: Date;
  mode?: "quick" | "deep";
}

export default function ClientIntelligenceChat() {
  const { clientSlug } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading: clientLoading } = useClientBySlug(clientSlug);
  const { data: sessions = [], isLoading: sessionsLoading } = useIntelligenceSessions(client?.id || "");
  const { data: healthStats, isLoading: healthLoading } = useClientHealthStats(client?.id);
  const runIntelligence = useRunClientIntelligence();
  const saveSession = useSaveIntelligenceSession();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Compute proactive alerts
  const alerts: string[] = [];
  if (healthStats) {
    if (healthStats.overdueFollowups > 0) {
      alerts.push(`${healthStats.overdueFollowups} overdue follow-up${healthStats.overdueFollowups > 1 ? "s" : ""} need attention`);
    }
    if (healthStats.dealsAtRisk > 0) {
      alerts.push(`${healthStats.dealsAtRisk} deal${healthStats.dealsAtRisk > 1 ? "s" : ""} stalled for 14+ days`);
    }
    if (healthStats.daysSinceContact !== null && healthStats.daysSinceContact > 30) {
      alerts.push(`No contact in ${healthStats.daysSinceContact} days`);
    }
  }

  const handleAsk = async (question: string, mode: "quick" | "deep") => {
    if (!client) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
      mode,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Pass conversation history for multi-turn support
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const result = await runIntelligence.mutateAsync({
        clientId: client.id,
        question,
        mode,
        conversationHistory,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.response || result,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save session
      await saveSession.mutateAsync({
        clientId: client.id,
        question,
        mode,
        responseData: result.response || result,
        tokensUsed: result.telemetry?.[0]?.tokenUsage?.totalTokens,
        processingTimeMs: result.processing_time_ms,
      });
    } catch (error) {
      console.error("Failed to get intelligence:", error);
    }
  };

  const handleQuickInsight = (question: string) => {
    handleAsk(question, "deep");
  };

  const handleLoadSession = (session: any) => {
    setActiveSessionId(session.id);
    setMessages([
      {
        id: session.id + "-q",
        role: "user",
        content: session.question,
        timestamp: new Date(session.created_at),
        mode: session.mode,
      },
      {
        id: session.id + "-a",
        role: "assistant",
        content: session.response_data,
        timestamp: new Date(session.created_at),
      },
    ]);
  };

  if (clientLoading) {
    return <div className="p-8">Loading client...</div>;
  }

  if (!client) {
    return <div className="p-8">Client not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/clients/${clientSlug}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Client
            </Button>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{client.name}</h1>
                <p className="text-sm text-muted-foreground">Intelligence Assistant</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proactive Alerts Banner */}
      {alerts.length > 0 && (
        <div className="container pt-4">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{alerts.join(" • ")}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={() => handleAsk("Analyze all urgent issues: overdue follow-ups, stalled deals, and suggest immediate actions to address them.", "deep")}
              >
                Analyze Now
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="container py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* History Sidebar */}
          <div className="col-span-3">
            <IntelligenceHistorySidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onLoadSession={handleLoadSession}
              onNewChat={() => {
                setMessages([]);
                setActiveSessionId(null);
              }}
              isLoading={sessionsLoading}
            />
          </div>

          {/* Chat Area */}
          <div className="col-span-6">
            <Card className="flex h-[calc(100vh-200px)] flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col p-6 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
                      <Brain className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold">What would you like to know?</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a quick insight or ask your own question
                    </p>
                  </div>
                  <QuickInsightCards 
                    onSelectInsight={handleQuickInsight} 
                    isLoading={runIntelligence.isPending} 
                  />
                </div>
              ) : (
                <IntelligenceChatMessages messages={messages} clientId={client.id} />
              )}
              <IntelligenceChatInput
                onAsk={handleAsk}
                isLoading={runIntelligence.isPending}
              />
            </Card>
          </div>

          {/* Health Stats Panel */}
          <div className="col-span-3">
            <ClientHealthPanel 
              stats={healthStats} 
              isLoading={healthLoading} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
