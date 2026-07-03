import type {
  OrgCitationEvidence,
  OrgProjectEvidence,
  OrgRepoEvidence,
} from "./types.ts";
import type {
  CapabilityAssessmentRow,
  CapabilityCoverageRow,
  CoverageLabel,
  CoverageLevel,
  RepoContribution,
} from "./reportTypes.ts";
import {
  classifyRepository,
  formatClassificationLabel,
  getQualityWeight,
} from "./repositoryClassification.ts";

/** Canonical capability → technology indicators that imply the capability. */
export const CAPABILITY_ONTOLOGY: Record<string, string[]> = {
  "web application": [
    "react",
    "next.js",
    "nextjs",
    "javascript",
    "typescript",
    "html",
    "css",
    "spa",
    "ssr",
    "frontend",
    "vite",
    "vue",
    "angular",
    "svelte",
    "remix",
    "web app",
    "web application",
  ],
  frontend: [
    "react",
    "next.js",
    "nextjs",
    "vue",
    "angular",
    "tailwind",
    "typescript",
    "javascript",
    "css",
    "html",
    "vite",
    "frontend",
    "ui",
    "ux",
  ],
  "backend api": [
    "node",
    "nodejs",
    "node.js",
    "express",
    "nestjs",
    "fastapi",
    "django",
    "flask",
    "spring",
    "laravel",
    "rest",
    "graphql",
    "api",
    "backend",
    "microservice",
  ],
  "database architecture": [
    "postgres",
    "postgresql",
    "mysql",
    "mongodb",
    "sqlite",
    "sql",
    "prisma",
    "typeorm",
    "drizzle",
    "migration",
    "database",
    "schema",
    "supabase",
  ],
  authentication: [
    "jwt",
    "oauth",
    "rbac",
    "auth",
    "passport",
    "supabase auth",
    "cognito",
    "login",
    "session",
    "identity",
    "sso",
  ],
  "cloud infrastructure": [
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "terraform",
    "github actions",
    "ci/cd",
    "devops",
    "cloud",
    "deployment",
  ],
  payments: [
    "stripe",
    "paypal",
    "razorpay",
    "ledger",
    "billing",
    "invoice",
    "subscription",
    "checkout",
    "payment",
  ],
  ai: [
    "openai",
    "llm",
    "rag",
    "embedding",
    "langchain",
    "chatbot",
    "agent",
    "gpt",
    "anthropic",
    "claude",
    "machine learning",
    "ai",
  ],
  "admin dashboard": [
    "dashboard",
    "admin",
    "crm",
    "analytics",
    "reporting",
    "tailwind",
    "shadcn",
    "data table",
  ],
  integrations: [
    "webhook",
    "twilio",
    "slack",
    "salesforce",
    "hubspot",
    "zapier",
    "n8n",
    "integration",
    "third-party",
  ],
  ios: [
    "swift",
    "objective-c",
    "objectivec",
    "xcode",
    "uikit",
    "swiftui",
    "cocoapods",
    "podfile",
    "xcodeproj",
    "ios app",
    "native ios",
    "react-native",
    "react native",
    "ios",
  ],
  android: [
    "kotlin",
    "android studio",
    "jetpack compose",
    "gradle",
    "android app",
    "native android",
    "android sdk",
    "react-native",
    "react native",
    "android",
  ],
  "react native": [
    "react-native",
    "react native",
    "expo",
    "@react-native",
  ],
  mobile: [
    "flutter",
    "ionic",
    "capacitor",
    "cordova",
    "hybrid app",
    "cross-platform mobile",
    "mobile app",
    "mobile application",
  ],
};

/** Maps job-skill phrases (normalized) → canonical capability key. */
const CAPABILITY_ALIASES: Record<string, string> = {
  "web application": "web application",
  "web app": "web application",
  "web development": "web application",
  "web applications": "web application",
  "full stack": "web application",
  "fullstack": "web application",
  "full-stack": "web application",
  frontend: "frontend",
  "front end": "frontend",
  "front-end": "frontend",
  "backend api": "backend api",
  "backend apis": "backend api",
  backend: "backend api",
  api: "backend api",
  apis: "backend api",
  "rest api": "backend api",
  "rest apis": "backend api",
  "database architecture": "database architecture",
  "database design": "database architecture",
  database: "database architecture",
  databases: "database architecture",
  sql: "database architecture",
  authentication: "authentication",
  auth: "authentication",
  authorization: "authentication",
  "cloud infrastructure": "cloud infrastructure",
  devops: "cloud infrastructure",
  infrastructure: "cloud infrastructure",
  "ci/cd": "cloud infrastructure",
  payments: "payments",
  payment: "payments",
  billing: "payments",
  ai: "ai",
  "machine learning": "ai",
  llm: "ai",
  "admin dashboard": "admin dashboard",
  dashboard: "admin dashboard",
  crm: "admin dashboard",
  integrations: "integrations",
  integration: "integrations",
  mobile: "mobile",
  "mobile app": "mobile",
  "mobile development": "mobile",
  "mobile app development": "mobile",
  ios: "ios",
  "ios development": "ios",
  "ios experience": "ios",
  "ios app": "ios",
  swift: "ios",
  android: "android",
  "android development": "android",
  "android experience": "android",
  "android app": "android",
  kotlin: "android",
  "react native": "react native",
  "react-native": "react native",
  expo: "react native",
  flutter: "mobile",
  css: "frontend",
  html: "frontend",
  "css experience": "frontend",
  "html experience": "frontend",
  "web development experience": "web application",
  python: "backend api",
  fastapi: "backend api",
  django: "backend api",
  flask: "backend api",
  postgresql: "database architecture",
  postgres: "database architecture",
  react: "web application",
  javascript: "web application",
  typescript: "web application",
  vue: "web application",
  angular: "web application",
};

