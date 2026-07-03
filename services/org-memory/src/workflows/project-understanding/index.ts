import type { WorkflowModule, WorkflowRunContext } from "../../graph/registry.js";
import { loadProjectProfiles } from "../../knowledge/projects.js";

export const projectUnderstandingWorkflow: WorkflowModule = {
  id: "project_understanding",
  version: "1.0.0",
  description: "Build structured project profiles from repository artifacts",
  dependsOn: ["repository_discovery"],
  async run(ctx: WorkflowRunContext) {
    const started = Date.now();
    const repoIds =
      ctx.candidateRepos.length > 0
        ? ctx.candidateRepos.map((r) => r.id)
        : (ctx.filters?.repoIds ?? []);

    const profiles = await loadProjectProfiles(repoIds, ctx.filters);

    return {
      patch: {
        projectProfiles: profiles,
        completedWorkflows: ["project_understanding"],
        nodeTelemetry: [
          {
            node: "project_understanding.load",
            capability: "project_understanding",
            ms: Date.now() - started,
            metadata: { profileCount: profiles.length },
          },
        ],
      },
      telemetryMs: Date.now() - started,
    };
  },
};
