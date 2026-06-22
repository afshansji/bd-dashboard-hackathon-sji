import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DealTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {["Deal Name", "Client", "Stage", "Amount", "Probability", "Owner", "Updated", "Close Date", "Actions"].map(h => (
              <TableHead key={h}><Skeleton className="h-4 w-20" /></TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 9 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
