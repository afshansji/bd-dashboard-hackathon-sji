import { Edit, Trash2, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TargetNiche } from '@/hooks/useTargetNiches';

interface NicheCardProps {
  niche: TargetNiche;
  onEdit: (niche: TargetNiche) => void;
  onDelete: (id: string) => void;
}

export function NicheCard({ niche, onEdit, onDelete }: NicheCardProps) {
  const statusColors = {
    active: 'default',
    researching: 'secondary',
    paused: 'outline',
    retired: 'destructive',
  } as const;

  const priorityColors = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary',
  } as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {niche.name}
            </CardTitle>
            <CardDescription className="line-clamp-2">{niche.description}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(niche)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(niche.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Badge variant={statusColors[niche.status]}>{niche.status}</Badge>
          <Badge variant={priorityColors[niche.priority]}>{niche.priority} priority</Badge>
        </div>
        
        {niche.industries && niche.industries.length > 0 && (
          <div>
            <span className="text-sm font-medium">Industries:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {niche.industries.slice(0, 3).map((industry, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {industry}
                </Badge>
              ))}
              {niche.industries.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{niche.industries.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {niche.target_revenue && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Target:</span>
            <span className="font-medium">${niche.target_revenue.toLocaleString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
