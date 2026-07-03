import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { IncomingMessage, ServerResponse } from "node:http";

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function upworkInspectorApiPlugin(env: Record<string, string>): Plugin {
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const functionBase = supabaseUrl
    ? `${supabaseUrl}/functions/v1/upwork-inspector`
    : null;

  async function proxyToEdgeFunction(
    req: IncomingMessage,
    res: ServerResponse,
    targetPath: string,
  ) {
    if (!functionBase) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "VITE_SUPABASE_URL is not configured for Upwork Inspector proxy",
        }),
      );
      return;
    }

    try {
      const headers = new Headers();
      const authorization = req.headers.authorization;
      const contentType = req.headers["content-type"];
      const inspectorKey = req.headers["x-upwork-inspector-key"];
      const apikey = req.headers["apikey"];
      if (authorization) headers.set("authorization", authorization);
      if (contentType) headers.set("content-type", contentType);
      if (inspectorKey) headers.set("x-upwork-inspector-key", inspectorKey);
      if (apikey) headers.set("apikey", String(apikey));

      const init: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method === "POST") {
        const body = await readRequestBody(req);
        init.body = body.length > 0 ? body : undefined;
      }

      const response = await fetch(`${functionBase}${targetPath}`, init);
      const responseBody = await response.text();

      res.statusCode = response.status;
      res.setHeader(
        "Content-Type",
        response.headers.get("content-type") ?? "application/json",
      );
      res.end(responseBody);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to proxy request";
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: message }));
    }
  }

  function register(server: { middlewares: { use: Function } }) {
    server.middlewares.use(
      async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const pathname = req.url?.split("?")[0];

        if (pathname === "/health" && req.method === "GET") {
          await proxyToEdgeFunction(req, res, "/health");
          return;
        }

        if (pathname === "/api/upwork/jobs" && req.method === "POST") {
          await proxyToEdgeFunction(req, res, "/api/upwork/jobs");
          return;
        }

        next();
      },
    );
  }

  return {
    name: "upwork-inspector-api-proxy",
    enforce: "pre",
    configureServer(server) {
      register(server);
    },
    configurePreviewServer(server) {
      register(server);
    },
  };
}

function postAggregatorApiPlugin(): Plugin {
  return {
    name: "post-aggregator-api",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next) => {
          const pathname = req.url?.split("?")[0];

          if (pathname !== "/api/posts") {
            next();
            return;
          }

          if (req.method !== "GET") {
            res.statusCode = 405;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }

          try {
            const { aggregatePosts } = await import(
              "./src/features/post-aggregator/services/aggregatePosts"
            );
            const payload = await aggregatePosts();
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to aggregate posts";
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: message }));
          }
        },
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next) => {
          const pathname = req.url?.split("?")[0];

          if (pathname !== "/api/posts") {
            next();
            return;
          }

          if (req.method !== "GET") {
            res.statusCode = 405;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
          }

          try {
            const { aggregatePosts } = await import(
              "./src/features/post-aggregator/services/aggregatePosts"
            );
            const payload = await aggregatePosts();
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to aggregate posts";
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: message }));
          }
        },
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    upworkInspectorApiPlugin(env),
    postAggregatorApiPlugin(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
