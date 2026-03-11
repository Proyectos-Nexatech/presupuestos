-- Add proyecto column to cuadro_economico for project-based filtering in Dashboard
ALTER TABLE public.cuadro_economico ADD COLUMN IF NOT EXISTS proyecto TEXT;

-- Notifying PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
