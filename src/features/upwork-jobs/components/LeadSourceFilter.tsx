import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JOB_LEAD_SOURCES,
  JOB_LEAD_SOURCE_LABELS,
  type JobLeadSource,
} from "../constants/sources";

export type LeadSourceFilterValue = "all" | JobLeadSource;

interface LeadSourceFilterProps {
  value: LeadSourceFilterValue;
  onChange: (value: LeadSourceFilterValue) => void;
}

export function LeadSourceFilter({ value, onChange }: LeadSourceFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as LeadSourceFilterValue)}
    >
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder="All platforms" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All platforms</SelectItem>
        {JOB_LEAD_SOURCES.map((source) => (
          <SelectItem key={source} value={source}>
            {JOB_LEAD_SOURCE_LABELS[source]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
