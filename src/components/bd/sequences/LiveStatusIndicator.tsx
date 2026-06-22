import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface LiveStatusIndicatorProps {
  isConnected: boolean;
  isReconnecting: boolean;
  lastUpdated?: Date;
}

export function LiveStatusIndicator({ isConnected, isReconnecting, lastUpdated }: LiveStatusIndicatorProps) {
  const getStatusColor = () => {
    if (isReconnecting) return "text-yellow-500";
    if (isConnected) return "text-green-500";
    return "text-red-500";
  };

  const getStatusText = () => {
    if (isReconnecting) return "Reconnecting";
    if (isConnected) return "Live";
    return "Disconnected";
  };

  const getStatusIcon = () => {
    if (isReconnecting) return <RefreshCw className="h-3 w-3 animate-spin" />;
    if (isConnected) return <Wifi className="h-3 w-3" />;
    return <WifiOff className="h-3 w-3" />;
  };

  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return "Never";
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="flex items-center gap-1.5 cursor-help"
          >
            <span className={`${getStatusColor()} ${isConnected && !isReconnecting ? 'animate-pulse' : ''}`}>
              {getStatusIcon()}
            </span>
            <span className="text-xs font-medium">{getStatusText()}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <div>Status: {getStatusText()}</div>
            <div>Last update: {getTimeSinceUpdate()}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
