import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { Copy, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import {
  type AnalyticsApiConsumerRow,
  type AnalyticsPeriod,
  type PushFrequency,
  useAnalyticsApiConsumers,
  useCreateAnalyticsApiConsumer,
  useDeleteAnalyticsApiConsumer,
  useRegenerateAnalyticsApiSecret,
  useTriggerAnalyticsPush,
  useUpdateAnalyticsApiConsumer,
} from '@/hooks/useAnalyticsApiConsumers';
import { toast } from 'sonner';

const PERIODS: AnalyticsPeriod[] = ['daily', 'weekly', 'monthly', 'all'];
const PUSH_FREQUENCIES: PushFrequency[] = ['manual', 'daily', 'weekly', 'monthly'];

const consumerSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    webhook_url: z
      .union([z.string().url('Must be a valid URL'), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
    webhook_secret: z
      .union([z.string().min(1, 'Secret is required'), z.literal('')])
      .optional()
      .transform((v) => (v ? v : undefined)),
    is_active: z.boolean().default(true),
    push_enabled: z.boolean().default(false),
    push_frequency: z.enum(['manual', 'daily', 'weekly', 'monthly'] as const).default('manual'),
    allowed_periods: z.array(z.enum(['daily', 'weekly', 'monthly', 'all'] as const)).min(1, 'Select at least one'),
  })
  .superRefine((values, ctx) => {
    if (values.push_enabled) {
      if (!values.webhook_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['webhook_url'],
          message: 'Webhook URL is required when push is enabled',
        });
      }
      if (!values.webhook_secret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['webhook_secret'],
          message: 'Webhook secret is required when push is enabled',
        });
      }
    }
  });

type ConsumerFormValues = z.infer<typeof consumerSchema>;

