export interface CompanySnapshot {
  industry: string;
  headquarters: string;
  businessModel: string;
  products: string[];
  targetCustomers: string;
  companySize: string | null;
  growthSignals: string[];
}

export interface OpportunitySummary {
  discoverySource: string;
  clientNeeds: string;
  estimatedScope: string;
  estimatedComplexity: string;
  estimatedBusinessValue: string;
}

export interface RelevantExperience {
  projectName: string;
  relevanceSummary: string;
  similarProblems: string[];
  technologies: string[];
  valueDelivered: string;
}

export interface DiscoveryQuestions {
  business: string[];
  technical: string[];
  timeline: string[];
  budget: string[];
  successCriteria: string[];
  decisionProcess: string[];
  currentPainPoints: string[];
}

export interface PossibleRisk {
  risk: string;
  priority: "high" | "medium" | "low";
  followUpQuestion: string;
}

export interface ObjectionResponse {
  objection: string;
  suggestedResponse: string;
  supportingEvidence: string;
  relevantCaseStudy: string | null;
}

export interface UpsellOpportunity {
  service: string;
  rationale: string;
  relevance: "high" | "medium" | "low";
}

export interface ClosingStrategy {
  recommendedNextSteps: string[];
  suggestions: string[];
}

export interface AiCheatSheet {
  topThingsToRemember: string[];
  topRisks: string[];
  topOpportunities: string[];
  topCaseStudies: string[];
  bestOpeningLine: string;
  bestClosingLine: string;
  questionsYouMustAsk: string[];
}

export interface MeetingBrief {
  title: string;
  executiveSummary: string;
  companySnapshot: CompanySnapshot;
  opportunitySummary: OpportunitySummary;
  clientPainPoints: string[];
  relevantExperience: RelevantExperience[];
  suggestedTalkingPoints: string[];
  discoveryQuestions: DiscoveryQuestions;
  possibleRisks: PossibleRisk[];
  objections: ObjectionResponse[];
  upsellOpportunities: UpsellOpportunity[];
  closingStrategy: ClosingStrategy;
  cheatSheet: AiCheatSheet;
  generatedAt: string;
  dataSourcesUsed: string[];
}

export interface MeetingBriefWorkspaceContext {
  notes: string;
  proposalDraft: string;
  assignedToName: string | null;
  status: string;
  tasks: Array<{ title: string; completed: boolean }>;
  recentActivities: Array<{ action: string; detail?: string }>;
}

export interface MeetingBriefResponse {
  brief: MeetingBrief;
  cached: boolean;
  id: string;
  generatedAt: string;
}
