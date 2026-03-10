-- Add total_horas to apu_items
ALTER TABLE public.apu_items ADD COLUMN IF NOT EXISTS total_horas DECIMAL(15,2);
