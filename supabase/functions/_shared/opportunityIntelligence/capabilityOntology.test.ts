import {
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  computeCapabilityTechnologyScore,
  expandJobRequirement,
  inferProjectCapabilities,
  matchJobRequirement,
  requirementIndicatorMatchesToken,
  resolveCapabilityKey,
  tokensMatch,
  assessOrgCapability,
} from "./capabilityOntology.ts";
import {
  classifyRepository,
  getQualityWeight,
} from "./repositoryClassification.ts";
import type { OrgProjectEvidence, OrgRepoEvidence } from "./types.ts";

const sampleProjects: OrgProjectEvidence[] = [
  {
    id: "p1",
    name: "patient-portal",
    summary: "HIPAA patient portal with React dashboard",
    techStack: ["react", "typescript", "tailwind", "@supabase/supabase-js", "jwt"],
    domainTags: ["healthcare"],
    keyFeatures: [],
    repositoryId: "r1",
  },
  {
    id: "p2",
    name: "crm-api",
    summary: "REST API for sales pipeline",
    techStack: ["node.js", "express", "postgresql", "prisma"],
    domainTags: ["saas"],
    keyFeatures: [],
    repositoryId: "r2",
  },
];

const sampleRepos: OrgRepoEvidence[] = [
  { id: "r1", name: "patient-portal", url: "https://github.com/org/patient-portal" },
  { id: "r2", name: "crm-api", url: "https://github.com/org/crm-api" },
];

Deno.test("resolveCapabilityKey maps job phrases to canonical capabilities", () => {
  assertEquals(resolveCapabilityKey("Web Application"), "web application");
  assertEquals(resolveCapabilityKey("Database Architecture"), "database architecture");
  assertEquals(resolveCapabilityKey("REST API"), "backend api");
});

Deno.test("inferProjectCapabilities expands tech stack into capabilities", () => {
  const profile = inferProjectCapabilities(sampleProjects[0]);
  assertEquals(profile.capabilities.has("web application"), true);
  assertEquals(profile.capabilities.has("authentication"), true);
  assertEquals(profile.capabilities.has("database architecture"), true);
  assertEquals(profile.capabilities.has("admin dashboard"), true);
});

Deno.test("matchJobRequirement matches Web Application via React stack", () => {
  const result = matchJobRequirement(
    "Web Application",
    sampleProjects,
    sampleRepos,
  );
  assertEquals(result.matched, true);
  assertEquals(result.coverage >= 45, true);
  assertEquals(result.matchedEvidence.includes("react"), true);
});

Deno.test("matchJobRequirement matches Database Architecture via PostgreSQL", () => {
  const result = matchJobRequirement(
    "Database Architecture",
    sampleProjects,
    sampleRepos,
  );
  assertEquals(result.matched, true);
  assertEquals(
    result.matchedEvidence.some((ev) => ev.includes("postgres")),
    true,
  );
});

Deno.test("Git is foundational and auto-satisfied when repos exist", () => {
  const result = matchJobRequirement("Git", sampleProjects, sampleRepos);
  assertEquals(result.matched, true);
  assertEquals(result.isFoundational, true);
  assertEquals(result.coverage >= 90, true);
});

Deno.test("computeCapabilityTechnologyScore uses weighted capability coverage", () => {
  const scored = computeCapabilityTechnologyScore(
    ["Web Application", "Database Architecture", "Git"],
    sampleProjects,
    sampleRepos,
  );
  assertEquals(scored.matched.includes("Web Application"), true);
  assertEquals(scored.matched.includes("Database Architecture"), true);
  assertEquals(scored.score >= 55, true);
});

Deno.test("resolveCapabilityKey maps React to web application not mobile", () => {
  assertEquals(resolveCapabilityKey("React"), "web application");
  assertEquals(resolveCapabilityKey("JavaScript"), "web application");
  assertEquals(resolveCapabilityKey("Python"), "backend api");
});

Deno.test("tokensMatch avoids git vs github false positive", () => {
  assertEquals(tokensMatch("git", "github"), false);
  assertEquals(tokensMatch("git", "github actions"), false);
  assertEquals(tokensMatch("react", "react"), true);
  assertEquals(tokensMatch("react", "react native"), false);
});

