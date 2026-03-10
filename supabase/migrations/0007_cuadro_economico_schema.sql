-- Create cuadro_economico table
CREATE TABLE IF NOT EXISTS public.cuadro_economico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    item TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    unidad TEXT,
    cantidad DECIMAL(15,2) DEFAULT 0,
    rendimiento DECIMAL(15,2) DEFAULT 0,
    rendimiento_ud DECIMAL(15,2) DEFAULT 0,
    precio_ud_suministro DECIMAL(15,2) DEFAULT 0,
    precio_ud_montaje DECIMAL(15,2) DEFAULT 0,
    total_hh DECIMAL(15,2) DEFAULT 0,
    precio_unitario DECIMAL(15,2),
    precio_total DECIMAL(15,2),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.cuadro_economico ENABLE ROW LEVEL SECURITY;

-- Public Access Policies
CREATE POLICY "CuadroEconomico viewable by everyone" ON public.cuadro_economico FOR SELECT USING (true);
CREATE POLICY "CuadroEconomico insertable by everyone" ON public.cuadro_economico FOR INSERT WITH CHECK (true);
CREATE POLICY "CuadroEconomico editable by everyone" ON public.cuadro_economico FOR UPDATE USING (true);
CREATE POLICY "CuadroEconomico deletable by everyone" ON public.cuadro_economico FOR DELETE USING (true);

-- Notifying PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
