import { supabase } from "@/integrations/supabase/client";
import {
  createDefaultLeadWorkspaceState,
  type LeadWorkspaceActivity,
  type LeadWorkspaceState,
  type LeadWorkspaceStatus,
  type LeadWorkspaceTask,
} from "../types/leadWorkspace";

const STORAGE_KEY = "job-lead-workspace-v1";

type WorkspaceRow = {
  id: string;
  job_id: string;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  assigned_at: string | null;
  status: LeadWorkspaceStatus;
  due_at: string | null;
  notes: string;
  proposal_draft: string;
  reply_generated_at: string | null;
  email_generated_at: string | null;
};

type TaskRow = {
  id: string;
  workspace_id: string;
  title: string;
  completed: boolean;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  workspace_id: string;
  action: string;
  detail: string | null;
  created_at: string;
};

export interface JobLeadWorkspaceBundle {
  workspaceId: string;
  state: LeadWorkspaceState;
}

function mapTask(row: TaskRow): LeadWorkspaceTask {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    assignedToId: row.assigned_to_id,
    assignedToName: row.assigned_to_name,
    createdAt: row.created_at,
  };
}

function mapActivity(row: ActivityRow): LeadWorkspaceActivity {
  return {
    id: row.id,
    action: row.action,
    detail: row.detail ?? undefined,
    createdAt: row.created_at,
  };
}

function mapWorkspace(
  row: WorkspaceRow,
  tasks: TaskRow[],
  activities: ActivityRow[],
): JobLeadWorkspaceBundle {
  return {
    workspaceId: row.id,
    state: {
      assignedToId: row.assigned_to_id,
      assignedToName: row.assigned_to_name,
      assignedAt: row.assigned_at,
      status: row.status,
      dueAt: row.due_at,
      notes: row.notes ?? "",
      proposalDraft: row.proposal_draft ?? "",
      replyGeneratedAt: row.reply_generated_at,
      emailGeneratedAt: row.email_generated_at,
      tasks: tasks.map(mapTask),
      activities: activities.map(mapActivity),
    },
  };
}

function readLegacyStore(jobId: string): LeadWorkspaceState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw) as Record<string, LeadWorkspaceState>;
    return store[jobId] ?? null;
  } catch {
    return null;
  }
}

function clearLegacyStore(jobId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const store = JSON.parse(raw) as Record<string, LeadWorkspaceState>;
    if (!store[jobId]) return;
    delete store[jobId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

async function ensureWorkspace(jobId: string): Promise<WorkspaceRow> {
  const { data: existing, error: fetchError } = await supabase
    .from("job_lead_workspaces")
    .select("*")
    .eq("job_id", jobId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing as WorkspaceRow;

  const legacy = readLegacyStore(jobId);
  const defaults = legacy ?? createDefaultLeadWorkspaceState();

  const { data: created, error: createError } = await supabase
    .from("job_lead_workspaces")
    .insert({
      job_id: jobId,
      assigned_to_id: defaults.assignedToId,
      assigned_to_name: defaults.assignedToName,
      assigned_at: defaults.assignedAt,
      status: defaults.status,
      due_at: defaults.dueAt,
      notes: defaults.notes,
      proposal_draft: defaults.proposalDraft,
      reply_generated_at: defaults.replyGeneratedAt,
      email_generated_at: defaults.emailGeneratedAt,
    })
    .select("*")
    .single();

  if (createError) throw createError;

  const workspace = created as WorkspaceRow;

  if (legacy?.tasks.length) {
    await supabase.from("job_lead_workspace_tasks").insert(
      legacy.tasks.map((task) => ({
        workspace_id: workspace.id,
        title: task.title,
        completed: task.completed,
        assigned_to_id: task.assignedToId ?? null,
        assigned_to_name: task.assignedToName ?? null,
        created_at: task.createdAt,
      })),
    );
  }

  if (legacy?.activities.length) {
    await supabase.from("job_lead_workspace_activities").insert(
      legacy.activities.map((activity) => ({
        workspace_id: workspace.id,
        action: activity.action,
        detail: activity.detail ?? null,
        created_at: activity.createdAt,
      })),
    );
  }

  if (legacy) clearLegacyStore(jobId);
  return workspace;
}

export async function fetchJobLeadWorkspace(
  jobId: string,
): Promise<JobLeadWorkspaceBundle> {
  const workspace = await ensureWorkspace(jobId);

  const [tasksResult, activitiesResult] = await Promise.all([
    supabase
      .from("job_lead_workspace_tasks")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_lead_workspace_activities")
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (tasksResult.error) throw tasksResult.error;
  if (activitiesResult.error) throw activitiesResult.error;

  return mapWorkspace(
    workspace,
    (tasksResult.data ?? []) as TaskRow[],
    (activitiesResult.data ?? []) as ActivityRow[],
  );
}

export async function updateJobLeadWorkspace(
  workspaceId: string,
  patch: Partial<{
    assigned_to_id: string | null;
    assigned_to_name: string | null;
    assigned_at: string | null;
    status: LeadWorkspaceStatus;
    due_at: string | null;
    notes: string;
    proposal_draft: string;
    reply_generated_at: string | null;
    email_generated_at: string | null;
  }>,
) {
  const { error } = await supabase
    .from("job_lead_workspaces")
    .update(patch)
    .eq("id", workspaceId);

  if (error) throw error;
}

export async function appendJobLeadActivity(
  workspaceId: string,
  action: string,
  detail?: string,
) {
  const { error } = await supabase.from("job_lead_workspace_activities").insert({
    workspace_id: workspaceId,
    action,
    detail: detail ?? null,
  });

  if (error) throw error;
}

export async function insertJobLeadTask(
  workspaceId: string,
  title: string,
): Promise<LeadWorkspaceTask> {
  const { data, error } = await supabase
    .from("job_lead_workspace_tasks")
    .insert({ workspace_id: workspaceId, title })
    .select("*")
    .single();

  if (error) throw error;
  return mapTask(data as TaskRow);
}

export async function updateJobLeadTask(
  taskId: string,
  patch: Partial<{
    completed: boolean;
    assigned_to_id: string | null;
    assigned_to_name: string | null;
    title: string;
  }>,
) {
  const { error } = await supabase
    .from("job_lead_workspace_tasks")
    .update(patch)
    .eq("id", taskId);

  if (error) throw error;
}
