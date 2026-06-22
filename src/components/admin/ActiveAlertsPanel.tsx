import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert } from '@/hooks/useControlTowerHealth';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  Check,
  Eye,
} from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ActiveAlertsPanelProps {
  alerts: Alert[];
  isLoading: boolean;
  onAcknowledge: (alertId: string) => Promise<void>;
  onResolve: (alertId: string, notes?: string) => Promise<void>;
}

export const ActiveAlertsPanel = ({
  alerts,
  isLoading,
  onAcknowledge,
  onResolve,
}: ActiveAlertsPanelProps) => {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'error':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sync_failure: 'Sync Failure',
      high_latency: 'High Latency',
      data_drift: 'Data Drift',
      mapping_issue: 'Mapping Issue',
      stale_data: 'Stale Data',
      api_unreachable: 'API Unreachable',
    };
    return labels[type] || type;
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;
    setIsResolving(true);
    try {
      await onResolve(selectedAlert.id, resolutionNotes || undefined);
      setSelectedAlert(null);
      setResolutionNotes('');
    } finally {
      setIsResolving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Active Alerts</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </Card>
    );
  }

  const groupedAlerts = alerts.reduce((acc, alert) => {
    if (!acc[alert.severity]) {
      acc[alert.severity] = [];
    }
    acc[alert.severity].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  const severityOrder = ['critical', 'error', 'warning', 'info'];

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Active Alerts</h3>
          <Badge variant="secondary">{alerts.length} Total</Badge>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="text-muted-foreground">All clear! No active alerts.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {severityOrder.map(severity => {
                const severityAlerts = groupedAlerts[severity] || [];
                if (severityAlerts.length === 0) return null;

                return (
                  <div key={severity}>
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(severity)}
                      <h4 className="font-medium capitalize">{severity}</h4>
                      <Badge variant="outline" className="ml-auto">
                        {severityAlerts.length}
                      </Badge>
                    </div>

                    <div className="space-y-2 ml-7">
                      {severityAlerts.map(alert => (
                        <div
                          key={alert.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getSeverityBadge(alert.severity)}
                                <span className="text-xs text-muted-foreground">
                                  {getAlertTypeLabel(alert.alert_type)}
                                </span>
                              </div>
                              <p className="font-medium text-sm mb-1">{alert.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {alert.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(alert.triggered_at), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>

                            <div className="flex flex-col gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedAlert(alert)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onAcknowledge(alert.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getSeverityIcon(selectedAlert.severity)}
              {selectedAlert?.title}
            </DialogTitle>
            <DialogDescription>{selectedAlert?.message}</DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {getAlertTypeLabel(selectedAlert.alert_type)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Severity</p>
                  {getSeverityBadge(selectedAlert.severity)}
                </div>
                <div>
                  <p className="text-muted-foreground">Triggered</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(selectedAlert.triggered_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline">{selectedAlert.status}</Badge>
                </div>
              </div>

              {Object.keys(selectedAlert.metadata || {}).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Additional Details</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Resolution Notes (Optional)
                </label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about how this was resolved..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlert(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isResolving}
            >
              {isResolving ? 'Resolving...' : 'Resolve Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
