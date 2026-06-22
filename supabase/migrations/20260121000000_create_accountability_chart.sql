-- Accountability Chart Migration
-- Creates tables for quarterly BD team accountability tracking with goals, activities, and weekly updates

-- =====================================================
-- PART 1: CREATE ENUMS
-- =====================================================

-- Quarter status enum
CREATE TYPE public.quarter_status AS ENUM ('planning', 'active', 'completed', 'archived');

-- Goal status enum
CREATE TYPE public.goal_status AS ENUM ('on_track', 'at_risk', 'off_track', 'completed');

-- Goal approval status enum
CREATE TYPE public.goal_approval_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected');

-- Activity frequency enum
CREATE TYPE public.activity_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'one_time');

-- Activity status enum
CREATE TYPE public.activity_status AS ENUM ('active', 'paused', 'completed');

-- =====================================================
-- PART 2: CREATE TABLES
-- =====================================================

-- Quarters table
CREATE TABLE IF NOT EXISTS public.accountability_quarters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.quarter_status NOT NULL DEFAULT 'planning',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_quarter_name UNIQUE(name),
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Team goals table
CREATE TABLE IF NOT EXISTS public.accountability_team_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES public.accountability_quarters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  target_unit TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  status public.goal_status NOT NULL DEFAULT 'on_track',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_target CHECK (target_value > 0)
);

-- Rep goals table
CREATE TABLE IF NOT EXISTS public.accountability_rep_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quarter_id UUID NOT NULL REFERENCES public.accountability_quarters(id) ON DELETE CASCADE,
  team_goal_id UUID REFERENCES public.accountability_team_goals(id) ON DELETE SET NULL,
  rep_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  target_unit TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  status public.goal_status NOT NULL DEFAULT 'on_track',
  approval_status public.goal_approval_status NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_target_rep CHECK (target_value > 0),
  CONSTRAINT approval_requires_approver CHECK (
    (approval_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    (approval_status != 'approved')
  )
);

-- Activities table
CREATE TABLE IF NOT EXISTS public.accountability_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_goal_id UUID NOT NULL REFERENCES public.accountability_rep_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency public.activity_frequency NOT NULL DEFAULT 'weekly',
  target_count INTEGER NOT NULL DEFAULT 1,
  current_count INTEGER NOT NULL DEFAULT 0,
  linked_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  status public.activity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positive_target_count CHECK (target_count > 0),
  CONSTRAINT valid_current_count CHECK (current_count >= 0)
);

-- Weekly updates table
CREATE TABLE IF NOT EXISTS public.accountability_weekly_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.accountability_activities(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  progress_value NUMERIC NOT NULL DEFAULT 0,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  status public.goal_status NOT NULL DEFAULT 'on_track',
  blockers TEXT,
  help_needed TEXT,
  notes TEXT,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_week_range CHECK (week_end_date >= week_start_date),
  CONSTRAINT valid_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_progress CHECK (progress_value >= 0),
  CONSTRAINT unique_activity_week UNIQUE(activity_id, week_start_date)
);

-- =====================================================
-- PART 3: CREATE INDEXES
-- =====================================================

-- Quarters indexes
CREATE INDEX IF NOT EXISTS idx_accountability_quarters_status ON public.accountability_quarters(status);
CREATE INDEX IF NOT EXISTS idx_accountability_quarters_dates ON public.accountability_quarters(start_date, end_date);

-- Team goals indexes
CREATE INDEX IF NOT EXISTS idx_accountability_team_goals_quarter ON public.accountability_team_goals(quarter_id);
CREATE INDEX IF NOT EXISTS idx_accountability_team_goals_status ON public.accountability_team_goals(status);

