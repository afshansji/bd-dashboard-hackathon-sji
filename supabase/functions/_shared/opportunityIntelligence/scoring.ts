import { computeCapabilityTechnologyScore } from "./capabilityOntology.ts";
import type {
  JobSignals,
  OpportunityAnalysisResult,
  OpportunityRecommendation,
  OpportunityScoreBreakdown,
  OrgCitationEvidence,
  OrgProjectEvidence,
  OrgRepoEvidence,
  ProjectSimilarityScore,
  ScoreComponent,
} from "./types.ts";

const WEIGHTS = {
  technology_match: 0.5,
  project_similarity: 0.1,
  domain_match: 0.25,
  risk: 0.15,
} as const;

const PURSUE_THRESHOLD = 75;
const REVIEW_THRESHOLD = 45;

function computeTechnologyMatch(
  jobTechnologies: string[],
  projects: OrgProjectEvidence[],
  repos: OrgRepoEvidence[],
  citations: OrgCitationEvidence[],
): ScoreComponent & { matched: string[]; missing: string[] } {
  const result = computeCapabilityTechnologyScore(
    jobTechnologies,
    projects,
    repos,
    citations,
  );

  return {
    score: result.score,
    reason: result.reason,
    matched: result.matched,
    missing: result.missing,
  };
}

function computeDomainMatch(
  signals: JobSignals,
  projects: OrgProjectEvidence[],
): ScoreComponent & { matchedDomains: string[] } {
  const orgDomains = projects.flatMap((project) => project.domainTags);
  if (orgDomains.length === 0) {
    return {
      score: signals.domain ? 20 : 35,
      reason: signals.domain
        ? `Job appears to be in ${signals.domain}, but no indexed domain tags were found.`
        : "No domain tags found in indexed project profiles.",
      matchedDomains: [],
    };
  }

  const haystack = [
    signals.domain ?? "",
    ...signals.features,
    ...signals.technologies,
  ].join(" ").toLowerCase();

  const matchedDomains = orgDomains.filter((domain) => {
    const token = domain.toLowerCase();
    return haystack.includes(token) || token.split(/\s+/).some((part) => haystack.includes(part));
  });

  const uniqueMatched = [...new Set(matchedDomains)];
  const score = uniqueMatched.length > 0
    ? Math.min(100, 55 + uniqueMatched.length * 15)
    : signals.domain
    ? 25
    : 40;

  return {
    score,
    reason: uniqueMatched.length > 0
      ? `Previous ${uniqueMatched.slice(0, 4).join(", ")} projects detected.`
      : signals.domain
      ? `Job domain (${signals.domain}) did not match indexed domain tags.`
      : "Limited domain overlap with indexed project profiles.",
    matchedDomains: uniqueMatched,
  };
}

