import { Card } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EducationCardProps {
  education?: string | null;
  highestDegree?: string | null;
}

export function EducationCard({ education, highestDegree }: EducationCardProps) {
  if (!education && !highestDegree) {
    return null;
  }

  const degrees = education ? education.split(';').map(d => d.trim()) : [];

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Education</h3>
            <p className="text-muted-foreground text-sm">Academic credentials</p>
          </div>
          {highestDegree && (
            <Badge variant="secondary">{highestDegree}</Badge>
          )}
        </div>

        {degrees.length > 0 && (
          <div className="space-y-2">
            {degrees.map((degree, idx) => (
              <div key={idx} className="pl-4 border-l-2 border-muted">
                <p className="text-sm">{degree}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
