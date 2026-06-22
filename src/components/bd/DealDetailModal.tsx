import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { Deal, DealStatus } from '@/hooks/useDeals';
import { Client } from '@/hooks/useClients';
import { AdminUser } from '@/hooks/useAdminUsers';
import { DEAL_STATUSES, STAGE_COLORS, STAGE_LABELS, STATUS_BADGE_VARIANTS, STATUS_LABELS } from '@/lib/dealStages';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DealDetailModalProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => Promise<void>;
  onStatusChange?: (dealId: string, status: DealStatus) => Promise<void>;
  onAssignPm?: (dealId: string, pmId: string | null) => Promise<void>;
  clients: Client[];
  users: AdminUser[];
  pms: AdminUser[];
}

function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getUserDisplayName(user: AdminUser | undefined): string {
  if (!user) return 'Unassigned';
  if (user.first_name || user.last_name) {
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  }
  return user.email;
}

function getClientLink(clientId: string | undefined | null, clients: Client[]): React.ReactNode {
  if (!clientId) return '-';
  const client = clients.find((item) => item.id === clientId);
  if (!client) return '-';
  return (
    <Link to={`/clients/${client.slug}`} className="text-primary hover:underline">
      {client.name}
    </Link>
  );
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

const statusOrder: DealStatus[] = [
  DEAL_STATUSES.ACTIVE,
  DEAL_STATUSES.WON,
  DEAL_STATUSES.LOST,
  DEAL_STATUSES.ON_HOLD,
];

export function DealDetailModal({
  deal,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
  onAssignPm,
  clients,
  users,
  pms,
}: DealDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DealStatus | ''>('');
  const [selectedPm, setSelectedPm] = useState<string>('');

  useEffect(() => {
    if (deal) {
      setSelectedStatus((deal.status as DealStatus | null | undefined) ?? '');
      setSelectedPm(deal.pm_assigned_id ?? '');
    } else {
      setSelectedStatus('');
      setSelectedPm('');
    }
  }, [deal, open]);

  const owner = useMemo(() => users.find((user) => user.id === deal?.owner_id), [deal?.owner_id, users]);
  const pm = useMemo(() => pms.find((user) => user.id === deal?.pm_assigned_id), [deal?.pm_assigned_id, pms]);

  const handleDelete = async () => {
    if (!deal) return;
    try {
      setIsDeleting(true);
      await onDelete(deal);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (status: DealStatus) => {
    if (!deal || !onStatusChange) return;
    setSelectedStatus(status);
    await onStatusChange(deal.id, status);
  };

  const handleAssignPm = async (pmId: string | null) => {
    if (!deal || !onAssignPm) return;
    setSelectedPm(pmId ?? '');
    await onAssignPm(deal.id, pmId);
  };

  const amountDisplay = deal?.amount ? formatCurrency(deal.amount, 'USD') : '—';
  const probabilityDisplay = typeof deal?.probability === 'number' ? `${deal?.probability}%` : '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {deal ? (
          <div className="space-y-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-semibold">{deal.title}</DialogTitle>
              <DialogDescription>
                Detailed view of deal performance, ownership, and sync metadata.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              {deal.stage && (
                <Badge className={cn('capitalize', STAGE_COLORS[deal.stage])}>{STAGE_LABELS[deal.stage]}</Badge>
              )}
              {deal.status && (
                <Badge variant={STATUS_BADGE_VARIANTS[deal.status]} className="capitalize">
                  {STATUS_LABELS[deal.status]}
                </Badge>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="text-lg font-semibold">{amountDisplay}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Probability</div>
                <div className="text-lg font-semibold">{probabilityDisplay}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Client</div>
                <div className="text-lg font-semibold">
                  {getClientLink(deal.client_id, clients)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Owner</div>
                <div className="text-lg font-semibold">{getUserDisplayName(owner)}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Project Manager</div>
                <div className="text-lg font-semibold">{getUserDisplayName(pm)}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">Close Date</div>
                <div className="text-lg font-semibold">{formatDate(deal.close_date)}</div>
              </div>
            </div>

            {(deal.notes || deal.control_tower_status || deal.control_tower_id) && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Notes</h3>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {deal.notes || '—'}
                  </p>
                </div>

                <Separator />

                {(deal.control_tower_id || deal.last_synced_at) && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Control Tower Sync</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Synced From Control Tower</div>
                        <div className="text-sm font-medium">{deal.synced_from_control_tower ? 'Yes' : 'No'}</div>
                      </div>
                      {deal.control_tower_id && (
                        <div>
                          <div className="text-xs text-muted-foreground">Control Tower Deal ID</div>
                          <div className="text-sm font-medium">{deal.control_tower_id}</div>
                        </div>
                      )}
                      {deal.control_tower_status && (
                        <div>
                          <div className="text-xs text-muted-foreground">Control Tower Status</div>
                          <div className="text-sm font-medium">{deal.control_tower_status}</div>
                        </div>
                      )}
                      {deal.last_synced_at && (
                        <div>
                          <div className="text-xs text-muted-foreground">Last Synced</div>
                          <div className="text-sm font-medium">{formatDate(deal.last_synced_at)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div className="flex flex-wrap gap-3">
              <Button variant="default" onClick={() => onEdit(deal)}>
                Edit Deal
              </Button>

              {onStatusChange && (
                <Select
                  value={selectedStatus || deal.status || ''}
                  onValueChange={(value) => handleStatusChange(value as DealStatus)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Update status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOrder.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {onAssignPm && (
                <Select
                  value={selectedPm || deal.pm_assigned_id || ''}
                  onValueChange={(value) => handleAssignPm(value || null)}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Assign project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {pms.map((pmOption) => (
                      <SelectItem key={pmOption.id} value={pmOption.id}>
                        {getUserDisplayName(pmOption)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Deal</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this deal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The deal and its history will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Deal not found</DialogTitle>
              <DialogDescription>The selected deal could not be loaded.</DialogDescription>
            </DialogHeader>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
