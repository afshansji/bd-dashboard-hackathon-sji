import type { AggregatedPost } from "../../types";
import {
  getRecencyCutoffUnix,
  matchesKeywordIntent,
} from "../filters";
import { LEAD_KEYWORDS } from "../keywords";
import type { PostSourceFetcher, SourceFetchResult } from "./types";

interface HNAlgoliaHit {
  objectID: string;
  title: string | null;
  author: string;
  url?: string | null;
  story_url?: string | null;
  created_at_i: number;
  points: number;
  num_comments: number;
  story_text?: string | null;
}

interface HNAlgoliaResponse {
  hits?: HNAlgoliaHit[];
}

function normalizeHNPost(
  hit: HNAlgoliaHit,
  matchedKeyword: string,
): AggregatedPost | null {
  if (!hit.title) {
    return null;
  }

  const discussionUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
  const externalUrl = hit.url || hit.story_url || discussionUrl;

  return {
    id: `hackernews-${hit.objectID}`,
    source: "hackernews",
    title: hit.title,
    author: hit.author,
    url: externalUrl,
    publishedAt: new Date(hit.created_at_i * 1000).toISOString(),
    matchedKeyword,
    excerpt: hit.story_text?.slice(0, 280) || undefined,
    metadata: {
      points: hit.points,
      comments: hit.num_comments,
      discussionUrl,
      matchedKeywords: matchedKeyword,
    },
  };
}

async function searchByKeyword(keyword: string): Promise<AggregatedPost[]> {
  const cutoffUnix = getRecencyCutoffUnix();
  const params = new URLSearchParams({
    query: keyword,
    tags: "story",
    hitsPerPage: "25",
    numericFilters: `created_at_i>${cutoffUnix}`,
  });
  const url = `https://hn.algolia.com/api/v1/search?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Hacker News API returned ${response.status}`);
  }

  const payload = (await response.json()) as HNAlgoliaResponse;
  return (
    payload.hits
      ?.map((hit) => normalizeHNPost(hit, keyword))
      .filter((post): post is AggregatedPost => post !== null)
      .filter((post) => matchesKeywordIntent(post, keyword)) ?? []
  );
}

export class HackerNewsSource implements PostSourceFetcher {
  readonly source = "hackernews" as const;

  async fetchPosts(): Promise<SourceFetchResult> {
    try {
      const results = await Promise.all(
        LEAD_KEYWORDS.map((keyword) => searchByKeyword(keyword)),
      );

      return { source: this.source, posts: results.flat() };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch Hacker News posts";
      return { source: this.source, posts: [], error: message };
    }
  }
}
