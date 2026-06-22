import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Pod } from '@/hooks/usePods';
import { Product, ProductCategory, PricingModel } from '@/types/product';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  pods: Pod[];
  onSave: (data: Partial<Product>) => Promise<void>;
}

const CATEGORY_OPTIONS: ProductCategory[] = ['Software', 'Service', 'Consulting', 'Training', 'Other'];

const PRICING_OPTIONS: PricingModel[] = ['Fixed', 'Hourly', 'Monthly', 'Project-based', 'Custom'];

export function ProductDialog({ open, onOpenChange, product, pods, onSave }: ProductDialogProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'Software',
    description: '',
    pricing_model: undefined,
    owner_team: undefined,
    target_industries: [],
    google_drive_link: '',
    marketing_variant_link: '',
    is_active: true,
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ownerTeamOptions = useMemo(
    () => [...pods].sort((a, b) => a.name.localeCompare(b.name)),
    [pods],
  );

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        google_drive_link: product.google_drive_link || '',
        marketing_variant_link: product.marketing_variant_link || '',
      });
    } else {
      setFormData({
        name: '',
        category: 'Software',
        description: '',
        pricing_model: undefined,
        owner_team: undefined,
        target_industries: [],
        google_drive_link: '',
        marketing_variant_link: '',
        is_active: true,
      });
    }
    setActiveTab('basic');
  }, [product, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        target_industries: formData.target_industries?.filter((industry) => industry.trim().length > 0),
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save product', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArrayInput = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      target_industries: value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product or Service'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Details</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    placeholder="e.g., Drupal Support Package"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={(formData.category as ProductCategory) || 'Software'}
                    onValueChange={(value) => setFormData({ ...formData, category: value as ProductCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <div className="flex items-center gap-3 rounded-md border p-3">
                    <Switch
                      id="is_active"
                      checked={formData.is_active ?? true}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{formData.is_active ? 'Active' : 'Inactive'}</p>
                      <p className="text-xs text-muted-foreground">
                        Control whether this offering is visible to the team
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                    placeholder="Summarize the product's value proposition"
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricing_model">Pricing Model</Label>
                  <Select
                    value={formData.pricing_model ?? ''}
                    onValueChange={(value) =>
                      setFormData({ ...formData, pricing_model: value ? (value as PricingModel) : undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pricing model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Not specified</SelectItem>
                      {PRICING_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_team">Owner Team</Label>
                  <Select
                    value={formData.owner_team || ''}
                    onValueChange={(value) => setFormData({ ...formData, owner_team: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {ownerTeamOptions.map((pod) => (
                        <SelectItem key={pod.id} value={pod.id}>
                          {pod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="target_industries">Target Industries</Label>
                  <Input
                    id="target_industries"
                    value={formData.target_industries?.join(', ') || ''}
                    onChange={(event) => handleArrayInput(event.target.value)}
                    placeholder="e.g., Higher Education, Healthcare, Nonprofit"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google_drive_link">Google Drive Link</Label>
                  <Input
                    id="google_drive_link"
                    type="url"
                    value={formData.google_drive_link || ''}
                    onChange={(event) => setFormData({ ...formData, google_drive_link: event.target.value })}
                    placeholder="https://drive.google.com/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketing_variant_link">Marketing Variant Link</Label>
                  <Input
                    id="marketing_variant_link"
                    type="url"
                    value={formData.marketing_variant_link || ''}
                    onChange={(event) => setFormData({ ...formData, marketing_variant_link: event.target.value })}
                    placeholder="https://"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4 mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Attach supporting materials to help the team sell and deliver this offering. This section is optional and can
                  evolve as you gather more collateral.
                </p>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Suggested resources to include:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Sales decks or battle cards</li>
                    <li>Technical documentation or implementation guides</li>
                    <li>Demo environment links or case studies</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
