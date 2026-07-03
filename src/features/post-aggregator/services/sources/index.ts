import type { PostSourceFetcher } from "./types";
import { HackerNewsSource } from "./hackernews";
import { RedditSource } from "./reddit";
import { TwitterSource } from "./twitter";

export const postSources: PostSourceFetcher[] = [
  new RedditSource(),
  new HackerNewsSource(),
  new TwitterSource(),
];

export { HackerNewsSource, RedditSource, TwitterSource };
export type { PostSourceFetcher, SourceFetchResult } from "./types";
