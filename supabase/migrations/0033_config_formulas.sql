-- Create config_formulas table
CREATE TABLE IF NOT EXISTS config_formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seccion TEXT NOT NULL, -- 'Salarios', 'APU', 'Dotacion', 'Global'
    variable_nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    formula_expresion TEXT,
    valor_constante NUMERIC DEFAULT 0,
    tipo TEXT NOT NULL DEFAULT 'formula', -- 'formula', 'constante', 'input'
    dependencias TEXT[],
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create config_formula_versions table for snapshotting
CREATE TABLE IF NOT EXISTS config_formula_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_version TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    es_original BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Data for Salarios
INSERT INTO config_formulas (seccion, variable_nombre, descripcion, formula_expresion, tipo, orden) VALUES
('Salarios', 'A', 'Salario Básico Mensual', 'INPUT', 'input', 10),
('Salarios', 'PM', 'Prima Mensual (Extra-legal)', 'INPUT', 'input', 20),
('Salarios', 'A''', 'Vr Diario Básico', 'A / 30', 'formula', 30),
('Salarios', 'HN', 'Horas Normales', '8.8', 'constante', 40),
('Salarios', 'A''''', 'Básico Diario', '(HN * A'') / 8', 'formula', 50),
('Salarios', 'B', 'Remuneración Nocturna (Factor 0.35)', '(A'' / 8) * 0.35', 'formula', 60),
('Salarios', 'C', 'Horas Extra Diurnas (Factor 1.25)', '(A'' / 8) * 1.25', 'formula', 70),
('Salarios', 'D', 'Horas Extra Nocturnas (Factor 1.75)', '(A'' / 8) * 1.75', 'formula', 80),
('Salarios', 'E', 'Dominical/Festivo Diurno (Factor 1.75)', 'A'' * 1.75', 'formula', 90),
('Salarios', 'F', 'Dominical/Festivo Nocturno (Factor 2.0)', 'A'' * 2', 'formula', 100),
('Salarios', 'H', 'Subsidio Transporte Diario', '117172 / 30', 'constante', 110),
('Salarios', 'K', 'Cesantías', 'SUM(A..J) * 0.08334', 'formula', 120),
('Salarios', 'L', 'Intereses Cesantías', 'K * 0.12', 'formula', 130),
('Salarios', 'M', 'Subsidio Familiar', 'SUM(A..G) * 0.04', 'formula', 140),
('Salarios', 'N', 'SENA', 'SUM(A..G) * 0.02', 'formula', 150),
('Salarios', 'O', 'ICBF', 'SUM(A..G) * 0.03', 'formula', 160),
('Salarios', 'P', 'Seguridad Social (ISS)', 'SUM(A..G) * 0.1889', 'formula', 170),
('Salarios', 'Q', 'FIC', '1459', 'constante', 180),
('Salarios', 'V', 'Prima de Servicios', 'SUM(A..J) * 0.0833', 'formula', 190),
('Salarios', 'W', 'Vacaciones', 'SUM(A..J) * 0.0417', 'formula', 200),
('Salarios', 'Y', 'Póliza Colectiva', 'SUM(A..J) * 0.03165', 'formula', 210),
('Salarios', 'Z', 'Prima de Producción (Fijo)', 'INPUT', 'input', 220),
('Salarios', 'AA', 'Total Día Calendario', 'SUM(A..Z)', 'formula', 230),
('Salarios', 'AB', 'Total Día Hábil', '(AA * 1.857) * (1 + Factor_Lluvia)', 'formula', 240),
('Salarios', 'AC', 'Vr. Hora Hombre', 'AB / 8.8', 'formula', 250);

-- Seed Initial Data for APU
INSERT INTO config_formulas (seccion, variable_nombre, descripcion, formula_expresion, tipo, orden) VALUES
('APU', 'MO_UNIT', 'Ecuación Maestra Mano de Obra', '(num_trab * salario_diario) / rendimiento', 'formula', 300);

-- Seed Initial Data for Dotacion
INSERT INTO config_formulas (seccion, variable_nombre, descripcion, formula_expresion, tipo, orden) VALUES
('Dotacion', 'FREC', 'Frecuencia de Reposición', 'ceil(D_PROY / D_ITEM)', 'formula', 400),
('Dotacion', 'V_DIA', 'Costo Diario Prorrateado', '(C_PROY * FREC * V_UNIT) / D_PROY', 'formula', 410);

-- Seed Initial Data for Global
INSERT INTO config_formulas (seccion, variable_nombre, descripcion, formula_expresion, valor_constante, tipo, orden) VALUES
('Global', 'IPC', 'Índice de Precios al Consumidor (2026)', '1.0954', 1.0954, 'constante', 500);

-- Create initial snapshot
INSERT INTO config_formula_versions (nombre_version, snapshot, es_original)
SELECT 'Versión Inicial (Diciembre 2024)', json_agg(t), true FROM config_formulas t;
