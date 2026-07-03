import type { AggregatedPost } from "../types";

export function dedupePosts(posts: AggregatedPost[]): AggregatedPost[] {
  const seen = new Map<string, AggregatedPost>();

  for (const post of posts) {
    const existing = seen.get(post.id);

    if (!existing) {
      seen.set(post.id, post);
      continue;
    }

    const existingKeywords = getMatchedKeywords(existing);
    const nextKeywords = getMatchedKeywords(post);
    const mergedKeywords = [...new Set([...existingKeywords, ...nextKeywords])];

    seen.set(post.id, {
      ...existing,
      matchedKeyword: mergedKeywords[0],
      metadata: {
        ...existing.metadata,
        matchedKeywords: mergedKeywords.join(", "),
      },
    });
  }

  return Array.from(seen.values());
}

function getMatchedKeywords(post: AggregatedPost): string[] {
  const fromMetadata = post.metadata.matchedKeywords;

  if (typeof fromMetadata === "string" && fromMetadata.length > 0) {
    return fromMetadata.split(", ");
  }

  return [post.matchedKeyword];
}
