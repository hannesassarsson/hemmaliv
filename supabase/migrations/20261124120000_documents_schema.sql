-- Dokumentarkivet skapades direkt i Supabase. Den här migrationen dokumenterar schemat
-- så att det går att återskapa; den är idempotent mot den befintliga databasen.
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  file_type text NOT NULL,
  original_filename text,
  uploaded_by text,
  category text NOT NULL DEFAULT 'ovrigt',
  title text,
  document_date date,
  amount numeric,
  issuer text,
  summary text,
  ai_status text NOT NULL DEFAULT 'pending',
  raw_ai jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  ai_error text,
  owner text NOT NULL DEFAULT 'Gemensamt'
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;
