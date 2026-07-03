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

export const JOB_LEAD_SOURCE_LABELS: Record<JobLeadSource, string> = {
  upwork: "Upwork",
  freelancer: "Freelancer",
  wellfound: "Wellfound",
  hackernews: "Hacker News",
  linkedin: "LinkedIn",
  reddit: "Reddit",
  twitter: "Twitter / X",
  facebook: "Facebook",
};

export const JOB_LEAD_SOURCE_STYLES: Record<JobLeadSource, string> = {
  upwork: "bg-green-100 text-green-800 border-green-200",
  freelancer: "bg-blue-100 text-blue-800 border-blue-200",
  wellfound: "bg-purple-100 text-purple-800 border-purple-200",
  hackernews: "bg-amber-100 text-amber-900 border-amber-200",
  linkedin: "bg-sky-100 text-sky-800 border-sky-200",
  reddit: "bg-orange-100 text-orange-800 border-orange-200",
  twitter: "bg-slate-100 text-slate-800 border-slate-200",
  facebook: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

export const JOB_LEAD_VIEW_LABELS: Record<JobLeadSource, string> = {
  upwork: "View on Upwork",
  freelancer: "View on Freelancer",
  wellfound: "View on Wellfound",
  hackernews: "View on Hacker News",
  linkedin: "View on LinkedIn",
  reddit: "View on Reddit",
  twitter: "View on X",
  facebook: "View on Facebook",
};

export const GENERIC_SOURCE_LABEL = "Other";
export const GENERIC_SOURCE_STYLE = "bg-gray-100 text-gray-800 border-gray-200";
export const GENERIC_VIEW_LABEL = "View original";

export const FEED_SOURCES = new Set<JobLeadSource>([
  "hackernews",
  "linkedin",
  "reddit",
  "twitter",
  "facebook",
]);

export const LEAD_TYPES = ["hiring", "post", "job"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  hiring: "Hiring",
  post: "Post",
  job: "Job listing",
};

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

export function isJobLeadSource(value: string): value is JobLeadSource {
  return (JOB_LEAD_SOURCES as readonly string[]).includes(value);
}

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
  if (isJobLeadSource(normalized)) {
    return normalized;
  }

  if (normalized && !LEGACY_GENERIC_SOURCES.has(normalized)) {
    const aliased = SOURCE_ALIASES[normalized];
    if (aliased) return aliased;
  }

  return null;
}

/** @deprecated Use resolveJobLeadSource(source, jobUrl) instead. */
export function normalizeJobLeadSource(value: string | null | undefined): JobLeadSource {
  return resolveJobLeadSource(value) ?? "upwork";
}

export function getJobLeadSourceLabel(
  source: string | null | undefined,
  jobUrl?: string | null,
): string {
  const resolved = resolveJobLeadSource(source, jobUrl);
  return resolved ? JOB_LEAD_SOURCE_LABELS[resolved] : GENERIC_SOURCE_LABEL;
}

export function getJobLeadSourceStyle(
  source: string | null | undefined,
  jobUrl?: string | null,
): string {
  const resolved = resolveJobLeadSource(source, jobUrl);
  return resolved ? JOB_LEAD_SOURCE_STYLES[resolved] : GENERIC_SOURCE_STYLE;
}

export function getJobLeadViewLabel(
  source: string | null | undefined,
  jobUrl?: string | null,
): string {
  const resolved = resolveJobLeadSource(source, jobUrl);
  return resolved ? JOB_LEAD_VIEW_LABELS[resolved] : GENERIC_VIEW_LABEL;
}
