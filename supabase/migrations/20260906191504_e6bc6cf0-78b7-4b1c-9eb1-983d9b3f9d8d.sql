CREATE TABLE public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  done boolean NOT NULL DEFAULT false,
  recurring boolean NOT NULL DEFAULT false,
  reminder timestamptz,
  notified_at timestamptz,
  added_by text,
  completed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_items TO anon, authenticated;
GRANT ALL ON public.shopping_items TO service_role;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shopping open" ON public.shopping_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  done boolean NOT NULL DEFAULT false,
  recurring boolean NOT NULL DEFAULT false,
  list_type text NOT NULL DEFAULT 'gemensamt',
  deadline timestamptz,
  reminder timestamptz,
  notified_at timestamptz,
  added_by text,
  completed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_items TO anon, authenticated;
GRANT ALL ON public.todo_items TO service_role;
ALTER TABLE public.todo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todo open" ON public.todo_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.meal_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  day text NOT NULL,
  dish_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan TO anon, authenticated;
GRANT ALL ON public.meal_plan TO service_role;
ALTER TABLE public.meal_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal plan open" ON public.meal_plan FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.meal_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_ideas TO anon, authenticated;
GRANT ALL ON public.meal_ideas TO service_role;
ALTER TABLE public.meal_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal ideas open" ON public.meal_ideas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  person text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO anon, authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push open" ON public.push_subscriptions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todo_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plan;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_ideas;

INSERT INTO public.meal_ideas (text) VALUES
  ('Köttbullar med potatismos'),
  ('Pasta carbonara'),
  ('Tacos'),
  ('Ugnsbakad lax med rotfrukter'),
  ('Kycklinggryta med ris'),
  ('Pannkakor och soppa'),
  ('Vegetarisk lasagne'),
  ('Korv Stroganoff'),
  ('Raggmunk med bacon'),
  ('Fisksoppa');

INSERT INTO public.shopping_items (text, qty, recurring, added_by) VALUES
  ('Mjölk', 2, true, 'Hannes'),
  ('Bröd', 1, false, 'Elvira'),
  ('Kaffe', 1, true, 'Hannes');

INSERT INTO public.todo_items (text, list_type, added_by, deadline) VALUES
  ('Boka bilservice', 'gemensamt', 'Elvira', now() + interval '3 days'),
  ('Vattna växterna', 'hannes', 'Hannes', now() + interval '1 day'),
  ('Ringa tandläkaren', 'elvira', 'Elvira', now() + interval '5 days');