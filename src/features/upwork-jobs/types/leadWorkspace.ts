export type LeadWorkspaceStatus =
  | "new"
  | "reviewing"
  | "assigned"
  | "contacted"
  | "meeting_booked"
  | "won"
  | "lost"
  | "archived";

export interface LeadWorkspaceTask {
  id: string;
  title: string;
  completed: boolean;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
}

export interface LeadWorkspaceActivity {
  id: string;
  action: string;
  detail?: string;
  createdAt: string;
}

export interface LeadTimelineEvent {
  id: string;
  label: string;
  timestamp: string;
  kind:
    | "found"
    | "analyzed"
    | "email"
    | "reply"
    | "assigned"
    | "meeting"
    | "status"
    | "note"
    | "custom";
}

export interface LeadWorkspaceState {
  assignedToId: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  status: LeadWorkspaceStatus;
  dueAt: string | null;
  notes: string;
  tasks: LeadWorkspaceTask[];
  activities: LeadWorkspaceActivity[];
  replyGeneratedAt: string | null;
  emailGeneratedAt: string | null;
  proposalDraft: string;
}

export const LEAD_STATUS_LABELS: Record<LeadWorkspaceStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  assigned: "Assigned",
  contacted: "Contacted",
  meeting_booked: "Meeting booked",
  won: "Won",
  lost: "Lost",
  archived: "Archived",
};

export const LEAD_STATUS_STYLES: Record<LeadWorkspaceStatus, string> = {
  new: "bg-slate-100 text-slate-800 border-slate-200",
  reviewing: "bg-amber-100 text-amber-900 border-amber-200",
  assigned: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-indigo-100 text-indigo-800 border-indigo-200",
  meeting_booked: "bg-emerald-100 text-emerald-800 border-emerald-200",
  won: "bg-green-100 text-green-800 border-green-200",
  lost: "bg-red-100 text-red-800 border-red-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
};

export function createDefaultLeadWorkspaceState(): LeadWorkspaceState {
  return {
    assignedToId: null,
    assignedToName: null,
    assignedAt: null,
    status: "new",
    dueAt: null,
    notes: "",
    tasks: [],
    activities: [],
    replyGeneratedAt: null,
    emailGeneratedAt: null,
    proposalDraft: "",
  };
}
