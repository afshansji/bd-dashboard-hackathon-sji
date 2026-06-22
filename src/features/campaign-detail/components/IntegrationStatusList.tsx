import { AlertCircle, CheckCircle2, Clock3, PlugZap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CampaignDetailIntegrations } from "../types";

interface IntegrationStatusListProps {
  integrations: CampaignDetailIntegrations;
  isLoading: boolean;
}

const STATUS_CONFIG = {
  synced: {
    label: "Synced",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    badge: "bg-emerald-100 text-emerald-700",
    description: "Data is up to date.",
  },
  pending: {
    label: "Pending",
    icon: <Clock3 className="h-4 w-4 text-amber-500" />,
    badge: "bg-amber-100 text-amber-700",
    description: "Waiting for the next automation run.",
  },
  error: {
    label: "Error",
    icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    badge: "bg-red-100 text-red-700",
    description: "We could not sync the latest data.",
  },
  not_configured: {
    label: "Not configured",
    icon: <PlugZap className="h-4 w-4 text-slate-500" />,
    badge: "bg-slate-100 text-slate-600",
    description: "Connect this integration to see insights here.",
  },
  disabled: {
    label: "Disabled",
    icon: <PlugZap className="h-4 w-4 text-slate-500" />,
    badge: "bg-slate-200 text-slate-600",
    description: "Integration disabled for this campaign.",
  },
} as const;

const INTEGRATION_LABELS: Record<keyof CampaignDetailIntegrations, string> = {
  n8n: "n8n Automations",
  hubspot: "HubSpot",
  ghl: "GoHighLevel",
};

export function IntegrationStatusList({ integrations, isLoading }: IntegrationStatusListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking integration status…</p>
        ) : (
          (Object.keys(INTEGRATION_LABELS) as Array<keyof CampaignDetailIntegrations>).map((key) => {
            const value = integrations[key];
            const status = (value?.status ?? "not_configured") as keyof typeof STATUS_CONFIG;
            const config = STATUS_CONFIG[status];
            return (
              <div key={key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <div>
                      <p className="text-sm font-medium">{INTEGRATION_LABELS[key]}</p>
                      <p className="text-xs text-muted-foreground">{value?.message ?? config.description}</p>
                    </div>
                  </div>
                  <Badge className={`${config.badge} capitalize`}>{config.label}</Badge>
                </div>
                {value?.last_synced_at ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last synced {new Date(value.last_synced_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
