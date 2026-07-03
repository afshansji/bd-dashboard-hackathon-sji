import type { AggregatedPost, AggregatedPostsResponse } from "../types";
import { isRecentPost, matchesKeywordIntent } from "./filters";
import { dedupePosts } from "./dedupePosts";
import { postSources } from "./sources";

function sortByRecency(posts: AggregatedPost[]): AggregatedPost[] {
  return [...posts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

function filterLeadPosts(posts: AggregatedPost[]): AggregatedPost[] {
  return posts.filter(
    (post) => isRecentPost(post) && matchesKeywordIntent(post, post.matchedKeyword),
  );
}

export async function aggregatePosts(): Promise<AggregatedPostsResponse> {
  const results = await Promise.all(
    postSources.map((source) => source.fetchPosts()),
  );

  const posts = sortByRecency(
    filterLeadPosts(dedupePosts(results.flatMap((result) => result.posts))),
  );

  const countBySource = posts.reduce(
    (acc, post) => {
      acc[post.source] = (acc[post.source] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    posts,
    fetchedAt: new Date().toISOString(),
    sources: results.map((result) => ({
      source: result.source,
      count: countBySource[result.source] ?? 0,
      ...(result.error ? { error: result.error } : {}),
    })),
  };
}
