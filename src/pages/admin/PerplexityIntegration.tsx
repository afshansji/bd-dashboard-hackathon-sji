import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PerplexityModelOption {
  id: string;
  label: string;
  cost: number;
}

interface PerplexityFormState {
  model: string;
  cost_per_1k_tokens: string;
  is_active: boolean;
}

interface PerplexityTestResult {
  ok: boolean;
  message: string;
  timestamp: string;
}

const DEFAULT_MODEL = "sonar";
const DEFAULT_COST = "1.00";

const PerplexityIntegration = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState<PerplexityModelOption[]>([]);
  const [form, setForm] = useState<PerplexityFormState>({
    model: DEFAULT_MODEL,
    cost_per_1k_tokens: DEFAULT_COST,
    is_active: false,
  });
  const [lastTest, setLastTest] = useState<PerplexityTestResult | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [configResponse, modelsResponse] = await Promise.all([
        supabase.functions.invoke("perplexity-manage", { method: "GET" }),
        supabase.functions.invoke("perplexity-manage/models", { method: "GET" }),
      ]);

      if (configResponse.error) throw configResponse.error;
      if (modelsResponse.error) throw modelsResponse.error;

      const configModel = configResponse.data?.config?.model ?? DEFAULT_MODEL;
      const configCost = configResponse.data?.config?.cost_per_1k_tokens;
      const parsedCost =
        typeof configCost === "number"
          ? configCost.toFixed(2)
          : typeof configCost === "string" && configCost.trim() !== ""
            ? Number(configCost).toFixed(2)
            : DEFAULT_COST;

      setForm({
        model: configModel,
        cost_per_1k_tokens: Number.isNaN(Number(parsedCost)) ? DEFAULT_COST : parsedCost,
        is_active: Boolean(configResponse.data?.integration?.is_active),
      });

      const modelOptions: PerplexityModelOption[] = Array.isArray(modelsResponse.data?.models)
        ? modelsResponse.data?.models
        : [];
      setModels(modelOptions);
    } catch (error) {
      console.error("Failed to load Perplexity integration", error);
      toast({
        title: "Unable to load Perplexity settings",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleModelChange = (value: string) => {
    const matched = models.find((model) => model.id === value);
    setForm((prev) => ({
      ...prev,
      model: value,
      cost_per_1k_tokens: matched ? matched.cost.toFixed(2) : prev.cost_per_1k_tokens,
    }));
  };

  const handleToggleActive = (checked: boolean) => {
    setForm((prev) => ({ ...prev, is_active: checked }));
  };

  const handleSave = async () => {
    const trimmedCost = form.cost_per_1k_tokens.trim();
    const parsedCost = Number(trimmedCost);

    if (trimmedCost === "" || Number.isNaN(parsedCost) || parsedCost < 0) {
      toast({
        title: "Invalid cost",
        description: "Please provide a valid cost per 1K tokens before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("perplexity-manage/save-config", {
        method: "POST",
        body: {
          model: form.model,
          cost_per_1k_tokens: parsedCost,
          is_active: form.is_active,
        },
      });

      if (error) throw error;

      const savedCost =
        typeof data?.config?.cost_per_1k_tokens === "number"
          ? data?.config?.cost_per_1k_tokens.toFixed(2)
          : parsedCost.toFixed(2);
      const savedModel =
        typeof data?.config?.model === "string" && data?.config?.model.trim() !== ""
          ? data.config.model
          : form.model;

      setForm({
        model: savedModel,
        cost_per_1k_tokens: savedCost,
        is_active: Boolean(data?.is_active ?? form.is_active),
      });
      toast({
        title: "Perplexity settings saved",
        description: `Model ${savedModel} at $${savedCost} per 1K tokens.`,
      });
    } catch (error) {
      console.error("Failed to save Perplexity config", error);
      toast({
        title: "Unable to save settings",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        `perplexity-manage/test?model=${encodeURIComponent(form.model)}`,
        { method: "GET" },
      );

      if (error) throw error;

      const ok = Boolean(data?.ok);
      const latency = typeof data?.latency_ms === "number" ? `${data.latency_ms}ms` : null;
      const message = ok
        ? `Connection successful${latency ? ` (${latency})` : ""}`
        : data?.error || "Perplexity API test failed.";

      setLastTest({ ok, message, timestamp: new Date().toISOString() });
      toast({
        title: ok ? "Perplexity connection successful" : "Perplexity test failed",
        description: message,
        variant: ok ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Failed to test Perplexity API", error);
      const description = error instanceof Error ? error.message : "Unable to reach the Perplexity API.";
      setLastTest({ ok: false, message: description, timestamp: new Date().toISOString() });
      toast({
        title: "Perplexity test failed",
        description,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="px-0" asChild>
          <Link to="/adminpanel/integrations" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to integrations
          </Link>
        </Button>
        <Button variant="outline" onClick={loadData} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refreshing
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perplexity AI integration</CardTitle>
          <CardDescription>
            Configure Perplexity model selection and pricing. API keys are securely stored in Supabase Edge secrets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="perplexity-active" className="text-base font-medium">
                Integration status
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable to allow the Admin Panel to use Perplexity for knowledge lookups.
              </p>
            </div>
            <Switch
              id="perplexity-active"
              checked={form.is_active}
              onCheckedChange={handleToggleActive}
              disabled={isLoading || saving}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="perplexity-model-select">Model</Label>
              <Select
                value={form.model}
                onValueChange={handleModelChange}
                disabled={isLoading || saving}
              >
                <SelectTrigger id="perplexity-model-select">
                  <SelectValue placeholder="Select a Perplexity model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.label} · ${model.cost.toFixed(2)}/1K
                    </SelectItem>
                  ))}
                  {models.length === 0 && <SelectItem value={form.model}>{form.model}</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perplexity-cost-input">Cost per 1K tokens (USD)</Label>
              <Input
                id="perplexity-cost-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={form.cost_per_1k_tokens}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cost_per_1k_tokens: event.target.value }))
                }
                disabled={isLoading || saving}
              />
            </div>
          </div>

          {lastTest && (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                lastTest.ok
                  ? "border-green-500 text-green-600 dark:text-green-400"
                  : "border-red-500 text-red-600 dark:text-red-400"
              }`}
            >
              <p className="font-medium">{lastTest.ok ? "Last successful test" : "Last failed test"}</p>
              <p>{lastTest.message}</p>
              <p className="text-xs text-muted-foreground">
                Tested {new Date(lastTest.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={isLoading || saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save settings
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || isLoading}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Test connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerplexityIntegration;
