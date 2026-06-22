import { Brain, Mail, Linkedin, Phone } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { CampaignContact } from '@/features/campaign-detail/types';

interface ContactInfoCellProps {
  contact: CampaignContact;
}

export function ContactInfoCell({ contact }: ContactInfoCellProps) {
  const displayTitle = contact.current_position_title || contact.contact_title;
  const displayCompany = contact.current_employer || contact.contact_company;
  
  return (
    <div className="flex items-start gap-3 min-w-0">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="text-sm font-medium">
          {contact.contact_name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 space-y-1">
        {/* Primary: Name */}
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm leading-tight truncate">
            {contact.contact_name}
          </p>
          
          {/* Available Data Icons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {contact.research_summary && (
              <Brain className="h-3 w-3 text-muted-foreground" />
            )}
            {contact.contact_email && (
              <Mail className="h-3 w-3 text-muted-foreground" />
            )}
            {contact.contact_linkedin_url && (
              <Linkedin className="h-3 w-3 text-muted-foreground" />
            )}
            {contact.contact_phone && (
              <Phone className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {/* Secondary: Title */}
        {displayTitle && (
          <p className="text-xs text-muted-foreground truncate">
            {displayTitle}
          </p>
        )}
        
        {/* Tertiary: Company + Metadata Badges */}
        {displayCompany && (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground truncate">
              {displayCompany}
            </p>
            
            {/* Metadata Badges */}
            {contact.total_years_experience && contact.total_years_experience > 5 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                {contact.total_years_experience} yrs
              </Badge>
            )}
            {contact.profile_completeness_score && contact.profile_completeness_score >= 75 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                {contact.profile_completeness_score}% profile
              </Badge>
            )}
            {contact.industry_focus && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 truncate max-w-[100px]">
                {contact.industry_focus}
              </Badge>
            )}
          </div>
        )}
        
        {/* Quaternary: LinkedIn Headline */}
        {contact.linkedin_headline && (
          <p className="text-xs text-muted-foreground italic line-clamp-1">
            "{contact.linkedin_headline.slice(0, 60)}{contact.linkedin_headline.length > 60 ? '...' : ''}"
          </p>
        )}
      </div>
    </div>
  );
}
