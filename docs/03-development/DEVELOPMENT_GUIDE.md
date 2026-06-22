# DEVELOPMENT_GUIDE.md - Development Workflows & Best Practices

**Last Updated**: December 18, 2025

This guide provides detailed development workflows, coding standards, best practices, and conventions for contributing to the SJ BD Dashboard project.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Code Style Guide](#code-style-guide)
4. [Component Development](#component-development)
5. [Hook Development](#hook-development)
6. [API Development](#api-development)
7. [Database Development](#database-development)
8. [Testing Guide](#testing-guide)
9. [Git Workflow](#git-workflow)
10. [Code Review Guidelines](#code-review-guidelines)
11. [Troubleshooting](#troubleshooting)
12. [Performance Optimization](#performance-optimization)

---

## Getting Started

### Prerequisites

```bash
# Required
- Node.js >= 18.0.0
- npm >= 9.0.0 (or bun >= 1.0.0)
- Git

# Recommended
- VS Code
- Supabase CLI
- GitHub CLI (gh)
```

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd sj-bd-dashboard

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env

# Edit .env with your credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
# PERPLEXITY_API_KEY=your-perplexity-key

# 4. Start development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:8080
```

### Project Structure Familiarization

```bash
# Explore key directories
ls src/pages/          # Page components
ls src/components/     # Reusable components
ls src/hooks/          # Custom React hooks
ls src/integrations/   # External service integrations
ls supabase/functions/ # Edge Functions

# Read key documentation
cat CLAUDE.md          # AI assistant guide
cat ARCHITECTURE.md    # Technical architecture
cat AGENTS.md          # AI agent development
```

---

## Development Environment

### VS Code Setup

**Recommended Extensions**:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "csstools.postcss",
    "ms-vscode.vscode-typescript-next",
    "supabase.supabase-vscode",
    "GitHub.copilot"
  ]
}
```

**Workspace Settings** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### Environment Configuration

**Required Environment Variables**:

```bash
# Supabase
VITE_SUPABASE_URL=         # Your Supabase project URL
VITE_SUPABASE_ANON_KEY=    # Your Supabase anon key

# Optional (for specific features)
PERPLEXITY_API_KEY=        # Perplexity AI integration
```

**Environment Files**:

- `.env` - Local development (not committed)
- `.env.local.example` - Template for required variables

### Development Scripts

```bash
# Development
npm run dev              # Start dev server (port 8080)

# Building
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run test             # Run tests

# Supabase (requires Supabase CLI)
supabase start           # Start local Supabase
supabase db reset        # Reset local database
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

---

## Code Style Guide

### TypeScript Style

#### Naming Conventions

```typescript
// PascalCase for types, interfaces, classes
interface UserProfile {
  id: string;
  name: string;
}

type CampaignStatus = 'draft' | 'active' | 'completed';

class CampaignManager {
  // ...
}

// camelCase for variables, functions, methods
const campaignId = 'abc123';
function getCampaignById(id: string) { /* ... */ }

// SCREAMING_SNAKE_CASE for constants
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';

// kebab-case for file names (if not React components)
// campaign-utils.ts
// deal-helpers.ts

// PascalCase for React component files
// CampaignList.tsx
// DealCard.tsx
```

#### Type Annotations

```typescript
// ✅ Explicit return types for functions
function calculateROI(spent: number, revenue: number): number {
  return ((revenue - spent) / spent) * 100;
}

// ✅ Interface over type for object shapes
interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
}

// ✅ Type for unions and utilities
type CampaignStatus = 'draft' | 'active' | 'completed';
type PartialCampaign = Partial<Campaign>;

// ✅ Discriminated unions for variants
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ✅ Generics for reusable types
interface ApiResponse<T> {
  data: T;
  error?: string;
}
```

#### Import Organization

```typescript
// 1. React & React-related
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Third-party libraries
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';

// 3. Internal imports (using @/ alias)
import { Button } from '@/components/ui/button';
import { useBDCampaigns } from '@/hooks/useBDCampaigns';
import { supabase } from '@/integrations/supabase/client';

// 4. Types
import type { Campaign } from '@/integrations/supabase/types';

// 5. Utilities
import { cn } from '@/lib/utils';
```

### React Component Style

#### Function Component Structure

```typescript
// ComponentName.tsx

// 1. Imports
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import type { Campaign } from '@/types';

// 2. Props interface
interface CampaignCardProps {
  campaign: Campaign;
  onEdit?: (id: string) => void;
  className?: string;
}

// 3. Component
export function CampaignCard({ campaign, onEdit, className }: CampaignCardProps) {
  // 3a. Hooks (state, queries, etc.)
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: details } = useQuery({
    queryKey: ['campaign-details', campaign.id],
    queryFn: () => fetchCampaignDetails(campaign.id),
    enabled: isExpanded,
  });

  // 3b. Effects
  useEffect(() => {
    if (isExpanded) {
      console.log('Expanded:', campaign.id);
    }
  }, [isExpanded, campaign.id]);

  // 3c. Event handlers
  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEdit = () => {
    onEdit?.(campaign.id);
  };

  // 3d. Derived values
  const statusColor = getStatusColor(campaign.status);

  // 3e. Early returns
  if (!campaign) return null;

  // 3f. Main render
  return (
    <div className={cn('p-4 border rounded', className)}>
      <h3>{campaign.name}</h3>
      <p className={statusColor}>{campaign.status}</p>
      <Button onClick={handleExpand}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </Button>
      {onEdit && (
        <Button onClick={handleEdit}>Edit</Button>
      )}
    </div>
  );
}

// 4. Helper functions (if component-specific)
function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-500';
    case 'draft': return 'text-gray-500';
    case 'completed': return 'text-blue-500';
    default: return 'text-gray-400';
  }
}
```

#### JSX Style

```typescript
// ✅ Good JSX practices

// 1. Use fragments when needed
<>
  <Header />
  <Content />
</>

// 2. Extract complex conditions
const shouldShowButton = isAdmin && hasPermission && !isDisabled;
return (
  <div>
    {shouldShowButton && <Button />}
  </div>
);

// 3. Use nullish coalescing for defaults
<p>{campaign.description ?? 'No description'}</p>

// 4. Destructure props early
const { name, status, assignee } = campaign;

// 5. Use semantic HTML
<article>
  <header>
    <h1>{title}</h1>
  </header>
  <main>
    {content}
  </main>
</article>

// 6. Consistent event handler naming
<Button onClick={handleClick} onSubmit={handleSubmit} />
```

### Tailwind CSS Style

```typescript
// ✅ Use utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h3 className="text-lg font-semibold text-gray-900">Title</h3>
  <Button className="bg-blue-500 hover:bg-blue-600">Action</Button>
</div>

// ✅ Use cn() for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  'p-4 rounded',
  isActive && 'bg-blue-100',
  isError && 'bg-red-100',
  className
)}>
  Content
</div>

// ✅ Extract repeated class combinations
const cardStyles = "p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition";
<div className={cardStyles}>Card 1</div>
<div className={cardStyles}>Card 2</div>

// ❌ Avoid inline styles
// <div style={{ color: 'red' }}>Bad</div>

// ✅ Use Tailwind instead
<div className="text-red-500">Good</div>
```

---

## Component Development

### Creating a New Component

**Step-by-step process**:

```bash
# 1. Determine component category
# UI component → src/components/ui/
# Domain component → src/components/bd/, src/components/admin/, etc.
# Feature component → src/features/<feature>/components/
# Page component → src/pages/

# 2. Create component file
# src/components/bd/CampaignStatusBadge.tsx

# 3. Follow component template (see above)

# 4. Add to barrel export if needed
# src/components/bd/index.ts
export { CampaignStatusBadge } from './CampaignStatusBadge';

# 5. Use component
import { CampaignStatusBadge } from '@/components/bd';
```

### Component Best Practices

#### 1. Single Responsibility

```typescript
// ❌ Component does too much
function CampaignManager() {
  // Fetches data
  // Renders list
  // Handles editing
  // Manages filters
  // Shows analytics
}

// ✅ Split into focused components
function CampaignList() { /* Renders list */ }
function CampaignFilters() { /* Manages filters */ }
function CampaignEditor() { /* Handles editing */ }
function CampaignAnalytics() { /* Shows analytics */ }

function CampaignManager() {
  return (
    <>
      <CampaignFilters />
      <CampaignList />
      <CampaignAnalytics />
    </>
  );
}
```

#### 2. Props Validation

```typescript
// ✅ Use TypeScript for prop validation
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick
}: ButtonProps) {
  // Implementation
}
```

#### 3. Memoization

```typescript
// ✅ Memoize expensive calculations
const sortedCampaigns = useMemo(() => {
  return campaigns.sort((a, b) => a.name.localeCompare(b.name));
}, [campaigns]);

// ✅ Memoize callbacks passed to child components
const handleEdit = useCallback((id: string) => {
  editCampaign(id);
}, [editCampaign]);

// ✅ Memoize components with React.memo
export const CampaignCard = React.memo(function CampaignCard({ campaign }) {
  // Only re-renders if campaign changes
});
```

#### 4. Error Boundaries

```typescript
// Create error boundary component
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <CampaignList />
</ErrorBoundary>
```

---

## Hook Development

### Creating Custom Hooks

**Template**:

```typescript
// src/hooks/useCampaignData.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import type { Campaign } from '@/integrations/supabase/types';

export function useCampaignData(campaignId: string) {
  const queryClient = useQueryClient();

  // Query
  const query = useQuery({
    queryKey: ['campaigns', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bd_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Campaign>) => {
      const { data, error } = await supabase
        .from('bd_campaigns')
        .update(updates)
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['campaigns', campaignId], data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Error updating campaign',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('bd_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['campaigns', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign deleted successfully' });
    }
  });

  return {
    campaign: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    delete: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
```

### Hook Best Practices

```typescript
// ✅ Hooks should be reusable
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ✅ Hooks should handle cleanup
export function useSubscription(channel: string) {
  useEffect(() => {
    const subscription = supabase
      .channel(channel)
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Change:', payload);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channel]);
}

// ✅ Hooks should provide useful return values
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return { value, toggle, setTrue, setFalse, setValue };
}
```

---

## API Development

### Edge Function Development

**Create new Edge Function**:

```bash
# 1. Create function
supabase functions new my-function

# 2. Edit supabase/functions/my-function/index.ts
# (see template below)

# 3. Test locally
supabase functions serve my-function

# 4. Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/my-function' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"param":"value"}'

# 5. Deploy
supabase functions deploy my-function
```

**Edge Function Template**:

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  param1: string;
  param2?: number;
}

interface ResponseBody {
  success: boolean;
  data?: any;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for admin operations
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { param1, param2 }: RequestBody = await req.json();

    // Validate input
    if (!param1) {
      throw new Error('param1 is required');
    }

    // Business logic
    const result = await processRequest(param1, param2);

    // Return success response
    const responseBody: ResponseBody = {
      success: true,
      data: result
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);

    const responseBody: ResponseBody = {
      success: false,
      error: error.message
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    });
  }
});

async function processRequest(param1: string, param2?: number) {
  // Implementation
  return { result: 'success' };
}
```

---

## Database Development

### Creating Migrations

```bash
# 1. Create new migration
supabase migration new add_campaign_tags

# 2. Edit migration file
# supabase/migrations/TIMESTAMP_add_campaign_tags.sql

# 3. Apply migration locally
supabase db reset

# 4. Test migration

# 5. Commit migration file

# 6. Apply to production (via Supabase dashboard or CLI)
```

**Migration Template**:

```sql
-- supabase/migrations/TIMESTAMP_add_campaign_tags.sql

-- Create table
CREATE TABLE IF NOT EXISTS campaign_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES bd_campaigns(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),

  UNIQUE(campaign_id, tag)
);

-- Create indexes
CREATE INDEX idx_campaign_tags_campaign_id ON campaign_tags(campaign_id);
CREATE INDEX idx_campaign_tags_tag ON campaign_tags(tag);

-- Enable RLS
ALTER TABLE campaign_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read campaign tags"
  ON campaign_tags FOR SELECT
  USING (true);

CREATE POLICY "Users can insert campaign tags"
  ON campaign_tags FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_permissions
      WHERE permission = 'manage_campaigns'
    )
  );

CREATE POLICY "Users can update own campaign tags"
  ON campaign_tags FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own campaign tags"
  ON campaign_tags FOR DELETE
  USING (created_by = auth.uid());

-- Grant permissions
GRANT ALL ON campaign_tags TO authenticated;

-- Add helpful comments
COMMENT ON TABLE campaign_tags IS 'Tags for organizing campaigns';
COMMENT ON COLUMN campaign_tags.tag IS 'Tag name (case-sensitive)';
```

---

## Testing Guide

### Writing Tests

```typescript
// tests/CampaignCard.test.tsx
import { describe, it, expect, beforeEach } from 'bun:test';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CampaignCard } from '@/components/bd/CampaignCard';

describe('CampaignCard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('renders campaign name', () => {
    const campaign = {
      id: '123',
      name: 'Test Campaign',
      status: 'active'
    };

    render(
      <QueryClientProvider client={queryClient}>
        <CampaignCard campaign={campaign} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Test Campaign')).toBeDefined();
  });

  it('calls onEdit when edit button clicked', () => {
    let editedId: string | undefined;
    const handleEdit = (id: string) => {
      editedId = id;
    };

    const campaign = {
      id: '123',
      name: 'Test Campaign',
      status: 'active'
    };

    render(
      <QueryClientProvider client={queryClient}>
        <CampaignCard campaign={campaign} onEdit={handleEdit} />
      </QueryClientProvider>
    );

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(editedId).toBe('123');
  });
});
```

---

## Git Workflow

### Branch Strategy

```bash
# Main branch: main (protected)
# Development branches: claude/<description>-<session-id>

# Create new branch
git checkout -b claude/add-new-feature-ABC123

# Make changes
# ...

# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: Add campaign tagging feature"

# Push to remote (with -u flag)
git push -u origin claude/add-new-feature-ABC123

# Create PR
gh pr create --title "feat: Add campaign tagging" --body "Description..."
```

### Commit Message Guidelines

**Format**: `<type>(<scope>): <subject>`

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

**Examples**:

```bash
feat(campaigns): Add tagging functionality
fix(deals): Resolve sync race condition
docs(readme): Update setup instructions
refactor(hooks): Extract campaign logic to useCampaignData
test(components): Add CampaignCard tests
```

---

## Code Review Guidelines

### Checklist

**For Authors**:

- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] TypeScript errors resolved
- [ ] Self-reviewed changes

**For Reviewers**:

- [ ] Code is readable
- [ ] Logic is correct
- [ ] Edge cases handled
- [ ] Performance considered
- [ ] Security issues checked
- [ ] Tests are adequate

---

## Troubleshooting

### Common Issues

**Issue**: TypeScript errors after pulling
**Solution**: Regenerate types

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

**Issue**: Supabase connection fails
**Solution**: Check environment variables in `.env`

**Issue**: Build fails
**Solution**: Clear cache and rebuild

```bash
rm -rf node_modules/.vite
npm run build
```

---

## Performance Optimization

### Tips

1. **Use React Query for caching**
2. **Memoize expensive computations**
3. **Lazy load heavy components**
4. **Optimize images**
5. **Use proper indexes on database tables**
6. **Minimize bundle size**

---

**For questions or issues, please consult**:

- `CLAUDE.md` - Main guide
- `ARCHITECTURE.md` - Architecture details
- `AGENTS.md` - AI agent guide
- GitHub Issues - Report bugs
