-- Phase 3: Fix NULL brand owners
-- Step 1: Get the first super_admin to use as default owner for NULL brands
DO $$
DECLARE
  default_owner_id uuid;
BEGIN
  -- Find first super_admin user
  SELECT id INTO default_owner_id
  FROM public.users
  WHERE role = 'super_admin'
  LIMIT 1;

  -- Update brands with NULL owner_id to use default owner
  IF default_owner_id IS NOT NULL THEN
    UPDATE public.brands
    SET owner_id = default_owner_id
    WHERE owner_id IS NULL;
    
    RAISE NOTICE 'Updated brands with NULL owner_id to default super_admin: %', default_owner_id;
  ELSE
    RAISE WARNING 'No super_admin found to assign as default brand owner';
  END IF;
END $$;

-- Step 2: Add NOT NULL constraint to owner_id (after fixing existing data)
ALTER TABLE public.brands
ALTER COLUMN owner_id SET NOT NULL;

-- Step 3: Add a comment explaining the constraint
COMMENT ON COLUMN public.brands.owner_id IS 'Required: Every brand must have an owner (manager or super_admin)';
