import { END, START, StateGraph } from "@langchain/langgraph";
import { isBoilerplateExcerpt } from "../knowledge/answer-synthesis.js";
import { synthesizeAnswerWithLlm } from "../knowledge/llm-synthesis.js";
import {
  createDefaultRegistry,
  type WorkflowRegistry,
  type WorkflowRunContext,
} from "./registry.js";
import { OrgMemoryStateAnnotation, type OrgMemoryState } from "./state.js";
import type {
  CapabilityId,
  OrgMemoryQueryRequest,
  OrgMemoryQueryResponse,
  RetrievalAnswer,
} from "./types.js";

function nowMs(): number {
  return Date.now();
}

async function planCapabilities(
  state: OrgMemoryState,
  registry: WorkflowRegistry,
): Promise<Partial<OrgMemoryState>> {
  const started = nowMs();
  const executionPlan = registry.resolveExecutionOrder(state.requestedCapabilities);

  return {
    executionPlan,
    nodeTelemetry: [
      {
        node: "plan_capabilities",
        ms: nowMs() - started,
        metadata: { executionPlan },
      },
    ],
  };
}

async function executeWorkflows(
  state: OrgMemoryState,
  registry: WorkflowRegistry,
): Promise<Partial<OrgMemoryState>> {
  const workflowTelemetry: Array<{ id: CapabilityId; ms: number }> = [];
  const nodeTelemetry = [...state.nodeTelemetry];
  const errors = [...state.errors];
  let candidateRepos = [...state.candidateRepos];
  let projectProfiles = [...(state.projectProfiles ?? [])];
  let discoveryResult = state.discoveryResult;
  let retrievalAnswer = state.retrievalAnswer;
  let retrievedChunks = [...state.retrievedChunks];
  const completedWorkflows: CapabilityId[] = [...state.completedWorkflows];

  const runContext = (): WorkflowRunContext => ({
    traceId: state.traceId,
    query: state.query,
    filters: state.filters,
    options: state.options,
    candidateRepos,
    projectProfiles,
  });

  for (const capabilityId of state.executionPlan) {
    const module = registry.get(capabilityId);
    if (!module) {
      errors.push({
        capability: capabilityId,
        message: `Workflow module not found: ${capabilityId}`,
      });
      continue;
    }

    const wfStarted = nowMs();
    try {
      const result = await module.run(runContext());
      workflowTelemetry.push({ id: capabilityId, ms: result.telemetryMs });

      const patch = result.patch;
      if (Array.isArray(patch.candidateRepos)) {
        candidateRepos = patch.candidateRepos as typeof candidateRepos;
      }
      if (Array.isArray(patch.projectProfiles)) {
        projectProfiles = patch.projectProfiles as typeof projectProfiles;
      }
      if (patch.discoveryResult) {
        discoveryResult = patch.discoveryResult as typeof discoveryResult;
      }
      if (patch.retrievalAnswer) {
        retrievalAnswer = patch.retrievalAnswer as typeof retrievalAnswer;
      }
      if (Array.isArray(patch.retrievedChunks)) {
        retrievedChunks = patch.retrievedChunks as typeof retrievedChunks;
      }
      if (Array.isArray(patch.completedWorkflows)) {
        completedWorkflows.push(
          ...(patch.completedWorkflows as CapabilityId[]),
        );
      }
      if (Array.isArray(patch.nodeTelemetry)) {
        nodeTelemetry.push(...(patch.nodeTelemetry as typeof nodeTelemetry));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Workflow execution failed";
      errors.push({ capability: capabilityId, message });
      workflowTelemetry.push({ id: capabilityId, ms: nowMs() - wfStarted });
    }
  }

  nodeTelemetry.push({
    node: "execute_workflows",
    ms: workflowTelemetry.reduce((sum, item) => sum + item.ms, 0),
    metadata: { workflows: workflowTelemetry },
  });

  return {
    candidateRepos,
    projectProfiles,
    discoveryResult,
    retrievalAnswer,
    retrievedChunks,
    completedWorkflows,
    nodeTelemetry,
    errors,
  };
}

async function synthesizeResponse(
  state: OrgMemoryState,
): Promise<Partial<OrgMemoryState>> {
  const started = nowMs();
  const repos = state.discoveryResult?.repos ?? state.candidateRepos;
  const projects = state.projectProfiles ?? [];
  const citations = state.retrievalAnswer?.citations ?? [];

  const hasContext =
    repos.length > 0 || projects.length > 0 || citations.length > 0;

  let retrievalAnswer: RetrievalAnswer | undefined = state.retrievalAnswer;
  let synthesisMode: "llm" | "template" | "none" = "none";

  if (hasContext) {
    const filteredCitations = citations.filter(
      (c) => !isBoilerplateExcerpt(c.excerpt),
    );
    const synthesized = await synthesizeAnswerWithLlm({
      query: state.query,
      repos,
      projects,
      citations: filteredCitations,
      confidence: state.retrievalAnswer?.confidence,
    });
    synthesisMode = synthesized.mode;
    const confidence = state.retrievalAnswer?.confidence
      ?? (projects.length > 0 ? 0.6 : filteredCitations.length > 0 ? 0.5 : 0.4);

    retrievalAnswer = {
      text: synthesized.text,
      citations: filteredCitations,
      confidence: synthesized.mode === "llm"
        ? Math.min(Math.max(confidence, 0.55), 0.95)
        : confidence,
    };
  }

  return {
    retrievalAnswer,
    nodeTelemetry: [
      {
        node: "synthesize_response",
        ms: nowMs() - started,
        metadata: {
          completedWorkflows: state.completedWorkflows,
          errorCount: state.errors.length,
          synthesisMode,
        },
      },
    ],
  };
}

export function buildMasterGraph(registry: WorkflowRegistry = createDefaultRegistry()) {
  const graph = new StateGraph(OrgMemoryStateAnnotation)
    .addNode("plan_capabilities", (state) => planCapabilities(state, registry))
    .addNode("execute_workflows", (state) => executeWorkflows(state, registry))
    .addNode("synthesize_response", synthesizeResponse)
    .addEdge(START, "plan_capabilities")
    .addEdge("plan_capabilities", "execute_workflows")
    .addEdge("execute_workflows", "synthesize_response")
    .addEdge("synthesize_response", END);

  return graph.compile();
}

export async function runOrgMemoryQuery(
  request: OrgMemoryQueryRequest,
  registry: WorkflowRegistry = createDefaultRegistry(),
): Promise<OrgMemoryQueryResponse> {
  const started = nowMs();
  const graph = buildMasterGraph(registry);

  const initialState: Partial<OrgMemoryState> = {
    traceId: request.traceId,
    query: request.query,
    requestedCapabilities: request.capabilities,
    filters: request.filters,
    options: request.options,
    completedWorkflows: [],
    nodeTelemetry: [],
    errors: [],
    candidateRepos: [],
    selectedProjects: [],
    retrievedChunks: [],
    graphPaths: [],
  };

  const finalState = await graph.invoke(initialState);

  const workflowMs = new Map<CapabilityId, number>();
  for (const node of finalState.nodeTelemetry) {
    if (node.capability) {
      workflowMs.set(
        node.capability,
        (workflowMs.get(node.capability) ?? 0) + node.ms,
      );
    }
  }

  const workflows = [...workflowMs.entries()].map(([id, ms]) => ({ id, ms }));

  const synthesisNode = finalState.nodeTelemetry.find(
    (n) => n.node === "synthesize_response",
  );
  const synthesisMode = synthesisNode?.metadata?.synthesisMode as
    | "llm"
    | "template"
    | "none"
    | undefined;

  const status =
    finalState.errors.length > 0
      ? finalState.completedWorkflows.length > 0
        ? "partial"
        : "failed"
      : "completed";

  return {
    traceId: request.traceId,
    capabilities: request.capabilities,
    executionPlan: finalState.executionPlan,
    discovery: finalState.discoveryResult,
    projects: finalState.projectProfiles,
    answer: finalState.retrievalAnswer,
    telemetry: {
      totalMs: nowMs() - started,
      workflows,
      nodes: finalState.nodeTelemetry,
    },
    status,
    synthesisMode,
    message:
      status === "completed"
        ? undefined
        : finalState.errors.map((e) => e.message).join("; "),
  };
}
