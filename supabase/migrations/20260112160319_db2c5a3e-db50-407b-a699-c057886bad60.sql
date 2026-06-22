-- Fix nullable created_by/owned_by columns that break RLS INSERT policies
-- Add triggers to auto-set these values like we did for project_tasks

-- 1. Fix bd_campaigns: Add trigger to auto-set created_by and owned_by
CREATE OR REPLACE FUNCTION public.set_campaign_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  IF NEW.owned_by IS NULL THEN
    NEW.owned_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_campaign_created_by_trigger ON public.bd_campaigns;
CREATE TRIGGER set_campaign_created_by_trigger
  BEFORE INSERT ON public.bd_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_created_by();

-- 2. Fix ai_agents: Add trigger to auto-set created_by
CREATE OR REPLACE FUNCTION public.set_agent_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_agent_created_by_trigger ON public.ai_agents;
CREATE TRIGGER set_agent_created_by_trigger
  BEFORE INSERT ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_agent_created_by();

-- 3. Fix email_templates: Add trigger to auto-set created_by
CREATE OR REPLACE FUNCTION public.set_email_template_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_email_template_created_by_trigger ON public.email_templates;
CREATE TRIGGER set_email_template_created_by_trigger
  BEFORE INSERT ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_email_template_created_by();

-- 4. Fix tasks table: Add trigger to auto-set created_by
CREATE OR REPLACE FUNCTION public.set_tasks_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tasks_created_by_trigger ON public.tasks;
CREATE TRIGGER set_tasks_created_by_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tasks_created_by();

-- 5. Fix leads table: Add trigger to auto-set created_by
CREATE OR REPLACE FUNCTION public.set_leads_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_leads_created_by_trigger ON public.leads;
CREATE TRIGGER set_leads_created_by_trigger
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_leads_created_by();

-- 6. Fix feedback_reports: Add trigger to auto-set created_by
CREATE OR REPLACE FUNCTION public.set_feedback_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_feedback_created_by_trigger ON public.feedback_reports;
CREATE TRIGGER set_feedback_created_by_trigger
  BEFORE INSERT ON public.feedback_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_feedback_created_by();

-- 7. Update bd_campaigns policies to include team_member for INSERT
DROP POLICY IF EXISTS "Authenticated users can create campaigns" ON public.bd_campaigns;
CREATE POLICY "Authenticated users can create campaigns" 
ON public.bd_campaigns 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 8. Add team_member role to campaign UPDATE policy
DROP POLICY IF EXISTS "Users can update own campaigns or admins can update all" ON public.bd_campaigns;
CREATE POLICY "Users can update own campaigns or admins can update all" 
ON public.bd_campaigns 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = created_by 
  OR auth.uid() = owned_by 
  OR has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'team_member')
);

-- 9. Add team_member role to campaign DELETE policy
DROP POLICY IF EXISTS "Users can delete own campaigns or admins can delete all" ON public.bd_campaigns;
CREATE POLICY "Users can delete own campaigns or admins can delete all" 
ON public.bd_campaigns 
FOR DELETE 
TO authenticated
USING (
  auth.uid() = created_by 
  OR has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'admin')
);