import { Brain, Send, MessageCircle, Mail, Calendar, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CampaignContact } from '@/features/campaign-detail/types';

export type QuickActionType = 'view' | 'research' | 'connect' | 'message' | 'email' | 'meeting' | 'followup';

interface QuickActionsCellProps {
  contact: CampaignContact;
  onAction: (action: QuickActionType, contactSlug: string) => void;
}

export function QuickActionsCell({ contact, onAction }: QuickActionsCellProps) {
  const { status, contact_email, contact_linkedin_url } = contact;

  // Determine primary and secondary actions based on status
  let primaryAction: { type: QuickActionType; label: string; icon: typeof Brain; disabled?: boolean } | null = null;
  let secondaryAction: { type: QuickActionType; icon: typeof ExternalLink } | null = null;

  switch (status) {
    case 'identified':
      primaryAction = { type: 'research', label: 'Research', icon: Brain };
      break;
    case 'researched':
      primaryAction = {
        type: 'connect',
        label: 'Connect',
        icon: Send,
        disabled: !contact_linkedin_url,
      };
      break;
    case 'contacted_linkedin':
      primaryAction = { type: 'followup', label: 'Follow Up', icon: Clock };
      break;
    case 'connected':
      primaryAction = {
        type: 'message',
        label: 'Message',
        icon: MessageCircle,
        disabled: !contact_linkedin_url,
      };
      break;
    case 'messaged':
      primaryAction = {
        type: 'email',
        label: 'Email',
        icon: Mail,
        disabled: !contact_email,
      };
      break;
    case 'contacted_email':
      primaryAction = { type: 'followup', label: 'Follow Up', icon: Clock };
      break;
    case 'responded':
      primaryAction = { type: 'meeting', label: 'Book Meeting', icon: Calendar };
      break;
    case 'meeting_booked':
      primaryAction = { type: 'view', label: 'View Details', icon: ExternalLink };
      break;
  }

  // Always show "View" as secondary action (unless it's the primary)
  if (primaryAction?.type !== 'view') {
    secondaryAction = { type: 'view', icon: ExternalLink };
  }

  return (
    <div className="flex items-center gap-2">
      {primaryAction && (
        <Button
          size="sm"
          variant="default"
          onClick={() => onAction(primaryAction.type, contact.slug)}
          disabled={primaryAction.disabled}
          className="gap-1.5 h-8"
        >
          <primaryAction.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{primaryAction.label}</span>
        </Button>
      )}
      
      {secondaryAction && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAction(secondaryAction.type, contact.slug)}
          className="h-8 w-8 p-0"
        >
          <secondaryAction.icon className="h-3.5 w-3.5" />
          <span className="sr-only">View details</span>
        </Button>
      )}
    </div>
  );
}
