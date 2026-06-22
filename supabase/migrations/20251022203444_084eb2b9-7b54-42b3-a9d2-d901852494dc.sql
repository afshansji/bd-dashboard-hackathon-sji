-- Step 1: Deduplicate existing clients by keeping the oldest record for each company
-- This creates a temp table with the canonical client_id for each company
CREATE TEMP TABLE client_dedup AS
SELECT DISTINCT ON (LOWER(company))
  id as canonical_id,
  LOWER(company) as company_lower
FROM public.clients
WHERE company IS NOT NULL
ORDER BY LOWER(company), created_at ASC;

-- Step 2: Update all deals to point to the canonical client
UPDATE public.deals
SET client_id = cd.canonical_id
FROM client_dedup cd
WHERE deals.client_id IN (
  SELECT c.id 
  FROM public.clients c
  WHERE LOWER(c.company) = cd.company_lower
  AND c.id != cd.canonical_id
);

-- Step 3: Delete duplicate clients (keeping only the canonical ones)
DELETE FROM public.clients
WHERE id IN (
  SELECT c.id
  FROM public.clients c
  JOIN client_dedup cd ON LOWER(c.company) = cd.company_lower
  WHERE c.id != cd.canonical_id
);

-- Step 4: Now add the unique constraint
CREATE UNIQUE INDEX idx_clients_company_unique 
ON public.clients (LOWER(company)) 
WHERE company IS NOT NULL;

-- Step 5: Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_clients_control_tower_id ON public.clients(control_tower_id) WHERE control_tower_id IS NOT NULL;