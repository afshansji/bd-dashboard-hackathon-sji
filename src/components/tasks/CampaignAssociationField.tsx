import { useState, useMemo } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBDCampaigns } from "@/hooks/useBDCampaigns";

interface CampaignAssociationFieldProps {
  form: any;
}

export function CampaignAssociationField({ form }: CampaignAssociationFieldProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const isCampaignAssociated = form.watch("is_campaign_associated");
  
  // Fetch campaigns with search - show planning, active, and paused campaigns
  const effectiveSearchQuery = searchQuery.length >= 3 ? searchQuery : undefined;
  const { campaigns, isLoading } = useBDCampaigns(
    undefined,
    1,
    50,
    effectiveSearchQuery,
    undefined
  );

  // Filter campaigns to only include Planning, Active, and Paused statuses
  const allowedStatusCampaigns = campaigns.filter(c =>
    ['planning', 'active', 'paused'].includes(c.status)
  );

  const selectedCampaign = useMemo(() => {
    const campaignId = form.getValues("campaign_id");
    return allowedStatusCampaigns.find(c => c.id === campaignId);
  }, [allowedStatusCampaigns, form.watch("campaign_id")]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="is_campaign_associated"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Associate with Campaign?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) => {
                  const isAssociated = value === "yes";
                  field.onChange(isAssociated);
                  if (!isAssociated) {
                    form.setValue("campaign_id", null);
                  }
                }}
                value={field.value ? "yes" : "no"}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no-campaign" />
                  <label htmlFor="no-campaign" className="text-sm font-normal cursor-pointer">
                    No
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes-campaign" />
                  <label htmlFor="yes-campaign" className="text-sm font-normal cursor-pointer">
                    Yes
                  </label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {isCampaignAssociated && (
        <FormField
          control={form.control}
          name="campaign_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Campaign <span className="text-destructive">*</span>
              </FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value && selectedCampaign
                        ? selectedCampaign.name
                        : "Select campaign"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search campaigns..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isLoading ? "Loading campaigns..." : "No campaigns found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {allowedStatusCampaigns.map((campaign) => (
                          <CommandItem
                            key={campaign.id}
                            value={campaign.name}
                            onSelect={() => {
                              form.setValue("campaign_id", campaign.id);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                campaign.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {campaign.name}
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
      )}
    </div>
  );
}

