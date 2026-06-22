import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useBDCampaigns, type BDCampaign } from '@/hooks/useBDCampaigns';
import { useCampaignOwners } from '@/hooks/useCampaignOwners';
import type { CampaignType } from '@/Api/adminCampaigns';
import { type TargetNiche } from '@/hooks/useTargetNiches';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import RichTextEditor from '@/components/rich-text/RichTextEditor';

const CAMPAIGN_TYPES: CampaignType[] = [
  'email_outbound',
  'linkedin_outbound',
  'cold_calling',
  'abm',
  'other',
];

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  email_outbound: 'Email Outbound',
  linkedin_outbound: 'LinkedIn Outbound',
  cold_calling: 'Cold Calling',
  abm: 'Account-Based Marketing',
  other: 'Other',
};

const TASK_TEMPLATES = [
  { value: 'kickoff', label: 'Kickoff plan' },
  { value: 'nurture', label: 'Nurture sequence' },
];

const optionalDate = z
  .union([
    z
      .string()
      .trim()
      .min(1)
      .regex(/\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
    z.literal(''),
  ])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalUuid = z
  .union([z.string().uuid('Invalid selection'), z.literal(''), z.undefined()])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalNumber = z
  .union([
    z
      .preprocess((value) => {
        if (value === '' || value === null || typeof value === 'undefined') {
          return undefined;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
      }, z.number().int().positive('Contact target must be positive')),
    z.undefined(),
  ])
  .optional()
  .transform((value) => value);

const campaignFormSchema = z
  .object({
    name: z.string().min(1, 'Campaign name is required'),
    nicheId: z.string().uuid('Please select a niche'),
    campaignTypes: z.array(z.enum(['email_outbound', 'linkedin_outbound', 'cold_calling', 'abm', 'other'] as const)).min(1, 'Select at least one campaign type'),
    startDate: optionalDate,
    endDate: optionalDate,
    targetContactsCount: optionalNumber,
    campaignObjective: z.string().optional(),
    ownedBy: z.string().uuid().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    seedKpis: z.boolean().optional().default(false),
    enableTaskTemplate: z.boolean().optional().default(false),
    taskTemplateKey: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.enableTaskTemplate && !values.taskTemplateKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['taskTemplateKey'],
        message: 'Select a task template',
      });
    }
  });

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  niches: TargetNiche[];
  campaign?: BDCampaign;
  mode?: 'create' | 'edit';
}

