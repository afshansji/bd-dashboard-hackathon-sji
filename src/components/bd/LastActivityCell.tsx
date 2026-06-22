import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface LastActivityCellProps {
  contact: CampaignContact;
}

export function LastActivityCell({ contact }: LastActivityCellProps) {
  // Determine most recent activity
  const activityDates = [
    contact.last_activity_at,
    contact.linkedin_message_sent_at,
    contact.email_sent_at,
    contact.linkedin_accepted_at,
    contact.linkedin_request_sent_at,
    contact.updated_at,
  ].filter(Boolean) as string[];

  if (activityDates.length === 0) {
    return <span className="text-xs text-muted-foreground">No activity</span>;
  }

  // Find the most recent date
  const mostRecentDate = activityDates
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const daysSinceActivity = Math.floor(
    (Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const relativeTime = formatDistanceToNow(mostRecentDate, { addSuffix: true });
  const exactTime = mostRecentDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`text-xs cursor-default ${
              daysSinceActivity > 7 ? 'text-muted-foreground' : 'text-foreground'
            }`}
          >
            {relativeTime}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{exactTime}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
