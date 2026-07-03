import assert from "node:assert/strict";
import test from "node:test";
import { chunkText, extractQueryTerms } from "../chunker.js";
import { parseGitHubUrl } from "../github.js";

test("parseGitHubUrl extracts owner and repo", () => {
  const ref = parseGitHubUrl("https://github.com/octocat/Hello-World");
  assert.deepEqual(ref, { owner: "octocat", repo: "Hello-World" });
});

test("chunkText splits long content", () => {
  const text = "a".repeat(5000);
  const chunks = chunkText(text, 1000, 100);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((c) => c.length <= 1000));
});

test("extractQueryTerms filters stop words", () => {
  const terms = extractQueryTerms("What React Supabase projects have we built?");
  assert.ok(terms.includes("react"));
  assert.ok(terms.includes("supabase"));
});
