import { RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSyncControlTowerDeals } from '@/hooks/useSyncControlTowerDeals';
import { usePushToControlTower } from '@/hooks/usePushToControlTower';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';

interface DealControlTowerSyncProps {
  dealId: string;
  syncedFromControlTower?: boolean | null;
  lastSyncedAt?: string | null;
  updatedAt?: string | null;
}

export function DealControlTowerSync({ 
  dealId, 
  syncedFromControlTower,
  lastSyncedAt,
  updatedAt
}: DealControlTowerSyncProps) {
  const { syncDeals, isSyncing } = useSyncControlTowerDeals(dealId);
  const { pushDeal, isPushing } = usePushToControlTower(dealId);

  // Check if there are pending local changes
  const hasPendingChanges = updatedAt && lastSyncedAt 
    ? new Date(updatedAt) > new Date(lastSyncedAt)
    : false;

  // Smart button validation
  const canPush = useMemo(() => {
    if (!dealId) return false;
    if (!syncedFromControlTower) return false;
    if (!hasPendingChanges) return false;
    return true;
  }, [dealId, syncedFromControlTower, hasPendingChanges]);

  const pushTooltip = useMemo(() => {
    if (!syncedFromControlTower) {
      return "This deal was not synced from Control Tower and cannot be pushed back";
    }
    if (!hasPendingChanges) {
      return "No local changes to push";
    }
    return "Push local changes back to Control Tower";
  }, [syncedFromControlTower, hasPendingChanges]);

  if (!syncedFromControlTower) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-4 w-4" />
          Control Tower Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Last synced:</span>
          <span>
            {lastSyncedAt 
              ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
              : 'Never'
            }
          </span>
        </div>

        {hasPendingChanges && (
          <Badge variant="outline" className="w-full justify-center text-yellow-600 border-yellow-600">
            Local changes pending push
          </Badge>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncDeals()}
            disabled={isSyncing || isPushing}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Pulling...' : 'Pull'}
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pushDeal()}
                disabled={!canPush || isPushing || isSyncing}
                className="w-full"
              >
                <Upload className={`h-4 w-4 mr-2 ${isPushing ? 'animate-spin' : ''}`} />
                {isPushing ? 'Pushing...' : 'Push'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{pushTooltip}</TooltipContent>
          </Tooltip>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Quick Reference:</p>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            <li><strong>Pull:</strong> Get latest from Control Tower</li>
            <li><strong>Push:</strong> Send local changes to Control Tower</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
