import type { AggregatedPost } from "../../types";
import {
  buildRedditSearchQuery,
  getRecencyCutoffUnix,
  matchesKeywordIntent,
} from "../filters";
import { LEAD_KEYWORDS } from "../keywords";
import type { PostSourceFetcher, SourceFetchResult } from "./types";

const SUBREDDITS = [
  "forhire",
  "startups",
  "entrepreneur",
  "cofounder",
  "SaaS",
  "webdev",
  "startup",
  "sideproject",
];

const SUBREDDIT_PATH = SUBREDDITS.join("+");
const USER_AGENT = "web:startup-post-aggregator:1.0.0 (by /u/startupfeed)";

interface RedditListingChild {
  data: {
    id: string;
    title: string;
    author: string;
    url: string;
    permalink: string;
    created_utc: number;
    selftext?: string;
    subreddit: string;
    score: number;
    num_comments: number;
    link_flair_text?: string | null;
    is_self: boolean;
  };
}

interface RedditListingResponse {
  data?: {
    children?: RedditListingChild[];
  };
}

interface PullPushSubmission {
  id: string;
  title: string;
  author: string;
  url: string;
  permalink: string;
  created_utc: number;
  selftext?: string;
  subreddit: string;
  score: number;
  num_comments: number;
  link_flair_text?: string | null;
  is_self: boolean;
}

interface PullPushResponse {
  data?: PullPushSubmission[];
}

function normalizeRedditSubmission(
  data: RedditListingChild["data"] | PullPushSubmission,
  matchedKeyword: string,
): AggregatedPost {
  const discussionUrl = data.permalink.startsWith("http")
    ? data.permalink
    : `https://www.reddit.com${data.permalink}`;

  return {
    id: `reddit-${data.id}`,
    source: "reddit",
    title: data.title,
    author: data.author,
    url: data.is_self ? discussionUrl : data.url,
    publishedAt: new Date(data.created_utc * 1000).toISOString(),
    matchedKeyword,
    excerpt: data.selftext?.slice(0, 280) || undefined,
    metadata: {
      subreddit: data.subreddit,
      score: data.score,
      comments: data.num_comments,
      flair: data.link_flair_text ?? null,
      discussionUrl,
      matchedKeywords: matchedKeyword,
    },
  };
}

function filterRedditResults(
  posts: AggregatedPost[],
  keyword: string,
): AggregatedPost[] {
  const cutoffUnix = getRecencyCutoffUnix();

  return posts.filter((post) => {
    const createdUnix = Math.floor(new Date(post.publishedAt).getTime() / 1000);
    return createdUnix >= cutoffUnix && matchesKeywordIntent(post, keyword);
  });
}

async function fetchFromRedditSearch(
  keyword: string,
): Promise<AggregatedPost[]> {
  const params = new URLSearchParams({
    q: buildRedditSearchQuery(keyword),
    restrict_sr: "on",
    sort: "new",
    limit: "25",
  });
  const url = `https://www.reddit.com/r/${SUBREDDIT_PATH}/search.json?${params}`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Reddit API returned ${response.status}`);
  }

  const payload = (await response.json()) as RedditListingResponse;
  const posts =
    payload.data?.children?.map((child) =>
      normalizeRedditSubmission(child.data, keyword),
    ) ?? [];

  return filterRedditResults(posts, keyword);
}

async function fetchFromPullPushSearch(
  keyword: string,
): Promise<AggregatedPost[]> {
  const cutoffUnix = getRecencyCutoffUnix();
  const titleQuery = `"${keyword}"`;

  const results = await Promise.all(
    SUBREDDITS.map(async (subreddit) => {
      const params = new URLSearchParams({
        q: titleQuery,
        subreddit,
        size: "25",
        sort: "desc",
        sort_type: "created_utc",
        after: String(cutoffUnix),
      });
      const url = `https://api.pullpush.io/reddit/search/submission/?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        return [] as AggregatedPost[];
      }

      const payload = (await response.json()) as PullPushResponse;
      const posts =
        payload.data?.map((item) =>
          normalizeRedditSubmission(item, keyword),
        ) ?? [];

      return filterRedditResults(posts, keyword);
    }),
  );

  return results.flat();
}

async function searchByKeyword(keyword: string): Promise<AggregatedPost[]> {
  try {
    const liveResults = await fetchFromRedditSearch(keyword);
    if (liveResults.length > 0) {
      return liveResults;
    }
  } catch {
    // Fall through to archive search.
  }

  return fetchFromPullPushSearch(keyword);
}

export class RedditSource implements PostSourceFetcher {
  readonly source = "reddit" as const;

  async fetchPosts(): Promise<SourceFetchResult> {
    try {
      const results = await Promise.all(
        LEAD_KEYWORDS.map((keyword) => searchByKeyword(keyword)),
      );
      const posts = results.flat();

      return {
        source: this.source,
        posts,
        ...(posts.length === 0
          ? {
              error:
                "No recent Reddit matches (live API blocked; archive has no posts within 30 days)",
            }
          : {}),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch Reddit posts";
      return { source: this.source, posts: [], error: message };
    }
  }
}
