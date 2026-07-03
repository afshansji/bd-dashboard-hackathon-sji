import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "what", "which", "who",
  "how", "have", "has", "had", "we", "our", "us", "i", "me", "my",
  "do", "does", "did", "be", "been", "being", "in", "on", "at", "to",
  "for", "of", "and", "or", "with", "about", "built", "build", "project",
  "projects", "repo", "repos", "repository", "repositories",
]);

function extractQueryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function isBoilerplateExcerpt(text: string): boolean {
  const lower = text.toLowerCase();
  const markers = [
    "welcome to your lovable project",
    "how can i edit this code",
    "use lovable",
    "use github codespaces",
    'click the "edit" button',
    "navigate to the desired file",
  ];
  return markers.some((m) => lower.includes(m));
}

function isOverviewQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return ["technolog", "tech stack", "project", "repositor", "overview", "stack"]
    .some((t) => lower.includes(t));
}

function synthesizeAnswerText(
  query: string,
  discovery: { repos: Array<Record<string, unknown>> } | undefined,
  projects: Array<Record<string, unknown>> | undefined,
  citations: Array<{
    sourcePath: string;
    excerpt: string;
  }>,
  confidence = 0,
): string {
  const repos = discovery?.repos ?? [];
  const projs = projects ?? [];
  const filteredCitations = citations.filter((c) => !isBoilerplateExcerpt(c.excerpt));

  if (repos.length === 0 && projs.length === 0 && filteredCitations.length === 0) {
    return "No indexed knowledge matched your query. Register a GitHub repository and run indexing first.";
  }

  if (isOverviewQuery(query) && projs.length > 0) {
    if (repos.length === 1 && projs.length === 1) {
      const repo = repos[0];
      const p = projs[0];
      const stack = ((p.techStack as string[]) ?? []).join(", ");
      const parts = [
        `**${p.name}** is registered and indexed.`,
        stack ? `Technologies include ${stack}.` : "",
        repo.url ? `Repository: ${repo.url}` : "",
      ].filter(Boolean);
      return parts.join(" ");
    }
    const lines = projs.map((p) => {
      const stack = ((p.techStack as string[]) ?? []).join(", ");
      return stack ? `- **${p.name}** (${stack})` : `- **${p.name}**`;
    });
    return `Found ${repos.length} indexed repositories:\n${lines.join("\n")}`;
  }

  const sections: string[] = [];
  if (repos.length > 0) {
    const lines = repos.map((repo) => {
      const status = repo.indexStatus ?? "unknown";
      const url = repo.url ?? "";
      return `• ${repo.name} (${status})${url ? ` — ${url}` : ""}`;
    });
    sections.push(`Repositories (${repos.length}):\n${lines.join("\n")}`);
  }

  if (projs.length > 0) {
    const lines = projs.map((p) => {
      const stack = ((p.techStack as string[]) ?? []).filter(Boolean);
      const parts = [`• ${p.name}`];
      if (stack.length > 0) parts.push(`Tech: ${stack.join(", ")}`);
      return parts.join(" — ");
    });
    sections.push(`Projects (${projs.length}):\n${lines.join("\n\n")}`);
  }

  if (filteredCitations.length > 0 && confidence >= 0.45 && !isOverviewQuery(query)) {
    const excerpts = filteredCitations.map(
      (c, i) => `[${i + 1}] ${c.sourcePath}: ${c.excerpt.slice(0, 200)}`,
    );
    sections.push(`Sources:\n${excerpts.join("\n\n")}`);
  }

  return sections.join("\n\n");
}

const ORG_MEMORY_SYSTEM_INSTRUCTIONS = `You are the SJ Innovation Organizational Memory assistant.

Answer using ONLY the provided context. Ignore Lovable/CakePHP/starter README boilerplate.
Group repos by domain when helpful. Cite excerpts as [1], [2]. Be concise (150-400 words).
Acknowledge when indexed knowledge is thin. No JSON, no preamble — start with the answer.`;

