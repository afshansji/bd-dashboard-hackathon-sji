-- Fix: Make created_by NOT NULL with a default of the current user
-- This ensures RLS INSERT policy works correctly

-- First, update any existing NULL created_by values to a system user or remove them
-- (We'll set to the current authenticated user for new inserts)

-- Update the status default to 'todo' instead of 'pending'
ALTER TABLE public.project_tasks 
ALTER COLUMN status SET DEFAULT 'todo';

-- Add a trigger to automatically set created_by to auth.uid() on insert
CREATE OR REPLACE FUNCTION public.set_task_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If created_by is not provided, set it to the current user
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS set_task_created_by_trigger ON public.project_tasks;
CREATE TRIGGER set_task_created_by_trigger
  BEFORE INSERT ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_created_by();

-- Add DELETE policy for users to delete their own tasks
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.project_tasks;
CREATE POLICY "Users can delete their own tasks" 
ON public.project_tasks 
FOR DELETE 
TO authenticated
USING (auth.uid() = created_by);

-- Ensure team members can view tasks via the has_role check
-- Update the SELECT policy to include team_member role
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON public.project_tasks;
CREATE POLICY "Users can view tasks assigned to them or created by them" 
ON public.project_tasks 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = assigned_to 
  OR auth.uid() = created_by 
  OR has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'team_member')
);