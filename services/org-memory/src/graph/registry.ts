import type { CapabilityId, QueryFilters, QueryOptions } from "./types.js";
import { knowledgeRetrievalWorkflow } from "../workflows/knowledge-retrieval/index.js";
import { projectUnderstandingWorkflow } from "../workflows/project-understanding/index.js";
import { repositoryDiscoveryWorkflow } from "../workflows/repository-discovery/index.js";

export interface WorkflowModule {
  id: CapabilityId;
  version: string;
  description: string;
  dependsOn: CapabilityId[];
  run: (state: WorkflowRunContext) => Promise<WorkflowRunResult>;
}

export interface WorkflowRunContext {
  traceId: string;
  query: string;
  filters?: QueryFilters;
  options?: QueryOptions;
  candidateRepos: Array<{ id: string; name: string; url: string }>;
  projectProfiles: Array<{
    id: string;
    name: string;
    summary: string;
    techStack: string[];
    domainTags: string[];
    keyFeatures: string[];
  }>;
}

export interface WorkflowRunResult {
  patch: Record<string, unknown>;
  telemetryMs: number;
}

export class WorkflowRegistry {
  private readonly modules = new Map<CapabilityId, WorkflowModule>();

  register(module: WorkflowModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Workflow already registered: ${module.id}`);
    }
    this.modules.set(module.id, module);
  }

  get(id: CapabilityId): WorkflowModule | undefined {
    return this.modules.get(id);
  }

  list(): WorkflowModule[] {
    return [...this.modules.values()];
  }

  resolveExecutionOrder(requested: CapabilityId[]): CapabilityId[] {
    const known = new Set(this.modules.keys());
    const unknown = requested.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new Error(`Unknown capabilities: ${unknown.join(", ")}`);
    }

    const needed = new Set<CapabilityId>();
    const visit = (id: CapabilityId) => {
      if (needed.has(id)) return;
      const mod = this.modules.get(id);
      if (!mod) return;
      for (const dep of mod.dependsOn) {
        visit(dep);
      }
      needed.add(id);
    };

    for (const id of requested) {
      visit(id);
    }

    return [...needed];
  }
}

export function createDefaultRegistry(): WorkflowRegistry {
  const registry = new WorkflowRegistry();
  registry.register(repositoryDiscoveryWorkflow);
  registry.register(projectUnderstandingWorkflow);
  registry.register(knowledgeRetrievalWorkflow);
  return registry;
}
