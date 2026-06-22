import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface ImportError {
  rowNumber: number;
  field: string;
  message: string;
}

interface ImportPreviewTableProps {
  errors: ImportError[];
}

export function ImportPreviewTable({ errors }: ImportPreviewTableProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Row</TableHead>
            <TableHead className="w-32">Field</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((error, index) => (
            <TableRow key={index}>
              <TableCell>
                <Badge variant="outline">{error.rowNumber}</Badge>
              </TableCell>
              <TableCell>
                <span className="font-medium text-sm">{error.field}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{error.message}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