/** Exact tech tokens → capability (checked before fuzzy indicator matching). */
const DIRECT_TECH_TO_CAPABILITY: Record<string, string> = {
  react: "web application",
  javascript: "web application",
  typescript: "web application",
  vue: "web application",
  angular: "web application",
  svelte: "web application",
  nextjs: "web application",
  "next.js": "web application",
  python: "backend api",
  fastapi: "backend api",
  django: "backend api",
  flask: "backend api",
  celery: "backend api",
  node: "backend api",
  nodejs: "backend api",
  "node.js": "backend api",
  express: "backend api",
  nestjs: "backend api",
  postgresql: "database architecture",
  postgres: "database architecture",
  mysql: "database architecture",
  mongodb: "database architecture",
  prisma: "database architecture",
  ios: "ios",
  swift: "ios",
  android: "android",
  kotlin: "android",
  "react-native": "react native",
  "react native": "react native",
  expo: "react native",
  flutter: "mobile",
  css: "frontend",
  html: "frontend",
};

const BACKEND_REPO_NAME_PATTERN = /-(be|backend|api|worker|processor)$/i;

/** Skills that are foundational — low weight, auto-satisfied when repos exist. */
const FOUNDATIONAL_SKILLS = new Set([
  "git",
  "github",
  "gitlab",
  "version control",
  "source control",
  "agile",
  "scrum",
  "communication",
  "english",
]);

const FOUNDATIONAL_MATCH_WEIGHT = 0.12;

/** Max repos stored per capability claim in the report payload. */
export const EVIDENCE_REPO_DISPLAY_LIMIT = 25;

/** Max indexed repos scanned when building evidence transparency. */
export const EVIDENCE_CORPUS_REPO_LIMIT = 500;

export function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.\-/ ]/g, "").trim();
}

function isHyphenCompoundPrefix(token: string, compound: string): boolean {
  return compound.includes("-") && compound.startsWith(`${token}-`);
}

function containsAsWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i");
  if (!pattern.test(haystack)) return false;
  if (isHyphenCompoundPrefix(needle, haystack) || isHyphenCompoundPrefix(haystack, needle)) {
    return false;
  }
  return true;
}

export function tokensMatch(a: string, b: string): boolean {
  const left = normalizeToken(a);
  const right = normalizeToken(b);
  if (!left || !right) return false;
  if (left === right) return true;

  if (left.includes(" ") && right.includes(" ")) {
    return requirementIndicatorMatchesToken(left, right) ||
      requirementIndicatorMatchesToken(right, left);
  }
  if (left.includes(" ")) {
    return requirementIndicatorMatchesToken(left, right);
  }
  if (right.includes(" ")) {
    return requirementIndicatorMatchesToken(right, left);
  }

  return tokensMatchSingle(left, right);
}

function tokensMatchSingle(a: string, b: string): boolean {
  if (containsAsWord(a, b) || containsAsWord(b, a)) {
    return true;
  }

  if (isHyphenCompoundPrefix(a, b) || isHyphenCompoundPrefix(b, a)) {
    return false;
  }

  if (a.length >= 4 && b.length >= 4) {
    return a.includes(b) || b.includes(a);
  }

  return false;
}

/** Stricter matching for requirement indicators vs repo tech tokens. */
export function requirementIndicatorMatchesToken(
  indicator: string,
  token: string,
): boolean {
  const ind = normalizeToken(indicator);
  const tok = normalizeToken(token);
  if (!ind || !tok) return false;
  if (ind === tok) return true;

  const hyphenated = ind.replace(/ /g, "-");
  const compact = ind.replace(/ /g, "");
  if (tok === hyphenated || tok === compact) return true;

  if (ind.includes(" ")) {
    return containsAsWord(tok, ind);
  }

  return tokensMatchSingle(ind, tok);
}

