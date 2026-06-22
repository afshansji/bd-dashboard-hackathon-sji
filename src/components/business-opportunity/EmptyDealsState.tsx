import { FolderOpen } from "lucide-react";

interface EmptyDealsStateProps {
  stage?: string;
  hasFilters?: boolean;
}

export function EmptyDealsState({ stage, hasFilters }: EmptyDealsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-1">
        {hasFilters ? "No deals match your filters" : `No deals in ${stage || "this stage"}`}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "Try adjusting your search or filter criteria."
          : "Deals will appear here as they are created or moved to this stage."}
      </p>
    </div>
  );
}
