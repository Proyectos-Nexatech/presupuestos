-- Add horas_diarias column to apus table
ALTER TABLE public.apus 
ADD COLUMN IF NOT EXISTS horas_diarias DECIMAL(15,2) DEFAULT 8;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
