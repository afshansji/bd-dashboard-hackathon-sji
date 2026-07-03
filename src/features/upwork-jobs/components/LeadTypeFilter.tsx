import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_TYPES, LEAD_TYPE_LABELS, type LeadType } from "../constants/sources";

export type LeadTypeFilterValue = "all" | LeadType;

interface LeadTypeFilterProps {
  value: LeadTypeFilterValue;
  onChange: (value: LeadTypeFilterValue) => void;
}

export function LeadTypeFilter({ value, onChange }: LeadTypeFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as LeadTypeFilterValue)}
    >
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="All lead types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All lead types</SelectItem>
        {LEAD_TYPES.map((leadType) => (
          <SelectItem key={leadType} value={leadType}>
            {LEAD_TYPE_LABELS[leadType]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
