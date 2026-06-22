import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface EmailCellProps {
  contact: CampaignContact;
}

export function EmailCell({ contact }: EmailCellProps) {
  const [copied, setCopied] = useState(false);

  if (!contact.contact_email) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(contact.contact_email!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayEmail =
    contact.contact_email.length > 25
      ? `${contact.contact_email.slice(0, 25)}...`
      : contact.contact_email;

  return (
    <div className="flex items-center gap-1 group">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`mailto:${contact.contact_email}`}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {displayEmail}
            </a>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{contact.contact_email}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
