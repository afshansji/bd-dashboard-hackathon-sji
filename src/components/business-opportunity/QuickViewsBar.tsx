import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickViewsBarProps {
  viewMode: "table" | "card";
  onViewModeChange: (mode: "table" | "card") => void;
}

export function QuickViewsBar({ viewMode, onViewModeChange }: QuickViewsBarProps) {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 px-2", viewMode === "table" && "bg-background shadow-sm")}
        onClick={() => onViewModeChange("table")}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-7 px-2", viewMode === "card" && "bg-background shadow-sm")}
        onClick={() => onViewModeChange("card")}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}
