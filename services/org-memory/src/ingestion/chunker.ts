import { createHash } from "node:crypto";

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function chunkText(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      const breakAt = normalized.lastIndexOf("\n\n", end);
      if (breakAt > start + chunkSize / 2) {
        end = breakAt;
      }
    }

    const slice = normalized.slice(start, end).trim();
    if (slice) chunks.push(slice);

    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

export function extractQueryTerms(query: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "what", "which", "who",
    "how", "have", "has", "had", "we", "our", "us", "i", "me", "my",
    "do", "does", "did", "be", "been", "being", "in", "on", "at", "to",
    "for", "of", "and", "or", "with", "about", "built", "build", "project",
    "projects", "repo", "repos", "repository", "repositories",
  ]);

  return query
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !stopWords.has(t));
}
