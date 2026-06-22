-- Remove the foreign key constraint on deals.owner_id to allow any UUID
-- This enables assigning users from both users and employees tables

-- First, find and drop the constraint (it might have different names)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the foreign key constraint name for owner_id
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'deals' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'owner_id'
    LIMIT 1;
    
    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE deals DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint found on deals.owner_id';
    END IF;
END $$;

-- Add a comment explaining the change
COMMENT ON COLUMN deals.owner_id IS 'UUID of the deal owner - can be from users or employees table (no FK constraint)';





