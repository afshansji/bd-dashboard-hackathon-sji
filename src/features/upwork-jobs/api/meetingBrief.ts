import { supabase } from "@/integrations/supabase/client";
import type {
  MeetingBriefResponse,
  MeetingBriefWorkspaceContext,
} from "../types/meetingBrief";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function meetingBriefFetch<T>(
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated. Please log in again.");

  const method = init?.method ?? (init?.body !== undefined ? "POST" : "GET");
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
  };
  if (init?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${FUNCTIONS_URL}/${path}`, {
    method,
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
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

  return data as T;
}

export const meetingBriefApi = {
  getBrief: (jobId: string) =>
    meetingBriefFetch<MeetingBriefResponse | { brief: null }>(
      `meeting-brief?jobId=${encodeURIComponent(jobId)}`,
      { method: "GET" },
    ),

  generateBrief: (
    jobId: string,
    workspace: MeetingBriefWorkspaceContext,
    force = false,
  ) =>
    meetingBriefFetch<MeetingBriefResponse>("meeting-brief", {
      method: "POST",
      body: { jobId, force, workspace },
    }),
};
