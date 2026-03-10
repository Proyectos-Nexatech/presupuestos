-- Create apus table (stores metadata for each activity's APU)
CREATE TABLE IF NOT EXISTS public.apus (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    cuadro_economico_id UUID REFERENCES public.cuadro_economico(id) ON DELETE CASCADE NOT NULL,
    rendimiento DECIMAL(15,2) DEFAULT 1,
    turno_factor DECIMAL(15,2) DEFAULT 1,
    unidad TEXT,
    UNIQUE(cuadro_economico_id)
);

-- Create apu_items table (stores resources for each APU)
CREATE TABLE IF NOT EXISTS public.apu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    apu_id UUID REFERENCES public.apus(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL, 
    descripcion TEXT NOT NULL,
    unidad TEXT NOT NULL,
    cantidad DECIMAL(15,4) DEFAULT 0,
    precio_unitario DECIMAL(15,2) DEFAULT 0,
    recurso_id UUID
);

-- Enable RLS
ALTER TABLE public.apus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apu_items ENABLE ROW LEVEL SECURITY;

-- Public Access Policies
CREATE POLICY "APUs viewable by everyone" ON public.apus FOR SELECT USING (true);
CREATE POLICY "APUs insertable by everyone" ON public.apus FOR INSERT WITH CHECK (true);
CREATE POLICY "APUs editable by everyone" ON public.apus FOR UPDATE USING (true);
CREATE POLICY "APUs deletable by everyone" ON public.apus FOR DELETE USING (true);

CREATE POLICY "APU items viewable by everyone" ON public.apu_items FOR SELECT USING (true);
CREATE POLICY "APU items insertable by everyone" ON public.apu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "APU items editable by everyone" ON public.apu_items FOR UPDATE USING (true);
CREATE POLICY "APU items deletable by everyone" ON public.apu_items FOR DELETE USING (true);

-- Notifying PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
