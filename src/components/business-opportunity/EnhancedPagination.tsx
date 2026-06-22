import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface EnhancedPaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  pageSizeOptions?: number[];
}

export function EnhancedPagination({ currentPage, pageSize, totalCount, onPageChange, onPageSizeChange, isLoading = false, pageSizeOptions = [25, 50, 100] }: EnhancedPaginationProps) {
  const sizeOptions = Array.from(new Set([pageSize, ...pageSizeOptions])).sort((a, b) => a - b);
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between mt-4 px-2">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{totalCount}</span> results
        </p>
        <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {sizeOptions.map((option) => (<SelectItem key={option} value={option.toString()}>{option} per page</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={currentPage === 0 || isLoading} onClick={() => onPageChange(0)}><ChevronsLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" disabled={currentPage === 0 || isLoading} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} max={totalPages} value={currentPage + 1} onChange={(e) => { const page = Math.min(Math.max(1, Number(e.target.value)), totalPages); onPageChange(page - 1); }} className="w-16 text-center h-9" disabled={isLoading} />
          <span className="text-sm text-muted-foreground whitespace-nowrap">of {totalPages}</span>
        </div>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1 || isLoading} onClick={() => onPageChange(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1 || isLoading} onClick={() => onPageChange(totalPages - 1)}><ChevronsRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
