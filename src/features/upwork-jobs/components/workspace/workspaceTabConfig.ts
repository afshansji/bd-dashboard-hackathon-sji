import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  Building2,
  ClipboardList,
  Clock,
  FileText,
  FolderOpen,
  History,
  LayoutList,
  Mail,
  MessageSquare,
  Paperclip,
  StickyNote,
} from "lucide-react";
export type WorkspaceTab =
  | "overview"
  | "company"
  | "analysis"
  | "evidence"
  | "proposal"
  | "reply"
  | "email"
  | "notes"
  | "tasks"
  | "timeline"
  | "attachments"
  | "chat"
  | "history"
  | "activity";

export interface WorkspaceTabConfig {
  value: WorkspaceTab;
  label: string;
  icon: LucideIcon;
}

export const WORKSPACE_TABS: WorkspaceTabConfig[] = [
  { value: "overview", label: "Overview", icon: ClipboardList },
  { value: "company", label: "Company", icon: Building2 },
  { value: "analysis", label: "AI Analysis", icon: Bot },
  { value: "chat", label: "Copilot", icon: Bot },
  { value: "evidence", label: "Evidence", icon: FolderOpen },
  { value: "proposal", label: "Proposal", icon: FileText },
  { value: "reply", label: "Reply", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "notes", label: "Notes", icon: StickyNote },
  { value: "tasks", label: "Tasks", icon: LayoutList },
  { value: "timeline", label: "Timeline", icon: Clock },
  { value: "attachments", label: "Attachments", icon: Paperclip },
  { value: "history", label: "History", icon: History },
  { value: "activity", label: "Activity", icon: Activity },
];
