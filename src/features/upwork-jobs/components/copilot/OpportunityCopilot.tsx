import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOpportunityCopilot } from "@/hooks/useOpportunityCopilot";
import { CopilotMessageBubble } from "./CopilotMessageBubble";
import {
  COPILOT_EXAMPLE_PROMPTS,
  COPILOT_QUICK_ACTIONS,
} from "./copilotPrompts";

interface OpportunityCopilotProps {
  jobId: string;
  enabled: boolean;
}

export function OpportunityCopilot({ jobId, enabled }: OpportunityCopilotProps) {
  const { messages, isStreaming, error, sendMessage, clearError } =
    useOpportunityCopilot({ jobId, enabled });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    void sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePrompt = (prompt: string) => {
    if (isStreaming) return;
    void sendMessage(prompt);
  };

  const showEmptyState = messages.length === 0;

  return (
    <section className="mt-8 rounded-xl border bg-gradient-to-b from-muted/30 to-background">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Opportunity Copilot</h3>
            <p className="text-sm text-muted-foreground">
              Ask anything about this opportunity
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-[420px] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between gap-2">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {showEmptyState ? (
            <div className="space-y-5 py-2">
              <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/20 p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">
                  I already have the full intelligence report, repository evidence,
                  and citations for this job. Ask follow-up questions — no need to
                  re-upload anything.
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {COPILOT_QUICK_ACTIONS.map((action) => (
                    <Button
                      key={action.label}
                      variant="secondary"
                      size="sm"
                      className="h-8 rounded-full text-xs"
                      disabled={isStreaming}
                      onClick={() => handlePrompt(action.prompt)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Examples
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COPILOT_EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={isStreaming}
                      onClick={() => handlePrompt(prompt)}
                      className="rounded-lg border bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/50 hover:text-foreground disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <CopilotMessageBubble key={message.id} message={message} />
              ))}
              {isStreaming ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Copilot is thinking...
                </div>
              ) : null}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {!showEmptyState ? (
          <div className="border-t px-5 py-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Quick Actions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COPILOT_QUICK_ACTIONS.map((action) => (
                <Badge
                  key={action.label}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => !isStreaming && handlePrompt(action.prompt)}
                >
                  {action.label}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this opportunity..."
              className="min-h-[52px] max-h-32 resize-none"
              disabled={isStreaming}
              rows={2}
            />
            <Button
              size="icon"
              className="h-[52px] w-[52px] shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Scoped to this opportunity · Evidence-backed answers only
          </p>
        </div>
      </div>
    </section>
  );
}
