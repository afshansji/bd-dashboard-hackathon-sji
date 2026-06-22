-- Fix the pod name spelling from Allgorydym to Allgorhythm
UPDATE public.pods 
SET name = 'Allgorhythm', updated_at = now()
WHERE name = 'Allgorydym';

-- Ensure Sales pod is deactivated (not shown in dropdown)
UPDATE public.pods 
SET is_active = false, updated_at = now()
WHERE name = 'Sales';