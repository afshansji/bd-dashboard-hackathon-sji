-- =====================================================
-- RLS Policy Fixes for Team Member Access
-- =====================================================

-- 1. user_accountability_chart - Allow users to manage their own entries
-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Users can manage own accountability" ON public.user_accountability_chart;
DROP POLICY IF EXISTS "Users can insert own accountability" ON public.user_accountability_chart;
DROP POLICY IF EXISTS "Users can update own accountability" ON public.user_accountability_chart;
DROP POLICY IF EXISTS "Users can delete own accountability" ON public.user_accountability_chart;
DROP POLICY IF EXISTS "Users can view own accountability" ON public.user_accountability_chart;

-- Create comprehensive policies for user_accountability_chart
CREATE POLICY "Users can view own accountability"
ON public.user_accountability_chart
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accountability"
ON public.user_accountability_chart
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accountability"
ON public.user_accountability_chart
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accountability"
ON public.user_accountability_chart
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. campaign_contact_comments - Add UPDATE policy
DROP POLICY IF EXISTS "Users can update own comments" ON public.campaign_contact_comments;

CREATE POLICY "Users can update own comments"
ON public.campaign_contact_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. campaign_contacts - Allow campaign owners and team members
DROP POLICY IF EXISTS "Team members can manage campaign contacts" ON public.campaign_contacts;
DROP POLICY IF EXISTS "Users can manage campaign contacts" ON public.campaign_contacts;

-- Allow users to SELECT contacts in campaigns they created or own
CREATE POLICY "Users can view campaign contacts"
ON public.campaign_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bd_campaigns 
    WHERE bd_campaigns.id = campaign_contacts.campaign_id
    AND (bd_campaigns.created_by = auth.uid() OR bd_campaigns.owned_by = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- Allow users to INSERT contacts in their campaigns
CREATE POLICY "Users can insert campaign contacts"
ON public.campaign_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bd_campaigns 
    WHERE bd_campaigns.id = campaign_contacts.campaign_id
    AND (bd_campaigns.created_by = auth.uid() OR bd_campaigns.owned_by = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- Allow users to UPDATE contacts in their campaigns
CREATE POLICY "Users can update campaign contacts"
ON public.campaign_contacts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bd_campaigns 
    WHERE bd_campaigns.id = campaign_contacts.campaign_id
    AND (bd_campaigns.created_by = auth.uid() OR bd_campaigns.owned_by = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- Allow users to DELETE contacts in their campaigns
CREATE POLICY "Users can delete campaign contacts"
ON public.campaign_contacts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bd_campaigns 
    WHERE bd_campaigns.id = campaign_contacts.campaign_id
    AND (bd_campaigns.created_by = auth.uid() OR bd_campaigns.owned_by = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- 4. deal_files - Allow deal owners and PMs to manage
DROP POLICY IF EXISTS "Users can manage deal files" ON public.deal_files;
DROP POLICY IF EXISTS "Deal owners can manage files" ON public.deal_files;

CREATE POLICY "Deal owners and PMs can view files"
ON public.deal_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals 
    WHERE deals.id = deal_files.deal_id
    AND (deals.owner_id = auth.uid() OR deals.pm_assigned_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Deal owners and PMs can insert files"
ON public.deal_files
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deals 
    WHERE deals.id = deal_files.deal_id
    AND (deals.owner_id = auth.uid() OR deals.pm_assigned_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Deal owners and PMs can update files"
ON public.deal_files
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals 
    WHERE deals.id = deal_files.deal_id
    AND (deals.owner_id = auth.uid() OR deals.pm_assigned_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Deal owners and PMs can delete files"
ON public.deal_files
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deals 
    WHERE deals.id = deal_files.deal_id
    AND (deals.owner_id = auth.uid() OR deals.pm_assigned_id = auth.uid())
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'manager')
);

-- 5. deal_reminders - Add UPDATE policy for creators
DROP POLICY IF EXISTS "Users can update own reminders" ON public.deal_reminders;

CREATE POLICY "Users can update own reminders"
ON public.deal_reminders
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 6. followup_suggestions - Add DELETE policy
DROP POLICY IF EXISTS "Users can delete own suggestions" ON public.followup_suggestions;

CREATE POLICY "Users can delete own suggestions"
ON public.followup_suggestions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7. ai_agent_runs - Allow users to create runs for agents they created
DROP POLICY IF EXISTS "Users can create agent runs" ON public.ai_agent_runs;

CREATE POLICY "Users can create agent runs"
ON public.ai_agent_runs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = executed_by
  OR EXISTS (
    SELECT 1 FROM public.ai_agents 
    WHERE ai_agents.id = ai_agent_runs.agent_id
    AND ai_agents.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);