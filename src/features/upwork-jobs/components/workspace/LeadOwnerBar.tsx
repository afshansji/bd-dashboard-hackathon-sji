import { CalendarClock, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBDTeamMembers } from "@/hooks/useBDTeamMembers";
import {
  formatDueLabel,
  useLeadWorkspace,
} from "../../hooks/useLeadWorkspace";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
  type LeadWorkspaceStatus,
} from "../../types/leadWorkspace";

interface LeadOwnerBarProps {
  jobId: string;
  compact?: boolean;
  showStatus?: boolean;
}

export function LeadOwnerBar({
  jobId,
  compact = false,
  showStatus = true,
}: LeadOwnerBarProps) {
  const { data: members = [], isLoading } = useBDTeamMembers();
  const { state, assignOwner, clearOwner, setStatus } = useLeadWorkspace(jobId);

  const dueLabel = formatDueLabel(state.dueAt);
  const initials =
    state.assignedToName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const handleOwnerChange = (value: string) => {
    if (value === "unassigned") {
      clearOwner();
      return;
    }
    const member = members.find((m) => m.id === value);
    if (member) {
      assignOwner(member.id, member.full_name);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 ${
        compact ? "p-2" : "p-3"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-w-[180px] flex-1 items-center gap-2">
        <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
          <Select
            value={state.assignedToId ?? "unassigned"}
            onValueChange={handleOwnerChange}
            disabled={isLoading}
          >
            <SelectTrigger className="mt-0.5 h-8 border-0 bg-transparent p-0 shadow-none focus:ring-0">
              <SelectValue placeholder="Assign owner">
                {state.assignedToName ? (
                  <span className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium text-foreground">
                      {state.assignedToName}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Assign owner...</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {dueLabel ? (
        <div className="flex items-center gap-1.5">
          <CalendarClock className="h-4 w-4 text-amber-600" />
          <Badge
            variant="outline"
            className={
              dueLabel === "Overdue"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }
          >
            {dueLabel}
          </Badge>
        </div>
      ) : null}

      {showStatus ? (
        <Select
          value={state.status}
          onValueChange={(value) => setStatus(value as LeadWorkspaceStatus)}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LEAD_STATUS_LABELS) as LeadWorkspaceStatus[]).map(
              (status) => (
                <SelectItem key={status} value={status}>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${LEAD_STATUS_STYLES[status]}`}
                  >
                    {LEAD_STATUS_LABELS[status]}
                  </span>
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
