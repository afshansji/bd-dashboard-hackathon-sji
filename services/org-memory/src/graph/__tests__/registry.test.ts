import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultRegistry } from "../registry.js";
import { runOrgMemoryQuery } from "../master-graph.js";

test("WorkflowRegistry resolves dependencies in order", () => {
  const registry = createDefaultRegistry();
  const order = registry.resolveExecutionOrder([
    "project_understanding",
    "knowledge_retrieval",
  ]);

  assert.deepEqual(order, [
    "repository_discovery",
    "project_understanding",
    "knowledge_retrieval",
  ]);
});

test("WorkflowRegistry rejects unknown capabilities", () => {
  const registry = createDefaultRegistry();
  assert.throws(
    () =>
      registry.resolveExecutionOrder([
        "repository_discovery",
        "proposal_generation" as "repository_discovery",
      ]),
    /Unknown capabilities/,
  );
});

test("runOrgMemoryQuery returns phase 0 stub response", async () => {
  const result = await runOrgMemoryQuery({
    traceId: "tr_test",
    query: "What React projects exist?",
    capabilities: ["knowledge_retrieval"],
  });

  assert.equal(result.traceId, "tr_test");
  assert.equal(result.status, "completed");
  assert.ok(
    result.answer?.text.toLowerCase().includes("indexed") ||
      result.answer?.text.toLowerCase().includes("database"),
  );
  assert.ok(result.telemetry.totalMs >= 0);
});
