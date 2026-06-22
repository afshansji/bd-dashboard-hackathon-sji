import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { useCampaignTags } from "@/hooks/useCampaignTags";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TagEditorProps {
  contactId: string;
  campaignId: string;
  currentTags: string[];
  onClose: () => void;
  onSave: (tags: string[]) => void;
}

export const TagEditor = ({ campaignId, currentTags, onClose, onSave }: TagEditorProps) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [searchValue, setSearchValue] = useState("");
  const { tags: existingTags, isLoading, ensureTagExists, getTagColor } = useCampaignTags(campaignId);

  const filteredTags = useMemo(() => {
    if (!searchValue) return existingTags;
    return existingTags.filter(tag => 
      tag.tag_name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [existingTags, searchValue]);

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleCreateAndAddTag = async () => {
    const trimmedValue = searchValue.trim();
    if (!trimmedValue) return;
    
    if (selectedTags.includes(trimmedValue)) {
      setSearchValue("");
      return;
    }

    await ensureTagExists(trimmedValue);
    setSelectedTags([...selectedTags, trimmedValue]);
    setSearchValue("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = () => {
    onSave(selectedTags);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateAndAddTag();
    }
  };

  const showCreateOption = searchValue.trim() && 
    !existingTags.some(t => t.tag_name.toLowerCase() === searchValue.toLowerCase());

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search or create tag..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {showCreateOption && (
              <Button onClick={handleCreateAndAddTag} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Available Tags:</p>
            <ScrollArea className="h-40 w-full rounded border p-2">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading tags...</p>
              ) : filteredTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {searchValue ? "No tags found. Press Enter to create." : "No tags yet. Create your first tag!"}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.tag_name);
                    return (
                      <Badge
                        key={tag.id}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer transition-all hover:scale-105"
                        style={{ 
                          backgroundColor: isSelected ? tag.color : 'transparent',
                          borderColor: tag.color,
                          color: isSelected ? '#ffffff' : tag.color
                        }}
                        onClick={() => handleToggleTag(tag.tag_name)}
                      >
                        {tag.tag_name}
                        {tag.usage_count > 0 && (
                          <span className="ml-1 text-xs opacity-70">({tag.usage_count})</span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Tags:</p>
            <div className="flex flex-wrap gap-2 min-h-[32px] p-2 border rounded">
              {selectedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags selected</p>
              ) : (
                selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    style={{ backgroundColor: getTagColor(tag) }}
                    className="text-white"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
