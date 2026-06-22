import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, RefreshCcw, ExternalLink } from "lucide-react";

interface AutomationConfig {
  enable_cron: boolean;
  sync_interval_minutes: number;
  source: "settings" | "env";
}

interface CronResult {
  processed: number;
  errors: string[];
  retried?: number;
}

export default function AutomationSettings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [enableCron, setEnableCron] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lastResult, setLastResult] = useState<CronResult | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<AutomationConfig>("lead-cron-sync", {
        body: { action: "get_config" },
      });
      if (error) throw error;
      setConfig(data);
      setEnableCron(Boolean(data?.enable_cron));
      setIntervalMinutes(data?.sync_interval_minutes ?? 60);
    } catch (error) {
      console.error("Failed to load automation config", error);
      toast.error("Unable to load automation settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke<AutomationConfig>("lead-cron-sync", {
        body: {
          action: "update_config",
          enable_cron: enableCron,
          sync_interval_minutes: intervalMinutes,
        },
      });
      if (error) throw error;
      setConfig(data);
      toast.success("Automation settings updated");
    } catch (error) {
      console.error("Failed to save automation settings", error);
      toast.error("Unable to update settings");
    } finally {
      setSaving(false);
    }
  }, [enableCron, intervalMinutes]);

  const handleRunNow = useCallback(async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke<CronResult & { triggered: string }>("lead-cron-sync", {
        body: { action: "run_now" },
      });
      if (error) throw error;
      setLastResult({ processed: data?.processed ?? 0, errors: data?.errors ?? [] });
      toast.success(`Manual sync completed: ${data?.processed ?? 0} emails processed`);
      await loadConfig();
    } catch (error) {
      console.error("Manual sync failed", error);
      toast.error("Failed to run sync");
    } finally {
      setRunning(false);
    }
  }, [loadConfig]);

  const handleRetryFailed = useCallback(async () => {
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke<CronResult>("lead-cron-sync", {
        body: { action: "retry_failed" },
      });
      if (error) throw error;
      const retried = data?.retried ?? 0;
      setLastResult({ processed: retried, retried, errors: data?.errors ?? [] });
      toast.success(`Retry triggered for ${retried} log entries`);
    } catch (error) {
      console.error("Retry failed", error);
      toast.error("Failed to retry failed logs");
    } finally {
      setRetrying(false);
    }
  }, []);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Lead Automation Settings</h1>
        <p className="text-muted-foreground">
          Configure the hourly Gmail sync and review automation history for HubSpot and GoHighLevel hand-offs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Cron</CardTitle>
            <CardDescription>
              Control the Supabase scheduled task that polls business@sjinnovation.com for unread lead emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Enable hourly sync</p>
                <p className="text-sm text-muted-foreground">
                  When enabled, the cron job will fetch new emails and route them through the automation pipeline.
                </p>
              </div>
              <Switch
                checked={enableCron}
                onCheckedChange={setEnableCron}
                disabled={loading || saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync-interval">Sync interval (minutes)</Label>
              <Input
                id="sync-interval"
                type="number"
                min={5}
                max={240}
                value={intervalMinutes}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setIntervalMinutes(Number.isNaN(next) ? intervalMinutes : next);
                }}
                disabled={loading || saving}
              />
              {config?.source === "env" && (
                <p className="text-xs text-muted-foreground">
                  Using environment defaults. Save to store overrides in lead_automation_settings.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={loadConfig} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual Controls</CardTitle>
            <CardDescription>
              Trigger the automation immediately or retry any entries flagged for review or error.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Run sync now</p>
                  <p className="text-sm text-muted-foreground">Fetch unread emails and process them immediately.</p>
                </div>
                <Button onClick={handleRunNow} disabled={running}>
                  {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Now
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Retry failed logs</p>
                  <p className="text-sm text-muted-foreground">Re-run automation for the latest error or review entries.</p>
                </div>
                <Button variant="outline" onClick={handleRetryFailed} disabled={retrying}>
                  {retrying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Retry
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <p className="font-medium">Recent Result</p>
              {lastResult ? (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p>Processed: {lastResult.processed}</p>
                  {typeof lastResult.retried === "number" && <p>Retried: {lastResult.retried}</p>}
                  {lastResult.errors.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm font-medium text-destructive">Errors</p>
                      <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                        {lastResult.errors.map((error, index) => (
                          <li key={`${error}-${index}`}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No errors reported.</p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Run a sync or retry to see the latest summary.</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Review automation logs</p>
                <p className="text-sm text-muted-foreground">Inspect AI parsing results and manual approval queue.</p>
              </div>
              <Button variant="ghost" onClick={() => navigate("/automation/leads")}> 
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
