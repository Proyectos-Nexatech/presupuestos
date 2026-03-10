-- Create table for administrative staff salary reference
CREATE TABLE IF NOT EXISTS staff_salaries_2026 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nivel INT NOT NULL CHECK (nivel BETWEEN 1 AND 8),
    cargo_nombre TEXT NOT NULL,
    salario_basico NUMERIC NOT NULL DEFAULT 0,
    prima_mensual NUMERIC NOT NULL DEFAULT 0,
    prima_produccion_diaria NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nivel)
);

-- Enable RLS
ALTER TABLE staff_salaries_2026 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public for staff_salaries_2026" ON staff_salaries_2026 FOR ALL USING (true);

-- Seed initial administrative levels (Placeholders)
INSERT INTO staff_salaries_2026 (nivel, cargo_nombre, salario_basico, prima_mensual, prima_produccion_diaria) VALUES
(1, 'COORDINADOR HSE', 0, 0, 0),
(2, 'SUPERVISOR MECANICO', 0, 0, 0),
(3, 'SUPERVISOR ELECTRICO', 0, 0, 0),
(4, 'ALMACENISTA', 0, 0, 0),
(5, 'AUXILIAR ADMINISTRATIVO', 0, 0, 0),
(6, 'JEFE DE PATIO', 0, 0, 0),
(7, 'RESIDENTE OBRA', 0, 0, 0),
(8, 'GERENTE PROYECTO', 0, 0, 0)
ON CONFLICT (nivel) DO NOTHING;
