import type {
  JobSignals,
  OpportunityRecommendation,
  OpportunityScoreBreakdown,
  OrgCitationEvidence,
  OrgProjectEvidence,
  OrgRepoEvidence,
  UpworkJobRow,
} from "./types.ts";
import type {
  BusinessRecommendation,
  CapabilityAssessmentRow,
  CapabilityEvidenceItem,
  ComplexityLevel,
  DeliveryAssessment,
  DeliveryLevel,
  OpportunityBreakdown,
  OpportunityIntelligenceReport,
  RequiredCapability,
  SkillGapAnalysis,
  SkillGapItem,
  SupportingProjectEvidence,
} from "./reportTypes.ts";

import {
  assessOrgCapability,
  buildOrgCapabilityIndex,
  toCapabilityCoverageRows,
} from "./capabilityOntology.ts";
import { extractRequiredCapabilities } from "./jobExtraction.ts";
import { formatClassificationLabel } from "./repositoryClassification.ts";

function buildOpportunityBreakdown(
  job: UpworkJobRow,
  signals: JobSignals,
): OpportunityBreakdown {
  return {
    projectType: job.job_type,
    industry: signals.domain,
    requiredTechnologies: signals.technologies,
    budget: signals.budget,
    timeline: signals.timeline,
    clientCountry: job.client_country ?? null,
    requiredExperience: job.experience_level,
    seniority: job.experience_level,
  };
}

function buildCapabilityEvidence(
  assessment: CapabilityAssessmentRow[],
): CapabilityEvidenceItem[] {
  return assessment
    .filter((row) => row.repositoryCount > 0 || row.matchedEvidence.length > 0)
    .map((row) => {
      const supportingProjects: SupportingProjectEvidence[] = row.contributingRepos
        .map((repo) => ({
          repositoryId: repo.repositoryId,
          repositoryName: repo.repositoryName,
          repositoryUrl: repo.repositoryUrl,
          classification: repo.classification,
          classificationLabel: formatClassificationLabel(repo.classification),
          qualityWeight: repo.qualityWeight,
          relevantBecause: repo.relevantBecause,
          notRelevant: repo.notRelevant,
          matchingTechnologies: repo.matchingTechnologies,
        }));

      return {
        capabilityKey: row.capabilityKey,
        label: row.label,
        coverage: row.level,
        coverageLabel: row.coverageLabel,
        coverageScore: row.coverage,
        repositoryCount: row.repositoryCount,
        evidenceLabels: row.matchedEvidence.slice(0, 8),
        supportingProjects,
        repositories: row.contributingRepos,
      };
    });
}

function buildSkillGapAnalysis(
  assessment: CapabilityAssessmentRow[],
): SkillGapAnalysis {
  const toItem = (row: CapabilityAssessmentRow): SkillGapItem => ({
    label: row.label,
    reason: row.reason,
  });

  return {
    strong: assessment
      .filter((row) => row.level === "strong")
      .sort((a, b) => b.coverage - a.coverage)
      .map(toItem),
    moderate: assessment
      .filter((row) => row.level === "moderate")
      .map(toItem),
    weak: assessment
      .filter((row) => row.level === "weak" || row.level === "none" || row.level === "unknown")
      .map(toItem),
  };
}

function buildEngineeringComplexity(
  job: UpworkJobRow,
  signals: JobSignals,
): { level: ComplexityLevel; reasons: string[] } {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const reasons: string[] = [];
  const markers: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /\bintegration(s)?\b/, label: "Multiple integrations" },
    { pattern: /\bbackground\b|\bworker(s)?\b|\bqueue(s)?\b/, label: "Background workers" },
    { pattern: /\bpayment(s)?\b|\bstripe\b|\bbilling\b/, label: "Financial workflows" },
    { pattern: /\breal[- ]time\b|\bstreaming\b|\bwebsocket\b/, label: "Real-time systems" },
    { pattern: /\bevent[- ]driven\b|\bwebhook(s)?\b/, label: "Event processing" },
    { pattern: /\bmulti[- ]agent\b|\brag\b|\bllm\b/, label: "AI system complexity" },
    { pattern: /\bmobile\b|\bios\b|\bandroid\b/, label: "Cross-platform delivery" },
  ];

  for (const marker of markers) {
    if (marker.pattern.test(text)) reasons.push(marker.label);
  }

  for (const feature of signals.features.slice(0, 4)) {
    reasons.push(feature);
  }

  const uniqueReasons = [...new Set(reasons)].slice(0, 6);
  let level: ComplexityLevel = "low";
  if (uniqueReasons.length >= 4) level = "high";
  else if (uniqueReasons.length >= 2) level = "medium";

  if (uniqueReasons.length === 0) {
    uniqueReasons.push("Scope appears focused with limited integration signals in the job post.");
  }

  return { level, reasons: uniqueReasons };
}

