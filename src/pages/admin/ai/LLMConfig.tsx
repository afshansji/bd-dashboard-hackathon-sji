import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Settings2, Eye, EyeOff, CheckCircle2, XCircle, ExternalLink,
  Sparkles, Brain, Gem, Bot, Loader2, Info, Zap,
} from "lucide-react";

type ProviderKey = "lovable" | "openai" | "gemini" | "claude";

interface ProviderDefinition {
  key: ProviderKey;
  name: string;
  description: string;
  icon: typeof Bot;
  color: string;
  models: string[];
  keyPrefix: string;
  keyPlaceholder: string;
  docsUrl: string;
  isDefault?: boolean;
}

interface ProviderState {
  apiKey: string;
  isConfigured: boolean;
  showKey: boolean;
  isTesting: boolean;
}

const PROVIDERS: ProviderDefinition[] = [
  {
    key: "lovable",
    name: "Lovable AI",
    description: "Built-in AI provider — always available, no API key needed",
    icon: Sparkles,
    color: "text-primary",
    models: ["lovable-2", "lovable-2-mini"],
    keyPrefix: "",
    keyPlaceholder: "",
    docsUrl: "",
    isDefault: true,
  },
  {
    key: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, GPT-4 Turbo, GPT-3.5 Turbo",
    icon: Brain,
    color: "text-emerald-500",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    keyPrefix: "sk-proj-",
    keyPlaceholder: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    key: "gemini",
    name: "Google Gemini",
    description: "Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash",
    icon: Gem,
    color: "text-blue-500",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    keyPrefix: "AIza",
    keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    key: "claude",
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus",
    icon: Bot,
    color: "text-orange-500",
    models: ["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus"],
    keyPrefix: "sk-ant-",
    keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
];

const STORAGE_KEY = "llm_provider_config";

function loadStoredConfig(): Partial<Record<ProviderKey, { isConfigured: boolean }>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function ProviderCard({
  provider,
  state,
  onUpdate,
}: {
  provider: ProviderDefinition;
  state: ProviderState;
  onUpdate: (patch: Partial<ProviderState>) => void;
}) {
  const Icon = provider.icon;

  const handleSave = () => {
    if (!state.apiKey.trim()) return;
    onUpdate({ isConfigured: true });
    const stored = loadStoredConfig();
    stored[provider.key] = { isConfigured: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  };

  const handleDisconnect = () => {
    onUpdate({ isConfigured: false, apiKey: "" });
    const stored = loadStoredConfig();
    stored[provider.key] = { isConfigured: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  };

  const handleTest = async () => {
    onUpdate({ isTesting: true });
    await new Promise((r) => setTimeout(r, 1500));
    onUpdate({ isTesting: false });
  };

  if (provider.isDefault) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className={`h-6 w-6 ${provider.color}`} />
              <div>
                <CardTitle className="text-lg">{provider.name}</CardTitle>
                <CardDescription>{provider.description}</CardDescription>
              </div>
            </div>
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Always Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {provider.models.map((m) => (
              <Badge key={m} variant="secondary">{m}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={state.isConfigured ? "border-green-500/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${provider.color}`} />
            <div>
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              <CardDescription>{provider.description}</CardDescription>
            </div>
          </div>
          {state.isConfigured ? (
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3" /> Not Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>API Key</Label>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              Get key <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={state.showKey ? "text" : "password"}
                placeholder={provider.keyPlaceholder}
                value={state.apiKey}
                onChange={(e) => onUpdate({ apiKey: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => onUpdate({ showKey: !state.showKey })}
              >
                {state.showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {!state.isConfigured ? (
            <Button onClick={handleSave} disabled={!state.apiKey.trim()} size="sm">
              Save Key
            </Button>
          ) : (
            <>
              <Button onClick={handleTest} variant="outline" size="sm" disabled={state.isTesting}>
                {state.isTesting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                Test
              </Button>
              <Button onClick={handleDisconnect} variant="destructive" size="sm">
                Disconnect
              </Button>
            </>
          )}
        </div>

        {state.isConfigured && (
          <>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Available Models</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {provider.models.map((m) => (
                  <Badge key={m} variant="secondary">{m}</Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {!state.isConfigured && (
          <p className="text-xs text-muted-foreground">
            Configuring unlocks {provider.models.length} additional models
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function LLMConfig() {
  const [states, setStates] = useState<Record<ProviderKey, ProviderState>>(() => {
    const stored = loadStoredConfig();
    const init: Record<string, ProviderState> = {};
    for (const p of PROVIDERS) {
      init[p.key] = {
        apiKey: "",
        isConfigured: p.isDefault || stored[p.key]?.isConfigured || false,
        showKey: false,
        isTesting: false,
      };
    }
    return init as Record<ProviderKey, ProviderState>;
  });

  const configuredCount = Object.values(states).filter((s) => s.isConfigured).length;
  const totalModels = PROVIDERS.filter((p) => states[p.key].isConfigured).reduce(
    (acc, p) => acc + p.models.length, 0
  );

  const updateProvider = (key: ProviderKey, patch: Partial<ProviderState>) => {
    setStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6" /> LLM Provider Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect AI providers to unlock models for your agents
          </p>
        </div>
        <div className="flex gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{configuredCount}</div>
            <div className="text-xs text-muted-foreground">Providers</div>
          </div>
          <Separator orientation="vertical" className="h-12" />
          <div className="text-center">
            <div className="text-2xl font-bold">{totalModels}</div>
            <div className="text-xs text-muted-foreground">Models</div>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Lovable AI</strong> is always available at no extra cost. Connect additional providers to access their specific models.
          API keys are stored locally — in production, store them securely via backend functions.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {PROVIDERS.map((provider) => (
          <ProviderCard
            key={provider.key}
            provider={provider}
            state={states[provider.key]}
            onUpdate={(patch) => updateProvider(provider.key, patch)}
          />
        ))}
      </div>
    </div>
  );
}
