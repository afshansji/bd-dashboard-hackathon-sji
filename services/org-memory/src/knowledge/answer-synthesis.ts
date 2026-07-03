import type {
  Citation,
  ProjectProfile,
  RepoRef,
} from "../graph/types.js";

const OVERVIEW_TERMS = [
  "technolog",
  "tech stack",
  "project",
  "repositor",
  "what do we have",
  "what are our",
  "overview",
  "stack",
];

const BOILERPLATE_MARKERS = [
  "welcome to your lovable project",
  "how can i edit this code",
  "use lovable",
  "use github codespaces",
  'click the "edit" button',
  "navigate to the desired file",
  "new codespace",
];

function isOverviewQuery(query?: string): boolean {
  if (!query) return false;
  const lower = query.toLowerCase();
  return OVERVIEW_TERMS.some((term) => lower.includes(term));
}

export function isBoilerplateExcerpt(text: string): boolean {
  const lower = text.toLowerCase();
  return BOILERPLATE_MARKERS.some((marker) => lower.includes(marker));
}

function cleanSummary(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed || isBoilerplateExcerpt(trimmed)) return "";
  return trimmed.slice(0, 200);
}

function formatTechStack(stack: string[]): string {
  const priority = [
    "typescript",
    "javascript",
    "react",
    "nextjs",
    "vue",
    "angular",
    "tailwind",
    "supabase",
    "postgres",
    "python",
    "go",
    "rust",
  ];
  const normalized = stack.map((s) => s.toLowerCase());
  const picked = priority.filter((t) => normalized.includes(t));
  const rest = normalized.filter((t) => !priority.includes(t)).slice(0, 3);
  return [...new Set([...picked, ...rest])].join(", ");
}

export function synthesizeAnswerText(params: {
  query?: string;
  repos?: RepoRef[];
  projects?: ProjectProfile[];
  citations?: Citation[];
  confidence?: number;
}): string {
  const repos = params.repos ?? [];
  const projects = params.projects ?? [];
  const citations = (params.citations ?? []).filter(
    (c) => !isBoilerplateExcerpt(c.excerpt),
  );
  const overview = isOverviewQuery(params.query);

  if (repos.length === 0 && projects.length === 0 && citations.length === 0) {
    return "No indexed knowledge matched your query. Register a GitHub repository and run indexing first.";
  }

  if (overview && projects.length > 0) {
    if (repos.length === 1 && projects.length === 1) {
      const repo = repos[0];
      const project = projects[0];
      const stack = formatTechStack(project.techStack);
      const summary = cleanSummary(project.summary);
      const parts = [
        `**${project.name}** is registered and indexed.`,
        stack ? `Technologies include ${stack}.` : "",
        summary ? summary : "",
        repo.url ? `Repository: ${repo.url}` : "",
      ].filter(Boolean);
      return parts.join(" ");
    }

    const lines = projects.map((p) => {
      const stack = formatTechStack(p.techStack);
      return stack ? `- **${p.name}** (${stack})` : `- **${p.name}**`;
    });
    return `Found ${repos.length} indexed repositor${repos.length === 1 ? "y" : "ies"}:\n${lines.join("\n")}`;
  }

  const sections: string[] = [];

  if (repos.length > 0) {
    const lines = repos.map((repo) => {
      const url = repo.url ? ` — ${repo.url}` : "";
      return `• ${repo.name}${url}`;
    });
    sections.push(`Repositories (${repos.length}):\n${lines.join("\n")}`);
  }

  if (projects.length > 0) {
    const lines = projects.map((p) => {
      const stack = formatTechStack(p.techStack);
      const summary = cleanSummary(p.summary);
      const parts = [`• ${p.name}`];
      if (stack) parts.push(`Tech: ${stack}`);
      if (summary) parts.push(summary);
      return parts.join(" — ");
    });
    sections.push(`Projects (${projects.length}):\n${lines.join("\n\n")}`);
  }

  const showExcerpts =
    citations.length > 0 &&
    (params.confidence ?? 0) >= 0.45 &&
    !overview;

  if (showExcerpts) {
    const excerpts = citations.map(
      (c, i) => `[${i + 1}] ${c.sourcePath}: ${c.excerpt.slice(0, 200)}`,
    );
    sections.push(`Sources:\n${excerpts.join("\n\n")}`);
  }

  return sections.join("\n\n");
}