function deliveryLevelFromAssessment(
  assessment: CapabilityAssessmentRow[],
  confidence: number,
): DeliveryLevel {
  const critical = assessment.filter((row) => row.importance === "critical");
  const criticalWeak = critical.filter((row) =>
    row.level === "weak" || row.level === "none" || row.level === "unknown",
  );

  if (criticalWeak.length > 0 && critical.length > 0) {
    return criticalWeak.length === critical.length ? "low" : "medium";
  }

  const strongCount = assessment.filter((row) => row.level === "strong").length;
  const weakCount = assessment.filter((row) =>
    row.level === "weak" || row.level === "none" || row.level === "unknown",
  ).length;

  if (confidence >= 80 && strongCount >= 2 && weakCount <= 1) return "very_high";
  if (confidence >= 65 && strongCount >= 1) return "high";
  if (confidence >= 45) return "medium";
  return "low";
}

function buildDeliveryAssessment(
  assessment: CapabilityAssessmentRow[],
  confidence: number,
): DeliveryAssessment {
  const level = deliveryLevelFromAssessment(assessment, confidence);
  const reasons: string[] = [];

  for (const row of assessment
    .filter((item) => item.level === "strong")
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 4)) {
    reasons.push(
      `${row.coverageLabel} ${row.label.toLowerCase()} capability (${row.repositoryCount} supporting projects)`,
    );
  }

  for (const row of assessment
    .filter((item) => item.level === "moderate")
    .slice(0, 3)) {
    reasons.push(`Moderate ${row.label.toLowerCase()} coverage`);
  }

  for (const row of assessment
    .filter((item) =>
      item.level === "weak" || item.level === "none" || item.level === "unknown",
    )
    .filter((item) => item.importance === "critical" || item.importance === "high")
    .slice(0, 4)) {
    reasons.push(
      `${row.label} requires validation — limited production evidence`,
    );
  }

  if (reasons.length === 0) {
    reasons.push("Insufficient indexed organizational evidence for a confident delivery assessment.");
  }

  const headlineByLevel: Record<DeliveryLevel, string> = {
    very_high: "SJ Innovation can confidently deliver this opportunity.",
    high: "Strong organizational capability alignment with manageable delivery risk.",
    medium: "Delivery is feasible with targeted validation on weaker capability areas.",
    low: "Significant capability gaps — pursue only with explicit risk acceptance.",
  };

  return {
    level,
    headline: headlineByLevel[level],
    reasons: reasons.slice(0, 8),
  };
}

