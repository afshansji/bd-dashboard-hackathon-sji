import { useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { CampaignStatus } from '@/Api/adminCampaigns';
import { cn } from '@/lib/utils';

interface CampaignStatusSelectProps {
  currentStatus: CampaignStatus;
  onStatusChange: (newStatus: CampaignStatus) => Promise<void>;
  disabled?: boolean;
  showBadge?: boolean;
}

const STATUS_CONFIG: Record<CampaignStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  planning: { label: 'Planning', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  paused: { label: 'Paused', variant: 'outline' },
  completed: { label: 'Completed', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'destructive' },
};

export function CampaignStatusSelect({
  currentStatus,
  onStatusChange,
  disabled = false,
  showBadge = false,
}: CampaignStatusSelectProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || isUpdating) return;

    setIsUpdating(true);
    try {
      await onStatusChange(newStatus as CampaignStatus);
      toast({
        title: 'Status updated',
        description: `Campaign status changed to ${STATUS_CONFIG[newStatus as CampaignStatus].label}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update status',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (showBadge) {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={currentStatus}
          onValueChange={handleStatusChange}
          disabled={disabled || isUpdating}
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue>
              <div className="flex items-center gap-2">
                {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                <Badge variant={STATUS_CONFIG[currentStatus].variant} className="capitalize">
                  {STATUS_CONFIG[currentStatus].label}
                </Badge>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <SelectItem key={status} value={status}>
                <Badge variant={config.variant} className="capitalize">
                  {config.label}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={disabled || isUpdating}
    >
      <SelectTrigger className={cn("w-[140px]", isUpdating && "opacity-50")}>
        <SelectValue>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className="capitalize">{STATUS_CONFIG[currentStatus].label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <SelectItem key={status} value={status}>
            <div className="flex items-center justify-between w-full gap-2">
              <span className="capitalize">{config.label}</span>
              {status === currentStatus && <Check className="h-4 w-4 text-primary" />}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
