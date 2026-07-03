import { invokeProvider } from "../providers.ts";
import { mapOrgMemoryResult } from "../opportunityIntelligence/orgMemoryBridge.ts";
import type { CompanyIntelligenceReport } from "./types.ts";

interface OrgProject {
  id: string;
  name: string;
  summary: string;
  techStack: string[];
  domainTags: string[];
}

function buildResearchPrompt(website: string, jobTitle?: string, jobDescription?: string): string {
  const jobContext = jobTitle
    ? `\n\nLead context — the BD team is evaluating this opportunity:\nTitle: ${jobTitle}\n${jobDescription ? `Description: ${jobDescription.slice(0, 800)}` : ""}`
    : "";

  return `Research the company at ${website} using only publicly available information from their website and reputable public sources.

Do NOT invent private contact details, emails, or phone numbers. If information is not publicly available, say so.

Gather:
- Company overview (name, what they do, industry, products/services, target customers, locations)
- Leadership & decision makers (founder, CEO, CTO, VP Engineering, product leads — only if publicly listed)
- Public contact channels (general email, sales, support, phone, contact forms, office locations)
- Social profiles (LinkedIn, GitHub, Twitter/X, Facebook, Instagram, YouTube)
- Business model and problems they solve
- Technology stack signals (from job posts, builtwith, careers pages, engineering blogs if visible)
- Growth signals (hiring, careers page, new products, blog activity, expansion, AI initiatives)
- Areas where a software development agency like SJ Innovation could potentially help

Write concise executive-style notes — do not copy large blocks of website text.${jobContext}`;
}

function buildStructuringPrompt(
  website: string,
  researchNotes: string,
  portfolioProjects: OrgProject[],
): string {
  const portfolioContext = portfolioProjects.length > 0
    ? `\n\nInternal portfolio projects for matching (select the most relevant, explain why):\n${portfolioProjects
      .slice(0, 15)
      .map((p) =>
        `- ${p.name}: ${p.summary.slice(0, 200)} | Tech: ${p.techStack.join(", ")} | Domains: ${p.domainTags.join(", ")}`
      )
      .join("\n")}`
    : "\n\nNo internal portfolio projects were retrieved — return an empty portfolioMatches array.";

  return `You are a BD intelligence analyst at SJ Innovation, a software development agency.

Convert the research notes below into a structured JSON company intelligence report for outreach preparation.

Rules:
- Be concise and actionable — executive brief style, not raw website dumps
- Only include publicly verifiable information from the research notes
- If leadership, contact, technology, or social info was not found, use empty arrays and explain in leadershipNote/technologyNote
- potentialOpportunities are recommendations, not assumptions — use confidence levels
- portfolioMatches: pick up to 5 most relevant internal projects with matchScore 0-100
- Do not fabricate contact details

Return ONLY valid JSON matching this schema:
{
  "executiveSummary": "string — 2-3 sentence account brief",
  "companyOverview": {
    "companyName": "string",
    "whatTheyDo": "string",
    "industry": "string",
    "productsAndServices": ["string"],
    "targetCustomers": "string",
    "locations": ["string"],
    "businessSummary": "string"
  },
  "leadership": [{ "role": "string", "name": "string|null", "title": "string|null", "linkedIn": "string|null", "notes": "string|null" }],
  "leadershipNote": "string",
  "contactInformation": [{ "type": "string", "value": "string", "notes": "string|null" }],
  "socialPresence": [{ "platform": "string", "url": "string|null", "handle": "string|null", "notes": "string|null" }],
  "businessUnderstanding": {
    "problemSolved": "string",
    "targetAudience": "string",
    "primaryOfferings": ["string"],
    "businessModel": "string",
    "growthSignals": ["string"]
  },
  "technologySignals": [{ "name": "string", "category": "string", "confidence": "high|medium|low", "source": "string|null" }],
  "technologyNote": "string",
  "growthSignals": [{ "signal": "string", "detail": "string", "relevance": "string" }],
  "potentialOpportunities": [{ "area": "string", "rationale": "string", "confidence": "high|medium|low" }],
  "portfolioMatches": [{
    "projectId": "string",
    "projectName": "string",
    "repositoryName": "string|null",
    "repositoryUrl": "string|null",
    "relevanceSummary": "string",
    "technologyOverlap": ["string"],
    "similarBusinessProblems": ["string"],
    "matchScore": 0
  }],
  "outreachGuidance": {
    "conversationStarter": "string",
    "recommendedContact": "string",
    "outreachAngle": "string",
    "painPoints": ["string"],
    "capabilitiesToHighlight": ["string"]
  },
  "discoveryCallPrep": {
    "suggestedQuestions": ["string"],
    "businessQuestions": ["string"],
    "technicalQuestions": ["string"],
    "risksToClarify": ["string"],
    "upsellOpportunities": ["string"]
  }
}

Company website: ${website}
${portfolioContext}

Research notes:
${researchNotes}`;
}

