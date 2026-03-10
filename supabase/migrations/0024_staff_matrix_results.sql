-- Create table for administrative staff calculated results
CREATE TABLE IF NOT EXISTS staff_matrix_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nivel INT NOT NULL CHECK (nivel BETWEEN 1 AND 8),
    turno_id UUID REFERENCES configuracion_turnos(id) ON DELETE CASCADE,
    concepto_id UUID REFERENCES maestro_conceptos(id) ON DELETE CASCADE,
    valor_final NUMERIC DEFAULT 0,
    tipo_persona TEXT NOT NULL DEFAULT 'STAFF' CHECK (tipo_persona = 'STAFF'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nivel, turno_id, concepto_id)
);

-- Enable RLS
ALTER TABLE staff_matrix_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public for staff_matrix_results" ON staff_matrix_results FOR ALL USING (true);
