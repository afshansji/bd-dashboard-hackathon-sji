import { CheckCircle2, XCircle, Clock, TrendingUp, Users, CheckSquare, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLastSyncDetails } from '@/hooks/useLastSyncDetails';
import { format } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

export function LastSyncDetails() {
  const { data: lastSync, isLoading } = useLastSyncDetails();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            Loading sync details...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lastSync) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            No sync history available
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSuccess = lastSync.status === 'success';
  const totalDeals = (lastSync.payload?.deals?.new || 0) + (lastSync.payload?.deals?.updated || 0);
  const totalClients = (lastSync.payload?.clients?.new || 0) + (lastSync.payload?.clients?.updated || 0);
  const hasErrors = (lastSync.payload?.deals?.failed || 0) > 0 || (lastSync.payload?.checklists?.failed || 0) > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Last Control Tower Sync
          </CardTitle>
          <Badge variant={isSuccess ? 'default' : 'destructive'} className={isSuccess ? 'bg-green-600 hover:bg-green-700' : ''}>
            {isSuccess ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Success
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Failed
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {format(new Date(lastSync.synced_at), 'PPpp')}
        </div>

        {isSuccess ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDeals}</p>
                  <p className="text-xs text-muted-foreground">Deals synced</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalClients}</p>
                  <p className="text-xs text-muted-foreground">Clients updated</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckSquare className="h-4 w-4" />
                <span>{lastSync.payload?.checklists?.synced || 0} checklist items synced</span>
              </div>
              <div className="text-muted-foreground">
                ⏱️ {((lastSync.payload?.duration || 0) / 1000).toFixed(1)}s
              </div>
            </div>

            {hasErrors && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  {lastSync.payload?.deals?.failed || 0} deals and {lastSync.payload?.checklists?.failed || 0} checklist items failed
                </span>
              </div>
            )}

            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger className="text-sm text-primary hover:underline">
                {isOpen ? 'Hide' : 'Show'} detailed breakdown
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium mb-1">📊 Deals</p>
                    <p className="text-muted-foreground">
                      {lastSync.payload?.deals?.new || 0} new, {lastSync.payload?.deals?.updated || 0} updated
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium mb-1">👥 Clients</p>
                    <p className="text-muted-foreground">
                      {lastSync.payload?.clients?.new || 0} new, {lastSync.payload?.clients?.updated || 0} updated
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium mb-1">✅ Checklists</p>
                    <p className="text-muted-foreground">
                      {lastSync.payload?.checklists?.synced || 0} synced
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium mb-1">⏱️ Duration</p>
                    <p className="text-muted-foreground">
                      {((lastSync.payload?.duration || 0) / 1000).toFixed(2)} seconds
                    </p>
                  </div>
                </div>

                {lastSync.payload?.errors && lastSync.payload.errors.length > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="font-medium text-sm mb-2 text-destructive">Errors:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {lastSync.payload.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        ) : (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-1">Sync Failed</p>
            <p className="text-sm text-muted-foreground">
              {lastSync.error_message || 'Unknown error occurred'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
