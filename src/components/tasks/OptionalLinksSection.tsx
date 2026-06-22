import { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Link2 } from "lucide-react";

interface OptionalLinksSectionProps {
  form: any;
}

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

function isValidUrl(url: string): boolean {
  if (!url) return true; // Empty is valid (optional)
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
}

export function OptionalLinksSection({ form }: OptionalLinksSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if any link has a value to show badge
  const activeCollabLink = form.watch("active_collab_link");
  const workboardAiLink = form.watch("workboard_ai_link");
  const referenceUrl = form.watch("reference_url");
  
  const hasLinks = !!(activeCollabLink || workboardAiLink || referenceUrl);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            <span>Optional Reference Links</span>
            {hasLinks && (
              <span className="text-xs text-muted-foreground">
                ({[activeCollabLink, workboardAiLink, referenceUrl].filter(Boolean).length} added)
              </span>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-4 pt-2">
        <FormField
          control={form.control}
          name="active_collab_link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Active Collab Link</FormLabel>
              <FormDescription className="text-xs">
                Link to related Active Collab task
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="https://..."
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e.target.value || null);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workboard_ai_link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workboard AI Link</FormLabel>
              <FormDescription className="text-xs">
                Link to related Workboard AI task
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="https://..."
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e.target.value || null);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference URL</FormLabel>
              <FormDescription className="text-xs">
                Any other relevant link or resource
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="https://..."
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e.target.value || null);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

