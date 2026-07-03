import type { WorkflowModule, WorkflowRunContext } from "../../graph/registry.js";
import { discoverRepositories } from "../../knowledge/discovery.js";
import {
  aggregateRepoScoresFromChunks,
  prefetchGlobalVectorChunks,
} from "../../knowledge/vector-prefetch.js";

export const repositoryDiscoveryWorkflow: WorkflowModule = {
  id: "repository_discovery",
  version: "1.0.0",
  description: "Find relevant repositories and projects for a query",
  dependsOn: [],
  async run(ctx: WorkflowRunContext) {
    const started = Date.now();
    const maxRepos = ctx.options?.maxRepos ?? 10;
    const searchAllRepos =
      ctx.options?.searchAllRepos ?? !ctx.filters?.repoIds?.length;

    let vectorRepoScores: Map<string, number> | undefined;
    if (searchAllRepos) {
      const maxChunks = ctx.options?.maxChunks ?? 10;
      const globalChunks = await prefetchGlobalVectorChunks(ctx.query, maxChunks);
      vectorRepoScores = aggregateRepoScoresFromChunks(globalChunks);
    }

    const repos = await discoverRepositories(
      ctx.query,
      ctx.filters,
      maxRepos,
      vectorRepoScores,
    );

    return {
      patch: {
        candidateRepos: repos.map((r) => ({
          id: r.id,
          name: r.name,
          url: r.url,
          score: r.score,
          matchedSignals: r.matchedSignals,
        })),
        discoveryResult: { repos },
        completedWorkflows: ["repository_discovery"],
        nodeTelemetry: [
          {
            node: "repository_discovery.search",
            capability: "repository_discovery",
            ms: Date.now() - started,
            metadata: { matchCount: repos.length },
          },
        ],
      },
      telemetryMs: Date.now() - started,
    };
  },
};
