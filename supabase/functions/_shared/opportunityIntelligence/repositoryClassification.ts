import type {
  OrgCitationEvidence,
  OrgProjectEvidence,
  OrgRepoEvidence,
} from "./types.ts";

export type RepoQualityClassification =
  | "production_product"
  | "client_project"
  | "internal_product"
  | "framework"
  | "starter_template"
  | "demo"
  | "poc"
  | "learning_repository"
  | "infrastructure";

export const QUALITY_WEIGHTS: Record<RepoQualityClassification, number> = {
  production_product: 1,
  client_project: 0.95,
  internal_product: 0.9,
  infrastructure: 0.7,
  framework: 0.5,
  poc: 0.4,
  demo: 0.25,
  starter_template: 0.2,
  learning_repository: 0.15,
};

const STARTER_NAME_PATTERN =
  /\b(template|starter|boilerplate|scaffold|skeleton|example|sample|hello-world|getting-started)\b/i;
const DEMO_NAME_PATTERN = /\b(demo|playground|sandbox|test-app|toy)\b/i;
const POC_NAME_PATTERN = /\b(poc|proof[- ]of[- ]concept|prototype|mvp)\b/i;
const FRAMEWORK_NAME_PATTERN = /\b(framework|sdk|toolkit|cli|library|lib)\b/i;
const INFRA_NAME_PATTERN =
  /\b(infra|infrastructure|devops|terraform|helm|k8s|kubernetes|ci-cd|pipeline)\b/i;
const LEARNING_NAME_PATTERN = /\b(learn|learning|tutorial|course|bootcamp|practice)\b/i;
const CLIENT_NAME_PATTERN = /\b(client|customer|external)\b/i;

function repoCitations(
  citations: OrgCitationEvidence[],
  repositoryId: string,
): OrgCitationEvidence[] {
  return citations.filter((citation) => citation.repositoryId === repositoryId);
}

function substantialReadme(citations: OrgCitationEvidence[]): boolean {
  const readme = citations.find((c) =>
    /readme/i.test(c.sourcePath) && c.excerpt.length >= 120,
  );
  return Boolean(readme);
}

export function classifyRepository(
  repo: OrgRepoEvidence,
  project: OrgProjectEvidence | undefined,
  citations: OrgCitationEvidence[] = [],
): RepoQualityClassification {
  const name = repo.name.toLowerCase();
  const summary = (project?.summary ?? "").toLowerCase();
  const techCount = project?.techStack.length ?? 0;
  const featureCount = project?.keyFeatures.length ?? 0;
  const domainCount = project?.domainTags.length ?? 0;
  const repoCitationList = repoCitations(citations, repo.id);
  const hasReadme = substantialReadme(repoCitationList);

  if (STARTER_NAME_PATTERN.test(name) || /contentstack starter/i.test(summary)) {
    return "starter_template";
  }
  if (DEMO_NAME_PATTERN.test(name)) return "demo";
  if (POC_NAME_PATTERN.test(name)) return "poc";
  if (LEARNING_NAME_PATTERN.test(name)) return "learning_repository";
  if (FRAMEWORK_NAME_PATTERN.test(name)) return "framework";
  if (INFRA_NAME_PATTERN.test(name)) return "infrastructure";

  const richness = techCount + featureCount + domainCount + (hasReadme ? 2 : 0);

  if (CLIENT_NAME_PATTERN.test(name) || CLIENT_NAME_PATTERN.test(summary)) {
    return "client_project";
  }

  if (
    richness >= 5 &&
    (domainCount > 0 || featureCount >= 2) &&
    techCount >= 3
  ) {
    return "production_product";
  }

  if (richness >= 4 && techCount >= 2) {
    return "internal_product";
  }

  if (techCount <= 1 && !hasReadme && featureCount === 0) {
    return "demo";
  }

  if (richness >= 2) {
    return "internal_product";
  }

  return "poc";
}

export function getQualityWeight(classification: RepoQualityClassification): number {
  return QUALITY_WEIGHTS[classification];
}

export function formatClassificationLabel(
  classification: RepoQualityClassification,
): string {
  return classification
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