export function isFoundationalSkill(skill: string): boolean {
  const normalized = normalizeToken(skill);
  return [...FOUNDATIONAL_SKILLS].some(
    (foundational) => tokensMatch(normalized, foundational),
  );
}

export function resolveCapabilityKey(skill: string): string | null {
  const normalized = normalizeToken(skill);

  if (isFoundationalSkill(skill)) return null;

  if (DIRECT_TECH_TO_CAPABILITY[normalized]) {
    return DIRECT_TECH_TO_CAPABILITY[normalized];
  }

  if (CAPABILITY_ALIASES[normalized]) {
    return CAPABILITY_ALIASES[normalized];
  }

  for (const [alias, key] of Object.entries(CAPABILITY_ALIASES)) {
    if (tokensMatch(normalized, alias)) return key;
  }

  for (const [key, indicators] of Object.entries(CAPABILITY_ONTOLOGY)) {
    if (indicators.some((indicator) => normalizeToken(indicator) === normalized)) {
      return key;
    }
  }

  for (const [key, indicators] of Object.entries(CAPABILITY_ONTOLOGY)) {
    if (indicators.some((indicator) => tokensMatch(normalized, indicator))) {
      return key;
    }
  }

  return null;
}

export function getCapabilityIndicators(capabilityKey: string): string[] {
  return CAPABILITY_ONTOLOGY[capabilityKey] ?? [];
}

export function expandJobRequirement(skill: string): {
  skill: string;
  capabilityKey: string | null;
  indicators: string[];
  isFoundational: boolean;
} {
  const isFoundational = isFoundationalSkill(skill);

  if (isFoundational) {
    return {
      skill,
      capabilityKey: null,
      indicators: [],
      isFoundational: true,
    };
  }

  const capabilityKey = resolveCapabilityKey(skill);

  if (capabilityKey) {
    return {
      skill,
      capabilityKey,
      indicators: getCapabilityIndicators(capabilityKey),
      isFoundational: false,
    };
  }

  return {
    skill,
    capabilityKey: null,
    indicators: [normalizeToken(skill)].filter(Boolean),
    isFoundational: false,
  };
}

export interface ProjectCapabilityProfile {
  projectId: string;
  repositoryId?: string;
  projectName: string;
  capabilities: Set<string>;
  /** capability key → matched indicator tokens */
  capabilityEvidence: Map<string, string[]>;
  /** all normalized tech/summary tokens */
  tokens: string[];
}

function collectSupplementalSignals(
  project: OrgProjectEvidence,
  citations: OrgCitationEvidence[],
): string[] {
  const signals: string[] = [];
  const repoCitations = project.repositoryId
    ? citations.filter((c) => c.repositoryId === project.repositoryId)
    : citations;

  if (BACKEND_REPO_NAME_PATTERN.test(project.name)) {
    signals.push("backend", "api");
    if (/-be$/i.test(project.name)) {
      signals.push("python", "fastapi");
    }
  }

  const stackText = project.techStack.join(" ").toLowerCase();
  if (stackText.includes("python") || stackText.includes("fastapi") ||
    stackText.includes("django") || stackText.includes("flask")) {
    signals.push("python");
  }

  for (const citation of repoCitations) {
    const path = citation.sourcePath.toLowerCase();
    const text = `${citation.sourcePath} ${citation.excerpt}`.toLowerCase();

    if (path.includes("requirements.txt") || path.includes("pyproject.toml")) {
      signals.push("python");
    }
    if (path === "package.json") {
      signals.push("javascript", "node");
    }
    if (/python|fastapi|django|flask|celery|uvicorn|gunicorn/.test(text)) {
      signals.push("python");
    }
    if (/fastapi/.test(text)) signals.push("fastapi");
    if (/django/.test(text)) signals.push("django");
    if (/react-native|@react-native-community|reactnative/.test(text)) {
      signals.push("react-native", "react native");
    }
    if (/podfile|\.xcodeproj|swiftui|uikit|cocoapods/.test(text)) {
      signals.push("swift", "ios", "xcode");
    }
    if (/build\.gradle|androidmanifest|jetpack compose|android\/app/.test(text)) {
      signals.push("android", "kotlin");
    }
    if (/\bexpo\b/.test(text)) {
      signals.push("expo", "react native");
    }
    if (/\bflutter\b/.test(text)) {
      signals.push("flutter");
    }
  }

  return signals;
}

