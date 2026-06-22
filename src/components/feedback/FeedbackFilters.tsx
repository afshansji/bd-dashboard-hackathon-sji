import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeedbackStatus } from "@/features/feedback/api";
import { FEEDBACK_STATUS_LABELS } from "@/features/feedback/constants";

interface FeedbackFiltersProps {
  status: FeedbackStatus | "all";
  module: string | "all";
  modules: string[];
  onStatusChange: (status: FeedbackStatus | "all") => void;
  onModuleChange: (module: string | "all") => void;
}

const STATUS_OPTIONS: Array<FeedbackStatus | "all"> = ["all", "open", "in_review", "resolved", "closed"];

export function FeedbackFilters({
  status,
  module,
  modules,
  onStatusChange,
  onModuleChange,
}: FeedbackFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={status} onValueChange={(value) => onStatusChange(value as FeedbackStatus | "all")}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((statusOption) => (
            <SelectItem key={statusOption} value={statusOption}>
              {statusOption === "all" ? "All statuses" : FEEDBACK_STATUS_LABELS[statusOption]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={module} onValueChange={(value) => onModuleChange(value)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter module" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modules</SelectItem>
          {modules.map((moduleOption) => (
            <SelectItem key={moduleOption} value={moduleOption}>
              {moduleOption}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
