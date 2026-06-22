import { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskLabels } from "@/hooks/useTaskLabels";

interface TaskLabelsFieldProps {
  form: any;
}

export function TaskLabelsField({ form }: TaskLabelsFieldProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { labels, isLoading, createLabelAsync } = useTaskLabels();
  
  const selectedLabelIds = form.watch("label_ids") || [];
  
  const selectedLabels = labels.filter(label => selectedLabelIds.includes(label.id));
  
  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleToggleLabel = (labelId: string) => {
    const currentIds = form.getValues("label_ids") || [];
    if (currentIds.includes(labelId)) {
      form.setValue("label_ids", currentIds.filter((id: string) => id !== labelId));
    } else {
      form.setValue("label_ids", [...currentIds, labelId]);
    }
  };

  const handleRemoveLabel = (labelId: string) => {
    const currentIds = form.getValues("label_ids") || [];
    form.setValue("label_ids", currentIds.filter((id: string) => id !== labelId));
  };

  const handleCreateLabel = async () => {
    // Capture value immediately before any async operations
    const trimmedValue = searchValue.trim();
    if (!trimmedValue) return;

    // Clear search value immediately to prevent double-creation
    const valueToCreate = trimmedValue;
    setSearchValue("");

    try {
      const newLabel = await createLabelAsync(valueToCreate);
      if (newLabel) {
        const currentIds = form.getValues("label_ids") || [];
        form.setValue("label_ids", [...currentIds, newLabel.id]);
      }
    } catch (error) {
      console.error("Failed to create label:", error);
      // Restore search value on error so user can retry
      setSearchValue(valueToCreate);
    }
  };

  const showCreateOption = searchValue.trim() && 
    !labels.some(l => l.name.toLowerCase() === searchValue.toLowerCase());

  return (
    <FormField
      control={form.control}
      name="label_ids"
      render={() => (
        <FormItem>
          <FormLabel>Labels</FormLabel>
          
          {/* Selected labels display */}
          {selectedLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedLabels.map((label) => (
                <Badge
                  key={label.id}
                  variant="secondary"
                  style={{ backgroundColor: `${label.color}20`, color: label.color, borderColor: label.color }}
                  className="border max-w-[200px]"
                >
                  <span className="truncate">{label.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLabel(label.id)}
                    className="ml-1 hover:text-destructive flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedLabels.length > 0
                    ? `${selectedLabels.length} label${selectedLabels.length > 1 ? 's' : ''} selected`
                    : "Select labels"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search or create labels..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? "Loading labels..." : "No labels found."}
                  </CommandEmpty>
                  
                  {showCreateOption && (
                    <CommandGroup>
                      <CommandItem
                        value={`__create_new_label__${searchValue}`}
                        onSelect={handleCreateLabel}
                        className="text-primary cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create "{searchValue}"
                      </CommandItem>
                    </CommandGroup>
                  )}
                  
                  <CommandGroup>
                    {filteredLabels.map((label) => (
                      <CommandItem
                        key={label.id}
                        value={label.name}
                        onSelect={() => handleToggleLabel(label.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedLabelIds.includes(label.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <Badge
                          variant="secondary"
                          style={{ backgroundColor: `${label.color}20`, color: label.color }}
                          className="text-xs max-w-[180px] truncate"
                        >
                          {label.name}
                        </Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

