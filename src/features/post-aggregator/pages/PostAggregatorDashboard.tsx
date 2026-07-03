import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useAggregatedPosts } from "../hooks/useAggregatedPosts";
import type { AggregatedPost, PostSource } from "../types";
import { PostCard } from "../components/PostCard";
import { SourceFilter, type SourceFilterValue } from "../components/SourceFilter";
import {
  KeywordFilter,
  type KeywordFilterValue,
} from "../components/KeywordFilter";
import { SOURCE_LABELS } from "../components/SourceBadge";
import { LEAD_KEYWORDS } from "../services/keywords";

function postMatchesKeyword(
  post: AggregatedPost,
  keyword: KeywordFilterValue,
): boolean {
  if (keyword === "all") {
    return true;
  }

  if (post.matchedKeyword === keyword) {
    return true;
  }

  const matchedKeywords = post.metadata.matchedKeywords;
  if (typeof matchedKeywords === "string") {
    return matchedKeywords.split(", ").includes(keyword);
  }

  return false;
}

export function PostAggregatorDashboard() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAggregatedPosts();
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>("all");
  const [keywordFilter, setKeywordFilter] = useState<KeywordFilterValue>("all");

  const sourceCounts = useMemo(() => {
    const base: Record<SourceFilterValue, number> = {
      all: data?.posts.length ?? 0,
      reddit: 0,
      hackernews: 0,
      twitter: 0,
    };

    data?.posts.forEach((post) => {
      base[post.source] += 1;
    });

    return base;
  }, [data?.posts]);

  const keywordCounts = useMemo(() => {
    const base = Object.fromEntries(
      ["all", ...LEAD_KEYWORDS].map((keyword) => [keyword, 0]),
    ) as Record<KeywordFilterValue, number>;

    base.all = data?.posts.length ?? 0;

    data?.posts.forEach((post) => {
      LEAD_KEYWORDS.forEach((keyword) => {
        if (postMatchesKeyword(post, keyword)) {
          base[keyword] += 1;
        }
      });
    });

    return base;
  }, [data?.posts]);

  const filteredPosts = useMemo(() => {
    if (!data?.posts) {
      return [];
    }

    return data.posts.filter((post) => {
      const matchesSource =
        sourceFilter === "all" || post.source === sourceFilter;
      const matchesKeyword = postMatchesKeyword(post, keywordFilter);
      return matchesSource && matchesKeyword;
    });
  }, [data?.posts, sourceFilter, keywordFilter]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Rss className="h-6 w-6" />
                <span className="text-sm font-medium uppercase tracking-wide">
                  Startup Feed
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                Development Lead Aggregator
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Intent-based search across Reddit and Hacker News for people
                actively seeking developers, technical co-founders, CTO help, AWS
                support, and MVP builders. Only posts from the last 30 days that
                contain the matched keyword in the title or body are shown.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {data?.sources ? (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {data.sources.map((source) => (
                <span
                  key={source.source}
                  className="rounded-md border bg-background px-3 py-1"
                >
                  {SOURCE_LABELS[source.source as PostSource]}: {source.count}{" "}
                  matches
                  {source.error ? ` (${source.error})` : ""}
                </span>
              ))}
              {data.fetchedAt ? (
                <span className="rounded-md border bg-background px-3 py-1">
                  Updated {new Date(data.fetchedAt).toLocaleTimeString()}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Source
            </p>
            <SourceFilter
              value={sourceFilter}
              onChange={setSourceFilter}
              counts={sourceCounts}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Keyword
            </p>
            <KeywordFilter
              value={keywordFilter}
              onChange={setKeywordFilter}
              counts={keywordCounts}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load posts</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Something went wrong."}
            </AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !isError && filteredPosts.length === 0 ? (
          <Alert>
            <AlertTitle>No matching leads found</AlertTitle>
            <AlertDescription>
              Try another keyword or source filter, or refresh to search again.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </div>
  );
}
