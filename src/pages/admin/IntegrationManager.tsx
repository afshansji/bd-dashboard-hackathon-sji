import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Clock,
  Loader2,
  Plug,
  Power,
  RefreshCw,
  ScrollText,
  Trash2,
} from "lucide-react";
import { PageInstructions } from "@/components/admin/PageInstructions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GlobalIntegration {
  id: string;
  name: string;
  description: string;
  category: string;
  is_enabled: boolean;
  icon: string;
  metadata?: any;
}

interface CrmIntegrationEntry {
  id: string;
  name: string;
  type: "hubspot" | "gohighlevel" | string;
  status: string;
  is_active: boolean;
  last_sync: string | null;
  metadata?: Record<string, any> | null;
}

interface IntegrationLogEntry {
  id: string;
  source: string;
  metric_name: string;
  metric_value: number | null;
  dimensions: any;
  recorded_at: string | null;
}

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
  latency_ms?: number;
  error?: string;
  model?: string;
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    console.error("Failed to format date", error);
    return value;
  }
};

const IntegrationManager = () => {
  const { toast } = useToast();
  const [globalIntegrations, setGlobalIntegrations] = useState<GlobalIntegration[]>([
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT powered automation and analysis",
      category: "AI",
      is_enabled: false,
      icon: "🤖",
    },
    {
      id: "perplexity",
      name: "Perplexity AI",
      description: "Research-grade answers from Perplexity's AI models (uses PERPLEXITY_API_KEY secret)",
      category: "AI",
      is_enabled: false,
      icon: "🧠",
    },
    {
      id: "exa",
      name: "Exa Search",
      description: "Real-time web search and research synthesis (uses EXA_API_KEY secret)",
      category: "Research",
      is_enabled: false,
      icon: "🔍",
    },
    {
      id: "google-drive",
      name: "Google Drive",
      description: "Sync deal documents from mapped Google Drive folders",
      category: "Storage",
      is_enabled: false,
      icon: "📁",
      metadata: null,
    },
    {
      id: "pandadoc",
      name: "PandaDoc",
      description: "Create, send, and track proposals with e-signature",
      category: "Documents",
      is_enabled: false,
      icon: "📝",
    },
    {
      id: "zerobounce",
      name: "Zerobounce",
      description: "Email validation service to verify contact emails (Super Admin only)",
      category: "Validation",
      is_enabled: false,
      icon: "✉️",
    },
  ]);
  const [crmIntegrations, setCrmIntegrations] = useState<CrmIntegrationEntry[]>([]);
  const [isCrmLoading, setIsCrmLoading] = useState(false);
  const [crmSyncing, setCrmSyncing] = useState<Record<string, boolean>>({});
  const [crmToggling, setCrmToggling] = useState<Record<string, boolean>>({});
  const [ghlForm, setGhlForm] = useState({ apiKey: "", locationId: "", locationName: "" });
  const [ghlIntegrations, setGhlIntegrations] = useState<any[]>([]);
  const [isConnectingGhl, setIsConnectingGhl] = useState(false);
  const [testingGhl, setTestingGhl] = useState(false);
  const [ghlTestResult, setGhlTestResult] = useState<any>(null);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [selectedLogSource, setSelectedLogSource] = useState<"hubspot" | "gohighlevel" | null>(null);
  const [logEntries, setLogEntries] = useState<IntegrationLogEntry[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [testingOpenAI, setTestingOpenAI] = useState(false);
  const [openAITestResult, setOpenAITestResult] = useState<any>(null);
  const [testingGoogleDrive, setTestingGoogleDrive] = useState(false);
  const [googleDriveTestResult, setGoogleDriveTestResult] = useState<any>(null);
  const [perplexityModels, setPerplexityModels] = useState<PerplexityModelOption[]>([]);
  const [perplexityForm, setPerplexityForm] = useState<PerplexityFormState>({
    model: "sonar",
    cost_per_1k_tokens: "1.00",
    is_active: false,
  });
  const [perplexityTestResult, setPerplexityTestResult] = useState<PerplexityTestResult | null>(null);
  const [testingPerplexity, setTestingPerplexity] = useState(false);
  const [savingPerplexity, setSavingPerplexity] = useState(false);
  const [testingExa, setTestingExa] = useState(false);
  const [exaTestResult, setExaTestResult] = useState<any>(null);
  const [hubspotApiKey, setHubspotApiKey] = useState("");
  const [isConfiguringHubspot, setIsConfiguringHubspot] = useState(false);
  const [hubspotTestResult, setHubspotTestResult] = useState<any>(null);
  const [pandadocApiKey, setPandadocApiKey] = useState("");
  const [pandadocWorkspaceId, setPandadocWorkspaceId] = useState("");
  const [testingPandadoc, setTestingPandadoc] = useState(false);
  const [pandadocTestResult, setPandadocTestResult] = useState<any>(null);
  const [isConnectingPandadoc, setIsConnectingPandadoc] = useState(false);
  const [zerobounceApiKey, setZerobounceApiKey] = useState("");
  const [testingZerobounce, setTestingZerobounce] = useState(false);
  const [zerobounceTestResult, setZerobounceTestResult] = useState<any>(null);
  const [isConnectingZerobounce, setIsConnectingZerobounce] = useState(false);
  const [zerobounceConfigured, setZerobounceConfigured] = useState(false);

  const hubspotIntegration = crmIntegrations.find((integration) => integration.type === "hubspot");

  useEffect(() => {
    void loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setIsCrmLoading(true);
    setCrmIntegrations([]);

    const nextGlobal = [...globalIntegrations];

    try {
      const { data, error } = await supabase.functions.invoke("integrations-dashboard", { method: "GET" });
      if (error) throw error;
      setCrmIntegrations(Array.isArray(data?.integrations) ? data.integrations : []);
    } catch (error) {
      console.error("Failed to load CRM integrations", error);
      toast({
        title: "Unable to load CRM integrations",
        description: "We could not fetch CRM integration details right now.",
        variant: "destructive",
      });
    } finally {
      setIsCrmLoading(false);
    }


    try {
      const { data: openaiStatus } = await supabase.functions.invoke("openai-test", {
        body: { action: "status" },
      });
      const openaiEnabled = Boolean(openaiStatus?.configured);
      const openaiIndex = nextGlobal.findIndex((integration) => integration.id === "openai");
      if (openaiIndex !== -1) {
        nextGlobal[openaiIndex] = { ...nextGlobal[openaiIndex], is_enabled: openaiEnabled };
      }
    } catch (error) {
      console.error("Failed to load OpenAI config", error);
    }

    try {
      const { data } = await supabase.functions.invoke("perplexity-manage", { method: "GET" });
      const configModel = data?.config?.model ?? "sonar";
      const configCost = data?.config?.cost_per_1k_tokens;
      const costString =
        typeof configCost === "number"
          ? configCost.toFixed(2)
          : typeof configCost === "string" && configCost.trim() !== ""
            ? Number(configCost).toFixed(2)
            : "0.80";
      const isActive = Boolean(data?.integration?.is_active);
      setPerplexityForm({
        model: configModel,
        cost_per_1k_tokens: Number.isNaN(Number(costString)) ? "0.80" : costString,
        is_active: isActive,
      });
      setPerplexityTestResult(null);
      const perplexityIndex = nextGlobal.findIndex((integration) => integration.id === "perplexity");
      if (perplexityIndex !== -1) {
        nextGlobal[perplexityIndex] = {
          ...nextGlobal[perplexityIndex],
          is_enabled: isActive,
        };
      }
    } catch (error) {
      console.error("Failed to load Perplexity config", error);
    }

    try {
      const { data } = await supabase.functions.invoke("perplexity-manage/models", { method: "GET" });
      const models: PerplexityModelOption[] = Array.isArray(data?.models) ? data.models : [];
      setPerplexityModels(models);
    } catch (error) {
      console.error("Failed to load Perplexity models", error);
    }

    try {
      const { data, error } = await supabase.functions.invoke("sync-deal-files", {
        body: { action: "test-connection" }
      });

      const googleDriveConfigured = !error && data?.ok;
      const googleDriveIndex = nextGlobal.findIndex((integration) => integration.id === "google-drive");
      if (googleDriveIndex !== -1) {
        nextGlobal[googleDriveIndex] = { ...nextGlobal[googleDriveIndex], is_enabled: googleDriveConfigured };
      }

      // Optionally fetch recent sync stats
      const { data: syncStats } = await supabase
        .from('google_drive_sync_log')
        .select('files_added, files_updated, files_skipped, completed_at')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (syncStats) {
        const googleDriveMetaIndex = nextGlobal.findIndex((integration) => integration.id === "google-drive");
        if (googleDriveMetaIndex !== -1) {
          nextGlobal[googleDriveMetaIndex] = {
            ...nextGlobal[googleDriveMetaIndex],
            metadata: syncStats,
          };
        }
      }
    } catch (error) {
      console.error("Failed to load Google Drive config", error);
    }

    // Check EXA integration
    try {
      const { data: exaCheck } = await supabase.functions.invoke("admin-leads-exa-import/test", {
        method: "GET",
      });
      const exaConfigured = Boolean(exaCheck?.ok);
      const exaIndex = nextGlobal.findIndex((integration) => integration.id === "exa");
      if (exaIndex !== -1) {
        nextGlobal[exaIndex] = { ...nextGlobal[exaIndex], is_enabled: exaConfigured };
      }
    } catch (error) {
      console.error("Failed to load EXA config", error);
    }

    // Load GoHighLevel integrations
    try {
      const { data, error } = await supabase.functions.invoke("gohighlevel-manage/integration", { method: "GET" });
      if (!error && data?.integrations) {
        setGhlIntegrations(Array.isArray(data.integrations) ? data.integrations : []);
      }
    } catch (error) {
      console.error("Failed to load GoHighLevel integrations", error);
    }

    // Check PandaDoc integration
    try {
      const { data: pandadocCheck } = await supabase.functions.invoke("pandadoc-manage/integration", {
        method: "GET",
      });
      const pandadocConfigured = Boolean(pandadocCheck?.ok && pandadocCheck?.integration);
      const pandadocIndex = nextGlobal.findIndex((integration) => integration.id === "pandadoc");
      if (pandadocIndex !== -1) {
        nextGlobal[pandadocIndex] = { ...nextGlobal[pandadocIndex], is_enabled: pandadocConfigured };
      }
    } catch (error) {
      console.error("Failed to load PandaDoc config", error);
    }

    // Check Zerobounce integration
    try {
      const { data: zerobounceCheck } = await supabase.functions.invoke("zerobounce-manage", {
        method: "GET",
      });
      const zerobounceConfigured = Boolean(zerobounceCheck?.ok && zerobounceCheck?.configured);
      setZerobounceConfigured(zerobounceConfigured);
      const zerobounceIndex = nextGlobal.findIndex((integration) => integration.id === "zerobounce");
      if (zerobounceIndex !== -1) {
        nextGlobal[zerobounceIndex] = { ...nextGlobal[zerobounceIndex], is_enabled: zerobounceConfigured };
      }
    } catch (error) {
      console.error("Failed to load Zerobounce config", error);
    }

    setGlobalIntegrations(nextGlobal);
  };

  const handleToggleCrmIntegration = async (integration: CrmIntegrationEntry) => {
    setCrmToggling((prev) => ({ ...prev, [integration.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("integrations-dashboard", {
        method: "PATCH",
        body: { id: integration.id, type: integration.type, is_active: !integration.is_active },
      });
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Unable to update integration state");
      }
      toast({
        title: `${integration.name} updated`,
        description: `${integration.name} is now ${!integration.is_active ? "active" : "inactive"}.`,
      });
      await loadIntegrations();
    } catch (error) {
      console.error("Failed to update CRM integration", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update integration state.",
        variant: "destructive",
      });
    } finally {
      setCrmToggling((prev) => ({ ...prev, [integration.id]: false }));
    }
  };

  const handleSyncCrmIntegration = async (integration: CrmIntegrationEntry) => {
    setCrmSyncing((prev) => ({ ...prev, [integration.type]: true }));
    try {
      if (integration.type === "hubspot") {
        const { data, error } = await supabase.functions.invoke("hubspot-sync/sync", { method: "POST" });
        if (error) throw error;
        if (!data?.ok) {
          throw new Error(data?.error || "HubSpot sync failed");
        }
        toast({ title: "HubSpot sync complete", description: "Recent HubSpot records are now up to date." });
      } else if (integration.type === "gohighlevel") {
        const { data, error } = await supabase.functions.invoke("gohighlevel-manage/sync-contacts", { method: "POST" });
        if (error) throw error;
        if (!data?.ok) {
          throw new Error(data?.error || "GoHighLevel sync failed");
        }
        toast({ title: "GoHighLevel sync complete", description: "Contacts and deals have been refreshed." });
      }
      await loadIntegrations();
    } catch (error) {
      console.error("CRM sync failed", error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unable to sync integration.",
        variant: "destructive",
      });
    } finally {
      setCrmSyncing((prev) => ({ ...prev, [integration.type]: false }));
    }
  };

  const handleTestGoHighLevel = async () => {
    if (!ghlForm.apiKey.trim()) {
      toast({
        title: "API key required",
        description: "Enter a GoHighLevel API key before testing.",
        variant: "destructive",
      });
      return;
    }

    setTestingGhl(true);
    setGhlTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("gohighlevel-manage/test-connection", {
        method: "POST",
        body: {
          apiKey: ghlForm.apiKey.trim(),
          locationId: ghlForm.locationId.trim() || null,
        },
      });

      if (error) throw error;

      setGhlTestResult(data);

      if (data?.ok) {
        toast({
          title: "Connection successful",
          description: data.message || "GoHighLevel credentials are valid.",
        });
        // Auto-populate location name if returned and not already filled
        if (data.locationName && !ghlForm.locationName.trim()) {
          setGhlForm((prev) => ({ ...prev, locationName: data.locationName }));
        }
      } else {
        toast({
          title: "Connection failed",
          description: data?.error || "Unable to connect to GoHighLevel.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("GoHighLevel test failed", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unable to test GoHighLevel connection.",
        variant: "destructive",
      });
      setGhlTestResult({ ok: false, error: "Connection test failed" });
    } finally {
      setTestingGhl(false);
    }
  };

  const handleConnectGoHighLevel = async () => {
    if (!ghlForm.apiKey.trim()) {
      toast({
        title: "API key required",
        description: "Enter a GoHighLevel API key before connecting.",
        variant: "destructive",
      });
      return;
    }

    if (!ghlForm.locationId.trim()) {
      toast({
        title: "Location ID required",
        description: "Enter a GoHighLevel Location ID before connecting.",
        variant: "destructive",
      });
      return;
    }

    setIsConnectingGhl(true);
    try {
      const { data, error } = await supabase.functions.invoke("gohighlevel-manage/integration", {
        method: "POST",
        body: {
          apiKey: ghlForm.apiKey.trim(),
          locationId: ghlForm.locationId.trim() || null,
          locationName: ghlForm.locationName.trim() || null,
        },
      });
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Unable to connect GoHighLevel");
      }
      toast({ title: "GoHighLevel connected", description: "Credentials saved successfully." });
      setGhlForm({ apiKey: "", locationId: "", locationName: "" });
      setGhlTestResult(null);
      await loadIntegrations();
    } catch (error) {
      console.error("GoHighLevel connection failed", error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Unable to connect to GoHighLevel.",
        variant: "destructive",
      });
    } finally {
      setIsConnectingGhl(false);
    }
  };

  const handleDeleteGhlIntegration = async (integrationId: string, locationName: string) => {
    if (!confirm(`Delete ${locationName || 'this location'}? This will remove the API key and all sync settings.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("gohighlevel-manage/integration", {
        method: "DELETE",
        body: { integration_id: integrationId },
      });
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "Unable to delete integration");
      }
      toast({ 
        title: "Integration deleted", 
        description: `${locationName || 'Location'} has been removed.` 
      });
      await loadIntegrations();
    } catch (error) {
      console.error("Delete failed", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete integration.",
        variant: "destructive",
      });
    }
  };

  const handleOpenIntegrationLogs = async (source: "hubspot" | "gohighlevel") => {
    setSelectedLogSource(source);
    setIsLogsDialogOpen(true);
    setIsLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from("control_tower_sync_log")
        .select("*")
        .eq("sync_type", "integration")
        .eq("entity_type", source === "hubspot" ? "hubspot_sync" : "gohighlevel_sync")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Transform to match IntegrationLogEntry interface
      const transformedLogs: IntegrationLogEntry[] = (data || []).map((log: any) => ({
        id: log.id,
        source: source,
        metric_name: log.status === "completed" ? "sync_success" : "sync_error",
        metric_value: log.payload?.companies || log.payload?.contacts || log.payload?.deals || null,
        dimensions: log.payload,
        recorded_at: log.created_at,
      }));
      
      setLogEntries(transformedLogs);
    } catch (error) {
      console.error("Failed to load integration logs", error);
      toast({
        title: "Unable to load logs",
        description: error instanceof Error ? error.message : "An unexpected error occurred while loading logs.",
        variant: "destructive",
      });
      setLogEntries([]);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const handleTestOpenAI = async () => {
    setTestingOpenAI(true);
    setOpenAITestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("openai-test", {
        body: { action: "test" },
      });
      
      if (error) throw error;
      
      setOpenAITestResult(data);
      
      if (data?.ok) {
        toast({
          title: "OpenAI connection successful",
          description: `Connected successfully. Found ${data.models_available || 0} models available.`,
        });
      } else {
        toast({
          title: "OpenAI connection failed",
          description: data?.error || "Unable to connect to OpenAI API.",
          variant: "destructive",
        });
      }
      
      await loadIntegrations();
    } catch (error) {
      console.error("OpenAI test failed", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unable to test OpenAI connection.",
        variant: "destructive",
      });
      setOpenAITestResult({ ok: false, error: "Connection test failed" });
    } finally {
      setTestingOpenAI(false);
    }
  };

  const handleTestGoogleDrive = async () => {
    setTestingGoogleDrive(true);
    setGoogleDriveTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sync-deal-files", {
        body: { action: "test-connection" }
      });

      if (error) throw error;

      setGoogleDriveTestResult(data);

      if (data?.ok) {
        toast({
          title: "Google Drive connection successful",
          description: "Service account authenticated successfully.",
        });
      } else {
        toast({
          title: "Google Drive connection failed",
          description: data?.error || "Unable to authenticate with Google Drive.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Google Drive test failed", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unable to test Google Drive connection.",
        variant: "destructive",
      });
      setGoogleDriveTestResult({ ok: false, error: "Connection test failed" });
    } finally {
      setTestingGoogleDrive(false);
    }
  };

  const handlePerplexityModelChange = (value: string) => {
    const matched = perplexityModels.find((model) => model.id === value);
    setPerplexityForm((prev) => ({
      ...prev,
      model: value,
      cost_per_1k_tokens: matched ? matched.cost.toFixed(2) : prev.cost_per_1k_tokens,
    }));
    setPerplexityTestResult(null);
  };

  const handleSavePerplexity = async (options?: { is_active?: boolean; silent?: boolean }) => {
    const targetActive = options?.is_active ?? perplexityForm.is_active;
    const trimmedCost = perplexityForm.cost_per_1k_tokens.trim();
    const parsedCost = Number(trimmedCost);

    if (trimmedCost === "" || Number.isNaN(parsedCost) || parsedCost < 0) {
      toast({
        title: "Invalid cost",
        description: "Enter a valid cost per 1K tokens before saving.",
        variant: "destructive",
      });
      return;
    }

    setSavingPerplexity(true);
    setPerplexityTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("perplexity-manage/save-config", {
        method: "POST",
        body: {
          model: perplexityForm.model,
          cost_per_1k_tokens: parsedCost,
          is_active: targetActive,
        },
      });

      if (error) throw error;

      const savedConfig = data?.config ?? {};
      const savedModel =
        typeof savedConfig.model === "string" && savedConfig.model.trim() !== ""
          ? savedConfig.model
          : perplexityForm.model;
      const savedCostNumber =
        typeof savedConfig.cost_per_1k_tokens === "number"
          ? savedConfig.cost_per_1k_tokens
          : parsedCost;
      const savedCost = savedCostNumber.toFixed(2);
      const savedActive = Boolean(data?.is_active ?? targetActive);

      setPerplexityForm({
        model: savedModel,
        cost_per_1k_tokens: savedCost,
        is_active: savedActive,
      });
      setGlobalIntegrations((prev) =>
        prev.map((integration) =>
          integration.id === "perplexity" ? { ...integration, is_enabled: savedActive } : integration,
        ),
      );

      if (options?.is_active !== undefined) {
        toast({
          title: options.is_active ? "Perplexity AI enabled" : "Perplexity AI disabled",
          description: options.is_active
            ? `Using ${savedModel} at $${savedCost} per 1K tokens.`
            : "You can re-enable the integration at any time.",
        });
      } else if (!options?.silent) {
        toast({
          title: "Perplexity AI settings saved",
          description: `Model ${savedModel} at $${savedCost} per 1K tokens.`,
        });
      }
    } catch (error) {
      console.error("Failed to save Perplexity config", error);
      toast({
        title: "Unable to save Perplexity settings",
        description: error instanceof Error ? error.message : "Unknown error occurred.",
        variant: "destructive",
      });
      if (options?.is_active !== undefined) {
        setPerplexityForm((prev) => ({ ...prev, is_active: !options.is_active }));
      }
    } finally {
      setSavingPerplexity(false);
    }
  };

  const handleTogglePerplexity = async (checked: boolean) => {
    setPerplexityForm((prev) => ({ ...prev, is_active: checked }));
    await handleSavePerplexity({ is_active: checked });
  };

  const handleTestPerplexity = async () => {
    setTestingPerplexity(true);
    setPerplexityTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('perplexity-manage/test', {
        body: { model: perplexityForm.model },
      });

      if (error) throw error;

      const result: PerplexityTestResult = {
        ok: Boolean(data?.ok),
        latency_ms: typeof data?.latency_ms === "number" ? data.latency_ms : undefined,
        model: typeof data?.model === "string" ? data.model : undefined,
        error:
          data?.ok
            ? undefined
            : typeof data?.error === "string"
              ? data.error
              : "Perplexity API request failed",
      };

      setPerplexityTestResult(result);

      if (result.ok) {
        toast({
          title: "Perplexity connection successful",
          description: result.latency_ms
            ? `API responded in ${result.latency_ms}ms.`
            : "API responded successfully.",
        });
      } else {
        toast({
          title: "Perplexity test failed",
          description: result.error || "Unable to connect to Perplexity API.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Perplexity test failed", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unable to test Perplexity connection.",
        variant: "destructive",
      });
      setPerplexityTestResult({ ok: false, error: error instanceof Error ? error.message : "Connection test failed" });
    } finally {
      setTestingPerplexity(false);
    }
  };

  const handleConfigureHubSpot = async () => {
    if (!hubspotApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your HubSpot Private App Access Token",
        variant: "destructive",
      });
      return;
    }

    setIsConfiguringHubspot(true);
    setHubspotTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("hubspot-sync/configure", {
        method: "POST",
        body: { apiKey: hubspotApiKey },
      });

      if (error) throw error;

      if (data?.ok) {
        setHubspotTestResult({ ok: true });
        toast({
          title: "HubSpot Connected",
          description: "Your HubSpot integration has been configured successfully",
        });
        setHubspotApiKey("");
        await loadIntegrations();
      } else {
        throw new Error(data?.error || "Configuration failed");
      }
    } catch (error: any) {
      console.error("HubSpot configuration error:", error);
      setHubspotTestResult({ ok: false, error: error.message });
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to configure HubSpot integration",
        variant: "destructive",
      });
    } finally {
      setIsConfiguringHubspot(false);
    }
  };

  const handleTestExa = async () => {
    setTestingExa(true);
    setExaTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-leads-exa-import/test", {
        method: "GET",
      });
      
      if (error) throw error;
      
      setExaTestResult(data);
      
      if (data?.ok) {
        toast({
          title: "EXA connection successful",
          description: "EXA API key is configured and working.",
        });
      } else {
        toast({
          title: "EXA connection failed",
          description: data?.error || "Unable to connect to EXA API.",
          variant: "destructive",
        });
      }
      
      await loadIntegrations();
    } catch (error) {
      console.error("EXA test failed", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unable to test EXA connection.",
        variant: "destructive",
      });
      setExaTestResult({ ok: false, error: "Connection test failed" });
    } finally {
      setTestingExa(false);
    }
  };

  const handleConnectPandaDoc = async () => {
    if (!pandadocApiKey.trim()) {
      toast({
        title: "API key required",
        description: "Enter your PandaDoc API key before connecting.",
        variant: "destructive",
      });
      return;
    }

    setIsConnectingPandadoc(true);
    setPandadocTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("pandadoc-manage/integration", {
        method: "POST",
        body: {
          api_key: pandadocApiKey.trim(),
          workspace_id: pandadocWorkspaceId.trim() || undefined,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to connect PandaDoc");

      toast({
        title: "PandaDoc Connected",
        description: "Your PandaDoc account has been successfully connected.",
      });

      setPandadocApiKey("");
      setPandadocWorkspaceId("");
      await loadIntegrations();
    } catch (error) {
      console.error("PandaDoc connection failed", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unable to connect to PandaDoc.",
        variant: "destructive",
      });
    } finally {
      setIsConnectingPandadoc(false);
    }
  };

  const handleTestPandaDocConnection = async () => {
    setTestingPandadoc(true);
    setPandadocTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("pandadoc-manage/templates", {
        method: "GET",
      });

      if (error) throw error;

      setPandadocTestResult(data);

      if (data?.ok) {
        const templateCount = Array.isArray(data.templates) ? data.templates.length : 0;
        toast({
          title: "Connection successful",
          description: `PandaDoc is working correctly. Found ${templateCount} template${templateCount !== 1 ? 's' : ''}.`,
        });
      } else {
        toast({
          title: "Connection failed",
          description: data?.error || "Unable to connect to PandaDoc.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("PandaDoc test failed", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unable to test PandaDoc connection.",
        variant: "destructive",
      });
      setPandadocTestResult({ ok: false, error: "Connection test failed" });
    } finally {
      setTestingPandadoc(false);
    }
  };

  const handleDisconnectPandaDoc = async () => {
    if (!confirm("Disconnect PandaDoc? This will remove your API key and all integration settings.")) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("pandadoc-manage/integration", {
        method: "DELETE",
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to disconnect PandaDoc");

      toast({
        title: "PandaDoc Disconnected",
        description: "Your PandaDoc account has been disconnected.",
      });

      setPandadocTestResult(null);
      await loadIntegrations();
    } catch (error) {
      console.error("PandaDoc disconnect failed", error);
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Unable to disconnect PandaDoc.",
        variant: "destructive",
      });
    }
  };

  const handleTestZeroBounce = async () => {
    if (!zerobounceApiKey.trim()) {
      toast({
        title: "API key required",
        description: "Enter your Zerobounce API key before testing.",
        variant: "destructive",
      });
      return;
    }

    setTestingZerobounce(true);
    setZerobounceTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        body: {
          action: "test",
          apiKey: zerobounceApiKey.trim(),
        },
      });

      if (error) throw error;

      setZerobounceTestResult(data);

      if (data?.ok) {
        toast({
          title: "Connection successful",
          description: `Zerobounce API is working. Credits remaining: ${data.credits || 'N/A'}`,
        });
      } else {
        toast({
          title: "Connection failed",
          description: data?.error || "Unable to connect to Zerobounce.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Zerobounce test failed", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unable to test Zerobounce connection.",
        variant: "destructive",
      });
      setZerobounceTestResult({ ok: false, error: "Connection test failed" });
    } finally {
      setTestingZerobounce(false);
    }
  };

  const handleConnectZeroBounce = async () => {
    if (!zerobounceApiKey.trim()) {
      toast({
        title: "API key required",
        description: "Enter your Zerobounce API key before connecting.",
        variant: "destructive",
      });
      return;
    }

    setIsConnectingZerobounce(true);
    setZerobounceTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        body: {
          action: "save",
          apiKey: zerobounceApiKey.trim(),
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to save Zerobounce API key");

      toast({
        title: "Zerobounce Connected",
        description: `API key saved successfully. Credits remaining: ${data.credits || 'N/A'}`,
      });

      setZerobounceApiKey("");
      await loadIntegrations();
    } catch (error) {
      console.error("Zerobounce connection failed", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unable to save Zerobounce API key.",
        variant: "destructive",
      });
    } finally {
      setIsConnectingZerobounce(false);
    }
  };

  const handleDisconnectZeroBounce = async () => {
    if (!confirm("Disconnect Zerobounce? This will remove your API key and disable email validation.")) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("zerobounce-manage", {
        body: {
          action: "delete",
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to disconnect Zerobounce");

      toast({
        title: "Zerobounce Disconnected",
        description: "API key has been removed.",
      });

      setZerobounceTestResult(null);
      await loadIntegrations();
    } catch (error) {
      console.error("Zerobounce disconnect failed", error);
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Unable to disconnect Zerobounce.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <PageInstructions
        title="Integration Manager"
        description="Connect and configure external services like HubSpot, Exa, and Perplexity"
        steps={[
          "View all available integrations and their connection status",
          "Click 'Configure' on any integration to set up API keys",
          "Test connections to ensure integrations are working",
          "Monitor integration health and usage"
        ]}
        tips={[
          "HubSpot sync runs automatically every 6 hours",
          "Exa integration is used for lead enrichment",
          "All API keys are encrypted and stored securely"
        ]}
        relatedLinks={[
          { label: "Data Sync Center", href: "/adminpanel/data-sync" },
          { label: "Documentation", href: "/adminpanel/documentation" }
        ]}
      />
      
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Integration Manager</h1>
          <p className="text-sm text-muted-foreground">
            Monitor global AI integrations and manage CRM connections for your brands.
          </p>
        </div>
        <Button variant="outline" onClick={loadIntegrations} className="w-full md:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Global integrations</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {globalIntegrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>{integration.icon}</span>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Category: {integration.category}</p>
                    <p>Status: {integration.is_enabled ? "Configured" : "Not configured"}</p>
                    {integration.id === "openai" && openAITestResult && (
                      <>
                        {openAITestResult.ok && (
                          <p className="text-green-600 dark:text-green-400">
                            ✓ {openAITestResult.models_available} models available
                          </p>
                        )}
                        {!openAITestResult.ok && (
                          <p className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {openAITestResult.error}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <Badge variant={integration.is_enabled ? "default" : "outline"}>
                    {integration.is_enabled ? "Active" : "Pending"}
                  </Badge>
                </div>
                {integration.id === "openai" && (
                  <Button
                    onClick={handleTestOpenAI}
                    disabled={testingOpenAI}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {testingOpenAI ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing connection...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                )}
                {integration.id === "perplexity" && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Model: {perplexityForm.model}</p>
                          <p>Cost: ${perplexityForm.cost_per_1k_tokens} per 1K tokens</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="perplexity-toggle" className="sr-only">
                            Toggle Perplexity integration
                          </Label>
                          <Switch
                            id="perplexity-toggle"
                            checked={perplexityForm.is_active}
                            onCheckedChange={handleTogglePerplexity}
                            disabled={savingPerplexity}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="perplexity-model">Model</Label>
                        <Select value={perplexityForm.model} onValueChange={handlePerplexityModelChange}>
                          <SelectTrigger id="perplexity-model">
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                          <SelectContent>
                            {perplexityModels.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.label} · ${model.cost.toFixed(2)}/1K
                              </SelectItem>
                            ))}
                            {perplexityModels.length === 0 && (
                              <SelectItem value={perplexityForm.model}>{perplexityForm.model}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="perplexity-cost">Cost per 1K tokens (USD)</Label>
                        <Input
                          id="perplexity-cost"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={perplexityForm.cost_per_1k_tokens}
                          onChange={(event) => {
                            setPerplexityForm((prev) => ({
                              ...prev,
                              cost_per_1k_tokens: event.target.value,
                            }));
                            setPerplexityTestResult(null);
                          }}
                          disabled={savingPerplexity}
                        />
                      </div>
                    </div>
                    {perplexityTestResult && (
                      <div
                        className={`rounded-md border px-3 py-2 text-sm ${
                          perplexityTestResult.ok
                            ? "border-green-500 text-green-600 dark:text-green-400"
                            : "border-red-500 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {perplexityTestResult.ok
                          ? `Connection successful${
                              typeof perplexityTestResult.latency_ms === "number"
                                ? ` (${perplexityTestResult.latency_ms}ms)`
                                : ""
                            }`
                          : `Test failed: ${perplexityTestResult.error || "Unknown error"}`}
                      </div>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button onClick={() => handleSavePerplexity()} disabled={savingPerplexity}>
                        {savingPerplexity ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>Save configuration</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleTestPerplexity}
                        disabled={testingPerplexity}
                      >
                        {testingPerplexity ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" /> Test Connection
                          </>
                      )}
                    </Button>
                  </div>
                </>
              )}
              {integration.id === "exa" && (
                <>
                  {exaTestResult && (
                    <div className="text-sm">
                      {exaTestResult.ok && (
                        <p className="text-green-600 dark:text-green-400">
                          ✓ EXA API key configured
                        </p>
                      )}
                      {!exaTestResult.ok && (
                        <p className="text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {exaTestResult.error}
                        </p>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={handleTestExa}
                    disabled={testingExa}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {testingExa ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing connection...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </>
              )}
              {integration.id === "google-drive" && (
                  <>
                    {googleDriveTestResult && (
                      <div className="text-sm">
                        {googleDriveTestResult.ok && (
                          <p className="text-green-600 dark:text-green-400">
                            ✓ Service account authenticated
                          </p>
                        )}
                        {!googleDriveTestResult.ok && (
                          <p className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {googleDriveTestResult.error}
                          </p>
                        )}
                      </div>
                    )}
                    {integration.metadata && (
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Last Sync:</p>
                        <p>✓ {integration.metadata.files_added || 0} files added</p>
                        <p>↻ {integration.metadata.files_updated || 0} updated</p>
                        <p>⊘ {integration.metadata.files_skipped || 0} skipped</p>
                      </div>
                    )}
                    <Button
                      onClick={handleTestGoogleDrive}
                      disabled={testingGoogleDrive}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {testingGoogleDrive ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testing connection...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Test Connection
                        </>
                      )}
                    </Button>
                  </>
                )}
                {integration.id === "pandadoc" && (
                  <>
                    {!integration.is_enabled ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                          <h4 className="text-sm font-medium">Configure PandaDoc</h4>
                          <div className="space-y-2">
                            <Label htmlFor="pandadoc-api-key">PandaDoc API Key</Label>
                            <Input
                              id="pandadoc-api-key"
                              type="password"
                              placeholder="Enter your PandaDoc API key"
                              value={pandadocApiKey}
                              onChange={(e) => setPandadocApiKey(e.target.value)}
                              disabled={isConnectingPandadoc}
                            />
                            <p className="text-xs text-muted-foreground">
                              Get your API key from PandaDoc Settings → API
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pandadoc-workspace-id">Workspace ID (Optional)</Label>
                            <Input
                              id="pandadoc-workspace-id"
                              type="text"
                              placeholder="Enter workspace ID if using workspaces"
                              value={pandadocWorkspaceId}
                              onChange={(e) => setPandadocWorkspaceId(e.target.value)}
                              disabled={isConnectingPandadoc}
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave empty to use your default workspace
                            </p>
                          </div>
                          <Button
                            onClick={handleConnectPandaDoc}
                            disabled={isConnectingPandadoc || !pandadocApiKey.trim()}
                            className="w-full"
                          >
                            {isConnectingPandadoc ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                <Plug className="mr-2 h-4 w-4" />
                                Connect PandaDoc
                              </>
                            )}
                          </Button>
                          <Link
                            to="/adminpanel/documentation?doc=pandadoc-integration"
                            className="text-xs text-primary hover:underline block"
                          >
                            View PandaDoc Setup Guide →
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          PandaDoc Connected
                        </div>
                        {pandadocTestResult && (
                          <div className="text-sm">
                            {pandadocTestResult.ok && (
                              <p className="text-green-600 dark:text-green-400">
                                ✓ Connection successful - {Array.isArray(pandadocTestResult.templates) ? pandadocTestResult.templates.length : 0} templates available
                              </p>
                            )}
                            {!pandadocTestResult.ok && (
                              <p className="text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {pandadocTestResult.error}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            onClick={handleTestPandaDocConnection}
                            disabled={testingPandadoc}
                            variant="outline"
                            size="sm"
                          >
                            {testingPandadoc ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Test Connection
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleDisconnectPandaDoc}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Disconnect
                          </Button>
                        </div>
                        <Link
                          to="/adminpanel/documentation?doc=pandadoc-integration"
                          className="text-xs text-primary hover:underline block"
                        >
                          View Documentation →
                        </Link>
                      </div>
                    )}
                  </>
                )}
                {integration.id === "zerobounce" && (
                  <>
                    {!integration.is_enabled ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                          <h4 className="text-sm font-medium">Configure Zerobounce</h4>
                          <div className="space-y-2">
                            <Label htmlFor="zerobounce-api-key">Zerobounce API Key</Label>
                            <Input
                              id="zerobounce-api-key"
                              type="password"
                              placeholder="Enter your Zerobounce API key"
                              value={zerobounceApiKey}
                              onChange={(e) => setZerobounceApiKey(e.target.value)}
                              disabled={isConnectingZerobounce}
                            />
                            <p className="text-xs text-muted-foreground">
                              Get your API key from Zerobounce Dashboard → API
                            </p>
                          </div>
                          {zerobounceTestResult && (
                            <div className="text-sm">
                              {zerobounceTestResult.ok && (
                                <p className="text-green-600 dark:text-green-400">
                                  ✓ Connection successful - Credits remaining: {zerobounceTestResult.credits || 'N/A'}
                                </p>
                              )}
                              {!zerobounceTestResult.ok && (
                                <p className="text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {zerobounceTestResult.error}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={handleTestZeroBounce}
                              disabled={testingZerobounce || !zerobounceApiKey.trim()}
                              variant="outline"
                              className="flex-1"
                            >
                              {testingZerobounce ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Test
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={handleConnectZeroBounce}
                              disabled={isConnectingZerobounce || !zerobounceApiKey.trim()}
                              className="flex-1"
                            >
                              {isConnectingZerobounce ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                <>
                                  <Plug className="mr-2 h-4 w-4" />
                                  Save & Connect
                                </>
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Note: Only Super Admins can configure Zerobounce integration
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          Zerobounce Connected
                        </div>
                        {zerobounceTestResult && (
                          <div className="text-sm">
                            {zerobounceTestResult.ok && (
                              <p className="text-green-600 dark:text-green-400">
                                ✓ Connection successful - Credits: {zerobounceTestResult.credits || 'N/A'}
                              </p>
                            )}
                            {!zerobounceTestResult.ok && (
                              <p className="text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {zerobounceTestResult.error}
                              </p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Email validation is active. All new contacts will be validated automatically.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleTestZeroBounce}
                            disabled={testingZerobounce}
                            variant="outline"
                            size="sm"
                          >
                            {testingZerobounce ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Checking...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Check Credits
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleDisconnectZeroBounce}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Power className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">CRM integrations</h2>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">HubSpot</CardTitle>
              <CardDescription>Sync contacts, deals, and activities from HubSpot.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={hubspotIntegration?.is_active ?? false}
                disabled={!hubspotIntegration || Boolean(crmToggling[hubspotIntegration.id]) || isCrmLoading}
                onCheckedChange={() => hubspotIntegration && handleToggleCrmIntegration(hubspotIntegration)}
              />
              <Badge variant={hubspotIntegration?.is_active ? "default" : "outline"}>
                {hubspotIntegration?.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hubspotIntegration?.is_active && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h4 className="text-sm font-medium">Configure Connection</h4>
                <div className="space-y-2">
                  <Label htmlFor="hubspot-api-key">Private App Access Token</Label>
                  <Input
                    id="hubspot-api-key"
                    type="password"
                    placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={hubspotApiKey}
                    onChange={(e) => setHubspotApiKey(e.target.value)}
                    disabled={isConfiguringHubspot}
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a Private App in HubSpot Settings → Integrations → Private Apps with CRM scopes
                  </p>
                </div>
                {hubspotTestResult && (
                  <div className="text-sm">
                    {hubspotTestResult.ok && (
                      <p className="text-green-600 dark:text-green-400">
                        ✓ Connection successful
                      </p>
                    )}
                    {!hubspotTestResult.ok && (
                      <p className="text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {hubspotTestResult.error}
                      </p>
                    )}
                  </div>
                )}
                <Button onClick={handleConfigureHubSpot} disabled={isConfiguringHubspot || !hubspotApiKey.trim()}>
                  {isConfiguringHubspot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
                  Save & Connect
                </Button>
              </div>
            )}
            
            {hubspotIntegration?.is_active && (
              <>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Configured & Active
                  </span>
                  <span>Last sync: {formatDateTime(hubspotIntegration?.last_sync)}</span>
                  <span>Status: {hubspotIntegration?.status ?? "Unknown"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => hubspotIntegration && handleSyncCrmIntegration(hubspotIntegration)}
                    disabled={!hubspotIntegration || Boolean(crmSyncing.hubspot)}
                  >
                    {crmSyncing.hubspot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Sync now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenIntegrationLogs("hubspot")}
                  >
                    <ScrollText className="mr-2 h-4 w-4" /> View logs
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">GoHighLevel</CardTitle>
            <CardDescription>Manage multiple GoHighLevel locations with individual API keys.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add new location form */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-medium">Add New Location</h4>
                <Badge variant="outline" className="text-xs">
                  Supports API Keys & OAuth
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your GoHighLevel API key (private key or OAuth token) and location ID to connect.
                OAuth tokens will be automatically refreshed if refresh token is provided.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="ghl-api-key">API Key *</Label>
                  <Input
                    id="ghl-api-key"
                    type="password"
                    placeholder="Enter API key"
                    value={ghlForm.apiKey}
                    onChange={(event) => {
                      setGhlForm((prev) => ({ ...prev, apiKey: event.target.value }));
                      setGhlTestResult(null);
                    }}
                    disabled={isConnectingGhl || testingGhl}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from GHL Settings → Integrations → API
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ghl-location-id">Location ID *</Label>
                  <Input
                    id="ghl-location-id"
                    placeholder="e.g., fZgMNJT9I9gVG0wDd1oi"
                    value={ghlForm.locationId}
                    onChange={(event) => {
                      setGhlForm((prev) => ({ ...prev, locationId: event.target.value }));
                      setGhlTestResult(null);
                    }}
                    disabled={isConnectingGhl || testingGhl}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find this in your GHL URL: .../location/<strong>YOUR_LOCATION_ID</strong>/...
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ghl-location-name">Location Name (optional)</Label>
                  <Input
                    id="ghl-location-name"
                    placeholder="e.g., Austin Office"
                    value={ghlForm.locationName}
                    onChange={(event) => setGhlForm((prev) => ({ ...prev, locationName: event.target.value }))}
                    disabled={isConnectingGhl || testingGhl}
                  />
                </div>
              </div>

              {ghlTestResult && (
                <div
                  className={`rounded-md border px-3 py-2 text-sm ${
                    ghlTestResult.ok
                      ? "border-green-500 text-green-600 dark:text-green-400"
                      : "border-red-500 text-red-600 dark:text-red-400"
                  }`}
                >
                  {ghlTestResult.ok ? (
                    <div className="space-y-1">
                      <span className="flex items-center gap-1">
                        ✓ {ghlTestResult.message || "Connection successful"}
                      </span>
                      {ghlTestResult.locationName && (
                        <p className="text-xs">Location: {ghlTestResult.locationName}</p>
                      )}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {ghlTestResult.error || "Connection failed"}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestGoHighLevel}
                  disabled={testingGhl || isConnectingGhl || !ghlForm.apiKey.trim()}
                >
                  {testingGhl ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleConnectGoHighLevel}
                  disabled={isConnectingGhl || testingGhl || !ghlForm.apiKey.trim() || !ghlForm.locationId.trim()}
                >
                  {isConnectingGhl ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Plug className="mr-2 h-4 w-4" />
                      Add Location
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* List of existing locations */}
            {ghlIntegrations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Connected Locations ({ghlIntegrations.length})</h4>
                <div className="space-y-2">
                  {ghlIntegrations.map((integration: any) => (
                    <div key={integration.id} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium">
                              {integration.location_name || "Unnamed Location"}
                            </h5>
                            <Badge variant={integration.is_active ? "default" : "outline"}>
                              {integration.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {integration.location_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-mono">{integration.location_id}</span>
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Last updated: {formatDateTime(integration.updated_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setCrmSyncing((prev) => ({ ...prev, [`ghl-${integration.id}`]: true }));
                              try {
                                const { data, error } = await supabase.functions.invoke("gohighlevel-manage/sync-contacts", {
                                  method: "POST",
                                  body: { integration_id: integration.id },
                                });
                                if (error) throw error;
                                if (!data?.ok) throw new Error(data?.error || "Sync failed");
                                toast({ title: "Sync complete", description: `${integration.location_name || "Location"} synced successfully.` });
                                await loadIntegrations();
                              } catch (error) {
                                console.error("Sync failed", error);
                                toast({
                                  title: "Sync failed",
                                  description: error instanceof Error ? error.message : "Unable to sync location.",
                                  variant: "destructive",
                                });
                              } finally {
                                setCrmSyncing((prev) => ({ ...prev, [`ghl-${integration.id}`]: false }));
                              }
                            }}
                            disabled={Boolean(crmSyncing[`ghl-${integration.id}`])}
                          >
                            {crmSyncing[`ghl-${integration.id}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteGhlIntegration(integration.id, integration.location_name)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {formatDateTime(integration.updated_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ghlIntegrations.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No GoHighLevel locations connected yet. Add your first location above.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Integration summary</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Integration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crmIntegrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell className="font-medium">{integration.name}</TableCell>
                  <TableCell>
                    <Badge variant={integration.is_active ? "default" : "outline"}>
                      {integration.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(integration.last_sync)}
                  </TableCell>
                </TableRow>
              ))}
              {crmIntegrations.length === 0 && !isCrmLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    No CRM integrations have been configured yet.
                  </TableCell>
                </TableRow>
              )}
              {isCrmLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading integrations...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>
              {selectedLogSource === "hubspot"
                ? "HubSpot sync logs"
                : selectedLogSource === "gohighlevel"
                ? "GoHighLevel sync logs"
                : "Integration logs"}
            </DialogTitle>
            <DialogDescription>
              Recent events captured from the integration sync pipeline.
            </DialogDescription>
          </DialogHeader>

          {isLogsLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading logs...
            </div>
          ) : logEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              No log entries found for this integration.
            </div>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
              {logEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="space-y-2 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary">{entry.metric_name}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatDateTime(entry.recorded_at)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Value: {entry.metric_value ?? "n/a"}</p>
                      {entry.dimensions && Object.keys(entry.dimensions).length > 0 && (
                        <pre className="mt-2 rounded-md bg-muted p-2 text-xs">
                          {JSON.stringify(entry.dimensions, null, 2)}
                        </pre>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationManager;