export default function AnalyticsApiConsumers() {
  const { data, isLoading } = useAnalyticsApiConsumers();
  const createConsumer = useCreateAnalyticsApiConsumer();
  const updateConsumer = useUpdateAnalyticsApiConsumer();
  const deleteConsumer = useDeleteAnalyticsApiConsumer();
  const regenSecret = useRegenerateAnalyticsApiSecret();
  const triggerPush = useTriggerAnalyticsPush();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AnalyticsApiConsumerRow | null>(null);

  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [secretValue, setSecretValue] = useState<string>('');
  const [secretLabel, setSecretLabel] = useState<string>('');

  const consumers = useMemo(() => data ?? [], [data]);

  const form = useForm<ConsumerFormValues>({
    resolver: zodResolver(consumerSchema),
    defaultValues: {
      name: '',
      description: '',
      webhook_url: undefined,
      webhook_secret: undefined,
      is_active: true,
      push_enabled: false,
      push_frequency: 'manual',
      allowed_periods: PERIODS,
    },
  });

  useEffect(() => {
    if (!dialogOpen) return;

    if (editing) {
      form.reset({
        name: editing.name,
        description: editing.description ?? '',
        webhook_url: editing.webhook_url ?? undefined,
        webhook_secret: editing.webhook_secret ?? undefined,
        is_active: editing.is_active,
        push_enabled: editing.push_enabled,
        push_frequency: (editing.push_frequency as PushFrequency) ?? 'manual',
        allowed_periods: (editing.allowed_periods as AnalyticsPeriod[]) ?? PERIODS,
      });
      return;
    }

    form.reset({
      name: '',
      description: '',
      webhook_url: undefined,
      webhook_secret: undefined,
      is_active: true,
      push_enabled: false,
      push_frequency: 'manual',
      allowed_periods: PERIODS,
    });
  }, [dialogOpen, editing, form]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (consumer: AnalyticsApiConsumerRow) => {
    setEditing(consumer);
    setDialogOpen(true);
  };

  const showSecretOnce = (label: string, secret: string) => {
    setSecretLabel(label);
    setSecretValue(secret);
    setSecretDialogOpen(true);
  };

  const onSubmit = async (values: ConsumerFormValues) => {
    try {
      if (editing) {
        await updateConsumer.mutateAsync({
          id: editing.id,
          updates: {
            name: values.name,
            description: values.description ?? null,
            webhook_url: values.webhook_url ?? null,
            webhook_secret: values.webhook_secret ?? null,
            is_active: values.is_active,
            push_enabled: values.push_enabled,
            push_frequency: values.push_frequency,
            allowed_periods: values.allowed_periods,
          },
        });
        setDialogOpen(false);
        return;
      }

      const result = await createConsumer.mutateAsync({
        name: values.name,
        description: values.description ?? null,
        webhook_url: values.webhook_url ?? null,
        webhook_secret: values.webhook_secret ?? null,
        is_active: values.is_active,
        push_enabled: values.push_enabled,
        push_frequency: values.push_frequency,
        allowed_periods: values.allowed_periods,
      });

      setDialogOpen(false);
      showSecretOnce(`API Secret for ${result.consumer.name}`, result.plainSecret);
    } catch (err) {
      // individual hooks already toast; keep this for safety
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(msg);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secretValue);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const toggleActive = async (consumer: AnalyticsApiConsumerRow, next: boolean) => {
    await updateConsumer.mutateAsync({ id: consumer.id, updates: { is_active: next } });
  };

  const togglePushEnabled = async (consumer: AnalyticsApiConsumerRow, next: boolean) => {
    await updateConsumer.mutateAsync({ id: consumer.id, updates: { push_enabled: next } });
  };

  const manualPush = async (consumer: AnalyticsApiConsumerRow) => {
    const result = await triggerPush.mutateAsync(consumer.id);
    const target = result.results?.find((r) => r.id === consumer.id);
    if (target?.status === 'failed') {
      toast.error(`Push failed: ${target.error || 'Unknown error'}`);
    }
  };

  const regenerateSecret = async (consumer: AnalyticsApiConsumerRow) => {
    const result = await regenSecret.mutateAsync(consumer.id);
    showSecretOnce(`New API Secret for ${result.consumer.name}`, result.plainSecret);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">API Consumers</h1>
          <p className="text-muted-foreground">
            Manage external projects that can pull usage stats and/or receive pushed analytics
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Consumer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consumers</CardTitle>
          <CardDescription>These records control access to the external analytics endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : consumers.length === 0 ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              No consumers yet. Click “Add Consumer” to create the first integration.
            </div>
          ) : (
            <div className="w-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Name</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Push</th>
                    <th className="p-2">Frequency</th>
                    <th className="p-2">Last Push</th>
                    <th className="p-2">Last Status</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consumers.map((consumer) => (
                    <tr key={consumer.id} className="border-b last:border-0">
                      <td className="p-2 font-medium">{consumer.name}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={consumer.is_active ? 'default' : 'secondary'}>
                            {consumer.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Switch
                            checked={consumer.is_active}
                            onCheckedChange={(next) => void toggleActive(consumer, next)}
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={consumer.push_enabled ? 'default' : 'secondary'}>
                            {consumer.push_enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Switch
                            checked={consumer.push_enabled}
                            onCheckedChange={(next) => void togglePushEnabled(consumer, next)}
                          />
                        </div>
                      </td>
                      <td className="p-2">{consumer.push_frequency}</td>
                      <td className="p-2 text-muted-foreground">
                        {consumer.last_push_at
                          ? formatDistanceToNow(new Date(consumer.last_push_at), { addSuffix: true })
                          : 'Never'}
                      </td>
                      <td className="p-2">
                        {consumer.last_push_status ? (
                          <Badge variant={consumer.last_push_status.startsWith('failed') ? 'destructive' : 'secondary'}>
                            {consumer.last_push_status.startsWith('failed') ? 'Failed' : consumer.last_push_status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(consumer)}>
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void manualPush(consumer)}
                            disabled={triggerPush.isPending || !consumer.webhook_url || !consumer.webhook_secret}
                            title={
                              consumer.webhook_url && consumer.webhook_secret
                                ? 'Send payload now'
                                : 'Configure webhook URL + secret to enable manual push'
                            }
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Push
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Secret
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Regenerate API secret?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will invalidate the old secret immediately. You’ll only be able to view the new
                                  secret once.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void regenerateSecret(consumer)}>
                                  Regenerate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete consumer?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove <span className="font-medium">{consumer.name}</span> and revoke API
                                  access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => void deleteConsumer.mutateAsync(consumer.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Consumer' : 'Create Consumer'}</DialogTitle>
            <DialogDescription>Configure access and optional webhook push delivery.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Marketing Dashboard" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional notes for this integration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Active</FormLabel>
                        <p className="text-xs text-muted-foreground">Allow this consumer to access the pull API</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="push_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Push enabled</FormLabel>
                        <p className="text-xs text-muted-foreground">Send analytics to your webhook on a schedule</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="push_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Push frequency</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PUSH_FREQUENCIES.map((freq) => (
                            <SelectItem key={freq} value={freq}>
                              {freq}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Allowed periods</FormLabel>
                  <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                    {PERIODS.map((p) => (
                      <FormField
                        key={p}
                        control={form.control}
                        name="allowed_periods"
                        render={({ field }) => {
                          const selected = field.value?.includes(p) ?? false;
                          return (
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => {
                                  const next = new Set(field.value ?? []);
                                  if (checked) next.add(p);
                                  else next.delete(p);
                                  field.onChange(Array.from(next));
                                }}
                              />
                              <span>{p}</span>
                            </label>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage>{form.formState.errors.allowed_periods?.message as string | undefined}</FormMessage>
                </div>
              </div>

              <FormField
                control={form.control}
                name="webhook_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/webhooks/usage" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="webhook_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook Secret</FormLabel>
                    <FormControl>
                      <Input placeholder="Shared secret for receiver verification" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={createConsumer.isPending || updateConsumer.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createConsumer.isPending || updateConsumer.isPending}>
                  {editing ? 'Save' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{secretLabel}</DialogTitle>
            <DialogDescription>
              This secret is shown only once. Store it securely in the consuming project.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 p-3 font-mono text-sm break-all">{secretValue}</div>

          <DialogFooter>
            <Button variant="outline" onClick={() => void handleCopySecret()} disabled={!secretValue}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button onClick={() => setSecretDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

