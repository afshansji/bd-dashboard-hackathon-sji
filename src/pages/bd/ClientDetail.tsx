import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Building,
  Globe,
  Mail,
  MapPin,
  Phone,
  User,
  FileText,
  ExternalLink,
  Loader2,
  Pencil,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClientBySlug } from '@/hooks/useClientBySlug';
import { useDeals } from '@/hooks/useDeals';
import { useDealFiles } from '@/hooks/useDealFiles';
import { usePushClientToGHL } from '@/hooks/usePushClientToGHL';
import { useClients, Client } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { EditClientDialog, ClientFormValues } from '@/components/bd/EditClientDialog';

interface AgentRunResponse {
  structured_output?: unknown;
}

interface AgentOutput {
  industry: string | null;
  employee_count: number | null;
  revenue: number | null;
  notes: string | null;
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.\-]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const safeString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
};

const extractAgentOutput = (raw: unknown): AgentOutput | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const root = raw as Record<string, unknown>;
  const candidateSource =
    root.client && typeof root.client === 'object'
      ? root.client
      : root.enriched_fields && typeof root.enriched_fields === 'object'
        ? root.enriched_fields
        : root.fields && typeof root.fields === 'object'
          ? root.fields
          : root;

  const candidate = candidateSource as Record<string, unknown>;

  const nestedProfile =
    candidate.profile && typeof candidate.profile === 'object'
      ? (candidate.profile as Record<string, unknown>)
      : null;

  const target = nestedProfile ?? candidate;

  const industry = safeString(target.industry ?? candidate.industry);
  const employeeCount = toNumber(
    target.employee_count ?? target.headcount ?? candidate.employee_count ?? candidate.headcount
  );
  const revenue = toNumber(
    target.revenue ?? target.annual_revenue ?? candidate.revenue ?? candidate.annual_revenue ?? candidate.company_revenue
  );
  const notes =
    safeString(target.notes) ??
    safeString(target.summary) ??
    safeString(candidate.notes) ??
    safeString(candidate.summary) ??
    safeString(root.summary) ??
    safeString(root.notes);

  if (!industry && employeeCount === null && revenue === null && !notes) {
    return null;
  }

  return {
    industry: industry ?? null,
    employee_count: employeeCount,
    revenue,
    notes: notes ?? null,
  };
};

const formatCount = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat().format(value);
};

const formatRevenue = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return withTime ? format(date, 'PPpp') : format(date, 'PP');
  } catch {
    return '—';
  }
}

function formatRelativeDate(value?: string | null) {
  if (!value) return null;
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return null;
  }
}

