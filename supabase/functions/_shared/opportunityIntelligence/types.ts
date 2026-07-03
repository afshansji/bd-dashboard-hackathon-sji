export type OpportunityRecommendation = "PURSUE" | "REVIEW" | "IGNORE";

export interface JobSignals {
  technologies: string[];
  domain: string | null;
  features: string[];
  budget: string | null;
  timeline: string | null;
  clientExpectations: string[];
}

export interface OrgProjectEvidence {
  id: string;
  name: string;
  summary: string;
  techStack: string[];
  domainTags: string[];
  keyFeatures: string[];
  repositoryId?: string;
}

export interface OrgRepoEvidence {
  id: string;
  name: string;
  url: string;
  indexStatus?: string;
}

export interface OrgCitationEvidence {
  chunkId: string;
  repositoryId: string;
  sourcePath: string;
  excerpt: string;
}

export interface ScoreComponent {
  score: number;
  reason: string;
}

export interface ProjectSimilarityScore extends ScoreComponent {
  projects: string[];
}

export interface OpportunityScoreBreakdown {
  technology_match: ScoreComponent;
  domain_match: ScoreComponent;
  project_similarity: ProjectSimilarityScore;
  risk: ScoreComponent & { items: string[] };
  weights: {
    technology_match: number;
    project_similarity: number;
    domain_match: number;
    risk: number;
  };
}

import type { OpportunityIntelligenceReport } from "./reportTypes.ts";

export interface OpportunityAnalysisResult {
  recommendation: OpportunityRecommendation;
  confidence: number;
  reasoning: {
    technology_match: ScoreComponent;
    domain_match: ScoreComponent;
    project_similarity: ProjectSimilarityScore;
    risk: string[];
  };
  summary: string;
  jobSignals: JobSignals;
  supportingRepositories: OrgRepoEvidence[];
  citations: OrgCitationEvidence[];
  evidenceNote: string | null;
  report: OpportunityIntelligenceReport;
}

export interface UpworkJobRow {
  id: string;
  title: string;
  description: string;
  job_type: string | null;
  hourly_rate: string | null;
  fixed_budget: string | null;
  experience_level: string | null;
  project_length: string | null;
  weekly_hours: string | null;
  skills: string[];
  client_country?: string | null;
}
