import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface PhoneCellProps {
  contact: CampaignContact;
}

export function PhoneCell({ contact }: PhoneCellProps) {
  const [copied, setCopied] = useState(false);

  if (!contact.contact_phone) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(contact.contact_phone!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={handleCopy}
          >
            {copied ? (
              <span className="flex items-center gap-1">
                {contact.contact_phone}
                <Check className="h-3 w-3 text-green-500" />
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {contact.contact_phone}
                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Click to copy</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
