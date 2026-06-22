import { Badge } from '@/components/ui/badge';
import { GoalStatus } from '@/hooks/useAccountabilityGoals';

interface GoalStatusBadgeProps {
  status: GoalStatus;
  className?: string;
}

export function GoalStatusBadge({ status, className }: GoalStatusBadgeProps) {
  const getStatusConfig = (status: GoalStatus) => {
    switch (status) {
      case 'on_track':
        return {
          label: 'On Track',
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600',
        };
      case 'at_risk':
        return {
          label: 'At Risk',
          variant: 'default' as const,
          className: 'bg-yellow-500 hover:bg-yellow-600',
        };
      case 'off_track':
        return {
          label: 'Off Track',
          variant: 'destructive' as const,
          className: '',
        };
      case 'completed':
        return {
          label: 'Completed',
          variant: 'default' as const,
          className: 'bg-blue-500 hover:bg-blue-600',
        };
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          className: '',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ''}`}>
      {config.label}
    </Badge>
  );
}

