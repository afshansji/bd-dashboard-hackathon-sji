import {
  CAPABILITY_ONTOLOGY,
  expandJobRequirement,
  resolveCapabilityKey,
} from "./capabilityOntology.ts";
import type { CapabilityImportance, RequiredCapability } from "./reportTypes.ts";
import type { JobSignals, UpworkJobRow } from "./types.ts";

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  healthcare: ["health", "healthcare", "medical", "patient", "hipaa", "clinical", "pharma"],
  fintech: ["fintech", "finance", "banking", "payment", "trading", "crypto", "wallet"],
  ecommerce: ["ecommerce", "e-commerce", "shopify", "storefront", "cart", "checkout"],
  saas: ["saas", "subscription", "b2b", "platform", "dashboard", "portal"],
  edtech: ["education", "learning", "lms", "course", "student", "school"],
  real_estate: ["real estate", "property", "listing", "rental", "mls"],
  logistics: ["logistics", "shipping", "fleet", "warehouse", "inventory", "supply chain"],
};

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function inferDomain(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return domain.replace(/_/g, " ");
    }
  }
  return null;
}

function extractFeaturePhrases(description: string): string[] {
  const sentences = description
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12 && s.length <= 180);

  const featureLike = sentences.filter((sentence) =>
    /\b(build|develop|implement|integrate|create|need|require|must|should|feature|module|system|api|dashboard|portal|automation)\b/i
      .test(sentence),
  );

  return uniqueStrings(featureLike).slice(0, 8);
}

function extractClientExpectations(description: string, experienceLevel: string | null): string[] {
  const expectations: string[] = [];
  if (experienceLevel) expectations.push(`Experience level: ${experienceLevel}`);
  const lower = description.toLowerCase();
  if (lower.includes("long-term")) expectations.push("Long-term engagement expected");
  if (lower.includes("immediate start") || lower.includes("asap")) {
    expectations.push("Immediate start requested");
  }
  if (lower.includes("communication") || lower.includes("responsive")) {
    expectations.push("Strong communication expected");
  }
  return uniqueStrings(expectations);
}

export function extractJobSignals(job: UpworkJobRow): JobSignals {
  const technologies = uniqueStrings([
    ...(Array.isArray(job.skills) ? job.skills : []),
  ]);

  const budget = job.hourly_rate ?? job.fixed_budget ?? null;
  const timelineParts = [job.project_length, job.weekly_hours].filter(Boolean);
  const timeline = timelineParts.length > 0 ? timelineParts.join(" · ") : null;

  const combinedText = [job.title, job.description].filter(Boolean).join("\n");

  return {
    technologies,
    domain: inferDomain(combinedText),
    features: extractFeaturePhrases(job.description ?? ""),
    budget,
    timeline,
    clientExpectations: extractClientExpectations(
      job.description ?? "",
      job.experience_level,
    ),
  };
}

function formatCapabilityLabel(key: string): string {
  return key
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const IMPORTANCE_RANK: Record<CapabilityImportance, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  optional: 1,
};

function higherImportance(
  current: CapabilityImportance,
  candidate: CapabilityImportance,
): CapabilityImportance {
  return IMPORTANCE_RANK[candidate] > IMPORTANCE_RANK[current]
    ? candidate
    : current;
}

function inferImportanceFromText(
  capabilityKey: string,
  jobText: string,
  fromSkills: boolean,
): CapabilityImportance {
  const lower = jobText.toLowerCase();
  const label = capabilityKey.replace(/ /g, "[ -]?");
  const criticalPattern = new RegExp(
    `(must|required|essential|critical|mandatory).{0,40}${label}|${label}.{0,40}(must|required|essential)`,
    "i",
  );
  const optionalPattern = new RegExp(
    `(nice to have|optional|bonus|preferred).{0,40}${label}|${label}.{0,40}(optional|bonus)`,
    "i",
  );

  if (criticalPattern.test(lower)) return "critical";
  if (optionalPattern.test(lower)) return "optional";
  if (fromSkills) return "high";
  return "medium";
}

function detectCapabilitiesInDescription(text: string): string[] {
  const lower = text.toLowerCase();
  const detected: string[] = [];

  for (const [capabilityKey, indicators] of Object.entries(CAPABILITY_ONTOLOGY)) {
    if (indicators.some((indicator) => lower.includes(indicator.toLowerCase()))) {
      detected.push(capabilityKey);
    }
  }

  return detected;
}

export function extractRequiredCapabilities(
  job: UpworkJobRow,
  signals: JobSignals,
): RequiredCapability[] {
  const combinedText = [job.title, job.description].filter(Boolean).join("\n");
  const byKey = new Map<string, RequiredCapability>();

  for (const skill of signals.technologies) {
    const expanded = expandJobRequirement(skill);
    if (expanded.isFoundational) continue;

    const capabilityKey = expanded.capabilityKey ??
      resolveCapabilityKey(skill);
    if (!capabilityKey) continue;

    const importance = inferImportanceFromText(capabilityKey, combinedText, true);
    const existing = byKey.get(capabilityKey);
    byKey.set(capabilityKey, {
      key: capabilityKey,
      label: formatCapabilityLabel(capabilityKey),
      importance: existing
        ? higherImportance(existing.importance, importance)
        : importance,
    });
  }

  for (const capabilityKey of detectCapabilitiesInDescription(combinedText)) {
    if (byKey.has(capabilityKey)) continue;
    byKey.set(capabilityKey, {
      key: capabilityKey,
      label: formatCapabilityLabel(capabilityKey),
      importance: inferImportanceFromText(capabilityKey, combinedText, false),
    });
  }

  if (byKey.size === 0 && signals.technologies.length > 0) {
    for (const skill of signals.technologies) {
      const expanded = expandJobRequirement(skill);
      if (expanded.isFoundational) continue;
      const key = `skill:${skill.toLowerCase()}`;
      byKey.set(key, {
        key,
        label: skill,
        importance: "high",
      });
    }
  }

  const order: CapabilityImportance[] = ["critical", "high", "medium", "optional"];
  return [...byKey.values()].sort((a, b) =>
    order.indexOf(a.importance) - order.indexOf(b.importance),
  );
}

export function buildOrgMemoryQuery(job: UpworkJobRow, signals: JobSignals): string {
  const techLine = signals.technologies.length
    ? `Required technologies: ${signals.technologies.join(", ")}.`
    : "";
  const domainLine = signals.domain ? `Business domain: ${signals.domain}.` : "";
  const featureLine = signals.features.length
    ? `Requested capabilities: ${signals.features.slice(0, 5).join("; ")}.`
    : "";

  return [
    `Does SJ Innovation have relevant experience for this Upwork opportunity?`,
    `Job title: ${job.title}.`,
    techLine,
    domainLine,
    featureLine,
    `Job summary: ${(job.description ?? "").slice(0, 600)}`,
  ].filter(Boolean).join(" ");
}
