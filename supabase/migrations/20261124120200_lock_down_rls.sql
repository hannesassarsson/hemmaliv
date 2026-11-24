-- Stänger de öppna RLS-reglerna: bara inloggade hushållsmedlemmar (public.hemma_members)
-- får läsa eller ändra data. Serverfunktionerna använder service role och påverkas inte.
-- Kör först när Hannes och Elvira finns i hemma_members, annars låser ni ut er själva.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['shopping_items', 'todo_items', 'meal_plan', 'meal_ideas', 'push_subscriptions', 'documents']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "hemma medlemmar" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "hemma medlemmar" ON public.%I FOR ALL TO authenticated USING ((SELECT public.hemma_ar_medlem())) WITH CHECK ((SELECT public.hemma_ar_medlem()))',
      t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "shopping open" ON public.shopping_items;
DROP POLICY IF EXISTS "todo open" ON public.todo_items;
DROP POLICY IF EXISTS "meal plan open" ON public.meal_plan;
DROP POLICY IF EXISTS "meal ideas open" ON public.meal_ideas;
DROP POLICY IF EXISTS "push open" ON public.push_subscriptions;
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;

-- Fillagringen för dokument
DROP POLICY IF EXISTS "documents_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_delete" ON storage.objects;
DROP POLICY IF EXISTS "hemma dokument" ON storage.objects;
CREATE POLICY "hemma dokument" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND (SELECT public.hemma_ar_medlem()))
  WITH CHECK (bucket_id = 'documents' AND (SELECT public.hemma_ar_medlem()));

-- Live-synk även för dokument
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
  END IF;
END $$;
