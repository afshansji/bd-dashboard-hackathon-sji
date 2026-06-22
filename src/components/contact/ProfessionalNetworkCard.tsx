import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Award } from "lucide-react";

interface ProfessionalNetworkCardProps {
  languages?: string[] | null;
  skills?: string[] | null;
}

export function ProfessionalNetworkCard({ languages, skills }: ProfessionalNetworkCardProps) {
  if (!languages?.length && !skills?.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Professional Network</h3>
            <p className="text-muted-foreground text-sm">Skills & languages</p>
          </div>
        </div>

        <div className="space-y-4">
          {languages && languages.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Languages
              </p>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang, idx) => (
                  <Badge key={idx} variant="secondary">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {skills && skills.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 12).map((skill, idx) => (
                  <Badge key={idx} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
