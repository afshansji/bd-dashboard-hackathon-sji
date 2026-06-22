import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, CheckCircle2 } from "lucide-react";

interface LinkedInProfileCardProps {
  contact: {
    contact_name: string;
    linkedin_headline?: string | null;
    linkedin_location?: string | null;
    linkedin_follower_count?: number | null;
    linkedin_connection_count?: number | null;
    linkedin_profile_image_url?: string | null;
    profile_completeness_score?: number | null;
  };
}

export function LinkedInProfileCard({ contact }: LinkedInProfileCardProps) {
  const getCompletenessColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCompletenessLabel = (score: number) => {
    if (score >= 80) return "Complete";
    if (score >= 50) return "Moderate";
    return "Limited";
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={contact.linkedin_profile_image_url || undefined} />
          <AvatarFallback className="text-lg">
            {contact.contact_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-semibold">{contact.contact_name}</h3>
            {contact.linkedin_headline && (
              <p className="text-sm text-muted-foreground mt-1">
                {contact.linkedin_headline}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {contact.linkedin_location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{contact.linkedin_location}</span>
              </div>
            )}
            {contact.linkedin_connection_count && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{contact.linkedin_connection_count.toLocaleString()} connections</span>
              </div>
            )}
          </div>

          {contact.profile_completeness_score !== null && contact.profile_completeness_score !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Profile:</span>
              </div>
              <Badge variant="outline" className="gap-1">
                <div className={`h-2 w-2 rounded-full ${getCompletenessColor(contact.profile_completeness_score)}`} />
                {getCompletenessLabel(contact.profile_completeness_score)} ({contact.profile_completeness_score}%)
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
