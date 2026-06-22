import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useControlTowerConfig } from '@/hooks/useControlTowerConfig';

interface ControlTowerLinkProps {
  path?: string;
  className?: string;
}

export function ControlTowerLink({ path = '', className }: ControlTowerLinkProps) {
  const { data: config } = useControlTowerConfig();
  
  if (!config?.url) return null;
  
  const fullUrl = `${config.url}${path}`;
  
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      asChild
    >
      <a href={fullUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="mr-2 h-4 w-4" />
        View in Control Tower
      </a>
    </Button>
  );
}
