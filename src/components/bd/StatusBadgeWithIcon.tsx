import { Badge } from "@/components/ui/badge";
import { User, Brain, Link2, CheckCircle, MessageSquare, Mail, Reply, Calendar, XCircle, Trophy, Facebook, Instagram, ThumbsDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignContactStatus } from "@/features/campaign-detail/types";

interface StatusBadgeWithIconProps {
  status: CampaignContactStatus;
  className?: string;
  socialPlatform?: 'linkedin' | 'facebook' | 'instagram';
}

const statusConfig: Record<CampaignContactStatus, {
  label: string;
  icon: typeof User;
  className: string;
}> = {
  identified: {
    label: "Identified",
    icon: User,
    className: "bg-slate-100 text-slate-700 hover:bg-slate-600 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors",
  },
  researched: {
    label: "Researched",
    icon: Brain,
    className: "bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-600 transition-colors",
  },
  client_not_ideal: {
    label: "Client Not Ideal",
    icon: ThumbsDown,
    className: "bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-600 transition-colors",
  },
  contacted_linkedin: {
    label: "LinkedIn Request",
    icon: Link2,
    className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-600 transition-colors",
  },
  contacted_social: {
    label: "Social Media Request",
    icon: Facebook,
    className: "bg-violet-100 text-violet-700 hover:bg-violet-600 hover:text-white dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-600 transition-colors",
  },
  connected: {
    label: "Connected",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 hover:bg-green-600 hover:text-white dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-600 transition-colors",
  },
  client_not_responsive: {
    label: "Client Not Responsive",
    icon: Clock,
    className: "bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-600 transition-colors",
  },
  messaged: {
    label: "Messaged",
    icon: MessageSquare,
    className: "bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-600 transition-colors",
  },
  contacted_email: {
    label: "Email Sent",
    icon: Mail,
    className: "bg-orange-100 text-orange-700 hover:bg-orange-600 hover:text-white dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-600 transition-colors",
  },
  responded: {
    label: "Responded",
    icon: Reply,
    className: "bg-teal-100 text-teal-700 hover:bg-teal-600 hover:text-white dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-600 transition-colors",
  },
  meeting_booked: {
    label: "Meeting Booked",
    icon: Calendar,
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-600 transition-colors",
  },
  close_lost: {
    label: "Close Lost",
    icon: XCircle,
    className: "bg-red-100 text-red-700 hover:bg-red-600 hover:text-white dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-600 transition-colors",
  },
  won: {
    label: "Won",
    icon: Trophy,
    className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-600 hover:text-white dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-600 transition-colors",
  },
};

export function StatusBadgeWithIcon({ status, className, socialPlatform = 'linkedin' }: StatusBadgeWithIconProps) {
  const config = statusConfig[status];
  let Icon = config.icon;
  let label = config.label;
  
  // Override icon and label for social media stage based on platform
  if (status === 'contacted_linkedin') {
    if (socialPlatform === 'facebook') {
      Icon = Facebook;
      label = 'Facebook Request';
    } else if (socialPlatform === 'instagram') {
      Icon = Instagram;
      label = 'Instagram Request';
    }
  }

  if (status === 'contacted_social') {
    if (socialPlatform === 'facebook') {
      Icon = Facebook;
      label = 'Facebook Request';
    } else if (socialPlatform === 'instagram') {
      Icon = Instagram;
      label = 'Instagram Request';
    }
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
