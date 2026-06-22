import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ArrowRight, X } from "lucide-react";

interface BulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStageChange?: (stage: string) => void;
  onBulkDelete?: () => void;
}

const STAGE_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "discovery", label: "Discovery" },
  { value: "qualified", label: "Qualified" },
  { value: "estimation", label: "Estimation" },
  { value: "proposal", label: "Proposal" },
  { value: "accepted", label: "Accepted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export function BulkActions({
  selectedCount,
  onClearSelection,
  onBulkStageChange,
  onBulkDelete,
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
      <span className="text-sm font-medium text-foreground">
        {selectedCount} deal{selectedCount !== 1 ? "s" : ""} selected
      </span>

      {onBulkStageChange && (
        <Select onValueChange={onBulkStageChange}>
          <SelectTrigger className="w-[160px] h-8">
            <ArrowRight className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Move to stage" />
          </SelectTrigger>
          <SelectContent>
            {STAGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onBulkDelete && (
        <Button variant="destructive" size="sm" onClick={onBulkDelete}>
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      )}

      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        <X className="h-3 w-3 mr-1" />
        Clear
      </Button>
    </div>
  );
}
