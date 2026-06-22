-- Add co-owner field to brands table
ALTER TABLE brands ADD COLUMN co_owner_id uuid REFERENCES users(id);

-- Add index for performance
CREATE INDEX idx_brands_co_owner_id ON brands(co_owner_id);

-- Add comment for documentation
COMMENT ON COLUMN brands.co_owner_id IS 'Optional secondary owner of the brand';