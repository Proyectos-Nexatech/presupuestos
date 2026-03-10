-- Add rendimiento_item to apu_items 
ALTER TABLE public.apu_items ADD COLUMN IF NOT EXISTS rendimiento_item DECIMAL(15,2) DEFAULT 1;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