function termOverlapScore(textA: string, textB: string): number {
  const termsA = new Set(
    textA.toLowerCase().split(/[^a-z0-9+#.-]+/).filter((term) => term.length >= 3),
  );
  const termsB = new Set(
    textB.toLowerCase().split(/[^a-z0-9+#.-]+/).filter((term) => term.length >= 3),
  );
  if (termsA.size === 0 || termsB.size === 0) return 0;
  let overlap = 0;
  for (const term of termsA) {
    if (termsB.has(term)) overlap += 1;
  }
  return overlap / Math.max(termsA.size, termsB.size);
}

function computeProjectSimilarity(
  jobTitle: string,
  jobDescription: string,
  signals: JobSignals,
  projects: OrgProjectEvidence[],
): ProjectSimilarityScore {
  if (projects.length === 0) {
    return {
      score: 0,
      reason: "No similar internal projects found in indexed organizational memory.",
      projects: [],
    };
  }

  const jobText = [jobTitle, jobDescription, ...signals.features, ...signals.technologies]
    .join(" ");

  const ranked = projects
    .map((project) => {
      const projectText = [
        project.name,
        project.summary,
        ...project.techStack,
        ...project.domainTags,
        ...project.keyFeatures,
      ].join(" ");
      return {
        project,
        overlap: termOverlapScore(jobText, projectText),
      };
    })
    .sort((a, b) => b.overlap - a.overlap);

  const top = ranked.filter((item) => item.overlap > 0).slice(0, 8);
  const topNames = top.map((item) => item.project.name);
  const bestOverlap = top[0]?.overlap ?? 0;
  const score = Math.round(Math.min(100, bestOverlap * 100 + top.length * 8));

  return {
    score,
    reason: topNames.length > 0
      ? `Closest matches: ${topNames.join(", ")}.`
      : "Indexed projects exist, but similarity to this job is weak.",
    projects: topNames,
  };
}

function computeRisk(
  missingTechnologies: string[],
  hasIndexedKnowledge: boolean,
): ScoreComponent & { items: string[] } {
  const items: string[] = [];
  if (!hasIndexedKnowledge) {
    items.push("No supporting evidence found in Organizational Memory.");
  }
  for (const tech of missingTechnologies.slice(0, 6)) {
    items.push(`${tech} capability not evidenced in indexed repositories.`);
  }
  if (items.length === 0) {
    return {
      score: 100,
      reason: "No major capability gaps detected from indexed knowledge.",
      items: [],
    };
  }
  const penalty = Math.min(90, items.length * 18);
  return {
    score: Math.max(10, 100 - penalty),
    reason: items.slice(0, 3).join(" "),
    items,
  };
}

export function resolveRecommendation(confidence: number): OpportunityRecommendation {
  if (confidence >= PURSUE_THRESHOLD) return "PURSUE";
  if (confidence >= REVIEW_THRESHOLD) return "REVIEW";
  return "IGNORE";
}

export function computeOpportunityScores(input: {
  jobTitle: string;
  jobDescription: string;
  signals: JobSignals;
  projects: OrgProjectEvidence[];
  repos: OrgRepoEvidence[];
  citations: OrgCitationEvidence[];
}): {
  breakdown: OpportunityScoreBreakdown;
  confidence: number;
  recommendation: OpportunityRecommendation;
  evidenceNote: string | null;
} {
  const hasIndexedKnowledge =
    input.projects.length > 0 ||
    input.repos.some((repo) => repo.indexStatus === "success") ||
    input.citations.length > 0;

  const technology = computeTechnologyMatch(
    input.signals.technologies,
    input.projects,
    input.repos,
    input.citations,
  );
  const domain = computeDomainMatch(input.signals, input.projects);
  const projectSimilarity = computeProjectSimilarity(
    input.jobTitle,
    input.jobDescription,
    input.signals,
    input.projects,
  );
  const risk = computeRisk(technology.missing, hasIndexedKnowledge);

  let confidence = Math.round(
    technology.score * WEIGHTS.technology_match +
      projectSimilarity.score * WEIGHTS.project_similarity +
      domain.score * WEIGHTS.domain_match +
      risk.score * WEIGHTS.risk,
  );

  let evidenceNote: string | null = null;
  if (!hasIndexedKnowledge) {
    confidence = Math.min(confidence, 35);
    evidenceNote =
      "Organizational Memory returned no indexed evidence. Recommendation is based on limited data.";
  } else if (
    input.signals.technologies.length > 0 &&
    technology.score < 40
  ) {
    confidence = Math.min(confidence, 55);
  }

  confidence = Math.max(0, Math.min(100, confidence));

  const breakdown: OpportunityScoreBreakdown = {
    technology_match: {
      score: technology.score,
      reason: technology.reason,
    },
    domain_match: {
      score: domain.score,
      reason: domain.reason,
    },
    project_similarity: projectSimilarity,
    risk: {
      score: risk.score,
      reason: risk.reason,
      items: risk.items,
    },
    weights: { ...WEIGHTS },
  };

  return {
    breakdown,
    confidence,
    recommendation: resolveRecommendation(confidence),
    evidenceNote,
  };
}

export function buildAnalysisResult(input: {
  jobTitle: string;
  jobDescription: string;
  signals: JobSignals;
  projects: OrgProjectEvidence[];
  repos: OrgRepoEvidence[];
  citations: OrgCitationEvidence[];
  summary: string;
}): OpportunityAnalysisResult {
  const scored = computeOpportunityScores({
    jobTitle: input.jobTitle,
    jobDescription: input.jobDescription,
    signals: input.signals,
    projects: input.projects,
    repos: input.repos,
    citations: input.citations,
  });

  return {
    recommendation: scored.recommendation,
    confidence: scored.confidence,
    reasoning: {
      technology_match: scored.breakdown.technology_match,
      domain_match: scored.breakdown.domain_match,
      project_similarity: scored.breakdown.project_similarity,
      risk: scored.breakdown.risk.items,
    },
    summary: input.summary,
    jobSignals: input.signals,
    supportingRepositories: input.repos.slice(0, 15),
    citations: input.citations,
    evidenceNote: scored.evidenceNote,
  };
}

export function buildTemplateSummary(
  recommendation: OpportunityRecommendation,
  breakdown: OpportunityScoreBreakdown,
): string {
  if (recommendation === "PURSUE") {
    return `Strong capability fit. ${breakdown.technology_match.reason}`;
  }
  if (recommendation === "REVIEW") {
    return `Mixed capability fit. ${breakdown.technology_match.reason} ${breakdown.risk.items[0] ?? "Manual review recommended."}`;
  }
  return `Weak capability fit. ${breakdown.risk.items[0] ?? breakdown.technology_match.reason}`;
}
