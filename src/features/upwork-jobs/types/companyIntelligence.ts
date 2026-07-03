export interface LeadershipContact {
  role: string;
  name: string | null;
  title: string | null;
  linkedIn: string | null;
  notes: string | null;
}

export interface ContactChannel {
  type: string;
  value: string;
  notes?: string | null;
}

export interface SocialProfile {
  platform: string;
  url: string | null;
  handle?: string | null;
  notes?: string | null;
}

export interface TechnologySignal {
  name: string;
  category: string;
  confidence: "high" | "medium" | "low";
  source?: string | null;
}

export interface GrowthSignal {
  signal: string;
  detail: string;
  relevance: string;
}

export interface PotentialOpportunity {
  area: string;
  rationale: string;
  confidence: "high" | "medium" | "low";
}

export interface PortfolioMatch {
  projectId: string;
  projectName: string;
  repositoryName?: string | null;
  repositoryUrl?: string | null;
  relevanceSummary: string;
  technologyOverlap: string[];
  similarBusinessProblems: string[];
  matchScore: number;
}

export interface OutreachGuidance {
  conversationStarter: string;
  recommendedContact: string;
  outreachAngle: string;
  painPoints: string[];
  capabilitiesToHighlight: string[];
}

export interface DiscoveryCallPrep {
  suggestedQuestions: string[];
  businessQuestions: string[];
  technicalQuestions: string[];
  risksToClarify: string[];
  upsellOpportunities: string[];
}

export interface CompanyOverview {
  companyName: string;
  whatTheyDo: string;
  industry: string;
  productsAndServices: string[];
  targetCustomers: string;
  locations: string[];
  businessSummary: string;
}

export interface BusinessUnderstanding {
  problemSolved: string;
  targetAudience: string;
  primaryOfferings: string[];
  businessModel: string;
  growthSignals: string[];
}

export interface CompanyIntelligenceReport {
  executiveSummary: string;
  companyOverview: CompanyOverview;
  leadership: LeadershipContact[];
  leadershipNote: string;
  contactInformation: ContactChannel[];
  socialPresence: SocialProfile[];
  businessUnderstanding: BusinessUnderstanding;
  technologySignals: TechnologySignal[];
  technologyNote: string;
  growthSignals: GrowthSignal[];
  potentialOpportunities: PotentialOpportunity[];
  portfolioMatches: PortfolioMatch[];
  outreachGuidance: OutreachGuidance;
  discoveryCallPrep: DiscoveryCallPrep;
  researchedAt: string;
  sourceWebsite: string;
}

export interface CompanyIntelligenceResponse {
  report: CompanyIntelligenceReport;
  companyWebsite: string;
  cached: boolean;
  id: string;
  researchedAt: string;
}
