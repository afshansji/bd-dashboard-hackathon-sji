import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Zap, Brain } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IntelligenceHistorySidebarProps {
  sessions: any[];
  activeSessionId: string | null;
  onLoadSession: (session: any) => void;
  onNewChat: () => void;
  isLoading: boolean;
}

export function IntelligenceHistorySidebar({
  sessions,
  activeSessionId,
  onLoadSession,
  onNewChat,
  isLoading,
}: IntelligenceHistorySidebarProps) {
  return (
    <Card className="h-[calc(100vh-200px)] flex flex-col">
      <div className="p-4 border-b">
        <Button onClick={onNewChat} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New Analysis
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Loading history...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No previous sessions
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onLoadSession(session)}
                className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${
                  activeSessionId === session.id ? "bg-accent border-primary" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium line-clamp-2 flex-1">
                    {session.question}
                  </p>
                  {session.mode === "quick" ? (
                    <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                  ) : (
                    <Brain className="h-3 w-3 text-purple-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </div>
                {session.processing_time_ms && (
                  <Badge variant="outline" className="text-xs mt-2">
                    {(session.processing_time_ms / 1000).toFixed(1)}s
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
