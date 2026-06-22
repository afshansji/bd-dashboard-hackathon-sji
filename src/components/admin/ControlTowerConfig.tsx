import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Database, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useControlTowerConfig,
  useSaveControlTowerConfig,
  useTestControlTowerConnection,
} from '@/hooks/useControlTowerConfig';

export const ControlTowerConfig = () => {
  const { toast } = useToast();
  const { data: config, isLoading: isLoadingConfig } = useControlTowerConfig();
  const saveConfig = useSaveControlTowerConfig();
  const testConnection = useTestControlTowerConnection();

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (config) {
      setUrl(config.url);
      setAnonKey(config.anon_key);
      setIsActive(config.is_active);
      
      if (config.url && config.anon_key) {
        setConnectionStatus('success');
      }
    }
  }, [config]);

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    
    try {
      await testConnection.mutateAsync({ url, anon_key: anonKey, is_active: isActive });
      setConnectionStatus('success');
      toast({
        title: 'Connection Successful',
        description: 'Successfully connected to Control Tower.',
      });
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Control Tower.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync({ url, anon_key: anonKey, is_active: isActive });
      toast({
        title: 'Configuration Saved',
        description: 'Control Tower configuration has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save configuration.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Testing...</Badge>;
      case 'success':
        return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Disconnected</Badge>;
      default:
        return <Badge variant="secondary">Not Configured</Badge>;
    }
  };

  if (isLoadingConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Control Tower Connection</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Configure connection to Control Tower database for pipeline management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="control-tower-url">Control Tower URL</Label>
            <Input
              id="control-tower-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="control-tower-key">Anon Key</Label>
            <Input
              id="control-tower-key"
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbG..."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="control-tower-active">Active Connection</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable Control Tower integration
              </p>
            </div>
            <Switch
              id="control-tower-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!url || !anonKey || testConnection.isPending}
          >
            {testConnection.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={!url || !anonKey || saveConfig.isPending}
          >
            {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </div>

        {config?.url && (
          <div className="text-sm text-muted-foreground">
            <p>Last configured: {new Date().toLocaleDateString()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
