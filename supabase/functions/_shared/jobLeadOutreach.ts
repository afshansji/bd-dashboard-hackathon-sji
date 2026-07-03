export type OutreachType = "reply" | "email";

export interface JobLeadOutreachContext {
  title: string;
  description: string;
  source: string | null;
  lead_type: string | null;
  job_url: string | null;
  job_type: string | null;
  skills: string[];
  client_country: string | null;
}

export interface OutreachProjectProof {
  name: string;
  summary?: string;
  tech?: string;
  url?: string;
  relevantBecause?: string;
}

export interface OutreachEvidence {
  orgMemorySummary: string | null;
  projects: OutreachProjectProof[];
  capabilityProof: string[];
}

const PLATFORM_REPLY_GUIDANCE: Record<string, string> = {
  reddit:
    "Write like a helpful Reddit comment. Casual, direct, no corporate jargon. 2-4 short paragraphs max.",
  twitter:
    "Write a concise X/Twitter reply. Under 280 characters if possible, otherwise keep it very short.",
  hackernews:
    "Write like a Hacker News comment. Technical, thoughtful, understated. No marketing fluff.",
  linkedin:
    "Write a professional LinkedIn comment or DM-style message. Warm but businesslike.",
  facebook: "Write a friendly, conversational reply suitable for Facebook.",
  upwork:
    "Write a strong Upwork proposal cover letter opening. Focus on relevant experience and approach.",
  freelancer:
    "Write a Freelancer.com proposal message. Professional and bid-focused.",
  wellfound:
    "Write a concise startup outreach message suitable for Wellfound.",
};

const TRUST_BUILDING_RULES = [
  "Build trust by showing we have already done similar work — not just that we can.",
  "Include 1-2 concrete proof points from COMPANY EVIDENCE when available: project/product names, what was built, and relevant tech.",
  "Tie each proof point directly to the poster's problem (e.g. quiz funnels, onboarding flows, conversion UX).",
  "Never invent clients, project names, metrics, or case studies that are not in COMPANY EVIDENCE.",
  "If evidence is limited, be honest and credible: mention the type of work and stack without fabricating names.",
  "Sound like a real practitioner sharing relevant experience, not a generic agency pitch.",
];

function platformLabel(source: string | null): string {
  const labels: Record<string, string> = {
    upwork: "Upwork",
    freelancer: "Freelancer",
    wellfound: "Wellfound",
    hackernews: "Hacker News",
    linkedin: "LinkedIn",
    reddit: "Reddit",
    twitter: "X / Twitter",
    facebook: "Facebook",
  };
  return labels[source ?? ""] ?? "this platform";
}

