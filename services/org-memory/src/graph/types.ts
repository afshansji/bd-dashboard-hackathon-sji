export const V1_CAPABILITIES = [
  "repository_discovery",
  "project_understanding",
  "knowledge_retrieval",
] as const;

export const FUTURE_CAPABILITIES = [
  "similar_project_discovery",
  "feature_extraction",
  "capability_discovery",
  "case_study_generation",
  "proposal_generation",
  "timeline_generation",
  "solution_recommendation",
  "industry_expertise_discovery",
  "reusable_component_discovery",
] as const;

export const ALL_CAPABILITIES = [
  ...V1_CAPABILITIES,
  ...FUTURE_CAPABILITIES,
] as const;

export type CapabilityId = (typeof ALL_CAPABILITIES)[number];

export type V1CapabilityId = (typeof V1_CAPABILITIES)[number];

export interface RepoRef {
  id: string;
  name: string;
  url: string;
  score?: number;
  matchedSignals?: string[];
}

export interface ProjectRef {
  id: string;
  repositoryId: string;
  name: string;
  rootPath: string;
}

export interface KnowledgeChunk {
  id: string;
  repositoryId: string;
  projectId?: string;
  sourcePath: string;
  excerpt: string;
  score?: number;
}

export interface GraphEdge {
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
  weight?: number;
}

export interface DiscoveryResult {
  repos: RepoRef[];
}

export interface ProjectProfile {
  id: string;
  name: string;
  summary: string;
  techStack: string[];
  domainTags: string[];
  keyFeatures: string[];
}

export interface Citation {
  chunkId: string;
  repositoryId: string;
  sourcePath: string;
  excerpt: string;
}

export interface RetrievalAnswer {
  text: string;
  citations: Citation[];
  confidence: number;
}

export interface WorkflowError {
  capability: CapabilityId;
  message: string;
}

export interface NodeTelemetry {
  node: string;
  capability?: CapabilityId;
  ms: number;
  metadata?: Record<string, unknown>;
}

export interface QueryFilters {
  techStack?: string[];
  industry?: string;
  clientId?: string;
  repoIds?: string[];
  projectIds?: string[];
}

export interface QueryOptions {
  maxRepos?: number;
  maxChunks?: number;
  includeCitations?: boolean;
  /** Search all indexed repos via vector similarity before narrowing candidates. */
  searchAllRepos?: boolean;
}

export interface OrgMemoryQueryRequest {
  traceId: string;
  query: string;
  capabilities: CapabilityId[];
  filters?: QueryFilters;
  options?: QueryOptions;
}

export interface OrgMemoryQueryResponse {
  traceId: string;
  capabilities: CapabilityId[];
  executionPlan: CapabilityId[];
  discovery?: DiscoveryResult;
  projects?: ProjectProfile[];
  answer?: RetrievalAnswer;
  telemetry: {
    totalMs: number;
    workflows: Array<{ id: CapabilityId; ms: number }>;
    nodes: NodeTelemetry[];
  };
  status: "completed" | "partial" | "failed";
  message?: string;
  synthesisMode?: "llm" | "template" | "none";
}
