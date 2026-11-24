-- Inbjudningar: när ett konto med en inbjuden e-postadress skapas och e-posten är bekräftad
-- kopplas det automatiskt till rätt person i hemma_members.
CREATE TABLE IF NOT EXISTS public.hemma_invites (
  email text PRIMARY KEY CHECK (email = lower(email)),
  person text NOT NULL UNIQUE CHECK (person IN ('Hannes', 'Elvira')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hemma_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hemma_invites FROM anon, authenticated;
GRANT ALL ON public.hemma_invites TO service_role;

CREATE OR REPLACE FUNCTION public.hemma_link_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.hemma_members (user_id, person)
    SELECT NEW.id, i.person FROM public.hemma_invites i WHERE i.email = lower(NEW.email)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.hemma_link_invited_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS hemma_link_invited_user ON auth.users;
CREATE TRIGGER hemma_link_invited_user
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.hemma_link_invited_user();
