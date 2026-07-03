export const JOB_LEAD_SOURCES = [
  "upwork",
  "freelancer",
  "wellfound",
  "hackernews",
  "linkedin",
  "reddit",
  "twitter",
  "facebook",
] as const;

export type JobLeadSource = (typeof JOB_LEAD_SOURCES)[number];

const VALID_SOURCES = new Set<string>(JOB_LEAD_SOURCES);

const LEGACY_GENERIC_SOURCES = new Set([
  "upwork_inspector",
  "upwork-inspector",
  "",
]);

const SOURCE_ALIASES: Record<string, JobLeadSource> = {
  upwork: "upwork",
  freelancer: "freelancer",
  wellfound: "wellfound",
  angelco: "wellfound",
  "angel.co": "wellfound",
  hackernews: "hackernews",
  "hacker-news": "hackernews",
  "hacker news": "hackernews",
  hn: "hackernews",
  linkedin: "linkedin",
  reddit: "reddit",
  twitter: "twitter",
  x: "twitter",
  facebook: "facebook",
  fb: "facebook",
};

const URL_SOURCE_PATTERNS: Array<{ source: JobLeadSource; pattern: RegExp }> = [
  { source: "reddit", pattern: /(^|\.)reddit\.com|redd\.it/i },
  { source: "hackernews", pattern: /(^|\.)news\.ycombinator\.com/i },
  { source: "twitter", pattern: /(^|\.)(twitter|x)\.com/i },
  { source: "linkedin", pattern: /(^|\.)linkedin\.com/i },
  { source: "facebook", pattern: /(^|\.)(facebook|fb)\.com/i },
  { source: "upwork", pattern: /(^|\.)upwork\.com/i },
  { source: "freelancer", pattern: /(^|\.)freelancer\.com/i },
  { source: "wellfound", pattern: /(^|\.)(wellfound|angel)\.co/i },
];

export function inferJobLeadSourceFromUrl(
  jobUrl: string | null | undefined,
): JobLeadSource | null {
  const raw = jobUrl?.trim();
  if (!raw) return null;

  for (const { source, pattern } of URL_SOURCE_PATTERNS) {
    if (pattern.test(raw)) {
      return source;
    }
  }

  try {
    const hostname = new URL(raw).hostname;
    for (const { source, pattern } of URL_SOURCE_PATTERNS) {
      if (pattern.test(hostname)) {
        return source;
      }
    }
  } catch {
    // Ignore invalid URLs and rely on raw pattern matching above.
  }

  return null;
}

export function resolveJobLeadSource(
  source: string | null | undefined,
  jobUrl?: string | null | undefined,
): JobLeadSource | null {
  const fromUrl = inferJobLeadSourceFromUrl(jobUrl);
  if (fromUrl) return fromUrl;

  const normalized = source?.trim().toLowerCase() ?? "";
  if (VALID_SOURCES.has(normalized)) {
    return normalized as JobLeadSource;
  }

  if (normalized && !LEGACY_GENERIC_SOURCES.has(normalized)) {
    const aliased = SOURCE_ALIASES[normalized];
    if (aliased) return aliased;
  }

  return null;
}

export function normalizeJobLeadSourceForStorage(
  source: string | null | undefined,
  jobUrl?: string | null | undefined,
): JobLeadSource {
  return resolveJobLeadSource(source, jobUrl) ?? "upwork";
}
