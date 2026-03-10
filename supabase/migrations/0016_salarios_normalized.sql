-- Normalized Salary Schema
BEGIN;

-- 1. Concepts Master (Items A, B, C...)
CREATE TABLE IF NOT EXISTS maestro_conceptos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT NOT NULL, -- A, B, C, K...
    nombre TEXT NOT NULL,
    porcentaje NUMERIC DEFAULT 0,
    formula TEXT,
    grupo TEXT CHECK (grupo IN ('Salarial', 'Prestacional', 'Parafiscal', 'Dotación', 'Otros')),
    orden INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Shifts Configuration
CREATE TABLE IF NOT EXISTS configuracion_turnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL UNIQUE, -- 8h, 12h Día, 12h Noche, 24h
    factor_multiplicador NUMERIC DEFAULT 1.0, -- e.g. 1.66 for 12h
    es_12h BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Calculations Matrix (Sequential DB)
CREATE TABLE IF NOT EXISTS matriz_costos_calculados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria INT NOT NULL CHECK (categoria BETWEEN 1 AND 8),
    turno_id UUID REFERENCES configuracion_turnos(id) ON DELETE CASCADE,
    concepto_id UUID REFERENCES maestro_conceptos(id) ON DELETE CASCADE,
    valor_final NUMERIC DEFAULT 0,
    UNIQUE(categoria, turno_id, concepto_id)
);

-- 4. Category Position Labels (Global or per type)
CREATE TABLE IF NOT EXISTS etiquetas_categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turno_id UUID REFERENCES configuracion_turnos(id) ON DELETE CASCADE,
    categoria INT NOT NULL CHECK (categoria BETWEEN 1 AND 8),
    labels TEXT[] DEFAULT '{}',
    UNIQUE(turno_id, categoria)
);

-- Enable RLS
ALTER TABLE maestro_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriz_costos_calculados ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas_categorias ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public Read Access Concepts" ON maestro_conceptos FOR SELECT USING (true);
CREATE POLICY "Public Write Access Concepts" ON maestro_conceptos FOR ALL USING (true);

CREATE POLICY "Public Read Access Shifts" ON configuracion_turnos FOR SELECT USING (true);
CREATE POLICY "Public Write Access Shifts" ON configuracion_turnos FOR ALL USING (true);

CREATE POLICY "Public Read Access Matrix" ON matriz_costos_calculados FOR SELECT USING (true);
CREATE POLICY "Public Write Access Matrix" ON matriz_costos_calculados FOR ALL USING (true);

CREATE POLICY "Public Read Access Labels" ON etiquetas_categorias FOR SELECT USING (true);
CREATE POLICY "Public Write Access Labels" ON etiquetas_categorias FOR ALL USING (true);

-- Seed Initial Data
INSERT INTO configuracion_turnos (nombre, factor_multiplicador, es_12h) VALUES 
('8H', 1.0, FALSE),
('12H DÍA', 1.5, TRUE),
('12H NOCHE', 1.5, TRUE),
('24H', 3.0, FALSE)
ON CONFLICT (nombre) DO NOTHING;

-- Seed Basic Concepts
INSERT INTO maestro_conceptos (codigo, nombre, porcentaje, grupo, orden) VALUES 
('A', 'SALARIO BASICO', 0, 'Salarial', 10),
('B', 'REMUNERACION NOCT', 0, 'Salarial', 20),
('C', 'HRS EXTRA DIURNAS', 0, 'Salarial', 30),
('H', 'SUBSIDIO TRANSPORTE', 0, 'Salarial', 40),
('K', 'CESANTIAS', 8.334, 'Prestacional', 50),
('L', 'INTERESES CESANTIAS', 12, 'Prestacional', 60),
('M', 'SUBSIDIO FAMILIAR', 4, 'Parafiscal', 70),
('AB', 'TOTAL DIA HABIL', 0, 'Otros', 500)
ON CONFLICT DO NOTHING;

COMMIT;
