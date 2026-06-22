import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar } from "lucide-react";

interface WorkExperience {
  company: string;
  title: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  description?: string;
  location?: string;
  is_current: boolean;
}

interface ExperienceTimelineCardProps {
  workHistory?: WorkExperience[];
  totalYears?: number | null;
}

export function ExperienceTimelineCard({ workHistory, totalYears }: ExperienceTimelineCardProps) {
  if (!workHistory || workHistory.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Professional Experience</h3>
              <p className="text-muted-foreground text-sm">Career history</p>
            </div>
          </div>
          {totalYears && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {totalYears} years total
            </Badge>
          )}
        </div>

        <div className="space-y-6 mt-6">
          {workHistory.map((exp, idx) => (
            <div key={idx} className="relative pl-6 pb-6 border-l-2 border-muted last:pb-0">
              <div className="absolute left-0 top-0 -translate-x-[9px] h-4 w-4 rounded-full bg-primary border-4 border-background" />
              
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold">{exp.title}</h4>
                    <p className="text-sm text-muted-foreground">{exp.company}</p>
                  </div>
                  {exp.is_current && (
                    <Badge variant="default" className="shrink-0">Current</Badge>
                  )}
                </div>

                {(exp.start_date || exp.duration) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {exp.start_date} - {exp.end_date || 'Present'}
                      {exp.duration && ` • ${exp.duration}`}
                    </span>
                  </div>
                )}

                {exp.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {exp.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
