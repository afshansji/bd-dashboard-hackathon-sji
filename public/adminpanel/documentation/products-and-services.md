# Products & Services Catalog

## Overview
The Products & Services module provides centralized management of SJ Innovation's service offerings within the Admin Panel. Designed for reusability across white-label platforms.

## Database Schema

### `products` Table
- `id` (UUID): Primary key
- `name` (TEXT): Product/service name
- `category` (TEXT): Service category (Software, Service, Consulting, Training, Other)
- `description` (TEXT): Detailed description
- `target_industries` (TEXT[]): Array of target industries
- `owner_team` (UUID): Responsible team/pod reference
- `pricing_model` (TEXT): Pricing structure (Fixed, Hourly, Monthly, Project-based, Custom)
- `is_active` (BOOLEAN): Active status
- `google_drive_link` (TEXT): Documentation link
- `marketing_variant_link` (TEXT): Marketing materials
- `created_at`, `updated_at`: Timestamps

## Default SJ Services

| Name | Category | Target Industry | Owner Team |
|------|----------|----------------|------------|
| OpenAI & ChatGPT Solutions | AI Development | Tech, Finance, Healthcare | BuildYourAI |
| Mobile App Development | App Engineering | Multiple sectors | Dev Team |
| AWS Cloud & DevOps Services | Infrastructure | Enterprise, SMB | CloudOps |
| Shopify E-Commerce Development | E-Commerce | Retail, D2C | Commerce Team |
| Custom Software & QA Testing | Software Development | All verticals | Engineering |

## Edge Functions

### `admin-products` (CRUD Operations)
**Endpoint:** `/functions/v1/admin-products`

**Methods:**
- `GET` - List all products (supports filtering by category, owner_team, is_active)
- `POST` - Create new product (requires admin role)
- `PUT` - Update product (requires admin role)
- `DELETE` - Archive product (requires admin role)

**Sample Request:**
```json
POST /functions/v1/admin-products
{
  "name": "AI Chatbot Development",
  "category": "Software",
  "description": "Custom AI chatbots using OpenAI GPT-5",
  "target_industries": ["Healthcare", "Finance", "Education"],
  "pricing_model": "Project-based",
  "owner_team": "uuid-of-pod",
  "is_active": true
}
```

## Admin Usage

### Add New Product
1. Navigate to `/adminpanel/strategy/products`
2. Click "Add Product" button
3. Fill in required fields:
   - Name (required)
   - Category (required)
   - Description
   - Target Industries (multi-select)
   - Pricing Model
   - Owner Team (select from PODs)
4. Optionally add:
   - Google Drive documentation link
   - Marketing variant link
5. Toggle "Active" status
6. Click "Save"

### Edit Product
1. Find product in DataTable
2. Click row to open detail drawer
3. Modify fields
4. Click "Update"

### Archive Product
1. Locate product in list
2. Click "Archive" button
3. Confirm action (sets `is_active = false`)

### Bulk Operations
- Export product list to CSV
- Bulk update owner teams
- Filter by category/team

## Access Control

### RLS Policies
- **View**: All authenticated users can view products
- **Create/Update/Delete**: Restricted to `super_admin`, `admin`, and `manager` roles

### Feature Flags
Controlled via `ai_configurations` table:
```json
{
  "configuration_type": "feature_flags",
  "configuration_data": {
    "products_enabled": true,
    "products_public_listing": false
  }
}
```

## Integration with Business Development

### Linking Products to Deals
When creating/editing deals, users can:
- Select related products/services from dropdown
- Auto-populate deal value based on pricing model
- Track which products generate most revenue

### Campaign Association
BD campaigns can target specific product offerings:
- Filter campaigns by product
- Track campaign performance per product
- Generate product-specific lead lists

## Review Checklist
- ☑ All 5 SJ services added to database
- ☑ Products visible in Admin Panel at `/adminpanel/strategy/products`
- ☑ CRUD operations functional via `admin-products` edge function
- ☑ Feature flags configured for products module
- ☑ RLS policies protecting data (view: all, manage: admin+)
- ☑ Products appear in deal creation/edit forms
- ☑ Documentation complete and accessible

## Future Enhancements (Roadmap)
- **Pricing Calculator**: Interactive tool to estimate project costs
- **Product Templates**: Pre-filled deal templates per product
- **Revenue Analytics**: Product performance dashboard
- **Client Portal**: Public-facing product catalog
- **Inventory Management**: Track service capacity/availability
