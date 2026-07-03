import type { UpworkJobRow } from "./types.ts";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are SJ Innovation's Business Development Copilot.

You already know:
- The complete job description
- Opportunity Intelligence Report
- Capability Assessment
- Delivery Assessment
- Repository Evidence
- Similar Projects
- Technology Coverage
- Engineering Risks
- Repository summaries
- Retrieved citations

Rules:
- Never invent company experience.
- Always answer using repository evidence from the provided context.
- When possible, explain WHY — not just what the report says.
- Never simply repeat the report verbatim.
- Provide actionable advice for BD, sales, and engineering decisions.
- If supplementary org memory results are provided, use them for that specific question.
- If evidence is insufficient, say so clearly and suggest what to verify.
- Use markdown formatting: headings, bullet lists, tables, and code blocks when helpful.
- Keep responses focused and practical.`;

function compactJob(job: UpworkJobRow): Record<string, unknown> {
  return {
    title: job.title,
    description: job.description,
    job_type: job.job_type,
    hourly_rate: job.hourly_rate,
    fixed_budget: job.fixed_budget,
    experience_level: job.experience_level,
    project_length: job.project_length,
    weekly_hours: job.weekly_hours,
    skills: job.skills,
    client_country: job.client_country,
  };
}

export function buildCopilotSystemPrompt(
  job: UpworkJobRow,
  analysis: Record<string, unknown>,
  supplementaryEvidence?: string,
): string {
  const sections = [
    SYSTEM_PROMPT,
    "\n\n## UPWORK JOB\n",
    JSON.stringify(compactJob(job), null, 2),
    "\n\n## OPPORTUNITY INTELLIGENCE ANALYSIS (complete JSON)\n",
    JSON.stringify(analysis, null, 2),
  ];

  if (supplementaryEvidence) {
    sections.push(
      "\n\n## SUPPLEMENTARY ORG MEMORY QUERY RESULTS\n",
      "The user asked about evidence not fully covered in the report above. Use this additional retrieval:\n",
      supplementaryEvidence,
    );
  }

  return sections.join("");
}

export function buildChatMessages(
  systemPrompt: string,
  history: CopilotMessage[],
  userMessage: string,
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  const recent = history.slice(-20);
  for (const msg of recent) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

const REPORT_TECH_PATTERNS = [
  /\b(react|vue|angular|svelte|next\.?js|nuxt)\b/i,
  /\b(node\.?js|express|nestjs|fastify)\b/i,
  /\b(python|django|flask|fastapi)\b/i,
  /\b(postgres|postgresql|mysql|mongodb|redis|supabase)\b/i,
  /\b(aws|azure|gcp|amplify|lambda|s3|ec2)\b/i,
  /\b(stripe|paypal|payment)\b/i,
  /\b(ai|ml|machine learning|openai|llm|langchain)\b/i,
  /\b(mobile|react native|flutter|ios|android|swift|kotlin)\b/i,
  /\b(graphql|rest api|microservice)\b/i,
  /\b(kubernetes|docker|terraform)\b/i,
];

function collectKnownTerms(analysis: Record<string, unknown>): Set<string> {
  const known = new Set<string>();
  const json = JSON.stringify(analysis).toLowerCase();
  for (const pattern of REPORT_TECH_PATTERNS) {
    const matches = json.match(new RegExp(pattern.source, "gi"));
    if (matches) {
      for (const m of matches) known.add(m.toLowerCase());
    }
  }
  return known;
}

function extractQueryTechTerms(message: string): string[] {
  const terms: string[] = [];
  for (const pattern of REPORT_TECH_PATTERNS) {
    const matches = message.match(new RegExp(pattern.source, "gi"));
    if (matches) terms.push(...matches.map((m) => m.toLowerCase()));
  }
  return [...new Set(terms)];
}

const SUPPLEMENTARY_TRIGGERS = [
  /\bshow\b.*\bprojects?\b/i,
  /\bwhich\b.*\brepositor/i,
  /\bfind\b.*\bprojects?\b/i,
  /\bdo we have\b/i,
  /\bhave we\b.*\b(built|done|worked)\b/i,
  /\bexamples?\b.*\bof\b/i,
  /\bprojects?\b.*\busing\b/i,
  /\brepos?\b.*\bwith\b/i,
];

export function needsSupplementaryOrgQuery(
  message: string,
  analysis: Record<string, unknown>,
): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;

  const hasTrigger = SUPPLEMENTARY_TRIGGERS.some((p) => p.test(trimmed));
  const queryTerms = extractQueryTechTerms(trimmed);
  if (queryTerms.length === 0 && !hasTrigger) return false;

  const known = collectKnownTerms(analysis);
  const unknownTerms = queryTerms.filter((t) => !known.has(t));

  if (unknownTerms.length > 0) return true;

  if (hasTrigger && queryTerms.length > 0) {
    return queryTerms.some((t) => !known.has(t));
  }

  if (hasTrigger) {
    const explicitNewTech = trimmed.match(
      /\b(?:using|with|for)\s+([a-z0-9+#.-]+(?:\s+[a-z0-9+#.-]+)?)/i,
    );
    if (explicitNewTech) {
      const candidate = explicitNewTech[1].toLowerCase();
      return !known.has(candidate) && !jsonIncludesLoose(JSON.stringify(analysis), candidate);
    }
  }

  return false;
}

function jsonIncludesLoose(json: string, term: string): boolean {
  return json.toLowerCase().includes(term.toLowerCase());
}

export function buildSupplementaryQuery(message: string): string {
  return message.trim();
}
