import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { TagEditor } from "./TagEditor";
import { useCampaignTags } from "@/hooks/useCampaignTags";

interface TagCellProps {
  contactId: string;
  campaignId: string;
  tags: string[];
  onTagsUpdate: (tags: string[]) => void;
}

export const TagCell = ({ contactId, campaignId, tags = [], onTagsUpdate }: TagCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { getTagColor } = useCampaignTags(campaignId);

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsUpdate(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map((tag) => (
        <Badge
          key={tag}
          className="group hover:pr-1 transition-all text-white"
          style={{ backgroundColor: getTagColor(tag) }}
        >
          {tag}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveTag(tag);
            }}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <Plus className="h-3 w-3" />
      </Button>
      
      {isEditing && (
        <TagEditor
          contactId={contactId}
          campaignId={campaignId}
          currentTags={tags}
          onClose={() => setIsEditing(false)}
          onSave={onTagsUpdate}
        />
      )}
    </div>
  );
};
