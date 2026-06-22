import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  description?: string;
  children?: ReactNode;
}

export default function KPICard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon, 
  description,
  children 
}: KPICardProps) {
  const getTrendIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="transition-smooth hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <div className="text-white [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-xs font-medium ${getTrendColor()}`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
              {description && (
                <span className="text-xs text-muted-foreground">
                  {description}
                </span>
              )}
            </div>
          )}
          
          {children}
        </div>
      </CardContent>
    </Card>
  );
}