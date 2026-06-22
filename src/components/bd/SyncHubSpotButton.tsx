import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHubspotSyncWithStatus } from '@/hooks/useHubspotSyncWithStatus';
import { useHubSpotStatus } from '@/hooks/useHubSpotStatus';
import { formatRelativeTime } from '@/lib/utils';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';

interface SyncHubSpotButtonProps {
  syncType?: 'full' | 'deals-only';
}

export function SyncHubSpotButton({ syncType = 'full' }: SyncHubSpotButtonProps) {
  const { isSyncing, startSync } = useHubspotSyncWithStatus();
  const { isConfigured, isActive, lastSync, isLoading } = useHubSpotStatus();

  const handleSync = async () => {
    await startSync(syncType);
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="secondary" className="ml-2">
          <AlertCircle className="h-3 w-3 mr-1" />
          Checking...
        </Badge>
      );
    }

    if (isSyncing) {
      return (
        <Badge variant="secondary" className="ml-2">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Syncing
        </Badge>
      );
    }

    if (isConfigured && isActive) {
      return (
        <Badge variant="default" className="ml-2 bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    }

    return (
      <Badge variant="destructive" className="ml-2">
        <XCircle className="h-3 w-3 mr-1" />
        Not Configured
      </Badge>
    );
  };

  const isButtonDisabled = isSyncing || isLoading || !isConfigured || !isActive;

  return (
    <div className="flex flex-col gap-1">
      <AlertDialog>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isButtonDisabled}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync from HubSpot'}
                  </Button>
                </AlertDialogTrigger>
                {getStatusBadge()}
              </div>
            </TooltipTrigger>
            {lastSync && (
              <TooltipContent>
                <p>Last sync: {format(lastSync, 'PPpp')}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isConfigured && isActive ? 'Sync from HubSpot CRM?' : 'HubSpot Not Configured'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isConfigured && isActive ? (
                <>
                  {syncType === 'deals-only' ? (
                    <>
                      This will import <strong>deals only</strong> from HubSpot CRM to your BD database.
                      Existing deals will be updated with the latest information.
                      <br/><br/>
                      <em>Companies and contacts will not be synced.</em>
                    </>
                  ) : (
                    <>
                      This will import <strong>companies, contacts, and deals</strong> from HubSpot CRM to your BD database.
                      Existing records will be updated with the latest information.
                    </>
                  )}
                </>
              ) : (
                <>
                  HubSpot integration is not configured. Please go to Admin → Integration Manager 
                  to set up your HubSpot API key before syncing data.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {isConfigured && isActive && (
              <AlertDialogAction onClick={handleSync}>
                Sync from HubSpot
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {lastSync && !isLoading && (
        <span className="text-xs text-muted-foreground ml-1">
          Last sync: {formatRelativeTime(lastSync)}
        </span>
      )}
    </div>
  );
}