async function synthesizeWithLlmEdge(
  query: string,
  discovery: { repos: Array<Record<string, unknown>> } | undefined,
  projects: Array<Record<string, unknown>> | undefined,
  citations: Array<{
    repositoryId: string;
    sourcePath: string;
    excerpt: string;
  }>,
): Promise<string | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const apiKey = openaiKey || lovableKey;
  if (!apiKey) return null;

  const repos = discovery?.repos ?? [];
  const projs = projects ?? [];
  const filtered = citations.filter((c) => !isBoilerplateExcerpt(c.excerpt));

  const contextParts: string[] = [];
  if (repos.length) {
    contextParts.push(
      "## Repositories\n" +
        repos.map((r) => `- ${r.name}${r.url ? ` (${r.url})` : ""}`).join("\n"),
    );
  }
  if (projs.length) {
    contextParts.push(
      "## Projects\n" +
        projs.map((p) => {
          const stack = ((p.techStack as string[]) ?? []).join(", ");
          const summary = String(p.summary ?? "").slice(0, 300);
          return `- ${p.name}${stack ? ` | tech: ${stack}` : ""}${summary ? ` | ${summary}` : ""}`;
        }).join("\n"),
    );
  }
  if (filtered.length) {
    contextParts.push(
      "## Excerpts\n" +
        filtered.map((c, i) => `[${i + 1}] ${c.sourcePath}\n${c.excerpt.slice(0, 400)}`).join("\n\n"),
    );
  }

  const url = openaiKey
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = Deno.env.get("ORG_MEMORY_LLM_MODEL") ?? "gpt-4o-mini";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          { role: "system", content: ORG_MEMORY_SYSTEM_INSTRUCTIONS },
          {
            role: "user",
            content: `${contextParts.join("\n\n")}\n\n---\n\nUser question: ${query}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function embedText(text: string): Promise<number[] | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const apiKey = openaiKey || lovableKey;
  if (!apiKey) return null;

  const url = openaiKey
    ? "https://api.openai.com/v1/embeddings"
    : "https://ai.gateway.lovable.dev/v1/embeddings";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text, model: "text-embedding-3-small" }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return (data.data?.[0]?.embedding as number[]) ?? null;
}

type ChunkHit = {
  id: string;
  repositoryId: string;
  sourcePath: string;
  excerpt: string;
  score: number;
};

type QueryPayload = {
  query: string;
  capabilities: string[];
  filters?: {
    techStack?: string[];
    industry?: string;
    repoIds?: string[];
    projectIds?: string[];
  };
  options?: {
    maxRepos?: number;
    maxChunks?: number;
    /** When true, vector search runs across all indexed repos before narrowing. */
    searchAllRepos?: boolean;
    /** Skip LLM answer synthesis — use template text only (faster for heavy pipelines). */
    skipLlmSynthesis?: boolean;
  };
};

function aggregateRepoScoresFromChunks(chunks: ChunkHit[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const chunk of chunks) {
    const current = scores.get(chunk.repositoryId) ?? 0;
    if (chunk.score > current) {
      scores.set(chunk.repositoryId, chunk.score);
    }
  }
  return scores;
}

async function fetchVectorChunks(
  client: SupabaseClient,
  embedding: number[],
  options: {
    matchCount: number;
    repoIds?: string[] | null;
    threshold?: number;
  },
): Promise<ChunkHit[]> {
  const { data: hits, error } = await client.rpc("search_org_knowledge_chunks", {
    p_embedding: embedding,
    p_match_count: options.matchCount,
    p_repository_ids: options.repoIds?.length ? options.repoIds : null,
    p_similarity_threshold: options.threshold ?? 0.22,
  });

  if (error || !hits) return [];

  return (hits as Array<{
    id: string;
    repository_id: string;
    source_path: string;
    content: string;
    similarity: number;
  }>).map((h) => ({
    id: h.id,
    repositoryId: h.repository_id,
    sourcePath: h.source_path,
    excerpt: h.content.slice(0, 400),
    score: h.similarity,
  }));
}

export async function runOrgMemoryQueryFallback(
  client: SupabaseClient,
  traceId: string,
  payload: QueryPayload,
) {
  const maxRepos = payload.options?.maxRepos ?? 10;
  const maxChunks = payload.options?.maxChunks ?? 10;
  const searchAllRepos =
    payload.options?.searchAllRepos ??
    !payload.filters?.repoIds?.length;
  const caps = new Set(payload.capabilities);
  const started = Date.now();

  let discovery: { repos: Array<Record<string, unknown>> } | undefined;
  let projects: Array<Record<string, unknown>> | undefined;
  let answer: Record<string, unknown> | undefined;
  let synthesisMode: "llm" | "template" | "none" = "none";
  const candidateRepoIds: string[] = [];

  const needsEmbedding =
    caps.has("knowledge_retrieval") ||
    (caps.has("repository_discovery") && searchAllRepos);
  const embedding = needsEmbedding
    ? await embedText(payload.query)
    : null;

  let globalChunks: ChunkHit[] = [];
  const vectorRepoScores = new Map<string, number>();

  if (
    embedding?.length &&
    caps.has("knowledge_retrieval") &&
    searchAllRepos
  ) {
    globalChunks = await fetchVectorChunks(client, embedding, {
      matchCount: Math.min(60, maxChunks * 4),
      repoIds: null,
      threshold: 0.22,
    });
    for (const [repoId, score] of aggregateRepoScoresFromChunks(globalChunks)) {
      vectorRepoScores.set(repoId, score);
    }
  }

  if (caps.has("repository_discovery")) {
    const terms = extractQueryTerms(payload.query);
    const repoFetchLimit = Math.min(Math.max(maxRepos * 8, 80), 250);
    const vectorRepoIds = [...vectorRepoScores.keys()];

    let repoQuery = client
      .from("org_repositories")
      .select("id, name, url, tags, index_status")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(repoFetchLimit);

    const { data: recentRepos, error } = await repoQuery;
    if (error) throw error;

    let repoRows = recentRepos ?? [];

    if (vectorRepoIds.length > 0) {
      const existingIds = new Set(repoRows.map((r) => r.id as string));
      const missingIds = vectorRepoIds.filter((id) => !existingIds.has(id)).slice(0, 50);
      if (missingIds.length > 0) {
        const { data: vectorRepos, error: vectorRepoError } = await client
          .from("org_repositories")
          .select("id, name, url, tags, index_status")
          .in("id", missingIds);
        if (!vectorRepoError && vectorRepos?.length) {
          repoRows = [...repoRows, ...vectorRepos];
        }
      }
    }

    const scored = repoRows
      .map((repo) => {
        const signals: string[] = [];
        let score =
          repo.index_status === "success"
            ? 0.35
            : repo.index_status === "failed"
            ? 0.1
            : 0.2;

        const haystack = [repo.name, ...(repo.tags ?? [])].join(" ").toLowerCase();

        for (const term of terms) {
          if (haystack.includes(term)) {
            score += 0.2;
            signals.push(term);
          }
        }

        if (payload.filters?.techStack?.length) {
          for (const tech of payload.filters.techStack) {
            const needle = tech.toLowerCase();
            if (haystack.includes(needle)) {
              score += 0.35;
              signals.push(tech);
            }
          }
        }

        if (payload.filters?.industry) {
          const industry = payload.filters.industry.toLowerCase();
          const tags = [...(repo.tags ?? []), repo.name]
            .map((t) => String(t).toLowerCase());
          if (tags.some((t) => t.includes(industry))) {
            score += 0.35;
            signals.push(payload.filters.industry);
          }
        }

        const vectorScore = vectorRepoScores.get(repo.id) ?? 0;
        if (vectorScore > 0) {
          score += vectorScore * 0.65;
          signals.push("semantic_match");
        }

        return {
          id: repo.id,
          name: repo.name,
          url: repo.url,
          indexStatus: repo.index_status,
          score: Math.min(score, 1),
          matchedSignals: [...new Set(signals)],
        };
      })
      .filter((repo) => repo.score >= 0.1 || terms.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRepos);

    discovery = { repos: scored };
    candidateRepoIds.push(...scored.map((r) => r.id));
  }

  if (caps.has("project_understanding")) {
    const projectLimit = Math.min(50, maxRepos * 2);
    let projectQuery = client
      .from("org_projects")
      .select("id, name, summary, tech_stack, domain_tags, profile, repository_id")
      .order("updated_at", { ascending: false })
      .limit(projectLimit);

    if (payload.filters?.projectIds?.length) {
      projectQuery = projectQuery.in("id", payload.filters.projectIds);
    } else if (candidateRepoIds.length > 0) {
      projectQuery = projectQuery.in("repository_id", candidateRepoIds);
    }

    const { data, error } = await projectQuery;
    if (error) throw error;

    projects = (data ?? []).map((row) => {
      const profile = (row.profile ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        name: row.name,
        summary: row.summary ?? (profile.summary as string) ?? "",
        techStack: row.tech_stack ?? (profile.techStack as string[]) ?? [],
        domainTags: row.domain_tags ?? (profile.domainTags as string[]) ?? [],
        keyFeatures: (profile.keyFeatures as string[]) ?? [],
        repositoryId: row.repository_id as string,
      };
    });
  }

  if (caps.has("knowledge_retrieval")) {
    const scopedRepoIds = searchAllRepos
      ? payload.filters?.repoIds
      : candidateRepoIds.length
      ? candidateRepoIds
      : payload.filters?.repoIds;

    let chunks: ChunkHit[] = globalChunks;

    if (chunks.length === 0 && embedding?.length) {
      chunks = await fetchVectorChunks(client, embedding, {
        matchCount: maxChunks,
        repoIds: scopedRepoIds,
        threshold: 0.25,
      });
    }

    if (chunks.length === 0) {
      const terms = extractQueryTerms(payload.query);
      let kw = client
        .from("org_knowledge_chunks")
        .select("id, repository_id, source_path, content")
        .limit(maxChunks);

      if (scopedRepoIds?.length) kw = kw.in("repository_id", scopedRepoIds);
      if (terms.length > 0) {
        kw = kw.or(terms.slice(0, 8).map((t) => `content.ilike.%${t}%`).join(","));
      } else if (scopedRepoIds?.length) {
        kw = kw.order("created_at", { ascending: false });
      }

      const { data: hits, error: kwError } = await kw;
      if (kwError) throw kwError;
      chunks = (hits ?? []).map((h) => ({
        id: h.id,
        repositoryId: h.repository_id,
        sourcePath: h.source_path,
        excerpt: h.content.slice(0, 400),
        score: 0.5,
      }));
    }

    const citations = chunks.slice(0, maxChunks).map((c) => ({
      chunkId: c.id,
      repositoryId: c.repositoryId,
      sourcePath: c.sourcePath,
      excerpt: c.excerpt,
    }));

    const filteredCitations = citations.filter(
      (c) => !isBoilerplateExcerpt(c.excerpt),
    );

    const registeredCount = discovery?.repos?.length ?? 0;
    const indexedCount =
      discovery?.repos?.filter((r) => r.indexStatus === "success").length ?? 0;
    const hasStructuredContext =
      (projects?.length ?? 0) > 0 || indexedCount > 0;

    const avg = chunks.length
      ? chunks.reduce((s, c) => s + c.score, 0) / chunks.length
      : hasStructuredContext
      ? 0.55
      : 0;

    let answerText: string;
    let answerSynthesis: "llm" | "template" = "template";
    if (chunks.length === 0 && !hasStructuredContext) {
      answerText = registeredCount > 0
        ? "Repositories are registered but not indexed yet. Click Index on each repo (with org-memory service running on :3100), then search again."
        : "No indexed knowledge matched your query. Register a GitHub repository and run indexing first.";
    } else if (payload.options?.skipLlmSynthesis) {
      answerText = synthesizeAnswerText(
        payload.query,
        discovery,
        projects,
        filteredCitations,
        avg,
      );
    } else {
      const llmText = await synthesizeWithLlmEdge(
        payload.query,
        discovery,
        projects,
        filteredCitations,
      );
      if (llmText) {
        answerText = llmText;
        answerSynthesis = "llm";
      } else {
        answerText = synthesizeAnswerText(
          payload.query,
          discovery,
          projects,
          filteredCitations,
          avg,
        );
      }
    }

    answer = {
      text: answerText,
      citations: filteredCitations,
      confidence: chunks.length || hasStructuredContext
        ? Math.min(Math.max(avg, answerSynthesis === "llm" ? 0.55 : 0.3), 0.95)
        : 0,
    };
    synthesisMode = answerSynthesis;
  }

  return {
    traceId,
    capabilities: payload.capabilities,
    executionPlan: payload.capabilities,
    discovery,
    projects,
    answer,
    telemetry: {
      totalMs: Date.now() - started,
      workflows: payload.capabilities.map((id) => ({ id, ms: 0 })),
      nodes: [{ node: "edge_fallback", ms: Date.now() - started }],
    },
    status: "completed",
    mode: "edge_fallback",
    synthesisMode,
  };
}
