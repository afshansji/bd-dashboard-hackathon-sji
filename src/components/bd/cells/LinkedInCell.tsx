import { ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface LinkedInCellProps {
  contact: CampaignContact;
}

export function LinkedInCell({ contact }: LinkedInCellProps) {
  if (!contact.contact_linkedin_url) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(contact.contact_linkedin_url!, '_blank', 'noopener,noreferrer');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleClick}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Open LinkedIn Profile</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
