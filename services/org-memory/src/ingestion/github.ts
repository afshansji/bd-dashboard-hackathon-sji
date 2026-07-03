export interface GitHubRepoRef {
  owner: string;
  repo: string;
}

export interface FetchedFile {
  path: string;
  content: string;
  sourceType: "readme" | "source_file" | "doc" | "config";
}

const INDEX_PATHS = [
  "README.md",
  "readme.md",
  "README",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "composer.json",
  "requirements.txt",
  "docs/README.md",
] as const;

export function parseGitHubUrl(url: string): GitHubRepoRef | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("github.com")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "sji-org-memory-indexer",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function resolveDefaultBranch(
  owner: string,
  repo: string,
): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(),
  });
  if (!res.ok) {
    throw new Error(`GitHub repo lookup failed (${res.status}): ${owner}/${repo}`);
  }
  const data = (await res.json()) as { default_branch?: string };
  return data.default_branch ?? "main";
}

export async function fetchLatestCommitSha(
  owner: string,
  repo: string,
  branch: string,
): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`,
    { headers: githubHeaders() },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const res = await fetch(url, { headers: { "User-Agent": "sji-org-memory-indexer" } });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text.trim()) return null;
  return text;
}

function classifyPath(path: string): FetchedFile["sourceType"] {
  const lower = path.toLowerCase();
  if (lower.includes("readme")) return "readme";
  if (lower.endsWith(".md")) return "doc";
  if (
    lower.endsWith(".json") ||
    lower.endsWith(".toml") ||
    lower.endsWith(".mod") ||
    lower.endsWith(".txt")
  ) {
    return "config";
  }
  return "source_file";
}

export async function fetchRepositoryFiles(
  owner: string,
  repo: string,
  branch: string,
): Promise<FetchedFile[]> {
  const files: FetchedFile[] = [];

  for (const path of INDEX_PATHS) {
    const content = await fetchRawFile(owner, repo, branch, path);
    if (!content) continue;
    files.push({
      path,
      content,
      sourceType: classifyPath(path),
    });
  }

  if (files.length === 0) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        ...githubHeaders(),
        Accept: "application/vnd.github.raw",
      },
    });
    if (res.ok) {
      const content = await res.text();
      if (content.trim()) {
        files.push({ path: "README.md", content, sourceType: "readme" });
      }
    }
  }

  return files;
}

export function detectTechStack(files: FetchedFile[]): string[] {
  const stack = new Set<string>();

  for (const file of files) {
    if (file.path === "package.json") {
      try {
        const pkg = JSON.parse(file.content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const deps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };
        for (const name of Object.keys(deps ?? {})) {
          stack.add(name.toLowerCase());
          if (name === "react") stack.add("react");
          if (name.includes("supabase")) stack.add("supabase");
          if (name.includes("next")) stack.add("nextjs");
        }
      } catch {
        // ignore invalid json
      }
    }
    if (file.path === "pyproject.toml" || file.path === "requirements.txt") {
      stack.add("python");
    }
    if (file.path === "Cargo.toml") stack.add("rust");
    if (file.path === "go.mod") stack.add("go");
  }

  const text = files.map((f) => f.content.toLowerCase()).join("\n");
  for (const tech of ["typescript", "javascript", "react", "supabase", "postgres", "tailwind"]) {
    if (text.includes(tech)) stack.add(tech);
  }

  return [...stack].slice(0, 20);
}

export function summarizeReadme(files: FetchedFile[]): string {
  const readme = files.find((f) => f.sourceType === "readme");
  if (!readme) return "";

  const skipPatterns = [
    /^welcome to your lovable project/i,
    /^project info$/i,
    /^how can i edit this code/i,
    /^use lovable$/i,
    /^use github/i,
    /^there are several ways/i,
    /lovable\.dev/i,
  ];

  const lines = readme.content
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .filter(
      (l) =>
        l &&
        !l.startsWith("![") &&
        !l.startsWith("[") &&
        !skipPatterns.some((p) => p.test(l)),
    );

  return lines.slice(0, 8).join(" ").slice(0, 500);
}
