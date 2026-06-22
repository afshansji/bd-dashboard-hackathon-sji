-- Update RLS policies for project_tasks table to allow all team members to create/edit/delete tasks
-- This migration addresses the issue where tasks with NULL project_id couldn't be created

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can manage all project tasks" ON public.project_tasks;
DROP POLICY IF EXISTS "Team members can view and edit their assigned tasks" ON public.project_tasks;

-- Create new comprehensive policies

-- 1. All authenticated users can view all tasks
CREATE POLICY "Authenticated users can view all tasks"
ON public.project_tasks
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. All authenticated users can create tasks
CREATE POLICY "Authenticated users can create tasks"
ON public.project_tasks
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Users can update tasks they created or are assigned to
-- Managers, admins, and super_admins can update all tasks
CREATE POLICY "Users can update own or assigned tasks"
ON public.project_tasks
FOR UPDATE
USING (
  -- User created the task
  created_by::text = auth.uid()::text
  OR
  -- User is assigned to the task
  assigned_to::text = auth.uid()::text
  OR
  -- User has manager, admin, or super_admin role
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = ANY(ARRAY['manager'::app_role, 'admin'::app_role, 'super_admin'::app_role])
  )
);

-- 4. Users can delete tasks they created
-- Managers, admins, and super_admins can delete all tasks
CREATE POLICY "Users can delete own tasks"
ON public.project_tasks
FOR DELETE
USING (
  -- User created the task
  created_by::text = auth.uid()::text
  OR
  -- User has manager, admin, or super_admin role
  EXISTS (
    SELECT 1 FROM users
    WHERE id::text = auth.uid()::text
    AND role = ANY(ARRAY['manager'::app_role, 'admin'::app_role, 'super_admin'::app_role])
  )
);

-- Add comment explaining the policies
COMMENT ON TABLE public.project_tasks IS
'Project tasks table with RLS policies allowing all authenticated users to create tasks and manage tasks they created or are assigned to. Managers and admins can manage all tasks.';
