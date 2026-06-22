import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Client } from '@/hooks/useClients';
import { AdminUser } from '@/hooks/useAdminUsers';
import { Deal, DealStage, DealStatus } from '@/hooks/useDeals';
import { DEAL_STAGES, DEAL_STATUSES, STAGE_LABELS, STATUS_LABELS } from '@/lib/dealStages';

const stageOptions = Object.values(DEAL_STAGES) as [DealStage, ...DealStage[]];
const statusOptions = Object.values(DEAL_STATUSES) as [DealStatus, ...DealStatus[]];

const dealSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  amount: z.number().min(0, 'Amount must be positive').optional().nullable(),
  stage: z.union([z.enum(stageOptions), z.literal('unassigned')]).optional().nullable(),
  status: z.union([z.enum(statusOptions), z.literal('unassigned')]).optional().nullable(),
  probability: z.number().min(0).max(100).optional().nullable(),
  client_id: z.union([z.string().uuid(), z.literal('unassigned')]).optional().nullable(),
  owner_id: z.union([z.string().uuid(), z.literal('unassigned')]).optional().nullable(),
  pm_assigned_id: z.union([z.string().uuid(), z.literal('unassigned')]).optional().nullable(),
  close_date: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type DealFormValues = z.infer<typeof dealSchema>;

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  onSubmit: (values: DealFormValues) => Promise<void>;
  isSubmitting?: boolean;
  clients: Client[];
  owners: AdminUser[];
  pms: AdminUser[];
}

export function DealDialog({
  open,
  onOpenChange,
  deal,
  onSubmit,
  isSubmitting = false,
  clients,
  owners,
  pms,
}: DealDialogProps) {
  const defaultValues: DealFormValues = useMemo(
    () => ({
      title: deal?.title ?? '',
      amount: typeof deal?.amount === 'number' ? deal.amount : null,
      stage: (deal?.stage as DealStage | null | undefined) ?? DEAL_STAGES.PROSPECTING,
      status: (deal?.status as DealStatus | null | undefined) ?? DEAL_STATUSES.ACTIVE,
      probability: typeof deal?.probability === 'number' ? deal.probability : 50,
      client_id: deal?.client_id ?? null,
      owner_id: deal?.owner_id ?? null,
      pm_assigned_id: deal?.pm_assigned_id ?? null,
      close_date: deal?.close_date ?? null,
      notes: deal?.notes ?? null,
    }),
    [deal]
  );

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form]);

  const handleSubmit = async (values: DealFormValues) => {
    // Convert "unassigned" values to null and ensure proper types
    const payload = {
      title: values.title,
      amount: typeof values.amount === 'number' ? Number(values.amount) : null,
      probability: typeof values.probability === 'number' ? Number(values.probability) : null,
      stage: (values.stage === 'unassigned' || !values.stage ? null : values.stage) as DealStage | null,
      status: (values.status === 'unassigned' || !values.status ? null : values.status) as DealStatus | null,
      client_id: values.client_id === 'unassigned' || !values.client_id ? null : values.client_id,
      owner_id: values.owner_id === 'unassigned' || !values.owner_id ? null : values.owner_id,
      pm_assigned_id: values.pm_assigned_id === 'unassigned' || !values.pm_assigned_id ? null : values.pm_assigned_id,
      close_date: values.close_date || null,
      notes: values.notes || null,
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{deal ? 'Edit Deal' : 'Create Deal'}</DialogTitle>
          <DialogDescription>
            {deal ? 'Update deal information and tracking details.' : 'Add a new deal to the pipeline.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Deal Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter deal title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          field.onChange(value === '' ? null : Number(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability</FormLabel>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Likelihood of closing</span>
                        <span className="font-medium text-foreground">{field.value ?? 0}%</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value ?? 0]}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? (value as DealStage) : null)}
                      value={(field.value as DealStage | null | undefined) ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {Object.values(DEAL_STAGES).map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {STAGE_LABELS[stage]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? (value as DealStatus) : null)}
                      value={(field.value as DealStatus | null | undefined) ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {Object.values(DEAL_STATUSES).map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.first_name || owner.last_name
                              ? `${owner.first_name ?? ''} ${owner.last_name ?? ''}`.trim()
                              : owner.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pm_assigned_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Manager</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select PM" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {pms.map((pm) => (
                          <SelectItem key={pm.id} value={pm.id}>
                            {pm.first_name || pm.last_name
                              ? `${pm.first_name ?? ''} ${pm.last_name ?? ''}`.trim()
                              : pm.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Close Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any context or next steps"
                      rows={3}
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : deal ? 'Save Changes' : 'Create Deal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
