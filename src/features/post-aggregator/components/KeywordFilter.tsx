import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LEAD_KEYWORDS } from "../services/keywords";

export type KeywordFilterValue = "all" | (typeof LEAD_KEYWORDS)[number];

interface KeywordFilterProps {
  value: KeywordFilterValue;
  onChange: (value: KeywordFilterValue) => void;
  counts: Record<KeywordFilterValue, number>;
}

const FILTER_OPTIONS: { value: KeywordFilterValue; label: string }[] = [
  { value: "all", label: "All keywords" },
  ...LEAD_KEYWORDS.map((keyword) => ({ value: keyword, label: keyword })),
];

export function KeywordFilter({ value, onChange, counts }: KeywordFilterProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) {
          onChange(next as KeywordFilterValue);
        }
      }}
      className="flex flex-wrap justify-start gap-2"
    >
      {FILTER_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="rounded-full px-3 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {option.label}
          <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-xs">
            {counts[option.value] ?? 0}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
