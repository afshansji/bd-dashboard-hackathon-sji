import type {
  JobSignals,
  OpportunityAnalysisResult,
  OpportunityScoreBreakdown,
  OrgCitationEvidence,
  OrgProjectEvidence,
  OrgRepoEvidence,
} from "./types.ts";

const EXPLANATION_SYSTEM = `You are an Opportunity Intelligence analyst for SJ Innovation.

You explain whether a company should pursue an Upwork job opportunity.

Rules:
- Use ONLY the provided job signals and organizational evidence.
- Do NOT invent projects, technologies, or experience.
- Do NOT change the recommendation or scores — they are already computed.
- If evidence is missing, say so explicitly.
- Return valid JSON only with keys: summary, technology_reason, domain_reason, project_reason.
- Keep each reason to 1-2 sentences. Summary should be 1-2 sentences.`;

interface ExplanationPayload {
  summary: string;
  technology_reason: string;
  domain_reason: string;
  project_reason: string;
}

export async function generateExplanation(input: {
  jobTitle: string;
  signals: JobSignals;
  breakdown: OpportunityScoreBreakdown;
  recommendation: string;
  confidence: number;
  projects: OrgProjectEvidence[];
  repos: OrgRepoEvidence[];
  citations: OrgCitationEvidence[];
  evidenceNote: string | null;
}): Promise<ExplanationPayload | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const apiKey = openaiKey || lovableKey;
  if (!apiKey) return null;

  const url = openaiKey
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = Deno.env.get("ORG_MEMORY_LLM_MODEL") ?? "gpt-4o-mini";

  const context = {
    jobTitle: input.jobTitle,
    jobSignals: input.signals,
    recommendation: input.recommendation,
    confidence: input.confidence,
    scores: input.breakdown,
    projects: input.projects.map((project) => ({
      name: project.name,
      summary: project.summary,
      techStack: project.techStack,
      domainTags: project.domainTags,
    })),
    repositories: input.repos.map((repo) => ({
      name: repo.name,
      url: repo.url,
      indexStatus: repo.indexStatus,
    })),
    citations: input.citations.map((citation) => ({
      sourcePath: citation.sourcePath,
      excerpt: citation.excerpt.slice(0, 250),
    })),
    evidenceNote: input.evidenceNote,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: EXPLANATION_SYSTEM },
          {
            role: "user",
            content: `Explain this opportunity analysis using only the evidence below:\n${JSON.stringify(context, null, 2)}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return JSON.parse(content) as ExplanationPayload;
  } catch {
    return null;
  }
}

export function applyExplanationToAnalysis(
  analysis: OpportunityAnalysisResult,
  breakdown: OpportunityScoreBreakdown,
  explanation: ExplanationPayload | null,
): OpportunityAnalysisResult {
  if (!explanation) return analysis;

  return {
    ...analysis,
    summary: explanation.summary || analysis.summary,
    reasoning: {
      ...analysis.reasoning,
      technology_match: {
        score: breakdown.technology_match.score,
        reason: explanation.technology_reason || breakdown.technology_match.reason,
      },
      domain_match: {
        score: breakdown.domain_match.score,
        reason: explanation.domain_reason || breakdown.domain_match.reason,
      },
      project_similarity: {
        score: breakdown.project_similarity.score,
        reason: explanation.project_reason || breakdown.project_similarity.reason,
        projects: breakdown.project_similarity.projects,
      },
    },
  };
}