function buildSuggestedTeam(
  assessment: CapabilityAssessmentRow[],
  signals: JobSignals,
): Array<{ role: string; reason: string }> {
  const roles: Array<{ role: string; reason: string }> = [];
  const capabilityKeys = new Set(assessment.map((row) => row.capabilityKey));
  const techText = signals.technologies.join(" ").toLowerCase();

  if (
    capabilityKeys.has("web application") ||
    capabilityKeys.has("frontend") ||
    /react|next|frontend|typescript|javascript|vue|angular/.test(techText)
  ) {
    roles.push({
      role: "Frontend Engineer",
      reason: "Client-side application delivery is a core job requirement.",
    });
  }
  if (
    capabilityKeys.has("backend api") ||
    capabilityKeys.has("database architecture") ||
    /node|python|fastapi|django|flask|backend|api|sql/.test(techText)
  ) {
    roles.push({
      role: "Backend Engineer",
      reason: "API, data, or service-layer implementation is required.",
    });
  }
  if (capabilityKeys.has("ai") || /openai|llm|rag|ai|chatbot|agent/.test(techText)) {
    roles.push({
      role: "AI Engineer",
      reason: "Job references AI, LLM, or automation capabilities.",
    });
  }
  if (
    capabilityKeys.has("cloud infrastructure") ||
    /docker|kubernetes|aws|azure|gcp|devops|ci\/cd/.test(techText)
  ) {
    roles.push({
      role: "DevOps Engineer",
      reason: "Infrastructure or deployment concerns are in scope.",
    });
  }
  if (
    capabilityKeys.has("ios") ||
    capabilityKeys.has("android") ||
    capabilityKeys.has("react native") ||
    capabilityKeys.has("mobile") ||
    /\bios\b|\bandroid\b|react[- ]native|flutter|expo/.test(techText)
  ) {
    roles.push({
      role: "Mobile Engineer",
      reason: "Native or cross-platform mobile delivery is a core job requirement.",
    });
  }

  if (roles.length === 0 && assessment.some((row) => row.coverage > 0)) {
    roles.push({
      role: "Full-Stack Engineer",
      reason: "Balanced capability coverage across indexed organizational knowledge.",
    });
  }

  return roles;
}

function buildBusinessRecommendation(
  recommendation: OpportunityRecommendation,
  signals: JobSignals,
  assessment: CapabilityAssessmentRow[],
  breakdown: OpportunityScoreBreakdown,
): BusinessRecommendation {
  const reasonsToPursue: string[] = [];
  const reasonsForCaution: string[] = [];

  for (const row of assessment
    .filter((item) => item.level === "strong")
    .slice(0, 5)) {
    reasonsToPursue.push(
      `${row.coverageLabel} ${row.label.toLowerCase()} capability across ${row.repositoryCount} production-weighted projects.`,
    );
  }

  if (breakdown.domain_match.score >= 50) {
    reasonsToPursue.push(breakdown.domain_match.reason);
  }

  for (const row of assessment
    .filter((item) => item.level === "moderate")
    .filter((item) => item.importance === "critical" || item.importance === "high")
    .slice(0, 3)) {
    reasonsForCaution.push(
      `Moderate ${row.label.toLowerCase()} coverage — confirm depth during discovery.`,
    );
  }

  for (const row of assessment
    .filter((item) =>
      item.level === "weak" || item.level === "none" || item.level === "unknown",
    )
    .slice(0, 5)) {
    reasonsForCaution.push(
      `${row.label}: ${row.reason}`,
    );
  }

  for (const risk of breakdown.risk.items.slice(0, 3)) {
    reasonsForCaution.push(risk);
  }

  if (reasonsToPursue.length === 0 && recommendation !== "IGNORE") {
    reasonsToPursue.push(breakdown.technology_match.reason);
  }

  const weakCapabilities = assessment.filter((row) =>
    row.level === "weak" || row.level === "none" || row.level === "unknown",
  );

  const discoveryQuestions = weakCapabilities.slice(0, 4).map((row) =>
    `What level of depth is required for ${row.label}, and is it a core deliverable?`,
  );

  const upsellOpportunities = signals.features.slice(0, 4).map((feature) =>
    `Clarify whether ${feature.toLowerCase()} is in initial scope or a follow-on phase.`,
  );

  const futureServices = [
    signals.domain ? `${signals.domain} analytics and reporting` : null,
    assessment.some((row) => row.capabilityKey === "ai")
      ? "AI reporting and workflow automation"
      : null,
    "Ongoing maintenance and feature iteration",
    "Cloud migration and performance optimization",
  ].filter((item): item is string => Boolean(item)).slice(0, 4);

  return {
    reasonsToPursue: [...new Set(reasonsToPursue)].slice(0, 6),
    reasonsForCaution: [...new Set(reasonsForCaution)].slice(0, 6),
    discoveryQuestions: [...new Set(discoveryQuestions)].slice(0, 5),
    upsellOpportunities: [...new Set(upsellOpportunities)].slice(0, 4),
    futureServices,
  };
}

