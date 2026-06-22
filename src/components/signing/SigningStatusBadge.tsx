import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
} from "lucide-react";
import type { SigningDocumentStatus } from "@/types/signing";

interface SigningStatusBadgeProps {
  status: SigningDocumentStatus;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  SigningDocumentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
    icon: React.ReactNode;
  }
> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: <FileText className="h-3 w-3" />,
  },
  sent: {
    label: "Sent",
    variant: "default",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    icon: <Send className="h-3 w-3" />,
  },
  viewed: {
    label: "Viewed",
    variant: "default",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    icon: <Eye className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    variant: "default",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  declined: {
    label: "Declined",
    variant: "destructive",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    icon: <XCircle className="h-3 w-3" />,
  },
  expired: {
    label: "Expired",
    variant: "secondary",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    icon: <Clock className="h-3 w-3" />,
  },
  voided: {
    label: "Voided",
    variant: "secondary",
    className: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
    icon: <Ban className="h-3 w-3" />,
  },
};

export const SigningStatusBadge = ({
  status,
  showIcon = true,
  size = "md",
}: SigningStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.draft;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <Badge variant="outline" className={`${config.className} ${sizeClasses[size]} font-medium`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
};

// ============================================================================
// DOCUMENT TYPE BADGE
// ============================================================================

import type { DocumentType } from "@/types/signing";
import { Shield } from "lucide-react";

interface DocumentTypeBadgeProps {
  type: DocumentType;
  size?: "sm" | "md" | "lg";
}

export const DocumentTypeBadge = ({ type, size = "md" }: DocumentTypeBadgeProps) => {
  const config = {
    sow: {
      label: "SOW",
      fullLabel: "Statement of Work",
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      icon: <FileText className="h-3 w-3" />,
    },
    nda: {
      label: "NDA",
      fullLabel: "Non-Disclosure Agreement",
      className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
      icon: <Shield className="h-3 w-3" />,
    },
  };

  const typeConfig = config[type];

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <Badge variant="outline" className={`${typeConfig.className} ${sizeClasses[size]} font-medium`}>
      <span className="mr-1">{typeConfig.icon}</span>
      {typeConfig.label}
    </Badge>
  );
};

// ============================================================================
// RECIPIENT STATUS BADGE
// ============================================================================

import type { RecipientStatus } from "@/types/signing";

interface RecipientStatusBadgeProps {
  status: RecipientStatus;
  size?: "sm" | "md";
}

const recipientStatusConfig: Record<
  RecipientStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  viewed: {
    label: "Viewed",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  signed: {
    label: "Signed",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  declined: {
    label: "Declined",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

export const RecipientStatusBadge = ({ status, size = "sm" }: RecipientStatusBadgeProps) => {
  const config = recipientStatusConfig[status] || recipientStatusConfig.pending;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
  };

  return (
    <Badge variant="outline" className={`${config.className} ${sizeClasses[size]} font-medium`}>
      {config.label}
    </Badge>
  );
};