function normalizeReport(
  parsed: Record<string, unknown>,
  website: string,
): CompanyIntelligenceReport {
  const overview = (parsed.companyOverview ?? {}) as Record<string, unknown>;
  const business = (parsed.businessUnderstanding ?? {}) as Record<string, unknown>;
  const outreach = (parsed.outreachGuidance ?? {}) as Record<string, unknown>;
  const discovery = (parsed.discoveryCallPrep ?? {}) as Record<string, unknown>;

  return {
    executiveSummary: String(parsed.executiveSummary ?? ""),
    companyOverview: {
      companyName: String(overview.companyName ?? "Unknown"),
      whatTheyDo: String(overview.whatTheyDo ?? ""),
      industry: String(overview.industry ?? ""),
      productsAndServices: Array.isArray(overview.productsAndServices)
        ? overview.productsAndServices.map(String)
        : [],
      targetCustomers: String(overview.targetCustomers ?? ""),
      locations: Array.isArray(overview.locations)
        ? overview.locations.map(String)
        : [],
      businessSummary: String(overview.businessSummary ?? ""),
    },
    leadership: Array.isArray(parsed.leadership)
      ? parsed.leadership.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          role: String(item.role ?? ""),
          name: item.name ? String(item.name) : null,
          title: item.title ? String(item.title) : null,
          linkedIn: item.linkedIn ? String(item.linkedIn) : null,
          notes: item.notes ? String(item.notes) : null,
        };
      })
      : [],
    leadershipNote: String(parsed.leadershipNote ?? ""),
    contactInformation: Array.isArray(parsed.contactInformation)
      ? parsed.contactInformation.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          type: String(item.type ?? ""),
          value: String(item.value ?? ""),
          notes: item.notes ? String(item.notes) : null,
        };
      })
      : [],
    socialPresence: Array.isArray(parsed.socialPresence)
      ? parsed.socialPresence.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          platform: String(item.platform ?? ""),
          url: item.url ? String(item.url) : null,
          handle: item.handle ? String(item.handle) : null,
          notes: item.notes ? String(item.notes) : null,
        };
      })
      : [],
    businessUnderstanding: {
      problemSolved: String(business.problemSolved ?? ""),
      targetAudience: String(business.targetAudience ?? ""),
      primaryOfferings: Array.isArray(business.primaryOfferings)
        ? business.primaryOfferings.map(String)
        : [],
      businessModel: String(business.businessModel ?? ""),
      growthSignals: Array.isArray(business.growthSignals)
        ? business.growthSignals.map(String)
        : [],
    },
    technologySignals: Array.isArray(parsed.technologySignals)
      ? parsed.technologySignals.map((row) => {
        const item = row as Record<string, unknown>;
        const confidence = item.confidence;
        return {
          name: String(item.name ?? ""),
          category: String(item.category ?? ""),
          confidence: confidence === "high" || confidence === "medium" || confidence === "low"
            ? confidence
            : "low",
          source: item.source ? String(item.source) : null,
        };
      })
      : [],
    technologyNote: String(parsed.technologyNote ?? ""),
    growthSignals: Array.isArray(parsed.growthSignals)
      ? parsed.growthSignals.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          signal: String(item.signal ?? ""),
          detail: String(item.detail ?? ""),
          relevance: String(item.relevance ?? ""),
        };
      })
      : [],
    potentialOpportunities: Array.isArray(parsed.potentialOpportunities)
      ? parsed.potentialOpportunities.map((row) => {
        const item = row as Record<string, unknown>;
        const confidence = item.confidence;
        return {
          area: String(item.area ?? ""),
          rationale: String(item.rationale ?? ""),
          confidence: confidence === "high" || confidence === "medium" || confidence === "low"
            ? confidence
            : "low",
        };
      })
      : [],
    portfolioMatches: Array.isArray(parsed.portfolioMatches)
      ? parsed.portfolioMatches.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          projectId: String(item.projectId ?? ""),
          projectName: String(item.projectName ?? ""),
          repositoryName: item.repositoryName ? String(item.repositoryName) : null,
          repositoryUrl: item.repositoryUrl ? String(item.repositoryUrl) : null,
          relevanceSummary: String(item.relevanceSummary ?? ""),
          technologyOverlap: Array.isArray(item.technologyOverlap)
            ? item.technologyOverlap.map(String)
            : [],
          similarBusinessProblems: Array.isArray(item.similarBusinessProblems)
            ? item.similarBusinessProblems.map(String)
            : [],
          matchScore: typeof item.matchScore === "number" ? item.matchScore : 0,
        };
      })
      : [],
    outreachGuidance: {
      conversationStarter: String(outreach.conversationStarter ?? ""),
      recommendedContact: String(outreach.recommendedContact ?? ""),
      outreachAngle: String(outreach.outreachAngle ?? ""),
      painPoints: Array.isArray(outreach.painPoints)
        ? outreach.painPoints.map(String)
        : [],
      capabilitiesToHighlight: Array.isArray(outreach.capabilitiesToHighlight)
        ? outreach.capabilitiesToHighlight.map(String)
        : [],
    },
    discoveryCallPrep: {
      suggestedQuestions: Array.isArray(discovery.suggestedQuestions)
        ? discovery.suggestedQuestions.map(String)
        : [],
      businessQuestions: Array.isArray(discovery.businessQuestions)
        ? discovery.businessQuestions.map(String)
        : [],
      technicalQuestions: Array.isArray(discovery.technicalQuestions)
        ? discovery.technicalQuestions.map(String)
        : [],
      risksToClarify: Array.isArray(discovery.risksToClarify)
        ? discovery.risksToClarify.map(String)
        : [],
      upsellOpportunities: Array.isArray(discovery.upsellOpportunities)
        ? discovery.upsellOpportunities.map(String)
        : [],
    },
    researchedAt: new Date().toISOString(),
    sourceWebsite: website,
  };
}

