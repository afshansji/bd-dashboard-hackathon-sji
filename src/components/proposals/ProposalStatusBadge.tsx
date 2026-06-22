import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Send, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import type { ProposalStatus } from "@/types/proposal";
import { format } from "date-fns";

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
  sentAt?: string;
  viewedAt?: string;
  completedAt?: string;
  expiresAt?: string;
}

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; color: string }
> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText, color: "text-muted-foreground" },
  sent: { label: "Sent", variant: "default", icon: Send, color: "text-blue-600" },
  viewed: { label: "Viewed", variant: "outline", icon: Eye, color: "text-yellow-600" },
  completed: { label: "Completed", variant: "default", icon: CheckCircle, color: "text-green-600" },
  signed: { label: "Signed", variant: "default", icon: CheckCircle, color: "text-green-600" },
  declined: { label: "Declined", variant: "destructive", icon: XCircle, color: "text-red-600" },
  expired: { label: "Expired", variant: "outline", icon: Clock, color: "text-orange-600" },
};

export const ProposalStatusBadge = ({
  status,
  sentAt,
  viewedAt,
  completedAt,
  expiresAt,
}: ProposalStatusBadgeProps) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-semibold">{config.label}</p>
      {sentAt && <p className="text-xs">Sent: {format(new Date(sentAt), "MMM d, yyyy h:mm a")}</p>}
      {viewedAt && <p className="text-xs">Viewed: {format(new Date(viewedAt), "MMM d, yyyy h:mm a")}</p>}
      {completedAt && <p className="text-xs">Completed: {format(new Date(completedAt), "MMM d, yyyy h:mm a")}</p>}
      {expiresAt && <p className="text-xs">Expires: {format(new Date(expiresAt), "MMM d, yyyy h:mm a")}</p>}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant={config.variant} className="gap-1.5">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{tooltipContent}</TooltipContent>
    </Tooltip>
  );
};
