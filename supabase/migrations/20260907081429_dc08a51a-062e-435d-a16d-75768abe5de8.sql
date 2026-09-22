ALTER TABLE public.shopping_items
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;