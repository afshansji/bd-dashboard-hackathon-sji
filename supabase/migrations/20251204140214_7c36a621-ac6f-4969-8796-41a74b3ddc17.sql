-- Remove foreign key constraints on deals table to allow assigning employees as owners/PMs
-- This allows owner_id and pm_assigned_id to accept UUIDs from either users or employees table

-- Drop the owner_id foreign key constraint
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_owner_id_fkey;

-- Drop the pm_assigned_id foreign key constraint if it exists
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_pm_assigned_id_fkey;