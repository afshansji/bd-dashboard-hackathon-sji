-- Clean up all orphaned references before adding foreign key constraints

-- First, nullify brand owner references to orphaned users
UPDATE public.brands
SET owner_id = NULL
WHERE owner_id IS NOT NULL 
AND owner_id NOT IN (SELECT id FROM auth.users);

UPDATE public.brands
SET co_owner_id = NULL
WHERE co_owner_id IS NOT NULL 
AND co_owner_id NOT IN (SELECT id FROM auth.users);

-- Clean up project manager references
UPDATE public.projects
SET project_manager = NULL
WHERE project_manager IS NOT NULL 
AND project_manager NOT IN (SELECT id FROM auth.users);

-- Clean up assigned team arrays - remove orphaned user IDs
UPDATE public.projects
SET assigned_team = (
  SELECT array_agg(team_member)
  FROM unnest(assigned_team) AS team_member
  WHERE team_member IN (SELECT id FROM auth.users)
)
WHERE assigned_team IS NOT NULL
AND EXISTS (
  SELECT 1 FROM unnest(assigned_team) AS tm 
  WHERE tm NOT IN (SELECT id FROM auth.users)
);

-- Clean up task assignments
UPDATE public.project_tasks
SET assigned_to = NULL
WHERE assigned_to IS NOT NULL 
AND assigned_to NOT IN (SELECT id FROM auth.users);

-- Clean up client manager assignments
UPDATE public.clients
SET assigned_manager = NULL
WHERE assigned_manager IS NOT NULL 
AND assigned_manager NOT IN (SELECT id FROM auth.users);

-- Now delete orphaned records
DELETE FROM public.user_brands
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.user_permissions
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

-- Add foreign key constraints with CASCADE

-- Users table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;

ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- User brands
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_brands_user_id_fkey' 
    AND table_name = 'user_brands'
  ) THEN
    ALTER TABLE public.user_brands DROP CONSTRAINT user_brands_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.user_brands
ADD CONSTRAINT user_brands_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- User permissions
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_permissions_user_id_fkey' 
    AND table_name = 'user_permissions'
  ) THEN
    ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_user_id_fkey;
  END IF;
END $$;

ALTER TABLE public.user_permissions
ADD CONSTRAINT user_permissions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;