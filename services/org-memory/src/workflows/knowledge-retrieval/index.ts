import type { WorkflowModule, WorkflowRunContext } from "../../graph/registry.js";
import { retrieveKnowledge } from "../../knowledge/retrieval.js";

export const knowledgeRetrievalWorkflow: WorkflowModule = {
  id: "knowledge_retrieval",
  version: "1.0.0",
  description: "Grounded Q&A with citations over indexed knowledge",
  dependsOn: [],
  async run(ctx: WorkflowRunContext) {
    const started = Date.now();
    const maxChunks = ctx.options?.maxChunks ?? 10;
    const searchAllRepos =
      ctx.options?.searchAllRepos ?? !ctx.filters?.repoIds?.length;

    const repoIds =
      searchAllRepos
        ? ctx.filters?.repoIds
        : ctx.candidateRepos.length > 0
        ? ctx.candidateRepos.map((r) => r.id)
        : ctx.filters?.repoIds;

    const result = await retrieveKnowledge(
      ctx.query,
      { ...ctx.filters, repoIds },
      maxChunks,
      { searchAllRepos },
    );

    return {
      patch: {
        retrievedChunks: result.chunks,
        retrievalAnswer: {
          text: result.answer,
          citations: result.citations,
          confidence: result.confidence,
        },
        completedWorkflows: ["knowledge_retrieval"],
        nodeTelemetry: [
          {
            node: "knowledge_retrieval.search",
            capability: "knowledge_retrieval",
            ms: Date.now() - started,
            metadata: {
              chunkCount: result.chunks.length,
              confidence: result.confidence,
            },
          },
        ],
      },
      telemetryMs: Date.now() - started,
    };
  },
};
