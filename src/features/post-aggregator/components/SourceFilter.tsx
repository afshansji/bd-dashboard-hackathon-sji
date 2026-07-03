import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PostSource } from "../types";
import { SOURCE_LABELS } from "./SourceBadge";

export type SourceFilterValue = "all" | PostSource;

interface SourceFilterProps {
  value: SourceFilterValue;
  onChange: (value: SourceFilterValue) => void;
  counts: Record<SourceFilterValue, number>;
}

const FILTER_OPTIONS: { value: SourceFilterValue; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "reddit", label: SOURCE_LABELS.reddit },
  { value: "hackernews", label: SOURCE_LABELS.hackernews },
  { value: "twitter", label: SOURCE_LABELS.twitter },
];

export function SourceFilter({ value, onChange, counts }: SourceFilterProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) {
          onChange(next as SourceFilterValue);
        }
      }}
      className="flex flex-wrap justify-start gap-2"
    >
      {FILTER_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="rounded-full px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {option.label}
          <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-xs">
            {counts[option.value]}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