function buildEvidenceTransparency(
  assessment: CapabilityAssessmentRow[],
) {
  return assessment
    .filter((row) => row.contributingRepos.length > 0)
    .map((row) => ({
      claim: `${row.label} capability`,
      repositoryCount: row.repositoryCount,
      repositoryIds: row.contributingRepos.map((repo) => repo.repositoryId),
      repositoryNames: row.contributingRepos.map((repo) => repo.repositoryName),
    }))
    .sort((a, b) => b.repositoryCount - a.repositoryCount)
    .slice(0, 20);
}

export function buildIntelligenceReport(input: {
  job: UpworkJobRow;
  signals: JobSignals;
  recommendation: OpportunityRecommendation;
  confidence: number;
  summary: string;
  breakdown: OpportunityScoreBreakdown;
  projects: OrgProjectEvidence[];
  repos: OrgRepoEvidence[];
  citations: OrgCitationEvidence[];
  evidenceProjects?: OrgProjectEvidence[];
  evidenceRepos?: OrgRepoEvidence[];
  evidenceScope?: {
    totalIndexedRepos: number;
    jobRelevantRepos: number;
    reposScannedForEvidence: number;
  };
}): OpportunityIntelligenceReport {
  const evidenceProjects = input.evidenceProjects ?? input.projects;
  const evidenceRepos = input.evidenceRepos ?? input.repos;
  const evidenceIndex = buildOrgCapabilityIndex(
    evidenceProjects,
    input.citations,
  );

  const requiredCapabilities = extractRequiredCapabilities(input.job, input.signals);

  const capabilityAssessment: CapabilityAssessmentRow[] = requiredCapabilities.map(
    (required) => {
      const assessmentKey = required.key.startsWith("skill:")
        ? required.label
        : required.key;
      const row = assessOrgCapability(
        assessmentKey,
        required.importance,
        evidenceProjects,
        evidenceRepos,
        input.citations,
        evidenceIndex,
      );
      return {
        ...row,
        capabilityKey: required.key,
        label: required.label,
      };
    },
  );

  if (capabilityAssessment.length === 0) {
    capabilityAssessment.push(
      assessOrgCapability(
        "web application",
        "medium",
        evidenceProjects,
        evidenceRepos,
        input.citations,
        evidenceIndex,
      ),
    );
  }

  const skillGapAnalysis = buildSkillGapAnalysis(capabilityAssessment);
  const engineeringComplexity = buildEngineeringComplexity(input.job, input.signals);
  const deliveryAssessment = buildDeliveryAssessment(
    capabilityAssessment,
    input.confidence,
  );

  const deliveryConfidence = {
    level: deliveryAssessment.level,
    explanation: `${deliveryAssessment.headline} ${deliveryAssessment.reasons.slice(0, 3).join(" ")}`,
    reasons: deliveryAssessment.reasons,
  };

  return {
    executiveSummary: {
      recommendation: input.recommendation,
      confidence: input.confidence,
      summary: input.summary,
    },
    deliveryAssessment,
    requiredCapabilities,
    capabilityAssessment,
    capabilityEvidence: buildCapabilityEvidence(capabilityAssessment),
    opportunityBreakdown: buildOpportunityBreakdown(input.job, input.signals),
    skillGapAnalysis,
    engineeringComplexity,
    deliveryConfidence,
    suggestedTeam: buildSuggestedTeam(capabilityAssessment, input.signals),
    businessRecommendation: buildBusinessRecommendation(
      input.recommendation,
      input.signals,
      capabilityAssessment,
      input.breakdown,
    ),
    evidenceTransparency: buildEvidenceTransparency(capabilityAssessment),
    evidenceScope: input.evidenceScope,
    similarProjects: [],
    capabilityCoverage: toCapabilityCoverageRows(capabilityAssessment),
  };
}
