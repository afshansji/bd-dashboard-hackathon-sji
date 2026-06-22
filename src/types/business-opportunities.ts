// Business Opportunities types - adapted from SJ Control Tower Main

export type DealStage =
  | "lead"
  | "discovery"
  | "qualified"
  | "estimation"
  | "proposal"
  | "accepted"
  | "won"
  | "lost";

export interface Deal {
  id: string;
  deal_name: string;
  slug?: string;
  stage: string;
  value: number;
  probability?: number | null;
  expected_close_date?: string | null;
  created_at: string;
  created_date?: string | null;
  updated_at: string;
  deleted_at?: string | null;
  days_in_stage?: number | null;
  owner?: string | null;
  actual_deal_owner_id?: string | null;
  actual_deal_owner_email?: string | null;
  actual_deal_owner_name?: string | null;
  bd_rep_id?: string | null;
  client?: string | { id: string; name: string; slug?: string; status?: string; industry?: string; region?: string; primary_contact?: string; domain?: string } | null;
  client_id?: string | null;
  clientemail?: string | null;
  clientcompanyname?: string | null;
  clientwebsite?: string | null;
  clientlinkedinbio?: string | null;
  clientfirstname?: string | null;
  clientlastname?: string | null;
  clientphone?: string | null;
  hubspot_deal_id?: string | null;
  lovable_url?: string | null;
  pod_assigned?: string | null;
  lead_source?: string | null;
  dealtype?: string | null;
  category?: string | null;
  // Title and amount for backwards compat
  title?: string;
  amount?: number | null;
  // Joined data
  clients?: { id: string; name: string; slug?: string; status?: string; industry?: string; region?: string; primary_contact?: string; domain?: string } | null;
  bd_rep?: { id: string; email: string; full_name: string } | null;
  bd_rep_email?: string | null;
  bd_rep_name?: string | null;
}

export function normalizeDealStage(stage: string | null | undefined): DealStage {
  if (!stage) return "lead";
  const lowered = stage.trim().toLowerCase();

  switch (lowered) {
    case "lead":
    case "discovery":
    case "qualified":
    case "estimation":
    case "proposal":
    case "accepted":
    case "won":
    case "lost":
      return lowered;
    // Map old stages to new
    case "prospecting":
      return "lead";
    case "qualification":
      return "discovery";
    case "negotiation":
      return "proposal";
    case "closed_won":
      return "won";
    case "closed_lost":
      return "lost";
    default:
      return "lead";
  }
}
