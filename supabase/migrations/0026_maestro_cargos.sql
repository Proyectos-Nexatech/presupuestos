-- Maestro de Cargos: Tabla centralizada de cargos operativos y administrativos
CREATE TABLE IF NOT EXISTS maestro_cargos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_cargo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('OP', 'STAFF')),
    nivel INT NOT NULL CHECK (nivel BETWEEN 1 AND 10),
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE maestro_cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all public for maestro_cargos" ON maestro_cargos FOR ALL USING (true);

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_maestro_cargos_tipo_nivel ON maestro_cargos(tipo, nivel);

-- Seed initial STAFF cargos (migrated from staff_salaries_2026)
INSERT INTO maestro_cargos (nombre_cargo, tipo, nivel) VALUES
('COORDINADOR HSE', 'STAFF', 1),
('Aux de Ingenieria', 'STAFF', 1),
('Vigia HSE', 'STAFF', 1),
('SUPERVISOR MECANICO', 'STAFF', 2),
('Hse Junior II', 'STAFF', 2),
('Programador Junior II', 'STAFF', 2),
('Facturador Junior', 'STAFF', 2),
('Administrador', 'STAFF', 2),
('SUPERVISOR ELECTRICO', 'STAFF', 3),
('Hse Junior I', 'STAFF', 3),
('QA QC Junior II', 'STAFF', 3),
('Facturador Junior Pleno', 'STAFF', 3),
('Administrador Junior', 'STAFF', 3),
('ALMACENISTA', 'STAFF', 4),
('QA QC Junior I', 'STAFF', 4),
('Programador Junior I', 'STAFF', 4),
('Facturador Junior Pleno II', 'STAFF', 4),
('Administrador Pleno', 'STAFF', 4),
('AUXILIAR ADMINISTRATIVO', 'STAFF', 5),
('Ing. Residente / Diseño Junior', 'STAFF', 5),
('Hse Pleno', 'STAFF', 5),
('QA QC Pleno', 'STAFF', 5),
('Rescatista II', 'STAFF', 5),
('JEFE DE PATIO', 'STAFF', 6),
('RESIDENTE OBRA', 'STAFF', 7),
('GERENTE PROYECTO', 'STAFF', 8),
('NIVEL 9 (PENDIENTE)', 'STAFF', 9),
('NIVEL 10 (PENDIENTE)', 'STAFF', 10)
ON CONFLICT DO NOTHING;
