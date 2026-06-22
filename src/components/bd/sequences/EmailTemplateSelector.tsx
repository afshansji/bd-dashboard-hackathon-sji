import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EmailTemplateSelectorProps {
  selectedTemplateId: string | null;
  onTemplateChange: (id: string) => void;
}

export function EmailTemplateSelector({
  selectedTemplateId,
  onTemplateChange,
}: EmailTemplateSelectorProps) {
  const { data: templates = [], isLoading } = useEmailTemplates();

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template">Email Template *</Label>
        <Select value={selectedTemplateId || undefined} onValueChange={onTemplateChange}>
          <SelectTrigger id="template">
            <SelectValue placeholder="Select email template..." />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="loading" disabled>Loading templates...</SelectItem>
            ) : templates.length === 0 ? (
              <SelectItem value="none" disabled>No templates available</SelectItem>
            ) : (
              templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({template.category})
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {selectedTemplate && (
        <Card className="p-4 space-y-3 bg-muted/50">
          <div>
            <div className="text-sm font-medium mb-1">Subject:</div>
            <div className="text-sm text-muted-foreground">
              {selectedTemplate.subject}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Body Preview:</div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
              {selectedTemplate.body}
            </div>
          </div>
          {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2">Available Variables:</div>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.variables.map((variable: string) => (
                  <Badge key={variable} variant="outline" className="text-xs">
                    {`{${variable}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}