import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type JobLeadOutreachType = "reply" | "email";

export interface JobLeadOutreachResponse {
  type: JobLeadOutreachType;
  content: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated. Please log in again.");

  return {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function generateJobLeadOutreach(
  jobId: string,
  type: JobLeadOutreachType,
): Promise<JobLeadOutreachResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/job-lead-outreach`, {
    method: "POST",
    headers,
    body: JSON.stringify({ jobId, type }),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore non-json
  }

  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`,
    );
  }

  return data as JobLeadOutreachResponse;
}
