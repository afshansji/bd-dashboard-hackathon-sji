import type { AggregatedPost } from "../types";

/** Only surface posts from the last N days. */
export const MAX_POST_AGE_DAYS = 30;

export function getRecencyCutoffUnix(): number {
  return Math.floor(Date.now() / 1000) - MAX_POST_AGE_DAYS * 24 * 60 * 60;
}

export function isRecentPost(post: AggregatedPost): boolean {
  const ageMs = Date.now() - new Date(post.publishedAt).getTime();
  return ageMs <= MAX_POST_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match hiring intent in the post title (primary) or excerpt.
 * Accepts small gaps between keyword tokens, e.g. "looking for a react developer".
 */
export function matchesKeywordIntent(
  post: AggregatedPost,
  keyword: string,
): boolean {
  const title = post.title.toLowerCase();
  const excerpt = (post.excerpt ?? "").toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();

  if (title.includes(normalizedKeyword) || excerpt.includes(normalizedKeyword)) {
    return true;
  }

  const tokens = normalizedKeyword.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }

  const flexibleTitlePattern = tokens.map(escapeRegex).join("\\s+(?:\\w+\\s+)*");
  const titleRegex = new RegExp(flexibleTitlePattern, "i");

  return titleRegex.test(title);
}

export function buildRedditSearchQuery(keyword: string): string {
  return `title:${keyword}`;
}
