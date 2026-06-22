export type ProductCategory =
  | 'Software'
  | 'Service'
  | 'Consulting'
  | 'Training'
  | 'Other';

export type PricingModel =
  | 'Fixed'
  | 'Hourly'
  | 'Monthly'
  | 'Project-based'
  | 'Custom';

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  pricing_model?: PricingModel;
  target_industries?: string[];
  owner_team?: string;
  google_drive_link?: string;
  marketing_variant_link?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  search?: string;
  category?: ProductCategory;
  owner_team?: string;
  is_active?: boolean;
}

export interface CreateProductData {
  name: string;
  description?: string;
  category: ProductCategory;
  pricing_model?: PricingModel;
  target_industries?: string[];
  owner_team?: string;
  google_drive_link?: string;
  marketing_variant_link?: string;
  is_active?: boolean;
}

export type UpdateProductData = Partial<CreateProductData> & { id: string };
