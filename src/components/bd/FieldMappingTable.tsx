import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Field {
  key: string;
  label: string;
}

interface FieldMappingTableProps {
  sheetHeaders: string[];
  requiredFields: Field[];
  optionalFields: Field[];
  mapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

export function FieldMappingTable({
  sheetHeaders,
  requiredFields,
  optionalFields,
  mapping,
  onMappingChange,
}: FieldMappingTableProps) {
  const handleMappingChange = (fieldKey: string, headerValue: string) => {
    const newMapping = { ...mapping };
    if (headerValue === "__none__") {
      delete newMapping[fieldKey];
    } else {
      newMapping[fieldKey] = headerValue;
    }
    onMappingChange(newMapping);
  };

  const renderFieldRow = (field: Field, isRequired: boolean) => {
    const isMapped = !!mapping[field.key];
    
    return (
      <TableRow key={field.key}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {field.label}
            {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
          </div>
        </TableCell>
        <TableCell>
          <Select
            value={mapping[field.key] || "__none__"}
            onValueChange={(value) => handleMappingChange(field.key, value)}
          >
            <SelectTrigger className={!isMapped && isRequired ? "border-destructive" : ""}>
              <SelectValue placeholder="Select column..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-muted-foreground">-- Not mapped --</span>
              </SelectItem>
              {sheetHeaders
                .filter((header) => header && header.trim() !== '')
                .map((header, index) => (
                  <SelectItem key={index} value={header}>
                    {header}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Field Mapping</Label>
        <p className="text-sm text-muted-foreground">
          Map your sheet columns to the campaign contact fields
        </p>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact Field</TableHead>
              <TableHead>Your Sheet Column</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requiredFields.map(field => renderFieldRow(field, true))}
            {optionalFields.map(field => renderFieldRow(field, false))}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>✓ Fields marked as "Required" must be mapped to proceed</p>
        <p>✓ Optional fields can be left unmapped if not available in your sheet</p>
      </div>
    </div>
  );
}
