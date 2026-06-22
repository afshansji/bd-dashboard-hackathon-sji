import { useState } from "react";
import { Send, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface IntelligenceChatInputProps {
  onAsk: (question: string, mode: "quick" | "deep") => void;
  isLoading: boolean;
}

export function IntelligenceChatInput({ onAsk, isLoading }: IntelligenceChatInputProps) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"quick" | "deep">("quick");

  const handleSubmit = () => {
    if (!question.trim() || isLoading) return;
    onAsk(question, mode);
    setQuestion("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Analysis Mode:</span>
        <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as any)}>
          <ToggleGroupItem value="quick" aria-label="Quick mode" className="gap-2">
            <Zap className="h-4 w-4" />
            Quick (10-15s)
          </ToggleGroupItem>
          <ToggleGroupItem value="deep" aria-label="Deep mode" className="gap-2">
            <Brain className="h-4 w-4" />
            Deep (thorough)
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this client..."
          className="min-h-[60px] resize-none"
          disabled={isLoading}
        />
        <Button
          onClick={handleSubmit}
          disabled={!question.trim() || isLoading}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
