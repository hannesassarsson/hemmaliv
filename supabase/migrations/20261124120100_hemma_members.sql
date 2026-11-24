-- Hushållsmedlemmar: kopplar ett Supabase Auth-konto till en person i appen.
-- Rader läggs in manuellt (SQL) när Hannes och Elvira har skapat sina konton.
CREATE TABLE IF NOT EXISTS public.hemma_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  person text NOT NULL UNIQUE CHECK (person IN ('Hannes', 'Elvira')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hemma_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hemma_members FROM anon, authenticated;
GRANT SELECT ON public.hemma_members TO authenticated;
GRANT ALL ON public.hemma_members TO service_role;

-- Inloggad persons namn, eller null om kontot inte är medlem.
CREATE OR REPLACE FUNCTION public.hemma_person()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT person FROM public.hemma_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.hemma_ar_medlem()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.hemma_members WHERE user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.hemma_person() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hemma_ar_medlem() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hemma_person() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hemma_ar_medlem() TO authenticated;

DROP POLICY IF EXISTS "hemma members read" ON public.hemma_members;
CREATE POLICY "hemma members read" ON public.hemma_members
  FOR SELECT TO authenticated
  USING ((SELECT public.hemma_ar_medlem()));
