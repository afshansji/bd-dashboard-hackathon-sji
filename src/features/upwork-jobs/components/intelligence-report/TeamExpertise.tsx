import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamRoleRecommendation } from "../../types/intelligenceReport";

interface TeamExpertiseProps {
  roles: TeamRoleRecommendation[];
}

export function TeamExpertise({ roles }: TeamExpertiseProps) {
  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No specific team composition recommended from current job signals.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {roles.map((role) => (
        <Card key={role.role}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{role.role}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {role.reason}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
