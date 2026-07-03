import { invokeProvider } from "../providers.ts";
import { mapOrgMemoryResult } from "../opportunityIntelligence/orgMemoryBridge.ts";
import type { MeetingBrief } from "./types.ts";

export interface BriefInputContext {
  job: {
    title: string;
    description: string;
    source: string;
    jobUrl: string | null;
    skills: string[];
    jobType: string | null;
    experienceLevel: string | null;
    clientCountry: string | null;
    fixedBudget: string | null;
    hourlyRate: string | null;
  };
  opportunityAnalysis: Record<string, unknown> | null;
  companyIntelligence: Record<string, unknown> | null;
  workspace: {
    notes: string;
    proposalDraft: string;
    assignedToName: string | null;
    status: string;
    tasks: Array<{ title: string; completed: boolean }>;
    recentActivities: Array<{ action: string; detail?: string }>;
  };
  orgMemoryResult?: Record<string, unknown>;
}

function summarizeJson(label: string, data: unknown, maxLen = 6000): string {
  if (!data) return `${label}: Not available`;
  const text = JSON.stringify(data, null, 2);
  if (text.length <= maxLen) return `${label}:\n${text}`;
  return `${label}:\n${text.slice(0, maxLen)}\n...[truncated]`;
}

function buildPrompt(ctx: BriefInputContext): string {
  const { projects, repos, citations } = mapOrgMemoryResult(ctx.orgMemoryResult ?? {});
  const orgContext = summarizeJson("Organizational Memory Projects", projects.slice(0, 12));
  const repoContext = summarizeJson("Indexed Repositories", repos.slice(0, 15));
  const citationContext = summarizeJson("Knowledge Citations", citations.slice(0, 8), 3000);

  const workspaceNotes = [
    ctx.workspace.notes ? `Notes:\n${ctx.workspace.notes}` : "",
    ctx.workspace.proposalDraft ? `Proposal draft:\n${ctx.workspace.proposalDraft.slice(0, 1500)}` : "",
    ctx.workspace.assignedToName ? `Assigned owner: ${ctx.workspace.assignedToName}` : "",
    ctx.workspace.status ? `Lead status: ${ctx.workspace.status}` : "",
    ctx.workspace.tasks.length
      ? `Tasks:\n${ctx.workspace.tasks.map((t) => `- [${t.completed ? "x" : " "}] ${t.title}`).join("\n")}`
      : "",
    ctx.workspace.recentActivities.length
      ? `Recent activity:\n${ctx.workspace.recentActivities.map((a) => `- ${a.action}${a.detail ? `: ${a.detail}` : ""}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n\n");

  return `You are a senior BD consultant at SJ Innovation preparing an executive meeting brief for a discovery call.

Synthesize ALL context below into ONE professional briefing. Be concise, evidence-based, and actionable.
Do NOT invent facts. If data is missing, state assumptions clearly or omit sections.
Use natural talking points — not sales-heavy language.
Focus on business relevance for portfolio projects, not repository names alone.

Return ONLY valid JSON matching this schema:
{
  "title": "string — e.g. Discovery Call Brief: [Company/Project]",
  "executiveSummary": "string — one paragraph: what company does, why they may need SJ Innovation, why opportunity matters",
  "companySnapshot": {
    "industry": "string",
    "headquarters": "string",
    "businessModel": "string",
    "products": ["string"],
    "targetCustomers": "string",
    "companySize": "string|null",
    "growthSignals": ["string"]
  },
  "opportunitySummary": {
    "discoverySource": "string — how/why lead was found",
    "clientNeeds": "string",
    "estimatedScope": "string",
    "estimatedComplexity": "string",
    "estimatedBusinessValue": "string"
  },
  "clientPainPoints": ["string — evidence-based only"],
  "relevantExperience": [{
    "projectName": "string",
    "relevanceSummary": "string",
    "similarProblems": ["string"],
    "technologies": ["string"],
    "valueDelivered": "string"
  }],
  "suggestedTalkingPoints": ["string — natural conversation starters"],
  "discoveryQuestions": {
    "business": ["string"],
    "technical": ["string"],
    "timeline": ["string"],
    "budget": ["string"],
    "successCriteria": ["string"],
    "decisionProcess": ["string"],
    "currentPainPoints": ["string"]
  },
  "possibleRisks": [{
    "risk": "string",
    "priority": "high|medium|low",
    "followUpQuestion": "string"
  }],
  "objections": [{
    "objection": "string",
    "suggestedResponse": "string",
    "supportingEvidence": "string",
    "relevantCaseStudy": "string|null"
  }],
  "upsellOpportunities": [{
    "service": "string",
    "rationale": "string",
    "relevance": "high|medium|low"
  }],
  "closingStrategy": {
    "recommendedNextSteps": ["string"],
    "suggestions": ["string — workshop, architecture discussion, case study, estimation, proposal"]
  },
  "cheatSheet": {
    "topThingsToRemember": ["string — max 5"],
    "topRisks": ["string — max 5"],
    "topOpportunities": ["string — max 5"],
    "topCaseStudies": ["string — max 5"],
    "bestOpeningLine": "string",
    "bestClosingLine": "string",
    "questionsYouMustAsk": ["string — max 5"]
  },
  "dataSourcesUsed": ["string — list which inputs were used"]
}

=== ORIGINAL LEAD ===
Title: ${ctx.job.title}
Source: ${ctx.job.source}
URL: ${ctx.job.jobUrl ?? "N/A"}
Type: ${ctx.job.jobType ?? "N/A"}
Experience: ${ctx.job.experienceLevel ?? "N/A"}
Country: ${ctx.job.clientCountry ?? "N/A"}
Budget: ${ctx.job.fixedBudget ?? ctx.job.hourlyRate ?? "N/A"}
Skills: ${ctx.job.skills.join(", ") || "N/A"}
Description:
${ctx.job.description.slice(0, 3000)}

=== WORKSPACE CONTEXT ===
${workspaceNotes || "No workspace notes or owner assigned."}

${summarizeJson("Opportunity Intelligence Analysis", ctx.opportunityAnalysis, 8000)}

${summarizeJson("Company Intelligence Report", ctx.companyIntelligence, 8000)}

${orgContext}

${repoContext}

${citationContext}`;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asPriority(value: unknown): "high" | "medium" | "low" {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function normalizeBrief(parsed: Record<string, unknown>): MeetingBrief {
  const snapshot = (parsed.companySnapshot ?? {}) as Record<string, unknown>;
  const opp = (parsed.opportunitySummary ?? {}) as Record<string, unknown>;
  const questions = (parsed.discoveryQuestions ?? {}) as Record<string, unknown>;
  const closing = (parsed.closingStrategy ?? {}) as Record<string, unknown>;
  const cheat = (parsed.cheatSheet ?? {}) as Record<string, unknown>;

  return {
    title: asString(parsed.title, "Discovery Call Brief"),
    executiveSummary: asString(parsed.executiveSummary),
    companySnapshot: {
      industry: asString(snapshot.industry),
      headquarters: asString(snapshot.headquarters),
      businessModel: asString(snapshot.businessModel),
      products: asStringArray(snapshot.products),
      targetCustomers: asString(snapshot.targetCustomers),
      companySize: snapshot.companySize ? asString(snapshot.companySize) : null,
      growthSignals: asStringArray(snapshot.growthSignals),
    },
    opportunitySummary: {
      discoverySource: asString(opp.discoverySource),
      clientNeeds: asString(opp.clientNeeds),
      estimatedScope: asString(opp.estimatedScope),
      estimatedComplexity: asString(opp.estimatedComplexity),
      estimatedBusinessValue: asString(opp.estimatedBusinessValue),
    },
    clientPainPoints: asStringArray(parsed.clientPainPoints),
    relevantExperience: Array.isArray(parsed.relevantExperience)
      ? parsed.relevantExperience.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          projectName: asString(item.projectName),
          relevanceSummary: asString(item.relevanceSummary),
          similarProblems: asStringArray(item.similarProblems),
          technologies: asStringArray(item.technologies),
          valueDelivered: asString(item.valueDelivered),
        };
      })
      : [],
    suggestedTalkingPoints: asStringArray(parsed.suggestedTalkingPoints),
    discoveryQuestions: {
      business: asStringArray(questions.business),
      technical: asStringArray(questions.technical),
      timeline: asStringArray(questions.timeline),
      budget: asStringArray(questions.budget),
      successCriteria: asStringArray(questions.successCriteria),
      decisionProcess: asStringArray(questions.decisionProcess),
      currentPainPoints: asStringArray(questions.currentPainPoints),
    },
    possibleRisks: Array.isArray(parsed.possibleRisks)
      ? parsed.possibleRisks.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          risk: asString(item.risk),
          priority: asPriority(item.priority),
          followUpQuestion: asString(item.followUpQuestion),
        };
      })
      : [],
    objections: Array.isArray(parsed.objections)
      ? parsed.objections.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          objection: asString(item.objection),
          suggestedResponse: asString(item.suggestedResponse),
          supportingEvidence: asString(item.supportingEvidence),
          relevantCaseStudy: item.relevantCaseStudy ? asString(item.relevantCaseStudy) : null,
        };
      })
      : [],
    upsellOpportunities: Array.isArray(parsed.upsellOpportunities)
      ? parsed.upsellOpportunities.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          service: asString(item.service),
          rationale: asString(item.rationale),
          relevance: asPriority(item.relevance),
        };
      })
      : [],
    closingStrategy: {
      recommendedNextSteps: asStringArray(closing.recommendedNextSteps),
      suggestions: asStringArray(closing.suggestions),
    },
    cheatSheet: {
      topThingsToRemember: asStringArray(cheat.topThingsToRemember).slice(0, 5),
      topRisks: asStringArray(cheat.topRisks).slice(0, 5),
      topOpportunities: asStringArray(cheat.topOpportunities).slice(0, 5),
      topCaseStudies: asStringArray(cheat.topCaseStudies).slice(0, 5),
      bestOpeningLine: asString(cheat.bestOpeningLine),
      bestClosingLine: asString(cheat.bestClosingLine),
      questionsYouMustAsk: asStringArray(cheat.questionsYouMustAsk).slice(0, 5),
    },
    generatedAt: new Date().toISOString(),
    dataSourcesUsed: asStringArray(parsed.dataSourcesUsed),
  };
}

export async function buildMeetingBrief(ctx: BriefInputContext): Promise<MeetingBrief> {
  const result = await invokeProvider(
    { provider: "openai", model: "gpt-4o-mini", temperature: 0.25, maxTokens: 5000 },
    [
      {
        role: "system",
        content:
          "You produce executive meeting preparation briefs for B2B software development sales. Return only valid JSON.",
      },
      { role: "user", content: buildPrompt(ctx) },
    ],
  );

  if (!result.content) {
    throw new Error(result.telemetry.error?.message ?? "Meeting brief generation failed");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(result.content) as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse meeting brief JSON");
  }

  return normalizeBrief(parsed);
}
