import { Annotation } from "@langchain/langgraph";
import type {
  CapabilityId,
  DiscoveryResult,
  GraphEdge,
  KnowledgeChunk,
  NodeTelemetry,
  ProjectProfile,
  ProjectRef,
  QueryFilters,
  QueryOptions,
  RepoRef,
  RetrievalAnswer,
  WorkflowError,
} from "./types.js";

export const OrgMemoryStateAnnotation = Annotation.Root({
  traceId: Annotation<string>,
  query: Annotation<string>,
  requestedCapabilities: Annotation<CapabilityId[]>,
  filters: Annotation<QueryFilters | undefined>,
  options: Annotation<QueryOptions | undefined>,
  executionPlan: Annotation<CapabilityId[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  candidateRepos: Annotation<RepoRef[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  selectedProjects: Annotation<ProjectRef[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  retrievedChunks: Annotation<KnowledgeChunk[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  graphPaths: Annotation<GraphEdge[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  discoveryResult: Annotation<DiscoveryResult | undefined>,
  projectProfiles: Annotation<ProjectProfile[] | undefined>,
  retrievalAnswer: Annotation<RetrievalAnswer | undefined>,
  completedWorkflows: Annotation<CapabilityId[]>({
    reducer: (current, next) => [...new Set([...current, ...next])],
    default: () => [],
  }),
  nodeTelemetry: Annotation<NodeTelemetry[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
  errors: Annotation<WorkflowError[]>({
    reducer: (current, next) => [...current, ...next],
    default: () => [],
  }),
});

export type OrgMemoryState = typeof OrgMemoryStateAnnotation.State;
