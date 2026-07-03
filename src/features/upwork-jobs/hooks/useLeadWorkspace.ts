import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  appendJobLeadActivity,
  fetchJobLeadWorkspace,
  insertJobLeadTask,
  updateJobLeadTask,
  updateJobLeadWorkspace,
} from "../api/jobLeadWorkspace";
import {
  createDefaultLeadWorkspaceState,
  type LeadTimelineEvent,
  type LeadWorkspaceState,
  type LeadWorkspaceStatus,
} from "../types/leadWorkspace";
import { getJobLeadSourceLabel } from "../constants/sources";
import type { UpworkJob } from "../types";

const WORKSPACE_QUERY_KEY = "job-lead-workspace";

export function buildLeadTimeline(
  job: UpworkJob,
  state: LeadWorkspaceState,
  analyzedAt: string | null,
): LeadTimelineEvent[] {
  const events: LeadTimelineEvent[] = [];

  const foundAt = job.scraped_at ?? job.created_at;
  if (foundAt) {
    events.push({
      id: "found",
      kind: "found",
      label: `Found on ${getJobLeadSourceLabel(job.source, job.job_url)}`,
      timestamp: foundAt,
    });
  }

  if (analyzedAt) {
    events.push({
      id: "analyzed",
      kind: "analyzed",
      label: "AI analyzed",
      timestamp: analyzedAt,
    });
  }

  if (state.emailGeneratedAt) {
    events.push({
      id: "email",
      kind: "email",
      label: "Email generated",
      timestamp: state.emailGeneratedAt,
    });
  }

  if (state.replyGeneratedAt) {
    events.push({
      id: "reply",
      kind: "reply",
      label: "Reply generated",
      timestamp: state.replyGeneratedAt,
    });
  }

  if (state.assignedAt && state.assignedToName) {
    events.push({
      id: "assigned",
      kind: "assigned",
      label: `Assigned to ${state.assignedToName}`,
      timestamp: state.assignedAt,
    });
  }

  if (state.status === "meeting_booked") {
    const meetingActivity = state.activities.find((a) =>
      a.action.toLowerCase().includes("meeting"),
    );
    events.push({
      id: "meeting",
      kind: "meeting",
      label: "Meeting booked",
      timestamp:
        meetingActivity?.createdAt ??
        state.assignedAt ??
        foundAt ??
        new Date().toISOString(),
    });
  }

  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function formatDueLabel(dueAt: string | null): string | null {
  if (!dueAt) return null;

  const due = new Date(dueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  const isSameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();

  if (diffMs < 0) return "Overdue";
  if (isSameDay && diffHours <= 2) return "Reply within 2 hours";
  if (isSameDay) return "Due today";
  if (diffHours <= 48) return `Due in ${diffHours}h`;
  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number,
) {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}

export function useLeadWorkspace(jobId: string) {
  const queryClient = useQueryClient();
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [proposalDraft, setProposalDraftLocal] = useState<string | null>(null);
  const [notesSaveStatus, setNotesSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const query = useQuery({
    queryKey: [WORKSPACE_QUERY_KEY, jobId],
    queryFn: () => fetchJobLeadWorkspace(jobId),
    enabled: Boolean(jobId),
    staleTime: 15_000,
  });

  const workspaceId = query.data?.workspaceId;
  const serverState = query.data?.state ?? createDefaultLeadWorkspaceState();
  const loadedJobIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!query.data || loadedJobIdRef.current === jobId) return;
    loadedJobIdRef.current = jobId;
    setNotesDraft(null);
    setProposalDraftLocal(null);
    setNotesSaveStatus("saved");
  }, [query.data, jobId]);

  const state = useMemo(
    () => ({
      ...serverState,
      notes: notesDraft ?? serverState.notes,
      proposalDraft: proposalDraft ?? serverState.proposalDraft,
    }),
    [serverState, notesDraft, proposalDraft],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [WORKSPACE_QUERY_KEY, jobId] });
  }, [queryClient, jobId]);

  const persistNotes = useMutation({
    mutationFn: async (notes: string) => {
      if (!workspaceId) throw new Error("Workspace not loaded");
      await updateJobLeadWorkspace(workspaceId, { notes });
    },
    onMutate: () => setNotesSaveStatus("saving"),
    onSuccess: () => setNotesSaveStatus("saved"),
    onError: () => setNotesSaveStatus("error"),
  });

  const debouncedPersistNotes = useDebouncedCallback((notes: string) => {
    persistNotes.mutate(notes);
  }, 600);

  const persistProposal = useMutation({
    mutationFn: async (draft: string) => {
      if (!workspaceId) throw new Error("Workspace not loaded");
      await updateJobLeadWorkspace(workspaceId, { proposal_draft: draft });
    },
  });

  const debouncedPersistProposal = useDebouncedCallback((draft: string) => {
    persistProposal.mutate(draft);
  }, 600);

  const assignOwner = useCallback(
    async (memberId: string, memberName: string) => {
      if (!workspaceId) return;
      const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const current = serverState;
      await updateJobLeadWorkspace(workspaceId, {
        assigned_to_id: memberId,
        assigned_to_name: memberName,
        assigned_at: new Date().toISOString(),
        status: current.status === "new" ? "assigned" : current.status,
        due_at: current.dueAt ?? dueAt,
      });
      await appendJobLeadActivity(workspaceId, "Assigned owner", memberName);
      invalidate();
    },
    [workspaceId, serverState, invalidate],
  );

  const clearOwner = useCallback(async () => {
    if (!workspaceId) return;
    const current = serverState;
    await updateJobLeadWorkspace(workspaceId, {
      assigned_to_id: null,
      assigned_to_name: null,
      assigned_at: null,
      status: current.status === "assigned" ? "new" : current.status,
    });
    await appendJobLeadActivity(workspaceId, "Removed owner");
    invalidate();
  }, [workspaceId, serverState, invalidate]);

  const setStatus = useCallback(
    async (status: LeadWorkspaceStatus) => {
      if (!workspaceId) return;
      await updateJobLeadWorkspace(workspaceId, { status });
      await appendJobLeadActivity(workspaceId, "Status changed", status);
      invalidate();
    },
    [workspaceId, invalidate],
  );

  const setDueAt = useCallback(
    async (dueAt: string | null) => {
      if (!workspaceId) return;
      await updateJobLeadWorkspace(workspaceId, { due_at: dueAt });
      await appendJobLeadActivity(workspaceId, "Due date updated");
      invalidate();
    },
    [workspaceId, invalidate],
  );

  const setNotes = useCallback(
    (notes: string) => {
      setNotesDraft(notes);
      setNotesSaveStatus("saving");
      debouncedPersistNotes(notes);
    },
    [debouncedPersistNotes],
  );

  const addTask = useCallback(
    async (title: string) => {
      if (!workspaceId) return;
      await insertJobLeadTask(workspaceId, title);
      await appendJobLeadActivity(workspaceId, "Task added", title);
      invalidate();
    },
    [workspaceId, invalidate],
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      const task = serverState.tasks.find((t) => t.id === taskId);
      if (!task) return;
      await updateJobLeadTask(taskId, { completed: !task.completed });
      invalidate();
    },
    [serverState.tasks, invalidate],
  );

  const assignTask = useCallback(
    async (taskId: string, memberId: string | null, memberName: string | null) => {
      await updateJobLeadTask(taskId, {
        assigned_to_id: memberId,
        assigned_to_name: memberName,
      });
      if (workspaceId) {
        await appendJobLeadActivity(
          workspaceId,
          "Task assigned",
          memberName ?? "Unassigned",
        );
      }
      invalidate();
    },
    [workspaceId, invalidate],
  );

  const recordOutreach = useCallback(
    async (type: "reply" | "email") => {
      if (!workspaceId) return;
      const now = new Date().toISOString();
      const current = serverState;
      await updateJobLeadWorkspace(workspaceId, {
        reply_generated_at: type === "reply" ? now : current.replyGeneratedAt,
        email_generated_at: type === "email" ? now : current.emailGeneratedAt,
        status:
          current.status === "new" || current.status === "assigned"
            ? "contacted"
            : current.status,
      });
      await appendJobLeadActivity(
        workspaceId,
        type === "reply" ? "Reply generated" : "Email generated",
      );
      invalidate();
    },
    [workspaceId, serverState, invalidate],
  );

  const setProposalDraft = useCallback(
    (draft: string) => {
      setProposalDraftLocal(draft);
      debouncedPersistProposal(draft);
    },
    [debouncedPersistProposal],
  );

  const bookMeeting = useCallback(async () => {
    if (!workspaceId) return;
    await updateJobLeadWorkspace(workspaceId, { status: "meeting_booked" });
    await appendJobLeadActivity(workspaceId, "Meeting booked");
    invalidate();
  }, [workspaceId, invalidate]);

  return useMemo(
    () => ({
      state,
      isLoading: query.isLoading,
      isError: query.isError,
      notesSaveStatus,
      assignOwner,
      clearOwner,
      setStatus,
      setDueAt,
      setNotes,
      addTask,
      toggleTask,
      assignTask,
      recordOutreach,
      setProposalDraft,
      bookMeeting,
    }),
    [
      state,
      query.isLoading,
      query.isError,
      notesSaveStatus,
      assignOwner,
      clearOwner,
      setStatus,
      setDueAt,
      setNotes,
      addTask,
      toggleTask,
      assignTask,
      recordOutreach,
      setProposalDraft,
      bookMeeting,
    ],
  );
}
