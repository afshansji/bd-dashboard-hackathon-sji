-- Allow any authenticated user to register org repositories (hackathon / team use).
-- Managers retain update/delete; indexing still requires manager via Edge Function.

DROP POLICY IF EXISTS "Managers can insert org repositories" ON public.org_repositories;

CREATE POLICY "Authenticated users can insert org repositories"
  ON public.org_repositories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
