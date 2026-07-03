import type { AggregatedPost, PostSource } from "../../types";

export interface SourceFetchResult {
  source: PostSource;
  posts: AggregatedPost[];
  error?: string;
}

export interface PostSourceFetcher {
  readonly source: PostSource;
  fetchPosts(): Promise<SourceFetchResult>;
}