Deno.test("requirementIndicatorMatchesToken links react-native not plain react", () => {
  assertEquals(requirementIndicatorMatchesToken("react native", "react"), false);
  assertEquals(requirementIndicatorMatchesToken("react native", "react-native"), true);
  assertEquals(requirementIndicatorMatchesToken("ios", "ios"), true);
  assertEquals(requirementIndicatorMatchesToken("ios", "react"), false);
});

Deno.test("resolveCapabilityKey maps platform skills to distinct capabilities", () => {
  assertEquals(resolveCapabilityKey("iOS experience"), "ios");
  assertEquals(resolveCapabilityKey("Android experience"), "android");
  assertEquals(resolveCapabilityKey("React Native"), "react native");
  assertEquals(resolveCapabilityKey("Mobile App Development"), "mobile");
});

Deno.test("plain React web repos are not iOS evidence", () => {
  const projects = Array.from({ length: 12 }, (_, i) => ({
    id: `p${i}`,
    name: `react-app-${i}`,
    summary: "SaaS web dashboard",
    techStack: ["react", "typescript"],
    domainTags: ["saas"],
    keyFeatures: [],
    repositoryId: `r${i}`,
  }));
  const repos = projects.map((p) => ({
    id: p.repositoryId!,
    name: p.name,
    url: `https://github.com/org/${p.name}`,
  }));

  const assessment = assessOrgCapability("iOS experience", "high", projects, repos, []);
  assertEquals(assessment.repositoryCount, 0);
  assertEquals(assessment.contributingRepos.length, 0);
});

Deno.test("resolveCapabilityKey maps CSS and HTML experience to frontend", () => {
  assertEquals(resolveCapabilityKey("CSS experience"), "frontend");
  assertEquals(resolveCapabilityKey("HTML experience"), "frontend");
  assertEquals(resolveCapabilityKey("Web Development experience"), "web application");
});

Deno.test("evidence scan counts all repos in corpus not just job-relevant subset", () => {
  const projects = Array.from({ length: 40 }, (_, i) => ({
    id: `p${i}`,
    name: `react-app-${i}`,
    summary: "React web dashboard",
    techStack: ["react", "typescript", "css", "html"],
    domainTags: [],
    keyFeatures: [],
    repositoryId: `r${i}`,
  }));
  const repos = projects.map((p) => ({
    id: p.repositoryId!,
    name: p.name,
    url: `https://github.com/org/${p.name}`,
  }));

  const assessment = assessOrgCapability("CSS", "high", projects, repos, []);
  assertEquals(assessment.repositoryCount, 40);
  assertEquals(assessment.contributingRepos.length, 25);
});

Deno.test("hybrid mobile and react-native repos count as platform evidence", () => {
  const projects = [
    {
      id: "p1",
      name: "gate-tribe-hybrid-app",
      summary: "Hybrid mobile application for community platform",
      techStack: ["react-native", "typescript"],
      domainTags: [],
      keyFeatures: [],
      repositoryId: "r1",
    },
    {
      id: "p2",
      name: "retirement-pulse-ai",
      summary: "Financial planning web application",
      techStack: ["react", "typescript"],
      domainTags: [],
      keyFeatures: [],
      repositoryId: "r2",
    },
    {
      id: "p3",
      name: "Health-HubAI",
      summary: "Healthcare dashboard with mobile-friendly responsive layout",
      techStack: ["react", "next.js"],
      domainTags: [],
      keyFeatures: [],
      repositoryId: "r3",
    },
  ];
  const repos = projects.map((p) => ({
    id: p.repositoryId!,
    name: p.name,
    url: `https://github.com/org/${p.name}`,
  }));

  const ios = assessOrgCapability("iOS experience", "high", projects, repos, []);
  assertEquals(ios.contributingRepos.some((r) => r.repositoryName === "gate-tribe-hybrid-app"), true);
  assertEquals(ios.contributingRepos.some((r) => r.repositoryName === "retirement-pulse-ai"), false);
  assertEquals(ios.contributingRepos.some((r) => r.repositoryName === "Health-HubAI"), false);

  const android = assessOrgCapability("Android experience", "high", projects, repos, []);
  assertEquals(android.contributingRepos.some((r) => r.repositoryName === "gate-tribe-hybrid-app"), true);
  assertEquals(android.contributingRepos.some((r) => r.repositoryName === "retirement-pulse-ai"), false);
});

