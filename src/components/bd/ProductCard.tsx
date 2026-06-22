import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  ownerTeamName?: string;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleActive: (product: Product, nextValue: boolean) => void;
}

const statusBadgeVariant = (isActive: boolean) => (isActive ? 'default' : 'secondary');

export function ProductCard({ product, ownerTeamName, onEdit, onDelete, onToggleActive }: ProductCardProps) {
  const handleToggle = (checked: boolean) => {
    onToggleActive(product, checked);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold leading-tight">{product.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{product.category}</Badge>
              {product.pricing_model && <Badge variant="secondary">{product.pricing_model}</Badge>}
              {ownerTeamName && <span className="text-xs font-medium uppercase tracking-wide">{ownerTeamName}</span>}
            </div>
          </div>
          <Badge variant={statusBadgeVariant(product.is_active)}>{product.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{product.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {product.target_industries && product.target_industries.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Target Industries</p>
            <div className="flex flex-wrap gap-2">
              {product.target_industries.slice(0, 5).map((industry) => (
                <Badge key={industry} variant="secondary" className="text-xs font-medium">
                  {industry}
                </Badge>
              ))}
              {product.target_industries.length > 5 && (
                <Badge variant="secondary" className="text-xs font-medium">
                  +{product.target_industries.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          {ownerTeamName && (
            <p>
              <span className="font-medium text-foreground">Owner Team:</span> {ownerTeamName}
            </p>
          )}
          {product.google_drive_link && (
            <a
              href={product.google_drive_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Google Drive resources
            </a>
          )}
          {product.marketing_variant_link && (
            <a
              href={product.marketing_variant_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Marketing variant
            </a>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={product.is_active} onCheckedChange={handleToggle} id={`toggle-${product.id}`} />
          <LabelledStatus isActive={product.is_active} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(product)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function LabelledStatus({ isActive }: { isActive: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium leading-none">{isActive ? 'Active' : 'Inactive'}</p>
      <p className="text-xs text-muted-foreground">
        {isActive ? 'Visible to teams across BD' : 'Hidden while inactive'}
      </p>
    </div>
  );
}
