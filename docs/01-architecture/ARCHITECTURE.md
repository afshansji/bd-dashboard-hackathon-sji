# ARCHITECTURE.md - Technical Architecture Guide

**Last Updated**: December 18, 2025

This document provides a detailed technical overview of the SJ BD Dashboard architecture, including system design, data flow, integration patterns, and architectural decisions.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Technology Stack Deep Dive](#technology-stack-deep-dive)
4. [Data Architecture](#data-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Integration Architecture](#integration-architecture)
8. [Security Architecture](#security-architecture)
9. [Performance & Scalability](#performance--scalability)
10. [Deployment Architecture](#deployment-architecture)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  React SPA (Vite)                                               │
│  ├─ Pages & Components                                          │
│  ├─ Custom Hooks (TanStack Query)                               │
│  ├─ State Management (React Query Cache)                        │
│  └─ UI Components (Radix UI + shadcn/ui)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API/SERVICE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Supabase Platform                                              │
│  ├─ PostgreSQL Database (117 tables)                            │
│  ├─ Edge Functions (Deno runtime, 60+ functions)                │
│  ├─ Realtime Subscriptions                                      │
│  ├─ Authentication & Authorization (JWT + RLS)                  │
│  └─ Storage                                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   INTEGRATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  External Services                                              │
│  ├─ Control Tower (HubSpot CRM)                                 │
│  ├─ AI Services (OpenAI, Perplexity, Anthropic)                 │
│  ├─ Email (SendGrid)                                            │
│  ├─ Documents (PandaDoc)                                        │
│  ├─ Research (Exa.js)                                           │
│  ├─ Validation (ZeroBounce)                                     │
│  ├─ Marketing (GoHighLevel)                                     │
│  └─ Social (LinkedIn)                                           │
└─────────────────────────────────────────────────────────────────┘
```

### System Characteristics

- **Type**: Single Page Application (SPA)
- **Architecture**: Serverless (JAMstack)
- **Database**: PostgreSQL (via Supabase)
- **API Style**: REST + RPC + Realtime
- **Authentication**: JWT-based
- **Authorization**: Row-Level Security (RLS) + Role-Based Access Control (RBAC)
- **Deployment**: CDN + Edge Functions

---

## Architecture Diagrams

### Frontend Component Hierarchy

```
App.tsx (Router)
│
├─ AuthProvider (Context)
│  └─ useAuth hook
│
├─ QueryClientProvider (React Query)
│  └─ Query cache
│
├─ TooltipProvider (Radix UI)
│
├─ Layout / AdminLayout
│  ├─ Navigation
│  ├─ ProfileDropdown
│  └─ Outlet (nested routes)
│     │
│     ├─ Pages (src/pages/)
│     │  ├─ Dashboard pages
│     │  ├─ BD pages
│     │  ├─ Admin pages
│     │  └─ Analytics pages
│     │
│     └─ Components (src/components/)
│        ├─ UI components
│        ├─ Feature components
│        └─ Domain components
│
└─ Toaster (Notifications)
```

### Data Flow

```
Component
    │
    ├─ useQuery (Read)
    │   │
    │   └─> Custom Hook (src/hooks/)
    │        │
    │        └─> Supabase Client
    │             │
    │             └─> PostgreSQL Database
    │
    └─ useMutation (Write)
        │
        ├─> onMutate (Optimistic Update)
        │    └─> Update Query Cache
        │
        ├─> mutationFn (API Call)
        │    │
        │    ├─> Supabase Client (Direct DB)
        │    └─> Edge Function (Complex Logic)
        │         │
        │         └─> External APIs
        │
        ├─> onSuccess (Cache Invalidation)
        │    └─> Refetch Data
        │
        └─> onError (Rollback)
             └─> Restore Previous State
```

### Authentication Flow

```
User Login
    │
    ↓
Supabase Auth
    │
    ├─> Generate JWT
    │
    └─> Store in localStorage
         │
         ↓
    App Loads
         │
         ├─> Read JWT from storage
         │
         ├─> Validate with Supabase
         │
         ├─> Fetch user profile & role
         │    (from profiles + user_roles)
         │
         └─> Set auth context
              │
              ├─> Route protection
              │    (ProtectedRoute component)
              │
              └─> RLS policies apply
                   (Database level)
```

### Control Tower Sync Architecture

```
Dashboard (UI)
    │
    ├─ Trigger Sync
    │   (Manual or Scheduled)
    │
    ↓
Edge Function
(sync-control-tower-*)
    │
    ├─> Fetch from Control Tower API
    │    (HubSpot data)
    │
    ├─> Transform data
    │    (Map fields)
    │
    ├─> Upsert to Supabase
    │    (deals, clients, employees)
    │
    ├─> Log sync status
    │    (control_tower_sync_log)
    │
    └─> Update health metrics
         (control_tower_health_snapshots)
              │
              ↓
        Dashboard shows
        sync status & health
```

---

## Technology Stack Deep Dive

### Frontend Stack

#### React 18.3+
- **Concurrent Features**: Automatic batching, transitions
- **Server Components**: Not used (client-only SPA)
- **Hooks**: Extensive use of custom hooks for logic reuse

#### TypeScript 5.8+
- **Configuration**: Partial strict mode
  - `noImplicitAny: false` - Allow implicit any
  - `strictNullChecks: false` - Allow null/undefined
  - `skipLibCheck: true` - Skip library type checking
- **Path Aliases**: `@/*` maps to `src/*`

#### Vite 5.4+
- **Build Tool**: Fast HMR with SWC
- **Dev Server**: Port 8080, host `::`
- **Plugins**: React SWC, Lovable Tagger (dev only)

#### TanStack Query v5
- **Purpose**: Server state management
- **Features**:
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Infinite queries
  - Devtools integration
- **Configuration**: Custom `QueryClient` in `App.tsx`

#### Radix UI + shadcn/ui
- **Radix UI**: Unstyled, accessible primitives
- **shadcn/ui**: Pre-styled components using Radix
- **Customization**: Tailwind-based styling
- **Components**: 48 UI components in `src/components/ui/`

#### Tailwind CSS 3.4+
- **Configuration**: Custom theme in `tailwind.config.ts`
- **Plugins**: Typography, Animate
- **Utilities**: Custom utilities via `cn()` function

### Backend Stack

#### Supabase Platform
- **Database**: PostgreSQL 15+
- **Runtime**: Deno for Edge Functions
- **Auth**: Supabase Auth (GoTrue)
- **Storage**: S3-compatible storage
- **Realtime**: WebSocket subscriptions

#### PostgreSQL Database
- **Version**: 15+
- **Tables**: 117 tables
- **Extensions**:
  - `uuid-ossp` - UUID generation
  - `pgcrypto` - Encryption
  - `pg_stat_statements` - Query analytics
- **Features**:
  - Row-Level Security (RLS)
  - Triggers & Functions
  - Full-text search
  - JSONB columns

#### Deno Runtime
- **Version**: 1.37+
- **Purpose**: Edge Functions execution
- **Features**:
  - TypeScript native support
  - Top-level await
  - Web standard APIs
  - Secure by default

---

## Data Architecture

### Database Design Principles

1. **Normalization**: 3NF for most tables
2. **Denormalization**: Strategic denormalization for performance
3. **Soft Deletes**: Use `deleted_at` timestamps
4. **Audit Trails**: `created_at`, `updated_at` on all tables
5. **UUIDs**: Primary keys use UUIDs, not integers
6. **JSONB**: Flexible data stored in JSONB columns

### Table Categories

#### Core Domain Tables

**Business Development**
```sql
bd_campaigns
├─ id (uuid)
├─ name (text)
├─ status (text)
├─ target_niche_id (uuid) → target_niches
├─ assignee_id (uuid) → users
├─ created_at (timestamptz)
└─ metadata (jsonb)

campaign_contacts
├─ id (uuid)
├─ campaign_id (uuid) → bd_campaigns
├─ contact_id (uuid) → contacts
├─ status (text)
├─ assigned_to (uuid) → users
└─ enrichment_data (jsonb)

campaign_sequences
├─ id (uuid)
├─ campaign_id (uuid) → bd_campaigns
├─ name (text)
├─ trigger_event (text)
└─ is_active (boolean)

sequence_steps
├─ id (uuid)
├─ sequence_id (uuid) → campaign_sequences
├─ step_order (integer)
├─ template_id (uuid) → email_templates
└─ delay_hours (integer)
```

**Deal Management**
```sql
deals
├─ id (uuid)
├─ title (text)
├─ stage (text) -- prospecting, qualification, proposal, negotiation
├─ client_id (uuid) → clients
├─ assignee_id (uuid) → users
├─ deal_owner (uuid) → users
├─ estimated_value (numeric)
├─ close_date (date)
└─ hubspot_deal_id (text) -- Control Tower sync

deal_comments
├─ id (uuid)
├─ deal_id (uuid) → deals
├─ user_id (uuid) → users
├─ content (text)
├─ mentions (uuid[]) -- @mentioned user IDs
└─ created_at (timestamptz)

deal_checklist_items
├─ id (uuid)
├─ deal_id (uuid) → deals
├─ template_item_id (uuid) → checklist_template_items
├─ title (text)
├─ is_completed (boolean)
└─ completed_by (uuid) → users
```

**Client Management**
```sql
clients
├─ id (uuid)
├─ name (text)
├─ slug (text) UNIQUE
├─ industry (text)
├─ company_size (text)
├─ hubspot_company_id (text)
└─ intelligence_data (jsonb)

contacts
├─ id (uuid)
├─ client_id (uuid) → clients
├─ first_name (text)
├─ last_name (text)
├─ email (text)
├─ linkedin_url (text)
└─ linkedin_data (jsonb)
```

#### Integration Tables

**Control Tower Sync**
```sql
control_tower_sync_log
├─ id (uuid)
├─ sync_type (text) -- full, deals, employees, clients
├─ status (text) -- running, completed, failed
├─ records_synced (integer)
├─ started_at (timestamptz)
└─ completed_at (timestamptz)

control_tower_health_snapshots
├─ id (uuid)
├─ timestamp (timestamptz)
├─ connection_status (text)
├─ last_successful_sync (timestamptz)
├─ pending_sync_count (integer)
└─ error_count (integer)
```

**AI & Automation**
```sql
ai_agents
├─ id (uuid)
├─ name (text)
├─ type (text) -- research, evaluation, content_generation
├─ provider (text) -- openai, perplexity, anthropic
├─ config (jsonb)
└─ created_by (uuid) → users

ai_agent_runs
├─ id (uuid)
├─ agent_id (uuid) → ai_agents
├─ input (jsonb)
├─ output (jsonb)
├─ status (text)
├─ execution_time_ms (integer)
└─ created_at (timestamptz)
```

### Row-Level Security (RLS)

All tables have RLS enabled with policies like:

```sql
-- Read: Users can read records they have access to
CREATE POLICY "Users can read accessible campaigns"
  ON bd_campaigns FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_permissions
      WHERE permission = 'view_all_campaigns'
    )
    OR assignee_id = auth.uid()
  );

-- Write: Users can update their assigned records
CREATE POLICY "Users can update assigned campaigns"
  ON bd_campaigns FOR UPDATE
  USING (assignee_id = auth.uid())
  WITH CHECK (assignee_id = auth.uid());

-- Admin override: Admins can do anything
CREATE POLICY "Admins can do anything"
  ON bd_campaigns FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

### Indexing Strategy

```sql
-- Frequently queried fields
CREATE INDEX idx_campaigns_status ON bd_campaigns(status);
CREATE INDEX idx_campaigns_assignee ON bd_campaigns(assignee_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_assignee ON deals(assignee_id);

-- Composite indexes for common queries
CREATE INDEX idx_campaigns_status_assignee
  ON bd_campaigns(status, assignee_id);

-- Full-text search
CREATE INDEX idx_campaigns_search
  ON bd_campaigns USING GIN (to_tsvector('english', name || ' ' || description));

-- JSONB indexes
CREATE INDEX idx_campaign_metadata
  ON bd_campaigns USING GIN (metadata);
```

---

## Frontend Architecture

### Component Architecture

#### Component Categories

1. **Pages** (`src/pages/`)
   - Route-level components
   - Data fetching orchestration
   - Layout composition

2. **Features** (`src/features/`)
   - Domain-specific feature modules
   - Self-contained with own components/hooks/types
   - Examples: `collabai`, `campaign-detail`, `pipeline`

3. **Components** (`src/components/`)
   - Reusable UI components
   - Business logic components
   - Organized by domain (bd, admin, ai, etc.)

4. **UI Components** (`src/components/ui/`)
   - Design system primitives
   - Based on shadcn/ui
   - No business logic

#### Component Patterns

**Container/Presenter Pattern**
```typescript
// Container: Handles data & logic
function CampaignListContainer() {
  const { data, isLoading, error } = useBDCampaigns();

  if (isLoading) return <CampaignListSkeleton />;
  if (error) return <ErrorState error={error} />;

  return <CampaignList campaigns={data} />;
}

// Presenter: Renders UI
interface CampaignListProps {
  campaigns: Campaign[];
}

function CampaignList({ campaigns }: CampaignListProps) {
  return (
    <div className="grid gap-4">
      {campaigns.map(campaign => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
```

**Compound Components Pattern**
```typescript
// Used for complex UI components
<Dialog>
  <DialogTrigger>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogBody>Content</DialogBody>
    <DialogFooter>
      <Button>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### State Management

#### Server State (TanStack Query)

```typescript
// Query keys follow hierarchical structure
['campaigns'] // All campaigns
['campaigns', campaignId] // Specific campaign
['campaigns', campaignId, 'contacts'] // Campaign contacts

// Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});
```

#### Client State (React Hooks)

```typescript
// Local component state
const [isOpen, setIsOpen] = useState(false);

// Form state (React Hook Form)
const form = useForm<FormData>({
  defaultValues: { /* ... */ }
});

// URL state (React Router)
const [searchParams, setSearchParams] = useSearchParams();
```

#### Context State (React Context)

```typescript
// Auth context (useAuth)
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, /* ... */ }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Routing Architecture

```typescript
// Hierarchical route structure
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<Login />} />

  {/* Protected routes with nested layouts */}
  <Route path="/bd/*" element={
    <ProtectedRoute requiredMinimumRole="team_member">
      <Layout />
    </ProtectedRoute>
  }>
    <Route index element={<Navigate to="/bd/dashboard" />} />
    <Route path="dashboard" element={<BDDashboard />} />

    {/* Nested routes */}
    <Route path="campaigns">
      <Route index element={<CampaignManagement />} />
      <Route path=":slug" element={<CampaignDetail />} />
      <Route path=":slug/roi" element={<CampaignROI />} />
    </Route>
  </Route>

  {/* Admin routes */}
  <Route path="/adminpanel/*" element={
    <ProtectedRoute requiredMinimumRole="admin">
      <AdminLayout />
    </ProtectedRoute>
  }>
    {/* Admin routes */}
  </Route>
</Routes>
```

---

## Backend Architecture

### Edge Functions Architecture

#### Function Structure

```typescript
// Standard function template
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader);

    // Parse request
    const { param1, param2 } = await req.json();

    // Business logic
    const result = await processRequest(param1, param2);

    // Return response
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
```

#### Function Categories

**1. Data Operations** (`admin-campaigns`, `admin-users`)
- CRUD operations with complex business logic
- Data validation
- Audit logging

**2. AI Operations** (`run-ai-agent`, `generate-followup-suggestions`)
- AI provider integration
- Provider fallback chain
- Token usage tracking

**3. Integration Operations** (`sync-control-tower-*`, `pandadoc-*`)
- External API calls
- Data transformation
- Error handling & retries

**4. Email Operations** (`send-campaign-email`, `lead-email-automation`)
- SendGrid integration
- Template rendering
- Delivery tracking

**5. Scheduled Operations** (Cron jobs)
- Background processing
- Data cleanup
- Health monitoring

### API Design Patterns

#### RPC Functions

```sql
-- Complex calculations in database
CREATE OR REPLACE FUNCTION calculate_campaign_roi(campaign_id UUID)
RETURNS TABLE (
  total_spent NUMERIC,
  total_revenue NUMERIC,
  roi_percentage NUMERIC,
  deals_won INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(cf.amount), 0) as total_spent,
    COALESCE(SUM(d.final_value), 0) as total_revenue,
    CASE
      WHEN SUM(cf.amount) > 0 THEN
        ((SUM(d.final_value) - SUM(cf.amount)) / SUM(cf.amount)) * 100
      ELSE 0
    END as roi_percentage,
    COUNT(d.id) FILTER (WHERE d.stage = 'won') as deals_won
  FROM bd_campaigns c
  LEFT JOIN campaign_financial_data cf ON cf.campaign_id = c.id
  LEFT JOIN deals d ON d.campaign_id = c.id
  WHERE c.id = campaign_id
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql;
```

#### Realtime Subscriptions

```typescript
// Subscribe to table changes
const channel = supabase
  .channel('campaigns-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'bd_campaigns'
    },
    (payload) => {
      console.log('Change received!', payload);
      // Update UI
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  )
  .subscribe();

// Cleanup
return () => {
  channel.unsubscribe();
};
```

---

## Integration Architecture

### Control Tower (HubSpot) Integration

**Architecture**:
```
Dashboard → Edge Function → Control Tower REST API → HubSpot
     ↑                                                   ↓
     └─────────── Sync Data ←──────────────────────────┘
```

**Sync Strategy**:
- **Full Sync**: Every 24 hours (scheduled)
- **Incremental Sync**: On-demand (user-triggered)
- **Real-time Updates**: Webhooks (planned)

**Data Mapping**:
```typescript
// HubSpot Deal → Supabase Deal
{
  hubspot_deal_id: deal.id,
  title: deal.properties.dealname,
  stage: mapHubSpotStageToInternal(deal.properties.dealstage),
  estimated_value: deal.properties.amount,
  close_date: deal.properties.closedate,
  // ...
}
```

### AI Provider Integration

**Provider Chain**:
```typescript
async function runWithProviderChain(prompt: string) {
  const providers = ['openai', 'perplexity', 'anthropic'];

  for (const provider of providers) {
    try {
      return await callAIProvider(provider, prompt);
    } catch (error) {
      console.error(`${provider} failed:`, error);
      // Try next provider
    }
  }

  throw new Error('All AI providers failed');
}
```

**Use Cases**:
- **OpenAI**: Content generation, embeddings, research
- **Perplexity**: Real-time web research
- **Anthropic**: Complex reasoning, analysis

### Email Integration (SendGrid)

**Flow**:
```
Campaign → Sequence → Step → Template → SendGrid → Recipient
                                           ↓
                                    Delivery Tracking
                                           ↓
                                  sequence_execution_log
```

**Features**:
- Template variables
- Personalization
- Tracking (opens, clicks)
- Bounce handling

---

## Security Architecture

### Authentication

**JWT-Based Authentication**:
```
User Login
    ↓
Supabase Auth
    ↓
Generate JWT
    ↓
Store in localStorage
    ↓
Include in all requests (Authorization header)
```

### Authorization

**Multi-Level Authorization**:

1. **Application Level** (React)
   ```typescript
   <ProtectedRoute requiredMinimumRole="admin">
     <AdminPanel />
   </ProtectedRoute>
   ```

2. **Database Level** (RLS)
   ```sql
   CREATE POLICY "policy_name"
     ON table_name
     USING (auth.uid() = user_id);
   ```

3. **Function Level** (Edge Functions)
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error('Unauthorized');
   ```

### Role Hierarchy

```
super_admin  (Full access)
    ↓
admin        (Admin access)
    ↓
manager      (Management access)
    ↓
team_member  (Basic access)
```

### Data Security

- **Encryption at Rest**: PostgreSQL encryption
- **Encryption in Transit**: TLS/HTTPS
- **API Keys**: Environment variables, not committed
- **RLS**: Database-level access control
- **Input Validation**: Zod schemas
- **XSS Protection**: React auto-escaping
- **CSRF Protection**: JWT tokens

---

## Performance & Scalability

### Frontend Performance

**Code Splitting**:
```typescript
// Lazy load heavy components
const Documentation = lazy(() => import('./pages/admin/Documentation'));

<Suspense fallback={<div>Loading...</div>}>
  <Documentation />
</Suspense>
```

**Caching Strategy**:
```typescript
// TanStack Query caching
queryClient.setQueryDefaults(['campaigns'], {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

**Optimistic Updates**:
```typescript
// Immediate UI update
onMutate: async (newData) => {
  await queryClient.cancelQueries({ queryKey: ['campaigns'] });
  const previous = queryClient.getQueryData(['campaigns']);
  queryClient.setQueryData(['campaigns'], old => [...old, newData]);
  return { previous };
},
```

### Backend Performance

**Database Optimization**:
- Proper indexing
- Query optimization
- Connection pooling
- RLS policy optimization

**Edge Function Optimization**:
- Cold start minimization
- Deno runtime efficiency
- Streaming responses for large data

### Scalability Considerations

**Horizontal Scaling**:
- Stateless Edge Functions
- CDN for static assets
- Database read replicas (future)

**Vertical Scaling**:
- Database compute upgrades
- Increased function memory

---

## Deployment Architecture

### Frontend Deployment

```
Code Changes
    ↓
Git Push
    ↓
Lovable Platform / Vercel / Netlify
    ↓
Build (npm run build)
    ↓
Deploy to CDN
    ↓
HTTPS endpoint
```

### Backend Deployment

```
Edge Function Changes
    ↓
supabase functions deploy
    ↓
Deno runtime
    ↓
HTTPS endpoint
```

### Database Migrations

```
New Migration
    ↓
supabase/migrations/*.sql
    ↓
supabase db push
    ↓
Applied to database
    ↓
Regenerate types
```

### CI/CD Pipeline

```
Git Push
    ↓
Run Tests
    ↓
TypeScript Check
    ↓
Build
    ↓
Deploy (if on main branch)
```

---

## Architectural Decisions

### Key Decisions & Rationale

1. **SPA over SSR/SSG**
   - **Reason**: Rich interactivity, real-time updates
   - **Trade-off**: Initial load time vs runtime performance

2. **Supabase over Custom Backend**
   - **Reason**: Faster development, managed infrastructure
   - **Trade-off**: Vendor lock-in vs development speed

3. **TanStack Query over Redux**
   - **Reason**: Built for async data, less boilerplate
   - **Trade-off**: Server-focused vs general state

4. **shadcn/ui over Component Library**
   - **Reason**: Customizable, copy-paste approach
   - **Trade-off**: Maintenance vs flexibility

5. **Edge Functions over Traditional API**
   - **Reason**: Scalability, global distribution
   - **Trade-off**: Cold starts vs scalability

6. **RLS over Application-Level Auth**
   - **Reason**: Security at database level
   - **Trade-off**: Complexity vs security

---

**This architecture is designed for:**
- ✅ Rapid development
- ✅ High scalability
- ✅ Strong security
- ✅ Real-time capabilities
- ✅ Modern developer experience

**Future improvements:**
- [ ] GraphQL layer for complex queries
- [ ] Offline-first capabilities
- [ ] Enhanced caching strategies
- [ ] Microservices for heavy processing
- [ ] Advanced monitoring & observability