-- Rep goals indexes
CREATE INDEX IF NOT EXISTS idx_accountability_rep_goals_quarter ON public.accountability_rep_goals(quarter_id);
CREATE INDEX IF NOT EXISTS idx_accountability_rep_goals_rep ON public.accountability_rep_goals(rep_id);
CREATE INDEX IF NOT EXISTS idx_accountability_rep_goals_team_goal ON public.accountability_rep_goals(team_goal_id);
CREATE INDEX IF NOT EXISTS idx_accountability_rep_goals_approval ON public.accountability_rep_goals(approval_status);
CREATE INDEX IF NOT EXISTS idx_accountability_rep_goals_status ON public.accountability_rep_goals(status);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_accountability_activities_rep_goal ON public.accountability_activities(rep_goal_id);
CREATE INDEX IF NOT EXISTS idx_accountability_activities_task ON public.accountability_activities(linked_task_id);
CREATE INDEX IF NOT EXISTS idx_accountability_activities_status ON public.accountability_activities(status);

-- Weekly updates indexes
CREATE INDEX IF NOT EXISTS idx_accountability_weekly_updates_activity ON public.accountability_weekly_updates(activity_id);
CREATE INDEX IF NOT EXISTS idx_accountability_weekly_updates_dates ON public.accountability_weekly_updates(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_accountability_weekly_updates_submitted ON public.accountability_weekly_updates(submitted_by);

-- =====================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.accountability_quarters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_team_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_rep_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_weekly_updates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 5: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to get current active quarter
CREATE OR REPLACE FUNCTION public.get_current_quarter()
RETURNS UUID AS $$
  SELECT id FROM public.accountability_quarters
  WHERE status = 'active'
  AND CURRENT_DATE BETWEEN start_date AND end_date
  ORDER BY start_date DESC
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to update goal progress from activities
CREATE OR REPLACE FUNCTION public.update_goal_progress_from_activities()
RETURNS TRIGGER AS $$
DECLARE
  activity_id UUID;
  rep_goal_record RECORD;
  team_goal_id_var UUID;
BEGIN
  -- Determine which activity we're dealing with based on the trigger source table
  IF TG_TABLE_NAME = 'accountability_activities' THEN
    activity_id := NEW.id;
  ELSE
    activity_id := NEW.activity_id;
  END IF;

  -- Get the rep goal for this activity
  SELECT rep_goal_id, team_goal_id INTO rep_goal_record
  FROM public.accountability_activities a
  JOIN public.accountability_rep_goals rg ON rg.id = a.rep_goal_id
  WHERE a.id = activity_id;
  
  -- Update rep goal current_value by summing all activities' current_count
  UPDATE public.accountability_rep_goals
  SET current_value = (
    SELECT COALESCE(SUM(current_count), 0)
    FROM public.accountability_activities
    WHERE rep_goal_id = rep_goal_record.rep_goal_id
  ),
  updated_at = NOW()
  WHERE id = rep_goal_record.rep_goal_id;
  
  -- If rep goal is linked to team goal, update team goal as well
  IF rep_goal_record.team_goal_id IS NOT NULL THEN
    UPDATE public.accountability_team_goals
    SET current_value = (
      SELECT COALESCE(SUM(current_value), 0)
      FROM public.accountability_rep_goals
      WHERE team_goal_id = rep_goal_record.team_goal_id
    ),
    updated_at = NOW()
    WHERE id = rep_goal_record.team_goal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and update goal status based on progress
CREATE OR REPLACE FUNCTION public.calculate_goal_status()
RETURNS TRIGGER AS $$
DECLARE
  progress_ratio NUMERIC;
  time_ratio NUMERIC;
  quarter_record RECORD;
  new_status public.goal_status;
BEGIN
  -- Get quarter information
  SELECT start_date, end_date INTO quarter_record
  FROM public.accountability_quarters
  WHERE id = NEW.quarter_id;
  
  -- Calculate progress ratio (0 to 1+)
  IF NEW.target_value > 0 THEN
    progress_ratio := NEW.current_value / NEW.target_value;
  ELSE
    progress_ratio := 0;
  END IF;
  
  -- Calculate time ratio (0 to 1)
  time_ratio := EXTRACT(EPOCH FROM (CURRENT_DATE - quarter_record.start_date)) / 
                EXTRACT(EPOCH FROM (quarter_record.end_date - quarter_record.start_date));
  
  -- Determine status
  IF progress_ratio >= 1 THEN
    new_status := 'completed';
  ELSIF progress_ratio >= time_ratio * 0.9 THEN
    -- Progress is at least 90% of where it should be
    new_status := 'on_track';
  ELSIF progress_ratio >= time_ratio * 0.7 THEN
    -- Progress is 70-90% of where it should be
    new_status := 'at_risk';
  ELSE
    -- Progress is less than 70% of where it should be
    new_status := 'off_track';
  END IF;
  
  NEW.status := new_status;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_accountability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: CREATE TRIGGERS
-- =====================================================

-- Triggers for updating timestamps
CREATE TRIGGER update_accountability_quarters_timestamp
  BEFORE UPDATE ON public.accountability_quarters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accountability_timestamp();

CREATE TRIGGER update_accountability_team_goals_timestamp
  BEFORE UPDATE ON public.accountability_team_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accountability_timestamp();

CREATE TRIGGER update_accountability_rep_goals_timestamp
  BEFORE UPDATE ON public.accountability_rep_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accountability_timestamp();

CREATE TRIGGER update_accountability_activities_timestamp
  BEFORE UPDATE ON public.accountability_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accountability_timestamp();

CREATE TRIGGER update_accountability_weekly_updates_timestamp
  BEFORE UPDATE ON public.accountability_weekly_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accountability_timestamp();

-- Triggers for automatic progress calculation
CREATE TRIGGER trigger_update_progress_on_activity_change
  AFTER INSERT OR UPDATE ON public.accountability_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goal_progress_from_activities();

CREATE TRIGGER trigger_update_progress_on_weekly_update
  AFTER INSERT OR UPDATE ON public.accountability_weekly_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goal_progress_from_activities();

-- Triggers for automatic status calculation (only for rep goals)
CREATE TRIGGER trigger_calculate_rep_goal_status
  BEFORE UPDATE OF current_value ON public.accountability_rep_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_goal_status();

-- Triggers for automatic status calculation (only for team goals)
CREATE TRIGGER trigger_calculate_team_goal_status
  BEFORE UPDATE OF current_value ON public.accountability_team_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_goal_status();

-- =====================================================
-- PART 7: ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Quarters policies
CREATE POLICY "Authenticated users can view quarters"
  ON public.accountability_quarters FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage quarters"
  ON public.accountability_quarters FOR ALL
  USING (public.is_manager_or_admin());

-- Team goals policies
CREATE POLICY "Authenticated users can view team goals"
  ON public.accountability_team_goals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage team goals"
  ON public.accountability_team_goals FOR ALL
  USING (public.is_manager_or_admin());

-- Rep goals policies
CREATE POLICY "Authenticated users can view rep goals"
  ON public.accountability_rep_goals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Reps can create their own goals"
  ON public.accountability_rep_goals FOR INSERT
  WITH CHECK (rep_id = auth.uid() OR public.is_manager_or_admin());

CREATE POLICY "Reps can update their own goals (status/progress)"
  ON public.accountability_rep_goals FOR UPDATE
  USING (
    rep_id = auth.uid() AND 
    approval_status IN ('draft', 'rejected')
  );

CREATE POLICY "Managers can update any rep goal"
  ON public.accountability_rep_goals FOR UPDATE
  USING (public.is_manager_or_admin());

CREATE POLICY "Managers can delete rep goals"
  ON public.accountability_rep_goals FOR DELETE
  USING (public.is_manager_or_admin());

-- Activities policies
CREATE POLICY "Authenticated users can view activities"
  ON public.accountability_activities FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Goal owners can manage their activities"
  ON public.accountability_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_rep_goals
      WHERE id = rep_goal_id AND rep_id = auth.uid()
    )
    OR public.is_manager_or_admin()
  );

