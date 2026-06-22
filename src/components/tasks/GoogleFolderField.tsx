import { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

interface GoogleFolderFieldProps {
  form: any;
}

// Extract Google Drive folder ID from URL
function extractFolderIdFromUrl(url: string): string | null {
  try {
    // Pattern: https://drive.google.com/drive/folders/FOLDER_ID
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) return folderMatch[1];

    // Pattern: https://drive.google.com/drive/u/0/folders/FOLDER_ID
    const folderMatch2 = url.match(/\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch2) return folderMatch2[1];

    return null;
  } catch {
    return null;
  }
}

export function GoogleFolderField({ form }: GoogleFolderFieldProps) {
  const [urlInput, setUrlInput] = useState("");
  const googleFolder = form.watch("google_folder");

  const handleSetFolder = () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      toast.error("Please enter a Google Drive folder URL");
      return;
    }

    const folderId = extractFolderIdFromUrl(trimmedUrl);
    if (!folderId) {
      toast.error("Invalid Google Drive folder URL. Please check the format.");
      return;
    }

    form.setValue("google_folder", {
      id: folderId,
      url: trimmedUrl,
      name: undefined, // Will be populated if we fetch from API later
    });
    setUrlInput("");
    toast.success("Google Drive folder linked successfully");
  };

  const handleRemoveFolder = () => {
    form.setValue("google_folder", null);
    setUrlInput("");
  };

  return (
    <FormField
      control={form.control}
      name="google_folder"
      render={() => (
        <FormItem>
          <FormLabel>Google Drive Folder (Optional)</FormLabel>
          <FormDescription className="text-xs">
            Paste a Google Drive folder URL to link it to this task
          </FormDescription>
          
          {googleFolder ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-2 py-2 px-3">
                <Folder className="h-4 w-4" />
                <span className="text-sm">
                  {googleFolder.name || "Google Drive Folder"}
                </span>
                {googleFolder.url && (
                  <a
                    href={googleFolder.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveFolder}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <FormControl>
                <Input
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSetFolder();
                    }
                  }}
                />
              </FormControl>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSetFolder}
                disabled={!urlInput.trim()}
              >
                Add
              </Button>
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

