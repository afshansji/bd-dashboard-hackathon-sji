import type { OpportunityIntelligenceReport } from "./intelligenceReport";

export type OpportunityRecommendation = "PURSUE" | "REVIEW" | "IGNORE";

export interface OpportunityScoreComponent {
  score: number;
  reason: string;
}

export interface OpportunityProjectSimilarity extends OpportunityScoreComponent {
  projects: string[];
}

export interface OpportunityJobSignals {
  technologies: string[];
  domain: string | null;
  features: string[];
  budget: string | null;
  timeline: string | null;
  clientExpectations: string[];
}

export interface OpportunityRepoEvidence {
  id: string;
  name: string;
  url: string;
  indexStatus?: string;
}

export interface OpportunityCitation {
  chunkId: string;
  repositoryId: string;
  sourcePath: string;
  excerpt: string;
}

export interface OpportunityAnalysis {
  recommendation: OpportunityRecommendation;
  confidence: number;
  reasoning: {
    technology_match: OpportunityScoreComponent;
    domain_match: OpportunityScoreComponent;
    project_similarity: OpportunityProjectSimilarity;
    risk: string[];
  };
  summary: string;
  jobSignals: OpportunityJobSignals;
  supportingRepositories: OpportunityRepoEvidence[];
  citations: OpportunityCitation[];
  evidenceNote: string | null;
  report?: OpportunityIntelligenceReport;
}

export interface OpportunityAnalysisResponse {
  analysis: OpportunityAnalysis;
  cached: boolean;
  id: string;
  recommendation: OpportunityRecommendation;
  confidence: number;
  analyzedAt: string;
}