function buildLeadSummary(job: JobLeadOutreachContext): string {
  const lines = [
    `Platform: ${platformLabel(job.source)}`,
    job.lead_type ? `Lead type: ${job.lead_type}` : null,
    job.job_type ? `Job type: ${job.job_type}` : null,
    job.client_country ? `Location: ${job.client_country}` : null,
    job.job_url ? `URL: ${job.job_url}` : null,
    `Title: ${job.title || "(untitled)"}`,
    `Description:\n${job.description || "(no description)"}`,
    job.skills.length > 0 ? `Skills: ${job.skills.join(", ")}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildOutreachQuery(job: JobLeadOutreachContext): string {
  const techLine = job.skills.length
    ? `Technologies: ${job.skills.join(", ")}.`
    : "";
  return [
    "What similar projects, products, or client work has SJ Innovation delivered that matches this lead?",
    `Title: ${job.title}.`,
    techLine,
    `Summary: ${(job.description ?? "").slice(0, 600)}`,
  ].filter(Boolean).join(" ");
}

export function extractOutreachEvidenceFromAnalysis(
  analysis: Record<string, unknown> | null,
): OutreachEvidence {
  const empty: OutreachEvidence = {
    orgMemorySummary: null,
    projects: [],
    capabilityProof: [],
  };
  if (!analysis) return empty;

  const report =
    (analysis.report as Record<string, unknown> | undefined) ?? analysis;

  const projects = new Map<string, OutreachProjectProof>();
  const capabilityProof: string[] = [];

  const capabilityAssessment = Array.isArray(report.capabilityAssessment)
    ? report.capabilityAssessment
    : [];

  for (const row of capabilityAssessment) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label : null;
    const level = typeof record.level === "string" ? record.level : null;
    const reason = typeof record.reason === "string" ? record.reason : null;

    if (label && level && ["strong", "moderate"].includes(level)) {
      capabilityProof.push(
        `${label}: ${reason ?? `Demonstrated ${level} coverage in our portfolio`}`,
      );
    }

    const repos = Array.isArray(record.contributingRepos)
      ? record.contributingRepos
      : [];
    for (const repo of repos) {
      if (!repo || typeof repo !== "object") continue;
      const r = repo as Record<string, unknown>;
      const id = String(r.repositoryId ?? r.repositoryName ?? "");
      if (!id) continue;

      const tech = Array.isArray(r.matchingTechnologies)
        ? r.matchingTechnologies.map(String).join(", ")
        : undefined;

      projects.set(id, {
        name: String(r.repositoryName ?? "Project"),
        url: r.repositoryUrl ? String(r.repositoryUrl) : undefined,
        summary: r.explanation ? String(r.explanation) : undefined,
        tech,
        relevantBecause: Array.isArray(r.relevantBecause)
          ? r.relevantBecause.map(String).slice(0, 2).join("; ")
          : undefined,
      });
    }
  }

  const similarProjects = Array.isArray(report.similarProjects)
    ? report.similarProjects
    : [];
  for (const project of similarProjects) {
    if (!project || typeof project !== "object") continue;
    const p = project as Record<string, unknown>;
    const id = String(p.projectId ?? p.repositoryId ?? p.repositoryName ?? "");
    if (!id) continue;

    projects.set(id, {
      name: String(p.repositoryName ?? p.projectId ?? "Project"),
      url: p.repositoryUrl ? String(p.repositoryUrl) : undefined,
      summary: p.summary ? String(p.summary) : undefined,
      tech: Array.isArray(p.technologyStack)
        ? p.technologyStack.map(String).join(", ")
        : undefined,
      relevantBecause: Array.isArray(p.matchReasons)
        ? p.matchReasons.map(String).slice(0, 2).join("; ")
        : undefined,
    });
  }

  return {
    orgMemorySummary: null,
    projects: [...projects.values()].slice(0, 6),
    capabilityProof: capabilityProof.slice(0, 6),
  };
}

export function mergeOutreachEvidence(
  analysisEvidence: OutreachEvidence,
  orgMemory: {
    answer?: string;
    projects?: Array<Record<string, unknown>>;
    citations?: Array<{ sourcePath?: string; excerpt?: string }>;
  } | null,
): OutreachEvidence {
  const projects = new Map<string, OutreachProjectProof>();

  for (const project of analysisEvidence.projects) {
    projects.set(project.name.toLowerCase(), project);
  }

  for (const project of orgMemory?.projects ?? []) {
    const name = String(project.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = projects.get(key);
    const stack = Array.isArray(project.techStack)
      ? project.techStack.map(String).join(", ")
      : undefined;
    const summary = project.summary ? String(project.summary) : undefined;

    projects.set(key, {
      name,
      url: project.url ? String(project.url) : existing?.url,
      summary: summary ?? existing?.summary,
      tech: stack ?? existing?.tech,
      relevantBecause: existing?.relevantBecause,
    });
  }

  const citationProof = (orgMemory?.citations ?? [])
    .filter((c) => c.excerpt && c.excerpt.length > 40)
    .slice(0, 3)
    .map((c) => `${c.sourcePath}: ${String(c.excerpt).slice(0, 160)}`);

  return {
    orgMemorySummary: orgMemory?.answer?.trim() || analysisEvidence.orgMemorySummary,
    projects: [...projects.values()].slice(0, 6),
    capabilityProof: [
      ...analysisEvidence.capabilityProof,
      ...citationProof,
    ].slice(0, 8),
  };
}

export function formatOutreachEvidence(evidence: OutreachEvidence | null): string {
  if (!evidence) {
    return "No indexed company evidence available. Do not invent project names.";
  }

  const sections: string[] = [];

  if (evidence.orgMemorySummary) {
    sections.push(`Org memory summary:\n${evidence.orgMemorySummary}`);
  }

  if (evidence.projects.length > 0) {
    const lines = evidence.projects.map((project) => {
      const parts = [`- ${project.name}`];
      if (project.tech) parts.push(`Tech: ${project.tech}`);
      if (project.summary) parts.push(`What we built: ${project.summary}`);
      if (project.relevantBecause) {
        parts.push(`Why it matters here: ${project.relevantBecause}`);
      }
      if (project.url) parts.push(`Link: ${project.url}`);
      return parts.join(" | ");
    });
    sections.push(`Relevant past work:\n${lines.join("\n")}`);
  }

  if (evidence.capabilityProof.length > 0) {
    sections.push(
      `Capability proof:\n${evidence.capabilityProof.map((line) => `- ${line}`).join("\n")}`,
    );
  }

  if (sections.length === 0) {
    return "No indexed company evidence available. Do not invent project names.";
  }

  return sections.join("\n\n");
}

export function buildOutreachMessages(
  type: OutreachType,
  job: JobLeadOutreachContext,
  evidence: OutreachEvidence | null = null,
): Array<{ role: "system" | "user"; content: string }> {
  const platform = job.source ?? "unknown";
  const guidance =
    PLATFORM_REPLY_GUIDANCE[platform] ??
    "Match the tone of the platform. Be helpful, specific, and human.";

  const leadSummary = buildLeadSummary(job);
  const evidenceBlock = formatOutreachEvidence(evidence);
  const trustRules = TRUST_BUILDING_RULES.join(" ");

  if (type === "reply") {
    return [
      {
        role: "system",
        content: [
          "You are a business development assistant for SJ Innovation, a software development agency.",
          "Generate a ready-to-paste reply the user can post on the original thread or platform.",
          guidance,
          trustRules,
          "Open by showing you understand their specific need, then mention relevant work we have already delivered.",
          "Do not use markdown code fences. Output only the reply text.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          "Generate a suggested reply for this lead.",
          "Use COMPANY EVIDENCE for trust-building proof points.",
          `\nLEAD:\n${leadSummary}`,
          `\nCOMPANY EVIDENCE:\n${evidenceBlock}`,
        ].join("\n"),
      },
    ];
  }

  return [
    {
      role: "system",
      content: [
        "You are a business development assistant for SJ Innovation, a software development agency.",
        "Generate a ready-to-send outreach email based on the lead context.",
        "Start with a line exactly like: Subject: <subject line>",
        "Then a blank line, then the email body.",
        trustRules,
        "Include a short 'relevant experience' section with 1-2 concrete examples from COMPANY EVIDENCE.",
        "Keep it professional, specific, and under 220 words.",
        "Do not use markdown code fences.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        "Generate a suggested outreach email for this lead.",
        "Use COMPANY EVIDENCE to show we have already done similar work.",
        `\nLEAD:\n${leadSummary}`,
        `\nCOMPANY EVIDENCE:\n${evidenceBlock}`,
      ].join("\n"),
    },
  ];
}