export function CampaignDialog({ open, onOpenChange, niches = [], campaign, mode = 'create' }: CampaignDialogProps) {
  const { createCampaign, updateCampaign, deleteCampaign } = useBDCampaigns();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = mode === 'edit' && campaign;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Ensure niches is always an array
  const safeNiches = Array.isArray(niches) ? niches : [];

  const { data: campaignOwners = [], isLoading: ownersLoading } = useCampaignOwners();

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      nicheId: '',
      campaignTypes: [],
      startDate: undefined,
      endDate: undefined,
      targetContactsCount: undefined,
      campaignObjective: '',
      ownedBy: user?.id || undefined,
      seedKpis: false,
      enableTaskTemplate: false,
      taskTemplateKey: undefined,
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        name: '',
        nicheId: '',
        campaignTypes: [],
        startDate: undefined,
        endDate: undefined,
        targetContactsCount: undefined,
        campaignObjective: '',
        ownedBy: user?.id || undefined,
        seedKpis: false,
        enableTaskTemplate: false,
        taskTemplateKey: undefined,
      });
    } else if (isEditMode) {
      // Pre-populate form with campaign data in edit mode
      form.reset({
        name: campaign.name,
        nicheId: campaign.niche_id,
        campaignTypes: campaign.campaign_types || [campaign.campaign_type],
        startDate: campaign.start_date || undefined,
        endDate: campaign.end_date || undefined,
        targetContactsCount: campaign.target_contacts_count || undefined,
        campaignObjective: campaign.campaign_objective || '',
        ownedBy: campaign.owned_by || user?.id,
        seedKpis: false,
        enableTaskTemplate: false,
        taskTemplateKey: undefined,
      });
    }
  }, [open, isEditMode, campaign, form]);

  const handleDelete = async () => {
    if (!campaign) return;
    
    try {
      await deleteCampaign.mutateAsync(campaign.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
      toast({
        title: 'Success',
        description: 'Campaign deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const handleSubmit = async (values: CampaignFormValues) => {
    try {
      const payload = {
        name: values.name,
        niche_id: values.nicheId,
        campaign_type: values.campaignTypes[0], // Legacy field - use first type
        campaign_types: values.campaignTypes,
        start_date: values.startDate ?? null,
        end_date: values.endDate ?? null,
        target_contacts_count: typeof values.targetContactsCount === 'number' ? values.targetContactsCount : null,
        campaign_objective: values.campaignObjective || null,
        owned_by: values.ownedBy || null,
      };

      if (isEditMode) {
        // Update existing campaign
        await updateCampaign.mutateAsync({
          id: campaign.id,
          campaign: payload,
        });
        
        toast({
          title: 'Success',
          description: 'Campaign updated successfully',
        });
      } else {
        // Create new campaign
        const options: Record<string, unknown> = {};
        if (values.seedKpis) {
          options.seedKpis = true;
        }
        if (values.enableTaskTemplate && values.taskTemplateKey) {
          options.taskTemplateKey = values.taskTemplateKey;
        }

        await createCampaign.mutateAsync({
          campaign: payload,
          options: Object.keys(options).length ? (options as { seedKpis?: boolean; taskTemplateKey?: string }) : undefined,
        });
        
        toast({
          title: 'Success',
          description: 'Campaign created successfully',
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save campaign', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update campaign details and settings' 
              : 'Configure campaign basics, targets, and automation helpers.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Q1 LinkedIn Outreach" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nicheId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Niche</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a niche" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {safeNiches.length === 0 ? (
                          <SelectItem value="loading" disabled>
                            Loading niches...
                          </SelectItem>
                        ) : (
                          safeNiches.map((niche) => (
                            <SelectItem key={niche.id} value={niche.id}>
                              {niche.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Owner</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={ownersLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={ownersLoading ? "Loading owners..." : "Select owner"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ownersLoading ? (
                          <SelectItem disabled value="loading">Loading owners...</SelectItem>
                        ) : campaignOwners.length === 0 ? (
                          <SelectItem disabled value="none">No owners available</SelectItem>
                        ) : (
                          campaignOwners.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={member.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {member.full_name?.substring(0, 2).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{member.full_name}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campaignTypes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Campaign Types</FormLabel>
                    <div className="space-y-3 border rounded-md p-4">
                      {CAMPAIGN_TYPES.map((type) => (
                        <div key={type} className="flex items-center space-x-3">
                          <Checkbox
                            checked={field.value?.includes(type)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              field.onChange(
                                checked
                                  ? [...current, type]
                                  : current.filter((t) => t !== type)
                              );
                            }}
                          />
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {CAMPAIGN_TYPE_LABELS[type]}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetContactsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Target</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={typeof field.value === 'number' ? field.value : ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(value === '' ? undefined : Number(value));
                        }}
                        placeholder="e.g. 500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="campaignObjective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Objective</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      content={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Describe the campaign story, goals, target audience, and strategy..."
                      className="min-h-[200px]"
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground mt-1">
                    Provide context and narrative about what this campaign aims to achieve
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditMode && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <FormLabel className="text-base">Seed default KPIs</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Automatically create baseline metrics to track campaign performance.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="seedKpis"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <FormLabel className="text-base">Add task template</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Prefill the project board with a curated task list for this campaign.
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="enableTaskTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('enableTaskTemplate') ? (
                  <FormField
                    control={form.control}
                    name="taskTemplateKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Template</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TASK_TEMPLATES.map((template) => (
                              <SelectItem key={template.value} value={template.value}>
                                {template.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
            )}

            <DialogFooter className={isEditMode ? "sm:justify-between" : ""}>
              {isEditMode && (
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      className="mr-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Campaign
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete the <span className="font-semibold">"{campaign?.name}"</span> campaign? 
                        This action cannot be undone and will remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        disabled={deleteCampaign.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteCampaign.isPending ? 'Deleting...' : 'Yes, Delete Campaign'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCampaign.isPending || updateCampaign.isPending}
                >
                  {createCampaign.isPending || updateCampaign.isPending
                    ? (isEditMode ? 'Saving...' : 'Creating...')
                    : (isEditMode ? 'Save Changes' : 'Create Campaign')
                  }
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CampaignDialog;
