import { RefreshCw, CheckCircle2, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSyncControlTowerDeals } from '@/hooks/useSyncControlTowerDeals';
import { useSyncControlTowerFull } from '@/hooks/useSyncControlTowerFull';
import { useControlTowerStatus } from '@/hooks/useControlTowerStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface SyncControlTowerButtonProps {
  mode?: 'clients-only' | 'full';
  onSyncStateChange?: (isSyncing: boolean, progress?: { current: number; total: number } | null) => void;
}

export function SyncControlTowerButton({ mode = 'full', onSyncStateChange }: SyncControlTowerButtonProps) {
  const { syncDeals, isSyncing: isSyncingDeals } = useSyncControlTowerDeals();
  const { mutate: syncFull, isPending: isSyncingFull } = useSyncControlTowerFull();
  const { isConfigured, isActive, lastSync, isLoading } = useControlTowerStatus();

  const [isClientSyncing, setIsClientSyncing] = useState(false);
  const [clientSyncProgress, setClientSyncProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const isSyncing = isSyncingDeals || isSyncingFull;

  // Notify parent component when sync state changes
  useEffect(() => {
    if (mode === 'clients-only' && onSyncStateChange) {
      onSyncStateChange(isClientSyncing, clientSyncProgress);
    }
  }, [isClientSyncing, clientSyncProgress, mode, onSyncStateChange]);

  const handleClientSync = async () => {
    if (!isConfigured || !isActive) {
      toast.error('Control Tower not configured', {
        description: 'Please configure Control Tower in Admin Settings first.'
      });
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsClientSyncing(true);
    setClientSyncProgress(null);

    try {
      // Call the sync-control-tower-clients-api edge function directly
      const { data, error } = await supabase.functions.invoke('sync-control-tower-clients-api', {
        signal: controller.signal
      });
      
      if (error) {
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          toast.info('Client sync stopped', {
            description: 'Sync operation was cancelled'
          });
          return;
        }
        throw error;
      }
      
      const result = data as { clients: { new: number; updated: number; total_fetched: number } };
      
      toast.success('Clients synced successfully', {
        description: `${result.clients.new} new, ${result.clients.updated} updated, ${result.clients.total_fetched} total fetched`
      });
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        toast.info('Client sync stopped', {
          description: 'Sync operation was cancelled'
        });
      } else {
        toast.error('Client sync failed', {
          description: error.message || 'An error occurred during sync'
        });
      }
    } finally {
      setIsClientSyncing(false);
      setClientSyncProgress(null);
      setAbortController(null);
    }
  };

  const handleStopSync = () => {
    if (abortController) {
      abortController.abort();
      toast.info('Stopping sync...', {
        description: 'Cancelling the sync operation'
      });
    }
  };

  const handleSyncDeals = async () => {
    await syncDeals();
  };

  const handleFullSync = () => {
    syncFull();
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

  const isButtonDisabled = isSyncing || isLoading || !isConfigured || !isActive || isClientSyncing;

  // Clients-only mode: Simple button without dropdown
  if (mode === 'clients-only') {
    return (
      <div className="flex flex-col gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                {isClientSyncing ? (
                  <Button variant="outline" onClick={handleStopSync}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Stop Sync
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={isButtonDisabled}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Clients from Control Tower
                      </Button>
                    </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {isConfigured && isActive ? 'Sync Clients from Control Tower?' : 'Control Tower Not Configured'}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {isConfigured && isActive ? (
                          <>
                            This will pull all <strong>client records</strong> from Control Tower and sync them to your database.
                            <br/><br/>
                            • Updates existing clients<br/>
                            • Creates new clients<br/>
                            • Preserves local customizations
                          </>
                        ) : (
                          <>
                            Control Tower integration is not configured. Please configure the Control Tower URL and API key in Admin Settings → Integration Manager to enable syncing.
                          </>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      {isConfigured && isActive && (
                        <AlertDialogAction onClick={handleClientSync}>
                          Sync Clients
                        </AlertDialogAction>
                      )}
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                )}
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
      </div>
    );
  }

  // Full mode: Dropdown with multiple sync options
  return (
    <div className="flex flex-col gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isButtonDisabled}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync from Control Tower'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Full Sync (Recommended)
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isConfigured && isActive ? 'Run Full Sync from Control Tower?' : 'Control Tower Not Configured'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isConfigured && isActive ? (
                            <>
                              This will sync <strong>everything</strong> from Control Tower:
                              <br/><br/>
                              • Employees (team members)<br/>
                              • PODs (project teams)<br/>
                              • Deals (active deals)<br/>
                              • Clients (from deals)<br/>
                              • Checklists (deal tasks)
                              <br/><br/>
                              This may take 2-5 minutes to complete.
                            </>
                          ) : (
                            <>
                              Control Tower integration is not configured. Please configure the Control Tower URL and API key in Admin Settings → Integration Manager to enable syncing.
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        {isConfigured && isActive && (
                          <AlertDialogAction onClick={handleFullSync}>
                            Run Full Sync
                          </AlertDialogAction>
                        )}
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Deals Only
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {isConfigured && isActive ? 'Sync Active Deals from Control Tower?' : 'Control Tower Not Configured'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {isConfigured && isActive ? (
                            <>
                              This will copy all <strong>active deals</strong> from Control Tower to your BD database.
                              Existing deals will be updated with the latest information including:
                              <br/><br/>
                              • Deal details and status<br/>
                              • Client information<br/>
                              • Checklist items<br/>
                              • Owner assignments
                            </>
                          ) : (
                            <>
                              Control Tower integration is not configured. Please configure the Control Tower URL and API key in Admin Settings → Integration Manager to enable syncing.
                            </>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        {isConfigured && isActive && (
                          <AlertDialogAction onClick={handleSyncDeals}>
                            Sync Deals
                          </AlertDialogAction>
                        )}
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
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
    </div>
  );
}
