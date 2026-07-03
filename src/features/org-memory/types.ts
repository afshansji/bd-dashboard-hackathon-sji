export type OrgMemoryCapability =
  | "repository_discovery"
  | "project_understanding"
  | "knowledge_retrieval";

export interface OrgRepository {
  id: string;
  name: string;
  url: string;
  default_branch: string;
  tags: string[];
  index_status: "pending" | "running" | "success" | "failed";
  last_indexed_at: string | null;
  index_error: string | null;
}

export interface OrgMemoryCitation {
  chunkId: string;
  repositoryId: string;
  sourcePath: string;
  excerpt: string;
}

export interface OrgMemoryQueryResult {
  runId?: string;
  traceId: string;
  status: string;
  discovery?: {
    repos: Array<{
      id: string;
      name: string;
      url: string;
      score?: number;
      matchedSignals?: string[];
    }>;
  };
  projects?: Array<{
    id: string;
    name: string;
    summary: string;
    techStack: string[];
    domainTags: string[];
    keyFeatures: string[];
  }>;
  answer?: {
    text: string;
    citations: OrgMemoryCitation[];
    confidence: number;
  };
  error?: string;
}
