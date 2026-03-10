
-- Create a new migration file to fix RLS for insumos table
DROP POLICY IF EXISTS "Insumos are editable by dir_compras or super_admin" ON public.insumos;
DROP POLICY IF EXISTS "Insumos are viewable by everyone" ON public.insumos;

CREATE POLICY "Allow all public for insumos" ON public.insumos FOR ALL USING (true);
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
