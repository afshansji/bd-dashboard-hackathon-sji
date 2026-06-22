import { Card } from "@/components/ui/card";
import { Briefcase, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CurrentRoleCardProps {
  contact: {
    current_employer?: string | null;
    current_position_title?: string | null;
    years_in_current_role?: number | null;
    linkedin_about?: string | null;
  };
}

export function CurrentRoleCard({ contact }: CurrentRoleCardProps) {
  if (!contact.current_employer && !contact.current_position_title) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Current Role</h3>
            <p className="text-muted-foreground text-sm">Professional position</p>
          </div>
        </div>

        <div className="space-y-3">
          {contact.current_position_title && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Position</p>
              <p className="font-medium">{contact.current_position_title}</p>
            </div>
          )}

          {contact.current_employer && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Company</p>
              <p className="font-medium">{contact.current_employer}</p>
            </div>
          )}

          {contact.years_in_current_role && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">
                {contact.years_in_current_role.toFixed(1)} years in role
              </Badge>
            </div>
          )}
        </div>

        {contact.linkedin_about && (
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground line-clamp-4">
              {contact.linkedin_about}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
