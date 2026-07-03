import "dotenv/config";
import { createServer } from "node:http";
import { z } from "zod";
import { runOrgMemoryQuery } from "../graph/master-graph.js";
import { ALL_CAPABILITIES } from "../graph/types.js";
import { indexRepository } from "../ingestion/repo-indexer.js";
import { isSupabaseConfigured } from "../knowledge/supabase.js";

const CapabilitySchema = z.enum(ALL_CAPABILITIES);

const QueryRequestSchema = z.object({
  traceId: z.string().min(1),
  query: z.string().min(3).max(2000),
  capabilities: z.array(CapabilitySchema).min(1),
  filters: z
    .object({
      techStack: z.array(z.string()).optional(),
      industry: z.string().optional(),
      clientId: z.string().uuid().optional(),
      repoIds: z.array(z.string().uuid()).optional(),
      projectIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
  options: z
    .object({
      maxRepos: z.number().int().positive().max(50).optional(),
      maxChunks: z.number().int().positive().max(100).optional(),
      includeCitations: z.boolean().optional(),
      searchAllRepos: z.boolean().optional(),
    })
    .optional(),
});

const IndexRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  indexRunId: z.string().uuid().optional(),
});

const PORT = Number(process.env.PORT ?? 3100);
const SERVICE_KEY = process.env.ORG_MEMORY_SERVICE_KEY ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorized(): Response {
  return json({ error: "Unauthorized" }, 401);
}

function assertAuthorized(req: Request): boolean {
  if (!SERVICE_KEY) return true;
  const header = req.headers.get("x-org-memory-key");
  return header === SERVICE_KEY;
}

async function handleQuery(req: Request): Promise<Response> {
  if (!assertAuthorized(req)) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = QueryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400,
    );
  }

  try {
    const result = await runOrgMemoryQuery(parsed.data);
    return json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Query execution failed";
    return json({ error: message }, 400);
  }
}

async function handleIndex(req: Request): Promise<Response> {
  if (!assertAuthorized(req)) return unauthorized();

  if (!isSupabaseConfigured()) {
    return json({ error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required" }, 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = IndexRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400,
    );
  }

  try {
    const result = await indexRepository(parsed.data);
    const status = result.status === "success" ? 200 : 422;
    return json(result, status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Indexing failed";
    return json({ error: message }, 500);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "org-memory",
        phase: 1,
        supabase: isSupabaseConfigured(),
      }),
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/query") {
    const webRequest = new Request(url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: await readBody(req),
    });
    const response = await handleQuery(webRequest);
    const text = await response.text();
    res.writeHead(response.status, { "Content-Type": "application/json" });
    res.end(text);
    return;
  }

  if (req.method === "POST" && url.pathname === "/index") {
    const webRequest = new Request(url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: await readBody(req),
    });
    const response = await handleIndex(webRequest);
    const text = await response.text();
    res.writeHead(response.status, { "Content-Type": "application/json" });
    res.end(text);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

server.listen(PORT, () => {
  console.log(`org-memory service listening on :${PORT}`);
});
