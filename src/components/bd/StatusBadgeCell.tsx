import { CheckCircle2, Circle, Send, Users, MessageCircle, Mail, Calendar, XCircle, Trophy, Facebook, Instagram } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CampaignContactStatus } from '@/features/campaign-detail/types';

const STATUS_CONFIG: Record<
  CampaignContactStatus,
  { label: string; description: string; icon: typeof Circle; className: string }
> = {
  identified: {
    label: 'Identified',
    description: 'Contact imported into campaign',
    icon: Circle,
    className: 'bg-slate-100 text-slate-900 border-slate-200',
  },
  researched: {
    label: 'Researched',
    description: 'Research summary completed',
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-900 border-blue-200',
  },
  client_not_ideal: {
    label: 'Not Ideal',
    description: 'Client does not fit ideal customer profile',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-900 border-gray-200',
  },
  contacted_linkedin: {
    label: 'Request Sent',
    description: 'LinkedIn connection request sent',
    icon: Send,
    className: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  },
  contacted_social: {
    label: 'Social Outreach',
    description: 'Contact made via social media',
    icon: Send,
    className: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  },
  connected: {
    label: 'Connected',
    description: 'Connection accepted on LinkedIn',
    icon: Users,
    className: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  client_not_responsive: {
    label: 'Not Responsive',
    description: 'Client has not responded to outreach',
    icon: XCircle,
    className: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  messaged: {
    label: 'Messaged',
    description: 'LinkedIn message sent',
    icon: MessageCircle,
    className: 'bg-purple-100 text-purple-900 border-purple-200',
  },
  contacted_email: {
    label: 'Email Sent',
    description: 'Email outreach sent',
    icon: Mail,
    className: 'bg-orange-100 text-orange-900 border-orange-200',
  },
  responded: {
    label: 'Responded',
    description: 'Prospect replied to outreach',
    icon: MessageCircle,
    className: 'bg-teal-100 text-teal-900 border-teal-200',
  },
  meeting_booked: {
    label: 'Meeting',
    description: 'Meeting scheduled',
    icon: Calendar,
    className: 'bg-green-200 text-green-900 border-green-300',
  },
  close_lost: {
    label: 'Close Lost',
    description: 'Deal did not close',
    icon: XCircle,
    className: 'bg-red-100 text-red-900 border-red-200',
  },
  won: {
    label: 'Won',
    description: 'Deal won successfully',
    icon: Trophy,
    className: 'bg-yellow-100 text-yellow-900 border-yellow-200',
  },
};

interface StatusBadgeCellProps {
  status: CampaignContactStatus;
  socialPlatform?: 'linkedin' | 'facebook' | 'instagram';
}

export function StatusBadgeCell({ status, socialPlatform = 'linkedin' }: StatusBadgeCellProps) {
  const config = STATUS_CONFIG[status];
  let Icon = config.icon;
  let label = config.label;
  let description = config.description;
  
  // Override for social media stage based on platform
  if (status === 'contacted_linkedin') {
    if (socialPlatform === 'facebook') {
      Icon = Facebook;
      label = 'FB Request Sent';
      description = 'Facebook connection/follow request sent';
    } else if (socialPlatform === 'instagram') {
      Icon = Instagram;
      label = 'IG Request Sent';
      description = 'Instagram follow request sent';
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={config.className}>
            <Icon className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
