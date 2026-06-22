import { Button } from "@/components/ui/button";
import { Tags, Mail, X } from "lucide-react";
import { StatusBadgeWithIcon } from "./StatusBadgeWithIcon";
import { useState } from "react";
import { TagEditor } from "./TagEditor";

interface BulkActionsBarProps {
  campaignId: string;
  selectedCount: number;
  onClearSelection: () => void;
  onBulkTagUpdate: (tags: string[]) => void;
  onBulkStatusChange: (status: string) => void;
}

export const BulkActionsBar = ({
  campaignId,
  selectedCount,
  onClearSelection,
  onBulkTagUpdate,
  onBulkStatusChange,
}: BulkActionsBarProps) => {
  const [showTagEditor, setShowTagEditor] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{selectedCount} selected</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagEditor(true)}
          >
            <Tags className="h-4 w-4 mr-2" />
            Add Tags
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBulkStatusChange("contacted")}
          >
            <Mail className="h-4 w-4 mr-2" />
            Mark Contacted
          </Button>
        </div>
      </div>

      {showTagEditor && (
        <TagEditor
          contactId="bulk"
          campaignId={campaignId}
          currentTags={[]}
          onClose={() => setShowTagEditor(false)}
          onSave={(tags) => {
            onBulkTagUpdate(tags);
            setShowTagEditor(false);
          }}
        />
      )}
    </>
  );
};
