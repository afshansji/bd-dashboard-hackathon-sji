import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface TitleCellProps {
  contact: CampaignContact;
}

export function TitleCell({ contact }: TitleCellProps) {
  const title = contact.current_position_title || contact.contact_title;

  if (!title) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const isTruncated = title.length > 30;
  const displayTitle = isTruncated ? `${title.slice(0, 30)}...` : title;

  if (isTruncated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground cursor-default">
              {displayTitle}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className="text-sm text-muted-foreground">{title}</span>;
}