export default function ClientDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: client, isLoading: isLoadingClient, error: fetchError } = useClientBySlug(slug);
  const clientId = client?.id;
  const { deals, loading: dealsLoading } = useDeals({ clientId, enabled: Boolean(clientId) });
  const { files, loading: filesLoading } = useDealFiles({ clientId, enabled: Boolean(clientId) });
  const { updateClient } = useClients();

  const [isRunning, setIsRunning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agentOutput, setAgentOutput] = useState<AgentOutput | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { mutate: pushToGHL, isPending: isPushingToGHL } = usePushClientToGHL();

  const error = fetchError ? 'Unable to load client details' : null;

  const primaryContact = useMemo(
    () =>
      [
        client?.contact_person && {
          icon: User,
          label: 'Point of Contact',
          value: client.contact_person,
        },
        client?.email && {
          icon: Mail,
          label: 'Email',
          value: client.email,
        },
        client?.phone && {
          icon: Phone,
          label: 'Phone',
          value: client.phone,
        },
        client?.website && {
          icon: Globe,
          label: 'Website',
          value: client.website,
        },
        (client?.address || client?.city || client?.state || client?.country) && {
          icon: MapPin,
          label: 'Location',
          value: [client?.address, client?.city, client?.state, client?.country].filter(Boolean).join(', '),
        },
        client?.company && {
          icon: Building,
          label: 'Company',
          value: client.company,
        },
      ].filter(Boolean) as { icon: LucideIcon; label: string; value: string }[],
    [client]
  );

  const relativeUpdatedAt = formatRelativeDate(client?.updated_at);

  const createDealSlug = (dealTitle: string | null | undefined, dealId: string) => {
    const slug = (dealTitle || 'deal')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug ? `${slug}-${dealId}` : `deal-${dealId}`;
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      if (isRunning || isApplying) return;
      setIsModalOpen(false);
      setAgentOutput(null);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleRunAgent = async () => {
    if (!client?.id) {
      toast({
        title: 'Client not ready',
        description: 'Client must be loaded before running the AI agent.',
        variant: 'destructive',
      });
      return;
    }

    setIsModalOpen(true);
    setIsRunning(true);
    setAgentOutput(null);

    try {
      const { data, error } = await supabase.functions.invoke<AgentRunResponse>('run-ai-agent', {
        body: { agent_type: 'research', target: 'client', client_id: client.id },
      });

      if (error) {
        throw error;
      }

      const output = extractAgentOutput(data?.structured_output);
      if (!output) {
        toast({
          title: 'No new insights',
          description: 'The AI agent did not return additional client details.',
        });
      }
      setAgentOutput(output);
    } catch (runError) {
      console.error('Error running AI agent:', runError);
      toast({
        title: 'Unable to run agent',
        description: runError instanceof Error ? runError.message : 'Unexpected error',
        variant: 'destructive',
      });
      setIsModalOpen(false);
      setAgentOutput(null);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancel = () => {
    if (isRunning || isApplying) return;
    setIsModalOpen(false);
    setAgentOutput(null);
  };

  const handleConfirm = async () => {
    if (!client?.id) {
      toast({
        title: 'Client not ready',
        description: 'A valid client record is required before applying updates.',
        variant: 'destructive',
      });
      return;
    }

    if (!agentOutput) {
      toast({
        title: 'No AI data available',
        description: 'Run the AI agent to review suggestions before confirming.',
        variant: 'destructive',
      });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (agentOutput.industry) {
      updates.industry = agentOutput.industry;
    }
    if (agentOutput.employee_count !== null && agentOutput.employee_count !== undefined) {
      updates.employee_count = agentOutput.employee_count;
    }
    if (agentOutput.revenue !== null && agentOutput.revenue !== undefined) {
      updates.revenue = agentOutput.revenue;
    }
    if (agentOutput.notes) {
      updates.notes = agentOutput.notes;
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: 'No changes to apply',
        description: 'The AI agent did not return any new client information.',
      });
      setIsModalOpen(false);
      setAgentOutput(null);
      return;
    }

    setIsApplying(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', client.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Client updated',
        description: 'AI-enriched data has been applied to the client record.',
      });

      setIsModalOpen(false);
      setAgentOutput(null);

      if (slug) {
        await queryClient.invalidateQueries({ queryKey: ['client-by-slug', slug] });
      }
      if (client.slug && client.slug !== slug) {
        await queryClient.invalidateQueries({ queryKey: ['client-by-slug', client.slug] });
      }
    } catch (updateError) {
      console.error('Error updating client with AI output:', updateError);
      toast({
        title: 'Unable to update client',
        description: updateError instanceof Error ? updateError.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleUpdateClient = async (values: ClientFormValues) => {
    if (!client?.id) return;

    setIsUpdating(true);
    try {
      await updateClient(client.id, values);

      setIsEditDialogOpen(false);

      if (slug) {
        await queryClient.invalidateQueries({ queryKey: ['client-by-slug', slug] });
      }
      if (client.slug && client.slug !== slug) {
        await queryClient.invalidateQueries({ queryKey: ['client-by-slug', client.slug] });
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: 'Unable to update client',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isLoadingClient && !client && !error) {
    return (
      <div className="container mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back to clients
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Client not found</CardTitle>
          </CardHeader>
          <CardContent>This client may have been removed or is unavailable.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply AI Suggestions</DialogTitle>
            <DialogDescription>
              Review the AI-generated recommendations before updating the client profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isRunning ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing client data...</span>
              </div>
            ) : agentOutput ? (
              <div className="space-y-4">
                <div className="grid gap-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Industry</p>
                  <p className="text-sm">{agentOutput.industry ?? '—'}</p>
                </div>
                <div className="grid gap-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Employee Count</p>
                  <p className="text-sm">{formatCount(agentOutput.employee_count)}</p>
                </div>
                <div className="grid gap-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Revenue</p>
                  <p className="text-sm">{formatRevenue(agentOutput.revenue)}</p>
                </div>
                <div className="grid gap-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Notes / Summary</p>
                  <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {agentOutput.notes ?? '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No structured data was returned for this client. You can close the dialog or adjust the details manually.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isRunning || isApplying}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isRunning || isApplying || !agentOutput}>
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EditClientDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        client={client as Client | null}
        onSubmit={handleUpdateClient}
        isSubmitting={isUpdating}
      />
      <div className="container mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back to clients
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(true)}
              disabled={!client?.id || isLoadingClient}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Client
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/clients/${slug}/intelligence`)}
              disabled={!client?.id}
            >
              Intelligence Chat
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => client?.id && pushToGHL({ clientId: client.id })}
                    disabled={!client?.id || isPushingToGHL || isLoadingClient}
                  >
                    {isPushingToGHL ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {client?.gohighlevel_contact_id ? 'Updating...' : 'Adding...'}
                      </>
                    ) : client?.gohighlevel_contact_id ? (
                      'Update in Leadslift'
                    ) : (
                      'Add to Leadslift'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {client?.gohighlevel_contact_id
                    ? 'Update this client in Leadslift/GoHighLevel CRM'
                    : 'Add this client to Leadslift/GoHighLevel CRM'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleRunAgent}
                    disabled={!client?.id || isRunning || isApplying || isLoadingClient}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      'Run Agent'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Use AI Agent to analyze and fill missing company data.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to load client</CardTitle>
            </CardHeader>
            <CardContent>{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              {isLoadingClient ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ) : (
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold">
                    {client?.name || 'Unknown client'}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {client?.industry ? <Badge variant="outline">{client.industry}</Badge> : null}
                    {client?.status ? <Badge className="capitalize">{client.status}</Badge> : null}
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {isLoadingClient ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <div className="space-y-3">
                  {primaryContact.length === 0 ? (
                    <p className="text-muted-foreground">No contact details available.</p>
                  ) : (
                    primaryContact.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-muted-foreground">{item.value}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <Separator />

              <div className="grid gap-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Metadata</p>
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <span>Created: {formatDate(client?.created_at)}</span>
                  <span>
                    Last Updated: {formatDate(client?.updated_at)}
                    {relativeUpdatedAt ? ` (${relativeUpdatedAt})` : ''}
                  </span>
                </div>
              </div>

              {client?.gohighlevel_contact_id && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">GHL CRM Sync</p>
                    <div className="grid gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Synced
                        </Badge>
                      </div>
                      {client.gohighlevel_last_synced_at && (
                        <span className="text-muted-foreground">
                          Last synced: {formatDate(client.gohighlevel_last_synced_at, true)}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Associated Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {dealsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deals found for this client.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Close Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map((deal) => (
                        <TableRow
                          key={deal.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            navigate(
                              `/${(deal.stage || 'prospecting').toLowerCase()}/${createDealSlug(deal.title, deal.id)}`
                            )
                          }
                        >
                          <TableCell className="font-medium">{deal.title || 'Untitled deal'}</TableCell>
                          <TableCell className="capitalize">{deal.status || '—'}</TableCell>
                          <TableCell className="capitalize">{deal.stage || '—'}</TableCell>
                          <TableCell className="text-right">
                            {typeof deal.amount === 'number'
                              ? new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                }).format(deal.amount)
                              : '—'}
                          </TableCell>
                          <TableCell>{formatDate(deal.close_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Stored Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stored files for this client.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => {
                      const driveUrl = file.drive_folder_url ?? undefined;
                      const lastSync = file.drive_last_modified_at ?? file.updated_at;
                      const relativeSync = formatRelativeDate(lastSync);

                      return (
                        <TableRow key={file.id}>
                          <TableCell className="font-medium">{file.drive_file_name || 'Untitled File'}</TableCell>
                          <TableCell>Google Drive</TableCell>
                          <TableCell>
                            {file.category ? (
                              <Badge variant="outline">{file.category}</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">Uncategorized</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatDate(lastSync, true)}</span>
                              {relativeSync ? <span className="text-xs text-muted-foreground">{relativeSync}</span> : null}
                            </div>
                          </TableCell>
                          <TableCell className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild disabled={!driveUrl}>
                              <a href={driveUrl || '#'} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" /> Drive
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
