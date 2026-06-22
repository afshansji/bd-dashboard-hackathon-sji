import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThumbsUp } from "lucide-react";

interface UpvoteButtonProps {
  count: number;
  hasUpvoted: boolean;
  onToggle: (nextState: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function UpvoteButton({
  count,
  hasUpvoted,
  onToggle,
  disabled = false,
  className,
}: UpvoteButtonProps) {
  return (
    <Button
      type="button"
      variant={hasUpvoted ? "default" : "outline"}
      size="sm"
      onClick={() => onToggle(!hasUpvoted)}
      disabled={disabled}
      aria-pressed={hasUpvoted}
      className={cn("gap-2", className)}
    >
      <ThumbsUp className="h-4 w-4" />
      <span>{hasUpvoted ? "Upvoted" : "Upvote"}</span>
      <span className={cn("text-xs", hasUpvoted ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {count}
      </span>
    </Button>
  );
}
