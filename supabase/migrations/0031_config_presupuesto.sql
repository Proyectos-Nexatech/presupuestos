-- Create table for global configuration parameters
CREATE TABLE IF NOT EXISTS config_presupuesto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clave TEXT NOT NULL UNIQUE,
    valor NUMERIC DEFAULT 0,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE config_presupuesto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public for config_presupuesto" ON config_presupuesto FOR ALL USING (true);

-- Insert factor_lluvia with default 0
INSERT INTO config_presupuesto (clave, valor, descripcion) 
VALUES ('factor_lluvia', 0, 'Factor de lluvia global aplicado a los salarios (%)')
ON CONFLICT (clave) DO NOTHING;