function collectProjectTokens(
  project: OrgProjectEvidence,
  citations: OrgCitationEvidence[],
): string[] {
  const repoCitations = project.repositoryId
    ? citations.filter((c) => c.repositoryId === project.repositoryId)
    : citations;

  const parts = [
    project.name,
    project.summary,
    ...project.techStack,
    ...project.domainTags,
    ...project.keyFeatures,
    ...collectSupplementalSignals(project, citations),
    ...repoCitations.map((c) => `${c.sourcePath} ${c.excerpt}`),
  ];

  const tokens = new Set<string>();
  for (const part of parts) {
    for (const token of part.toLowerCase().split(/[^a-z0-9+#.\-/]+/)) {
      const trimmed = token.trim();
      if (trimmed.length >= 2) tokens.add(trimmed);
    }
  }
  return [...tokens];
}

function indicatorMatchesHaystack(indicator: string, haystack: string): boolean {
  const needle = normalizeToken(indicator);
  if (!needle) return false;
  const lower = haystack.toLowerCase();

  if (needle.includes(" ")) {
    return lower.includes(needle);
  }

  if (haystack.split(/[^a-z0-9+#.\-/]+/).some((token) => token === needle)) {
    return true;
  }

  const pattern = new RegExp(
    `(?:^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`,
  );
  return pattern.test(lower);
}

export function inferProjectCapabilities(
  project: OrgProjectEvidence,
  citations: OrgCitationEvidence[] = [],
): ProjectCapabilityProfile {
  const tokens = collectProjectTokens(project, citations);
  const haystack = tokens.join(" ");
  const capabilities = new Set<string>();
  const capabilityEvidence = new Map<string, string[]>();

  for (const [capabilityKey, indicators] of Object.entries(CAPABILITY_ONTOLOGY)) {
    const matchedIndicators: string[] = [];

    for (const indicator of indicators) {
      if (indicatorMatchesHaystack(indicator, haystack)) {
        matchedIndicators.push(indicator);
      }
    }

    if (matchedIndicators.length > 0) {
      capabilities.add(capabilityKey);
      capabilityEvidence.set(capabilityKey, [...new Set(matchedIndicators)]);
    }
  }

  return {
    projectId: project.id,
    repositoryId: project.repositoryId,
    projectName: project.name,
    capabilities,
    capabilityEvidence,
    tokens,
  };
}

export function buildOrgCapabilityIndex(
  projects: OrgProjectEvidence[],
  citations: OrgCitationEvidence[] = [],
): {
  profiles: ProjectCapabilityProfile[];
  orgCapabilities: Set<string>;
  /** capability → unique matched indicators across org */
  orgEvidence: Map<string, string[]>;
} {
  const profiles = projects.map((project) =>
    inferProjectCapabilities(project, citations),
  );

  const orgCapabilities = new Set<string>();
  const orgEvidence = new Map<string, Set<string>>();

  for (const profile of profiles) {
    for (const capability of profile.capabilities) {
      orgCapabilities.add(capability);
      const indicators = profile.capabilityEvidence.get(capability) ?? [];
      const existing = orgEvidence.get(capability) ?? new Set<string>();
      for (const indicator of indicators) existing.add(indicator);
      orgEvidence.set(capability, existing);
    }
  }

  const evidenceMap = new Map<string, string[]>();
  for (const [key, set] of orgEvidence.entries()) {
    evidenceMap.set(key, [...set]);
  }

  return { profiles, orgCapabilities, orgEvidence: evidenceMap };
}

export interface RequirementMatchResult {
  skill: string;
  capabilityKey: string | null;
  matched: boolean;
  coverage: number;
  isFoundational: boolean;
  weight: number;
  matchedEvidence: string[];
  reason: string;
}

function coverageLevel(coverage: number): CoverageLevel {
  if (coverage >= 75) return "strong";
  if (coverage >= 45) return "moderate";
  if (coverage > 0) return "weak";
  return "none";
}

export function coverageLabelForScore(
  coverage: number,
  level: CoverageLevel,
): CoverageLabel {
  if (level === "none" || level === "unknown" || coverage === 0) return "Unknown";
  if (level === "strong" && coverage >= 85) return "Excellent";
  if (level === "strong") return "Strong";
  if (level === "moderate") return "Moderate";
  return "Weak";
}

function formatCapabilityLabel(key: string): string {
  return key
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function computeIndicatorOverlap(
  requirementIndicators: string[],
  orgIndicators: string[],
  projectTokens: string[],
): string[] {
  const matched = new Set<string>();

  for (const req of requirementIndicators) {
    for (const org of orgIndicators) {
      if (requirementIndicatorMatchesToken(req, org)) matched.add(org);
    }
    for (const token of projectTokens) {
      if (requirementIndicatorMatchesToken(req, token)) matched.add(token);
    }
  }

  return [...matched];
}

export function matchJobRequirement(
  skill: string,
  projects: OrgProjectEvidence[],
  repos: OrgRepoEvidence[],
  citations: OrgCitationEvidence[] = [],
): RequirementMatchResult {
  const expanded = expandJobRequirement(skill);
  const { profiles, orgCapabilities, orgEvidence } = buildOrgCapabilityIndex(
    projects,
    citations,
  );

  if (expanded.isFoundational) {
    const hasRepos = repos.length > 0 || projects.length > 0;
    return {
      skill,
      capabilityKey: expanded.capabilityKey,
      matched: hasRepos,
      coverage: hasRepos ? 95 : 0,
      isFoundational: true,
      weight: FOUNDATIONAL_MATCH_WEIGHT,
      matchedEvidence: hasRepos ? ["version control", "git workflow"] : [],
      reason: hasRepos
        ? "Foundational development practice — satisfied by registered GitHub repositories."
        : "No indexed repositories available to confirm development practices.",
    };
  }

  const capabilityKey = expanded.capabilityKey;
  const allOrgTokens = profiles.flatMap((p) => p.tokens);

  let matchedEvidence: string[] = [];
  let matched = false;
  let coverage = 0;

  if (capabilityKey && orgCapabilities.has(capabilityKey)) {
    matched = true;
    matchedEvidence = orgEvidence.get(capabilityKey) ?? [];
    const supportingProjects = profiles.filter((p) =>
      p.capabilities.has(capabilityKey),
    );
    const weightedSupport = supportingProjects.reduce((sum, profile) => {
      const project = projects.find((item) => item.id === profile.projectId);
      const repo = project?.repositoryId
        ? repos.find((item) => item.id === project.repositoryId)
        : repos.find((item) => item.name === project?.name);
      if (!repo) return sum + 0.3;
      const classification = classifyRepository(repo, project, citations);
      return sum + getQualityWeight(classification);
    }, 0);

    const maxWeighted = repos.length > 0
      ? repos.reduce((sum, repo) => {
        const project =
          projects.find((item) => item.repositoryId === repo.id) ??
          projects.find((item) => item.name === repo.name);
        return sum + getQualityWeight(classifyRepository(repo, project, citations));
      }, 0) / Math.max(1, repos.length) * Math.min(repos.length, 12)
      : 3;

    const repoCoverage = maxWeighted > 0
      ? Math.min(100, (weightedSupport / maxWeighted) * 100)
      : supportingProjects.length > 0
      ? 70
      : 0;
    const indicatorDepth = Math.min(
      100,
      (matchedEvidence.length / Math.max(3, expanded.indicators.length * 0.35)) * 100,
    );
    coverage = Math.round(repoCoverage * 0.35 + indicatorDepth * 0.65);
    coverage = Math.min(100, Math.max(coverage, 55));
  } else {
    const directMatches = computeIndicatorOverlap(
      expanded.indicators,
      [...orgEvidence.values()].flat(),
      allOrgTokens,
    );

    if (directMatches.length > 0) {
      matched = true;
      matchedEvidence = directMatches;
      const repoHits = profiles.filter((profile) =>
        expanded.indicators.some((indicator) =>
          profile.tokens.some((token) =>
            requirementIndicatorMatchesToken(indicator, token),
          ),
        ),
      ).length;
      const repoCoverage = repos.length > 0
        ? (repoHits / repos.length) * 100
        : repoHits > 0
        ? 70
        : 0;
      coverage = Math.round(
        Math.min(100, repoCoverage * 0.4 + (directMatches.length / Math.max(expanded.indicators.length, 1)) * 100 * 0.6),
      );
      coverage = Math.max(coverage, 45);
    } else if (capabilityKey) {
      const fuzzyMatches = computeIndicatorOverlap(
        expanded.indicators,
        [],
        allOrgTokens,
      );
      if (fuzzyMatches.length > 0) {
        matched = true;
        matchedEvidence = fuzzyMatches;
        coverage = Math.max(45, Math.min(75, fuzzyMatches.length * 18));
      }
    }
  }

  let reason: string;
  if (matched && matchedEvidence.length > 0) {
    const label = capabilityKey ? formatCapabilityLabel(capabilityKey) : skill;
    const repoCount = profiles.filter((p) =>
      capabilityKey
        ? p.capabilities.has(capabilityKey)
        : expanded.indicators.some((ind) =>
          p.tokens.some((t) => requirementIndicatorMatchesToken(ind, t)),
        ),
    ).length;
    reason =
      `${label} matched via ${matchedEvidence.slice(0, 5).join(", ")}` +
      (repoCount > 0 ? ` — found in ${repoCount} repositories.` : ".");
  } else if (matched) {
    reason = `${skill} capability inferred from indexed organizational knowledge.`;
  } else {
    reason = `No indexed evidence for ${skill}${
      capabilityKey ? ` (${formatCapabilityLabel(capabilityKey)})` : ""
    }.`;
  }

  return {
    skill,
    capabilityKey,
    matched,
    coverage,
    isFoundational: false,
    weight: 1,
    matchedEvidence: matchedEvidence.slice(0, 12),
    reason,
  };
}

/** Collapse redundant job skills that map to the same capability (e.g. React + Web Application). */
export function dedupeRequirementResults(
  results: RequirementMatchResult[],
): RequirementMatchResult[] {
  const byKey = new Map<string, RequirementMatchResult>();

  for (const result of results) {
    const key = result.isFoundational
      ? `foundational:${normalizeToken(result.skill)}`
      : result.capabilityKey ?? `skill:${normalizeToken(result.skill)}`;
    const existing = byKey.get(key);
    if (!existing || result.coverage > existing.coverage) {
      byKey.set(key, { ...result, skill: existing?.skill ?? result.skill });
    }
  }

  return [...byKey.values()];
}

export function computeCapabilityTechnologyScore(
  jobTechnologies: string[],
  projects: OrgProjectEvidence[],
  repos: OrgRepoEvidence[],
  citations: OrgCitationEvidence[] = [],
): {
  score: number;
  matched: string[];
  missing: string[];
  requirementResults: RequirementMatchResult[];
  reason: string;
} {
  if (jobTechnologies.length === 0) {
    const hasOrgTech = projects.some((p) => p.techStack.length > 0);
    return {
      score: hasOrgTech ? 60 : 25,
      matched: [],
      missing: [],
      requirementResults: [],
      reason: hasOrgTech
        ? "No explicit job technologies listed; general engineering capability assumed from indexed repositories."
        : "No job technologies listed and no indexed tech stack found.",
    };
  }

  const requirementResults = jobTechnologies.map((skill) =>
    matchJobRequirement(skill, projects, repos, citations),
  );

  const scoringResults = dedupeRequirementResults(requirementResults);
  const nonFoundational = scoringResults.filter((r) => !r.isFoundational);

  let weightedSum = 0;
  let weightTotal = 0;
  for (const result of scoringResults) {
    weightedSum += result.coverage * result.weight;
    weightTotal += result.weight;
  }

  let score = weightTotal > 0
    ? Math.round(weightedSum / weightTotal)
    : 0;

  const strongCapabilities = nonFoundational.filter((r) => r.coverage >= 55);
  if (strongCapabilities.length >= 3 && score < 70) {
    score = Math.min(
      100,
      score + Math.min(18, strongCapabilities.length * 4),
    );
  }

  const matched = requirementResults
    .filter((r) => r.matched)
    .map((r) => r.skill);
  const missing = nonFoundational
    .filter((r) => !r.matched || r.coverage < 45)
    .map((r) => r.skill);

  const strongMatches = requirementResults.filter((r) => r.matched && r.coverage >= 55);
  const reason = strongMatches.length > 0
    ? `Capability coverage: ${
      strongMatches.map((r) => `${r.skill} (${r.coverage}%)`).slice(0, 5).join(", ")
    }.`
    : matched.length > 0
    ? `Partial capability overlap: ${matched.slice(0, 5).join(", ")}.`
    : "No matching engineering capabilities found in indexed organizational knowledge.";

  return { score, matched, missing, requirementResults, reason };
}

function humanizeEvidence(indicator: string, capabilityKey: string): string {
  const token = indicator.toLowerCase();
  if (/jwt|oauth|auth|rbac|sso/.test(token)) return "Authentication and access control";
  if (/react|vue|angular|svelte/.test(token)) return `Built ${indicator} frontend`;
  if (/postgres|mysql|mongodb|sql/.test(token)) return `${indicator} data layer`;
  if (/fastapi|django|flask|express|nestjs/.test(token)) return `${indicator} API service`;
  if (/stripe|payment|billing|ledger/.test(token)) return "Payment or billing workflows";
  if (/dashboard|admin|crm/.test(token)) return "Admin dashboard experience";
  if (/docker|kubernetes|terraform|aws|azure|gcp/.test(token)) {
    return "Cloud and deployment infrastructure";
  }
  if (/openai|llm|rag|embedding|chatbot/.test(token)) {
    return "AI and LLM integration";
  }
  const label = formatCapabilityLabel(capabilityKey);
  return `${label} via ${indicator}`;
}

function buildRelevanceBullets(
  capabilityKey: string,
  matchedIndicators: string[],
  project: OrgProjectEvidence | undefined,
  jobIndicators: string[],
): { relevantBecause: string[]; notRelevant: string[] } {
  const relevantBecause: string[] = [];
  const seen = new Set<string>();

  for (const indicator of matchedIndicators) {
    const phrase = humanizeEvidence(indicator, capabilityKey);
    const key = phrase.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      relevantBecause.push(phrase);
    }
    if (relevantBecause.length >= 4) break;
  }

  if (project) {
    for (const tech of project.techStack) {
      if (relevantBecause.length >= 4) break;
      if (jobIndicators.some((ind) => tokensMatch(ind, tech))) {
        const phrase = humanizeEvidence(tech, capabilityKey);
        const key = phrase.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          relevantBecause.push(phrase);
        }
      }
    }
  }

  const notRelevant: string[] = [];
  const projectTokens = new Set(
    [
      ...(project?.techStack ?? []),
      ...matchedIndicators,
    ].map((token) => normalizeToken(token)),
  );

  for (const indicator of jobIndicators.slice(0, 8)) {
    if (notRelevant.length >= 4) break;
    const normalized = normalizeToken(indicator);
    if (!normalized || normalized.length < 3) continue;
    const matched = [...projectTokens].some((token) => tokensMatch(token, normalized));
    if (!matched) {
      notRelevant.push(`No ${indicator} evidence`);
    }
  }

  return {
    relevantBecause: relevantBecause.slice(0, 4),
    notRelevant: notRelevant.slice(0, 4),
  };
}

function buildRepoContribution(
  repo: OrgRepoEvidence,
  project: OrgProjectEvidence | undefined,
  profile: ProjectCapabilityProfile | undefined,
  capabilityKey: string | null,
  requirementIndicators: string[],
  citations: OrgCitationEvidence[],
): RepoContribution | null {
  const repoCitations = citationsForRepo(citations, repo.id);
  const matchingTechnologies: string[] = [];

  if (profile && capabilityKey && profile.capabilities.has(capabilityKey)) {
    matchingTechnologies.push(
      ...(profile.capabilityEvidence.get(capabilityKey) ?? []),
    );
  }

  if (project) {
    for (const tech of project.techStack) {
      if (requirementIndicators.some((ind) =>
        requirementIndicatorMatchesToken(ind, tech),
      )) {
        matchingTechnologies.push(tech);
      }
    }
  }

  const citationHits = repoCitations.filter((citation) =>
    requirementIndicators.some((ind) =>
      indicatorMatchesHaystack(ind, `${citation.sourcePath} ${citation.excerpt}`),
    ),
  );

  const uniqueTech = [...new Set(matchingTechnologies)];
  if (uniqueTech.length === 0 && citationHits.length === 0) return null;

  const classification = classifyRepository(repo, project, citations);
  const qualityWeight = getQualityWeight(classification);
  const matchedIndicators = profile && capabilityKey
    ? profile.capabilityEvidence.get(capabilityKey) ?? uniqueTech
    : uniqueTech;

  const { relevantBecause, notRelevant } = buildRelevanceBullets(
    capabilityKey ?? "general",
    matchedIndicators,
    project,
    requirementIndicators,
  );

  const confidence = Math.round(
    Math.min(
      100,
      ((uniqueTech.length > 0 ? 50 : 0) +
        Math.min(40, uniqueTech.length * 12) +
        Math.min(30, citationHits.length * 15)) * qualityWeight,
    ),
  );

  const explanationParts: string[] = [];
  if (relevantBecause.length > 0) {
    explanationParts.push(relevantBecause.slice(0, 2).join("; "));
  }
  if (classification === "starter_template" || classification === "demo") {
    explanationParts.push(
      `Classified as ${formatClassificationLabel(classification)} — limited delivery evidence.`,
    );
  }

  return {
    repositoryId: repo.id,
    repositoryName: repo.name,
    repositoryUrl: repo.url,
    matchedFiles: [...new Set(citationHits.map((c) => c.sourcePath))],
    matchingTechnologies: uniqueTech,
    explanation: explanationParts.join(" ") ||
      "Indexed repository supports this capability.",
    confidence,
    classification,
    qualityWeight,
    relevantBecause,
    notRelevant,
  };
}

function citationsForRepo(
  citations: OrgCitationEvidence[],
  repositoryId: string,
): OrgCitationEvidence[] {
  return citations.filter((citation) => citation.repositoryId === repositoryId);
}

export function computeCapabilityCoverageRow(
  skill: string,
  projects: OrgProjectEvidence[],
  repos: OrgRepoEvidence[],
  citations: OrgCitationEvidence[],
  matchResult?: RequirementMatchResult,
): CapabilityCoverageRow {
  const result = matchResult ?? matchJobRequirement(skill, projects, repos, citations);
  const expanded = expandJobRequirement(skill);
  const { profiles } = buildOrgCapabilityIndex(projects, citations);

  const contributingRepos: RepoContribution[] = [];
  for (const repo of repos) {
    const project =
      projects.find((item) => item.repositoryId === repo.id) ??
      projects.find((item) => item.name === repo.name);
    const profile = project
      ? profiles.find((p) => p.projectId === project.id)
      : undefined;

    const contribution = buildRepoContribution(
      repo,
      project,
      profile,
      result.capabilityKey,
      expanded.indicators,
      citations,
    );
    if (contribution) contributingRepos.push(contribution);
  }

  contributingRepos.sort((a, b) =>
    (b.qualityWeight * b.confidence) - (a.qualityWeight * a.confidence),
  );

  let coverage = result.coverage;
  if (contributingRepos.length > 0) {
    const weightedScore = contributingRepos.reduce(
      (sum, repo) => sum + repo.qualityWeight,
      0,
    );
    const repoCoverage = Math.min(
      100,
      Math.round((weightedScore / Math.max(1, contributingRepos.length)) * 100),
    );
    coverage = Math.max(coverage, repoCoverage);
  }

  if (result.matched && result.matchedEvidence.length > 0 && coverage === 0) {
    coverage = 45;
  }

  const level = coverageLevel(coverage);

  return {
    technology: skill,
    capability: result.capabilityKey
      ? formatCapabilityLabel(result.capabilityKey)
      : undefined,
    coverage,
    level,
    reason: result.reason,
    matchedEvidence: result.matchedEvidence,
    contributingRepos: contributingRepos
      .filter((repo) => repo.qualityWeight >= 0.25)
      .slice(0, EVIDENCE_REPO_DISPLAY_LIMIT),
  };
}

export function assessOrgCapability(
  capabilityKey: string,
  importance: "critical" | "high" | "medium" | "optional",
  projects: OrgProjectEvidence[],
  repos: OrgRepoEvidence[],
  citations: OrgCitationEvidence[],
  precomputedIndex?: ReturnType<typeof buildOrgCapabilityIndex>,
): CapabilityAssessmentRow {
  const indicators = getCapabilityIndicators(capabilityKey);
  const skillLabel = formatCapabilityLabel(capabilityKey);
  const matchResult = matchJobRequirement(
    skillLabel,
    projects,
    repos,
    citations,
  );

  const expanded = expandJobRequirement(skillLabel);
  const { profiles } = precomputedIndex ??
    buildOrgCapabilityIndex(projects, citations);

  const contributingRepos: RepoContribution[] = [];
  for (const repo of repos) {
    const project =
      projects.find((item) => item.repositoryId === repo.id) ??
      projects.find((item) => item.name === repo.name);
    const profile = project
      ? profiles.find((p) => p.projectId === project.id)
      : undefined;

    const contribution = buildRepoContribution(
      repo,
      project,
      profile,
      matchResult.capabilityKey ?? capabilityKey,
      expanded.indicators.length > 0 ? expanded.indicators : indicators,
      citations,
    );
    if (contribution) contributingRepos.push(contribution);
  }

  contributingRepos.sort((a, b) =>
    (b.qualityWeight * b.confidence) - (a.qualityWeight * a.confidence),
  );

  const qualityFiltered = contributingRepos.filter((repo) =>
    repo.qualityWeight >= 0.25,
  );
  const repositoryCount = qualityFiltered.length;

  let coverage = matchResult.coverage;
  if (qualityFiltered.length > 0) {
    const weightedScore = qualityFiltered.reduce(
      (sum, repo) => sum + repo.qualityWeight * (repo.confidence / 100),
      0,
    );
    const normalized = Math.min(
      100,
      Math.round((weightedScore / Math.max(1, qualityFiltered.length)) * 100),
    );
    coverage = Math.max(coverage, normalized);
  }

  if (repositoryCount === 0 && !matchResult.matched) {
    coverage = 0;
  }

  const level: CoverageLevel = repositoryCount === 0 && !matchResult.matched
    ? "unknown"
    : coverageLevel(coverage);

  let reason = matchResult.reason;
  if (repositoryCount > 0) {
    reason =
      `${skillLabel}: ${repositoryCount} weighted supporting project${repositoryCount === 1 ? "" : "s"}` +
      (matchResult.matchedEvidence.length > 0
        ? ` via ${matchResult.matchedEvidence.slice(0, 4).join(", ")}.`
        : ".");
  } else if (level === "unknown") {
    reason = `No indexed evidence for ${skillLabel}.`;
  }

  if (importance === "critical" && level === "weak") {
    coverage = Math.max(0, coverage - 10);
  }

  const finalLevel = repositoryCount === 0 && !matchResult.matched
    ? "unknown"
    : coverageLevel(coverage);

  return {
    capabilityKey,
    label: skillLabel,
    importance,
    coverage,
    level: finalLevel,
    coverageLabel: coverageLabelForScore(coverage, finalLevel),
    repositoryCount,
    reason,
    matchedEvidence: matchResult.matchedEvidence,
    contributingRepos: qualityFiltered.slice(0, EVIDENCE_REPO_DISPLAY_LIMIT),
  };
}

export function toCapabilityCoverageRows(
  assessment: CapabilityAssessmentRow[],
): CapabilityCoverageRow[] {
  return assessment.map((row) => ({
    technology: row.label,
    capability: row.label,
    coverage: row.coverage,
    level: row.level === "unknown" ? "none" : row.level,
    reason: row.reason,
    matchedEvidence: row.matchedEvidence,
    contributingRepos: row.contributingRepos,
  }));
}
