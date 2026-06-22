import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Brain, Mail, Linkedin, Phone } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface NameCellProps {
  contact: CampaignContact;
}

export function NameCell({ contact }: NameCellProps) {
  const initials = contact.contact_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasResearch = !!contact.research_summary;
  const hasEmail = !!contact.contact_email;
  const hasLinkedIn = !!contact.contact_linkedin_url;
  const hasPhone = !!contact.contact_phone;

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={contact.linkedin_profile_image_url || undefined} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-sm">{contact.contact_name}</span>
        <div className="flex items-center gap-0.5">
          {hasResearch && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Brain className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Research available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {hasEmail && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Mail className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Email available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {hasLinkedIn && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Linkedin className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">LinkedIn profile available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {hasPhone && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Phone className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Phone available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
