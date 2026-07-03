import type {
  Citation,
  ProjectProfile,
  RepoRef,
} from "../graph/types.js";
import { isBoilerplateExcerpt, synthesizeAnswerText } from "./answer-synthesis.js";

export const ORG_MEMORY_SYSTEM_INSTRUCTIONS = `You are the SJ Innovation Organizational Memory assistant.

Your job is to answer questions about the company's registered GitHub repositories and indexed project knowledge.

## Rules (always follow)

1. **Ground every claim** in the provided context only. Never invent repos, technologies, clients, or features.
2. **Ignore boilerplate** in summaries and excerpts: Lovable setup instructions, generic CakePHP/React starter text, "how to edit this code", clone/push steps, and similar template README content.
3. **Prefer substance**: product purpose, domain (healthcare, CRM, education, etc.), tech stack, integrations, and capabilities mentioned in real project docs.
4. **Be concise** for broad overview questions; use short paragraphs or bullet lists. Aim for 150–400 words unless the question needs depth.
5. **Cite sources** when using specific facts from excerpts. Use inline markers like [1], [2] matching the excerpt numbers in context.
6. **Acknowledge gaps** when context is thin (e.g. "only README indexed", "tech stack not detected"). Do not guess.
7. **Group logically** when many repos are listed — by product line, domain, or stack when patterns are visible.
8. **Do not** repeat the full repo list mechanically unless the user asked for a complete inventory.

## Output format

- Plain text (markdown allowed: **bold**, bullets, short headers).
- No JSON, no tool calls, no preamble like "Based on the context provided".
- Start directly with the answer.`;

function cleanSummaryForLlm(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed || isBoilerplateExcerpt(trimmed)) return "";
  if (/cakephp application skeleton/i.test(trimmed)) return "";
  if (/todo: document your project/i.test(trimmed)) return "";
  return trimmed.slice(0, 400);
}

function buildContextBlock(params: {
  repos: RepoRef[];
  projects: ProjectProfile[];
  citations: Citation[];
}): string {
  const sections: string[] = [];

  if (params.repos.length > 0) {
    const lines = params.repos.map((r) => {
      const parts = [`- ${r.name}`];
      if (r.url) parts.push(`url: ${r.url}`);
      if (r.matchedSignals?.length) {
        parts.push(`signals: ${r.matchedSignals.join(", ")}`);
      }
      return parts.join(" | ");
    });
    sections.push(`## Registered repositories (${params.repos.length})\n${lines.join("\n")}`);
  }

  if (params.projects.length > 0) {
    const lines = params.projects.map((p) => {
      const stack = p.techStack.filter(Boolean).join(", ");
      const summary = cleanSummaryForLlm(p.summary);
      const parts = [`- ${p.name}`];
      if (stack) parts.push(`tech: ${stack}`);
      if (p.domainTags.length) parts.push(`domains: ${p.domainTags.join(", ")}`);
      if (summary) parts.push(`summary: ${summary}`);
      return parts.join(" | ");
    });
    sections.push(`## Project profiles (${params.projects.length})\n${lines.join("\n")}`);
  }

  const usefulCitations = params.citations.filter(
    (c) => !isBoilerplateExcerpt(c.excerpt),
  );
  if (usefulCitations.length > 0) {
    const lines = usefulCitations.map((c, i) => {
      const repo = params.repos.find((r) => r.id === c.repositoryId);
      return `[${i + 1}] ${repo?.name ?? c.repositoryId} / ${c.sourcePath}\n${c.excerpt.slice(0, 500)}`;
    });
    sections.push(`## Indexed excerpts\n${lines.join("\n\n")}`);
  }

  return sections.join("\n\n");
}

function resolveChatConfig(): { apiKey: string; url: string } | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  const apiKey = openaiKey || lovableKey;
  if (!apiKey) return null;

  const url = openaiKey
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";

  return { apiKey, url };
}

export async function synthesizeAnswerWithLlm(params: {
  query: string;
  repos?: RepoRef[];
  projects?: ProjectProfile[];
  citations?: Citation[];
  confidence?: number;
}): Promise<{ text: string; mode: "llm" | "template" }> {
  const repos = params.repos ?? [];
  const projects = params.projects ?? [];
  const citations = (params.citations ?? []).filter(
    (c) => !isBoilerplateExcerpt(c.excerpt),
  );

  const fallback = () => ({
    text: synthesizeAnswerText({
      query: params.query,
      repos,
      projects,
      citations,
      confidence: params.confidence,
    }),
    mode: "template" as const,
  });

  if (repos.length === 0 && projects.length === 0 && citations.length === 0) {
    return {
      text: "No indexed knowledge matched your query. Register a GitHub repository and run indexing first.",
      mode: "template",
    };
  }

  const chat = resolveChatConfig();
  if (!chat) return fallback();

  const context = buildContextBlock({ repos, projects, citations });
  const model = process.env.ORG_MEMORY_LLM_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch(chat.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chat.apiKey}`,
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
            content: `${context}\n\n---\n\nUser question: ${params.query}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("LLM synthesis failed:", res.status, await res.text());
      return fallback();
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return fallback();

    return { text, mode: "llm" };
  } catch (error) {
    console.warn("LLM synthesis error:", error);
    return fallback();
  }
}
