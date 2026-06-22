import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface ProfileScoreCellProps {
  contact: CampaignContact;
}

export function ProfileScoreCell({ contact }: ProfileScoreCellProps) {
  if (!contact.profile_completeness_score) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const score = contact.profile_completeness_score;
  
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let colorClass = 'text-muted-foreground';
  
  if (score >= 90) {
    variant = 'default';
    colorClass = 'text-green-600 dark:text-green-400';
  } else if (score >= 75) {
    variant = 'secondary';
    colorClass = 'text-blue-600 dark:text-blue-400';
  } else if (score >= 60) {
    colorClass = 'text-yellow-600 dark:text-yellow-400';
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className={`cursor-default ${colorClass}`}>
            {score}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Profile Completeness: {score}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
