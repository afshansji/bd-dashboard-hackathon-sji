import { Link } from "react-router-dom";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Briefcase } from "lucide-react";

interface Client { id: string; name: string; slug: string; status?: string; industry?: string; region?: string; }

interface ClientQuickPreviewProps { client: Client; children: React.ReactNode; }

export function ClientQuickPreview({ client, children }: ClientQuickPreviewProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />{client.name}</h4>
            {client.status && <Badge variant="secondary" className="mt-1">{client.status}</Badge>}
          </div>
          {client.industry && <div className="text-sm flex items-center gap-1"><Briefcase className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Industry:</span> {client.industry}</div>}
          {client.region && <div className="text-sm flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{client.region}</div>}
          <Link to={`/clients/${client.slug}`} className="text-sm text-primary hover:underline block pt-2">View client details →</Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
