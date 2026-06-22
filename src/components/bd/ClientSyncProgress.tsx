import { RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface ClientSyncProgressProps {
  isVisible: boolean;
  progress?: {
    current: number;
    total: number;
  } | null;
}

export function ClientSyncProgress({ isVisible, progress }: ClientSyncProgressProps) {
  if (!isVisible) return null;
  
  return (
    <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
      <RefreshCw className="h-4 w-4 animate-spin" />
      <AlertTitle>Syncing Clients from Control Tower</AlertTitle>
      <AlertDescription>
        {progress ? (
          <div className="space-y-2 mt-2">
            <p className="text-sm">
              Processing client {progress.current} of {progress.total}...
            </p>
            <Progress value={(progress.current / progress.total) * 100} />
          </div>
        ) : (
          <p className="text-sm mt-2">Fetching clients from Control Tower...</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