Deno.test("Git is foundational without cloud infrastructure capability", () => {
  const expanded = expandJobRequirement("Git");
  assertEquals(expanded.isFoundational, true);
  assertEquals(expanded.capabilityKey, null);
});

Deno.test("Python detected for backend repos like paige-be", () => {
  const projects: OrgProjectEvidence[] = [{
    id: "p-paige",
    name: "paige-be",
    summary: "Backend API service",
    techStack: [],
    domainTags: [],
    keyFeatures: [],
    repositoryId: "r-paige",
  }];
  const repos: OrgRepoEvidence[] = [{
    id: "r-paige",
    name: "paige-be",
    url: "https://github.com/sjinnovation/paige-be",
  }];

  const result = matchJobRequirement("Python", projects, repos);
  assertEquals(result.matched, true);
  assertEquals(result.coverage >= 45, true);
  assertEquals(result.capabilityKey, "backend api");
});

Deno.test("fullstack fintech job skills match via capability ontology", () => {
  const projects: OrgProjectEvidence[] = Array.from({ length: 20 }, (_, i) => ({
    id: `p${i}`,
    name: `react-project-${i}`,
    summary: "SaaS dashboard application",
    techStack: ["typescript", "react", "tailwind"],
    domainTags: ["fintech"],
    keyFeatures: [],
    repositoryId: `r${i}`,
  }));

  projects.push({
    id: "p-pg",
    name: "sj-control-main-new",
    summary: "Business management platform",
    techStack: ["typescript", "react", "postgres", "supabase"],
    domainTags: [],
    keyFeatures: [],
    repositoryId: "r-pg",
  });

  projects.push({
    id: "p-paige",
    name: "paige-be",
    summary: "Python FastAPI backend",
    techStack: [],
    domainTags: [],
    keyFeatures: [],
    repositoryId: "r-paige",
  });

  const repos: OrgRepoEvidence[] = [
    ...projects.map((p) => ({
      id: p.repositoryId!,
      name: p.name,
      url: `https://github.com/sjinnovation/${p.name}`,
    })),
  ];

  const jobSkills = [
    "Web Application",
    "SQL",
    "Database Architecture",
    "Git",
    "PostgreSQL",
    "Python",
    "React",
    "JavaScript",
  ];

  const webApp = matchJobRequirement("Web Application", projects, repos);
  assertEquals(webApp.matched, true);
  assertEquals(webApp.coverage >= 55, true);
  assertEquals(webApp.matchedEvidence.includes("react"), true);

  const dbArch = matchJobRequirement("Database Architecture", projects, repos);
  assertEquals(dbArch.matched, true);
  assertEquals(dbArch.coverage >= 45, true);

  const git = matchJobRequirement("Git", projects, repos);
  assertEquals(git.matched, true);
  assertEquals(git.coverage >= 90, true);

  const sql = matchJobRequirement("SQL", projects, repos);
  assertEquals(sql.matched, true);

  const python = matchJobRequirement("Python", projects, repos);
  assertEquals(python.matched, true);

  const scored = computeCapabilityTechnologyScore(jobSkills, projects, repos);
  assertEquals(scored.score >= 55, true);
  assertEquals(scored.matched.includes("Web Application"), true);
  assertEquals(scored.matched.includes("Database Architecture"), true);
  assertEquals(scored.reason.includes("Capability coverage"), true);
});

Deno.test("classifyRepository demotes starter templates", () => {
  const repo: OrgRepoEvidence = {
    id: "r-template",
    name: "template-react-headless",
    url: "https://github.com/org/template-react-headless",
  };
  const project: OrgProjectEvidence = {
    id: "p-template",
    name: "template-react-headless",
    summary: "Build a Starter Website with React.js and Contentstack",
    techStack: ["react", "javascript"],
    domainTags: [],
    keyFeatures: [],
    repositoryId: "r-template",
  };

  const classification = classifyRepository(repo, project);
  assertEquals(classification, "starter_template");
  assertEquals(getQualityWeight(classification), 0.2);
});
