import type { OpportunityRecommendation } from "./types.ts";

export type CapabilityImportance = "critical" | "high" | "medium" | "optional";
export type CoverageLevel = "strong" | "moderate" | "weak" | "none" | "unknown";
export type CoverageLabel =
  | "Excellent"
  | "Strong"
  | "Moderate"
  | "Weak"
  | "Unknown";
export type ComplexityLevel = "low" | "medium" | "high";
export type DeliveryLevel = "very_high" | "high" | "medium" | "low";
export type RepoQualityClassification =
  | "production_product"
  | "client_project"
  | "internal_product"
  | "framework"
  | "starter_template"
  | "demo"
  | "poc"
  | "learning_repository"
  | "infrastructure";

export interface RequiredCapability {
  key: string;
  label: string;
  importance: CapabilityImportance;
}

export interface OpportunityBreakdown {
  projectType: string | null;
  industry: string | null;
  requiredTechnologies: string[];
  budget: string | null;
  timeline: string | null;
  clientCountry: string | null;
  requiredExperience: string | null;
  seniority: string | null;
}

export interface RepoContribution {
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
  matchedFiles: string[];
  matchingTechnologies: string[];
  explanation: string;
  confidence: number;
  classification: RepoQualityClassification;
  qualityWeight: number;
  relevantBecause: string[];
  notRelevant: string[];
}

export interface CapabilityAssessmentRow {
  capabilityKey: string;
  label: string;
  importance: CapabilityImportance;
  coverage: number;
  level: CoverageLevel;
  coverageLabel: CoverageLabel;
  repositoryCount: number;
  reason: string;
  matchedEvidence: string[];
  contributingRepos: RepoContribution[];
}

/** @deprecated Use capabilityAssessment — kept for cached analyses */
export interface CapabilityCoverageRow {
  technology: string;
  capability?: string;
  coverage: number;
  level: CoverageLevel;
  reason: string;
  matchedEvidence?: string[];
  contributingRepos: RepoContribution[];
}

export interface SupportingProjectEvidence {
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
  classification: RepoQualityClassification;
  classificationLabel: string;
  qualityWeight: number;
  relevantBecause: string[];
  notRelevant: string[];
  matchingTechnologies: string[];
}

export interface CapabilityEvidenceItem {
  capabilityKey: string;
  label: string;
  coverage: CoverageLevel;
  coverageLabel: CoverageLabel;
  coverageScore: number;
  repositoryCount: number;
  evidenceLabels: string[];
  supportingProjects: SupportingProjectEvidence[];
  /** @deprecated Use supportingProjects */
  repositories?: RepoContribution[];
}

/** @deprecated Repositories are evidence only — not ranked globally */
export interface SimilarProjectCard {
  projectId: string;
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
  summary: string;
  businessDomain: string;
  technologyStack: string[];
  matchPercentage: number;
  matchReasons: string[];
  businessValue: string;
  matchedFiles: string[];
  relevantSnippets: string[];
}

export interface SkillGapItem {
  label: string;
  reason: string;
}

export interface SkillGapAnalysis {
  strong: SkillGapItem[];
  moderate: SkillGapItem[];
  weak: SkillGapItem[];
}

export interface EngineeringComplexity {
  level: ComplexityLevel;
  reasons: string[];
}

export interface DeliveryAssessment {
  level: DeliveryLevel;
  headline: string;
  reasons: string[];
}

export interface DeliveryConfidence {
  level: DeliveryLevel;
  explanation: string;
  reasons: string[];
}

export interface TeamRoleRecommendation {
  role: string;
  reason: string;
}

export interface BusinessRecommendation {
  reasonsToPursue: string[];
  reasonsForCaution: string[];
  discoveryQuestions: string[];
  upsellOpportunities: string[];
  futureServices: string[];
}

export interface EvidenceClaim {
  claim: string;
  repositoryCount: number;
  repositoryIds: string[];
  repositoryNames: string[];
}

export interface EvidenceScope {
  totalIndexedRepos: number;
  jobRelevantRepos: number;
  reposScannedForEvidence: number;
}

export interface OpportunityIntelligenceReport {
  executiveSummary: {
    recommendation: OpportunityRecommendation;
    confidence: number;
    summary: string;
  };
  deliveryAssessment: DeliveryAssessment;
  requiredCapabilities: RequiredCapability[];
  capabilityAssessment: CapabilityAssessmentRow[];
  capabilityEvidence: CapabilityEvidenceItem[];
  opportunityBreakdown: OpportunityBreakdown;
  skillGapAnalysis: SkillGapAnalysis;
  engineeringComplexity: EngineeringComplexity;
  deliveryConfidence: DeliveryConfidence;
  suggestedTeam: TeamRoleRecommendation[];
  businessRecommendation: BusinessRecommendation;
  evidenceTransparency: EvidenceClaim[];
  evidenceScope?: EvidenceScope;
  /** @deprecated Empty in capability-first reports */
  similarProjects: SimilarProjectCard[];
  /** @deprecated Mapped from capabilityAssessment for backward compatibility */
  capabilityCoverage: CapabilityCoverageRow[];
}
