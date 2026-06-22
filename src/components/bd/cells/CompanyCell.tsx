import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface CompanyCellProps {
  contact: CampaignContact;
}

export function CompanyCell({ contact }: CompanyCellProps) {
  const company = contact.current_employer || contact.contact_company;

  if (!company) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const isTruncated = company.length > 25;
  const displayCompany = isTruncated ? `${company.slice(0, 25)}...` : company;

  // If contact has a company_id, make it clickable
  if (contact.company_id) {
    // For now, use company_id since we don't have slug in the contact data
    // TODO: When company data is joined, use company slug
    const companyLink = `/companies/${contact.company_id}`;
    
    if (isTruncated) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link 
                to={companyLink}
                className="text-sm text-primary hover:underline cursor-pointer"
              >
                {displayCompany}
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{company}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <Link 
        to={companyLink}
        className="text-sm text-primary hover:underline"
      >
        {company}
      </Link>
    );
  }

  // No company_id, show as regular text
  if (isTruncated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground cursor-default">
              {displayCompany}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{company}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className="text-sm text-muted-foreground">{company}</span>;
}
