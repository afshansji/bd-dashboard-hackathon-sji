---
name: supabase-patterns
description: "Supabase database and backend patterns for SJ BD Dashboard. Apply to ALL database work, migrations, RLS policies, Edge Functions, and queries."
---

# Supabase Patterns — SJ BD Dashboard

Apply these patterns to ALL database work in this project. No exceptions.

## Table Creation

### Naming
- Tables: `snake_case` (e.g., `campaign_contacts`, `deal_comments`)
- Columns: `snake_case` (e.g., `created_at`, `owner_id`)
- Foreign keys: `referenced_table_id` (e.g., `campaign_id`, `user_id`)
- Junction tables: `parent_child` (e.g., `project_task_labels`)

### Required Columns
Every table MUST have:
```sql
CREATE TABLE public.table_name (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- ... domain columns
);
```

### Timestamps
- Always `TIMESTAMPTZ` (not `TIMESTAMP`)
- Auto-update `updated_at` with trigger:
```sql
CREATE TRIGGER update_table_name_updated_at
  BEFORE UPDATE ON public.table_name
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Indexes
Add indexes for:
- Foreign key columns (`CREATE INDEX idx_table_fk ON table(fk_id)`)
- Frequently filtered columns (`status`, `type`, `email`)
- Columns used in ORDER BY
- Composite indexes for common query patterns

## RLS Policies (MANDATORY)

### EVERY table MUST have RLS enabled:
```sql
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
```

### Common Policy Patterns

**Pattern 1: Transparency (all authenticated users can view)**
```sql
-- Used for: DHS submissions, accountability goals, feedback
CREATE POLICY "Authenticated users can view" ON public.table_name
  FOR SELECT USING (auth.uid() IS NOT NULL);
```

**Pattern 2: Owner-based**
```sql
-- Used for: User-owned data
CREATE POLICY "Users can manage own records" ON public.table_name
  FOR ALL USING (auth.uid() = user_id);
```

**Pattern 3: Role-based (manager/admin)**
```sql
-- Used for: Admin operations, team management
CREATE POLICY "Managers can manage all" ON public.table_name
  FOR ALL USING (public.is_manager_or_admin());
```

**Pattern 4: Combined (owner + manager override)**
```sql
-- Used for: Goals, activities, tasks
CREATE POLICY "Owner or manager can manage" ON public.table_name
  FOR ALL USING (
    auth.uid() = user_id
    OR public.is_manager_or_admin()
  );
```

### Helper Function
```sql
-- Already exists in this project
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('manager', 'admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Role Hierarchy
```
super_admin > admin > manager > pm > user
```

## Edge Function Pattern

### Standard Template
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create Supabase client with user's JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Parse request
    const { action, ...params } = await req.json();

    // 4. Execute business logic
    let result;
    switch (action) {
      case "list":
        result = await handleList(supabase, params);
        break;
      case "create":
        result = await handleCreate(supabase, params);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // 5. Return success response
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // 6. Handle errors (don't leak internal details)
    console.error("Edge Function error:", error.message);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

### Shared Utilities
Located in `supabase/functions/_shared/` (12 modules):
- CORS headers
- Auth verification
- Error formatting
- Supabase client creation

## Migration Naming

Format: `YYYYMMDDHHMMSS_description.sql`

Example: `20260213120000_add_campaign_tags_table.sql`

### Migration Template
```sql
-- Migration: Add campaign_tags table
-- Purpose: Enable tagging campaigns for filtering and organization

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.campaign_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.bd_campaigns(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(campaign_id, tag_name)
);

-- 2. Enable RLS
ALTER TABLE public.campaign_tags ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Authenticated users can view tags"
  ON public.campaign_tags FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage tags"
  ON public.campaign_tags FOR ALL
  USING (public.is_manager_or_admin());

-- 4. Create indexes
CREATE INDEX idx_campaign_tags_campaign ON public.campaign_tags(campaign_id);

-- 5. Add updated_at trigger (if applicable)
```

## React Query Hook Pattern

### Standard Query Hook
```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCampaignContacts(campaignId: string) {
  return useQuery({
    queryKey: ['campaign_contacts', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_contacts')
        .select('*, contacts(*)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
}
```

### Standard Mutation Hook
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export function useCreateCampaignContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { campaign_id: string; contact_id: string }) => {
      const { data: result, error } = await supabase
        .from('campaign_contacts')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['campaign_contacts', variables.campaign_id],
      });
      toast({ title: "Contact added to campaign" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

### Key Rules

1. **Check `.error` before `.data`** — Supabase returns `{ data, error }`. Always check error first.
2. **Use query key conventions** — `[tableName]` for lists, `[tableName, id]` for single records.
3. **Invalidate on mutations** — Always invalidate related query keys after create/update/delete.
4. **Toast on success and error** — User feedback for every mutation.
5. **Use `enabled` for conditional queries** — Prevent fetching when dependencies aren't ready.
6. **Never use Supabase client directly in components** — Always through custom hooks in `src/hooks/`.

## Type Generation

After schema changes, regenerate types:
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
# Or from remote:
supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
```

## Existing Tables (92+ in THIS project)

### By Domain
- **Users**: profiles, users, user_roles, user_permissions, user_notifications, user_activity_log
- **Campaigns**: bd_campaigns, campaign_contacts, campaign_emails, campaign_sequences, sequence_steps, sequence_execution_log, contact_sequence_enrollments, campaign_financial_data, campaign_tags, campaign_import_jobs, campaign_contact_status_history, campaign_contact_comments, campaign_contact_linkedin_messages
- **Deals**: deals, deal_comments, deal_files, deal_checklist_items, deal_system_info
- **Clients**: clients, contacts, employees, leads
- **Tasks**: project_tasks, task_comments, task_comment_mentions, task_labels, project_task_labels, task_attachments, task_history
- **DHS**: dhs_submissions
- **Accountability**: accountability_quarters, accountability_team_goals, accountability_rep_goals, accountability_activities, accountability_weekly_updates
- **AI**: ai_agents, ai_agent_runs, ai_agent_templates, ai_shared_resources, ai_configurations, bd_weekly_reports
- **Signing**: signing_documents, signing_document_recipients, signing_document_activity_log, signing_document_watchers
- **Feedback**: feedback_reports, feedback_comments, feedback_upvotes
- **Integrations**: control_tower_sync_log, control_tower_health_snapshots, zerobounce_config, zerobounce_validations, pandadoc_integrations, gohighlevel_integrations, analytics_api_consumers
- **Other**: products, target_niches, marketing_efforts, pods, projects, followups, email_templates, sql_query_logs

## Edge Function Deployment
```bash
supabase functions deploy [function-name]
```
