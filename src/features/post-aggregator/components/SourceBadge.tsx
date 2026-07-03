import { Badge } from "@/components/ui/badge";
import type { PostSource } from "../types";

const SOURCE_LABELS: Record<PostSource, string> = {
  reddit: "Reddit",
  hackernews: "Hacker News",
  twitter: "Twitter/X",
};

const SOURCE_STYLES: Record<PostSource, string> = {
  reddit: "bg-orange-100 text-orange-800 border-orange-200",
  hackernews: "bg-amber-100 text-amber-900 border-amber-200",
  twitter: "bg-sky-100 text-sky-800 border-sky-200",
};

interface SourceBadgeProps {
  source: PostSource;
}

export function SourceBadge({ source }: SourceBadgeProps) {
  return (
    <Badge variant="outline" className={SOURCE_STYLES[source]}>
      {SOURCE_LABELS[source]}
    </Badge>
  );
}

export { SOURCE_LABELS };
