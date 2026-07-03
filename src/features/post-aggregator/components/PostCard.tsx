import { ExternalLink, MessageCircle, Search, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import type { AggregatedPost } from "../types";
import { SourceBadge } from "./SourceBadge";

interface PostCardProps {
  post: AggregatedPost;
}

function getMetadataItems(post: AggregatedPost): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];

  if (post.source === "reddit") {
    if (post.metadata.subreddit) {
      items.push({ label: "Subreddit", value: String(post.metadata.subreddit) });
    }
    if (typeof post.metadata.score === "number") {
      items.push({ label: "Score", value: String(post.metadata.score) });
    }
    if (typeof post.metadata.comments === "number") {
      items.push({ label: "Comments", value: String(post.metadata.comments) });
    }
    if (post.metadata.flair) {
      items.push({ label: "Flair", value: String(post.metadata.flair) });
    }
  }

  if (post.source === "hackernews") {
    if (typeof post.metadata.points === "number") {
      items.push({ label: "Points", value: String(post.metadata.points) });
    }
    if (typeof post.metadata.comments === "number") {
      items.push({ label: "Comments", value: String(post.metadata.comments) });
    }
  }

  return items;
}

export function PostCard({ post }: PostCardProps) {
  const metadataItems = getMetadataItems(post);
  const discussionUrl =
    typeof post.metadata.discussionUrl === "string"
      ? post.metadata.discussionUrl
      : post.url;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={post.source} />
          <Badge variant="secondary" className="gap-1">
            <Search className="h-3 w-3" />
            {post.matchedKeyword}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(post.publishedAt)}
          </span>
        </div>
        <CardTitle className="text-lg leading-snug">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline"
          >
            {post.title}
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>by {post.author}</span>
          {metadataItems.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1">
              {item.label === "Score" || item.label === "Points" ? (
                <ThumbsUp className="h-3.5 w-3.5" />
              ) : item.label === "Comments" ? (
                <MessageCircle className="h-3.5 w-3.5" />
              ) : null}
              {item.label}: {item.value}
            </span>
          ))}
        </div>

        {post.excerpt ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="default">
            <a href={post.url} target="_blank" rel="noopener noreferrer">
              Open post
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
          {discussionUrl !== post.url ? (
            <Button asChild size="sm" variant="outline">
              <a href={discussionUrl} target="_blank" rel="noopener noreferrer">
                Discussion
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
