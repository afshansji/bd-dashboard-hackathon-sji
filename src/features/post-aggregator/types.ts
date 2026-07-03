export type PostSource = "reddit" | "hackernews" | "twitter";

export interface AggregatedPost {
  id: string;
  source: PostSource;
  title: string;
  author: string;
  url: string;
  publishedAt: string;
  matchedKeyword: string;
  excerpt?: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface AggregatedPostsResponse {
  posts: AggregatedPost[];
  fetchedAt: string;
  sources: {
    source: PostSource;
    count: number;
    error?: string;
  }[];
}
