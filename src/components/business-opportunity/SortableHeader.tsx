import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
  column: string;
  label: string;
  sortBy: string | null;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  className?: string;
}

export function SortableHeader({ column, label, sortBy, sortOrder, onSort, className }: SortableHeaderProps) {
  return (
    <TableHead className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)} onClick={() => onSort(column)}>
      <div className="flex items-center gap-2">
        {label}
        {sortBy === column ? (sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-40" />}
      </div>
    </TableHead>
  );
}
