import type { PostSourceFetcher, SourceFetchResult } from "./types";

/**
 * Placeholder for Twitter/X integration.
 * Requires API credentials (Bearer token) — implement fetchPosts() when ready.
 */
export class TwitterSource implements PostSourceFetcher {
  readonly source = "twitter" as const;

  async fetchPosts(): Promise<SourceFetchResult> {
    return {
      source: this.source,
      posts: [],
      error: "Twitter/X integration not configured yet",
    };
  }
}
