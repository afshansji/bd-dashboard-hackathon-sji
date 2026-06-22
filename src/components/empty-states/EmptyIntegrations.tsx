import { Plug } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { useNavigate } from "react-router-dom";

export function EmptyIntegrations() {
  const navigate = useNavigate();

  return (
    <EmptyState
      icon={Plug}
      title="No Active Integrations"
      description="Connect services like Google Analytics, HubSpot, and ActiveCollab to automate data tracking."
      primaryAction={{
        label: "Browse Integrations",
        onClick: () => navigate("/admin/integrations"),
      }}
      secondaryAction={{
        label: "Setup Guide",
        onClick: () => window.open("https://docs.lovable.dev", "_blank"),
        variant: "ghost",
      }}
    />
  );
}