export async function buildCompanyIntelligenceReport(input: {
  website: string;
  jobTitle?: string;
  jobDescription?: string;
  orgMemoryResult?: Record<string, unknown>;
}): Promise<CompanyIntelligenceReport> {
  const researchPrompt = buildResearchPrompt(
    input.website,
    input.jobTitle,
    input.jobDescription,
  );

  const researchResult = await invokeProvider(
    { provider: "perplexity", model: "sonar", temperature: 0.2, maxTokens: 2500 },
    [
      {
        role: "system",
        content:
          "You are a business development research assistant. Provide factual, publicly sourced company intelligence for B2B outreach. Never invent private contact information.",
      },
      { role: "user", content: researchPrompt },
    ],
  );

  if (!researchResult.content) {
    throw new Error(
      researchResult.telemetry.error?.message ?? "Company research failed",
    );
  }

  const { projects } = mapOrgMemoryResult(input.orgMemoryResult ?? {});
  const orgProjects: OrgProject[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    summary: p.summary,
    techStack: p.techStack,
    domainTags: p.domainTags,
  }));

  const structureResult = await invokeProvider(
    { provider: "openai", model: "gpt-4o-mini", temperature: 0.2, maxTokens: 4000 },
    [
      {
        role: "system",
        content:
          "You produce structured JSON company intelligence reports for business development teams. Return only valid JSON.",
      },
      {
        role: "user",
        content: buildStructuringPrompt(
          input.website,
          researchResult.content,
          orgProjects,
        ),
      },
    ],
  );

  if (!structureResult.content) {
    throw new Error(
      structureResult.telemetry.error?.message ?? "Failed to structure company report",
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(structureResult.content) as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse company intelligence report JSON");
  }

  return normalizeReport(parsed, input.website);
}
