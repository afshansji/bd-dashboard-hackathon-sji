-- Add new columns to ai_agents for usage context
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS usage_location TEXT,
ADD COLUMN IF NOT EXISTS usage_route TEXT,
ADD COLUMN IF NOT EXISTS min_role_required public.app_role DEFAULT 'team_member',
ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS use_cases JSONB DEFAULT '[]'::jsonb;

-- Create agent_views table to track engagement
CREATE TABLE public.agent_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_views ENABLE ROW LEVEL SECURITY;

-- Users can insert their own views
CREATE POLICY "Users can record their own agent views"
ON public.agent_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own views, managers+ can view all
CREATE POLICY "Users can view agent views based on role"
ON public.agent_views
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
);

-- Create index for faster queries
CREATE INDEX idx_agent_views_agent_id ON public.agent_views(agent_id);
CREATE INDEX idx_agent_views_user_id ON public.agent_views(user_id);
CREATE INDEX idx_agent_views_viewed_at ON public.agent_views(viewed_at DESC);

-- Populate existing agents with usage context
UPDATE public.ai_agents SET
    usage_location = 'Campaign Contact Detail page > Research Actions',
    usage_route = '/bd/campaigns',
    min_role_required = 'team_member',
    benefits = '["Saves 2-3 hours of manual research per lead", "Provides 10 key insights automatically", "Identifies engagement opportunities"]'::jsonb,
    use_cases = '["Before initial outreach to a new lead", "When preparing for a discovery call", "To find talking points based on recent activity"]'::jsonb
WHERE slug = 'bd-research-analyst';

UPDATE public.ai_agents SET
    usage_location = 'LinkedIn Agent Config (Admin Settings)',
    usage_route = '/admin/linkedin-agent',
    min_role_required = 'admin',
    benefits = '["Batch enriches contacts with company data", "Calculates lead quality scores", "Reduces manual data entry by 90%"]'::jsonb,
    use_cases = '["After importing new contacts to a campaign", "To prioritize leads by quality score", "Before launching outreach sequences"]'::jsonb
WHERE slug = 'lead-auto-enrichment-agent';

UPDATE public.ai_agents SET
    usage_location = 'Deal Detail page > Quick Actions',
    usage_route = '/bd/pipeline',
    min_role_required = 'team_member',
    benefits = '["Summarizes meeting notes in seconds", "Identifies next steps automatically", "Tracks deal momentum over time"]'::jsonb,
    use_cases = '["After a client call to update deal status", "During pipeline reviews", "To identify stalled deals"]'::jsonb
WHERE slug = 'deal-status-intelligence';

UPDATE public.ai_agents SET
    usage_location = 'Client Detail page > Intelligence Tab',
    usage_route = '/bd/clients',
    min_role_required = 'team_member',
    benefits = '["Strategic insights from all client data", "Identifies upsell opportunities", "Prepares you for client meetings"]'::jsonb,
    use_cases = '["Before quarterly business reviews", "When exploring expansion opportunities", "To understand client pain points"]'::jsonb
WHERE slug = 'client-intelligence-assistant';

UPDATE public.ai_agents SET
    usage_location = 'Deal Detail page > Quick Actions',
    usage_route = '/bd/pipeline',
    min_role_required = 'team_member',
    benefits = '["Instant answers from deal documents", "No more searching through files", "Extracts key terms and conditions"]'::jsonb,
    use_cases = '["When asked about contract terms during a call", "To compare pricing across proposals", "To find specific clauses quickly"]'::jsonb
WHERE slug = 'document-qa-assistant';

UPDATE public.ai_agents SET
    usage_location = 'Deal Detail page > Quick Actions',
    usage_route = '/bd/pipeline',
    min_role_required = 'manager',
    benefits = '["Identifies pipeline bottlenecks", "Forecasts deal outcomes", "Recommends focus areas"]'::jsonb,
    use_cases = '["During weekly pipeline reviews", "When planning resource allocation", "To identify at-risk deals"]'::jsonb
WHERE slug = 'deal-pipeline-analyzer';

UPDATE public.ai_agents SET
    usage_location = 'Campaign Contact Detail page',
    usage_route = '/bd/campaigns',
    min_role_required = 'team_member',
    benefits = '["Analyzes LinkedIn engagement patterns", "Recommends optimal follow-up timing", "Scores lead interest level"]'::jsonb,
    use_cases = '["Before following up with a lead", "To prioritize daily outreach", "When a lead goes cold"]'::jsonb
WHERE slug = 'linkedin-lead-analyzer';

UPDATE public.ai_agents SET
    usage_location = 'Campaign Outreach > Message Generator',
    usage_route = '/bd/campaigns',
    min_role_required = 'team_member',
    benefits = '["Personalized messages in 5 seconds", "Multiple variants to choose from", "Based on lead research data"]'::jsonb,
    use_cases = '["For initial LinkedIn connection requests", "When crafting follow-up messages", "To A/B test different approaches"]'::jsonb
WHERE slug = 'linkedin-message-generator';

UPDATE public.ai_agents SET
    usage_location = 'Deal Detail page > Quick Actions',
    usage_route = '/bd/pipeline',
    min_role_required = 'team_member',
    benefits = '["Finds gaps in proposals automatically", "Compares against requirements", "Suggests improvements"]'::jsonb,
    use_cases = '["Before submitting a proposal", "When client raises concerns", "To strengthen competitive positioning"]'::jsonb
WHERE slug = 'proposal-gap-analysis';

UPDATE public.ai_agents SET
    usage_location = 'Deal Detail page > Quick Actions',
    usage_route = '/bd/pipeline',
    min_role_required = 'team_member',
    benefits = '["Evidence-based objection responses", "Uses your deal context", "Builds on successful patterns"]'::jsonb,
    use_cases = '["When client raises pricing concerns", "To address competitor comparisons", "During negotiation prep"]'::jsonb
WHERE slug = 'client-objection-handler';

UPDATE public.ai_agents SET
    usage_location = 'Admin Reports > Scheduled Insights',
    usage_route = '/admin/ai-agents',
    min_role_required = 'manager',
    benefits = '["Weekly digest of BD performance", "Highlights wins and risks", "Actionable recommendations"]'::jsonb,
    use_cases = '["For weekly team meetings", "Executive reporting", "Trend analysis over time"]'::jsonb
WHERE slug = 'bd-weekly-insights';