-- Weekly updates policies
CREATE POLICY "Authenticated users can view weekly updates"
  ON public.accountability_weekly_updates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Activity owners can create weekly updates"
  ON public.accountability_weekly_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accountability_activities a
      JOIN public.accountability_rep_goals rg ON rg.id = a.rep_goal_id
      WHERE a.id = activity_id AND rg.rep_id = auth.uid()
    )
    OR public.is_manager_or_admin()
  );

CREATE POLICY "Update owners can edit their updates"
  ON public.accountability_weekly_updates FOR UPDATE
  USING (submitted_by = auth.uid() OR public.is_manager_or_admin());

CREATE POLICY "Managers can delete weekly updates"
  ON public.accountability_weekly_updates FOR DELETE
  USING (public.is_manager_or_admin());

-- =====================================================
-- PART 8: NOTIFICATION FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to notify managers when a goal is submitted for approval
CREATE OR REPLACE FUNCTION public.notify_goal_submitted_for_approval()
RETURNS TRIGGER AS $$
DECLARE
  rep_name TEXT;
  manager_record RECORD;
BEGIN
  -- Only trigger when approval_status changes to 'pending_approval'
  IF NEW.approval_status = 'pending_approval' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'pending_approval') THEN
    -- Get rep name
    SELECT COALESCE(full_name, email) INTO rep_name
    FROM public.profiles
    WHERE id = NEW.rep_id;

    -- Notify all managers/admins
    FOR manager_record IN
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role IN ('super_admin', 'admin', 'manager')
    LOOP
      INSERT INTO public.user_notifications (user_id, type, title, message, link, data)
      VALUES (
        manager_record.user_id,
        'goal_approval_requested',
        'Goal Approval Requested',
        rep_name || ' submitted a goal for approval: ' || NEW.title,
        '/bd/accountability/' || NEW.id,
        jsonb_build_object(
          'goal_id', NEW.id,
          'rep_id', NEW.rep_id,
          'goal_title', NEW.title
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify rep when their goal is approved or rejected
CREATE OR REPLACE FUNCTION public.notify_goal_approval_decision()
RETURNS TRIGGER AS $$
DECLARE
  approver_name TEXT;
BEGIN
  -- Only trigger when approval_status changes to 'approved' or 'rejected'
  IF (NEW.approval_status IN ('approved', 'rejected')) AND 
     (OLD.approval_status IS NULL OR OLD.approval_status NOT IN ('approved', 'rejected')) THEN
    
    -- Get approver name
    SELECT COALESCE(full_name, email) INTO approver_name
    FROM public.profiles
    WHERE id = NEW.approved_by;

    -- Notify the rep
    INSERT INTO public.user_notifications (user_id, type, title, message, link, data)
    VALUES (
      NEW.rep_id,
      CASE 
        WHEN NEW.approval_status = 'approved' THEN 'goal_approved'
        ELSE 'goal_rejected'
      END,
      CASE 
        WHEN NEW.approval_status = 'approved' THEN 'Goal Approved'
        ELSE 'Goal Rejected'
      END,
      CASE 
        WHEN NEW.approval_status = 'approved' THEN
          approver_name || ' approved your goal: ' || NEW.title
        ELSE
          approver_name || ' rejected your goal: ' || NEW.title || 
          CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' - Reason: ' || NEW.rejection_reason ELSE '' END
      END,
      '/bd/accountability/' || NEW.id,
      jsonb_build_object(
        'goal_id', NEW.id,
        'goal_title', NEW.title,
        'approval_status', NEW.approval_status,
        'approved_by', NEW.approved_by,
        'rejection_reason', NEW.rejection_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for notifications
CREATE TRIGGER trigger_notify_goal_submitted
  AFTER UPDATE ON public.accountability_rep_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_goal_submitted_for_approval();

CREATE TRIGGER trigger_notify_goal_decision
  AFTER UPDATE ON public.accountability_rep_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_goal_approval_decision();

-- =====================================================
-- PART 9: GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.accountability_quarters TO authenticated;
GRANT ALL ON public.accountability_team_goals TO authenticated;
GRANT ALL ON public.accountability_rep_goals TO authenticated;
GRANT ALL ON public.accountability_activities TO authenticated;
GRANT ALL ON public.accountability_weekly_updates TO authenticated;

