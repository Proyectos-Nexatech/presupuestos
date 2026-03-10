-- Add missing concepts to maestro_conceptos
BEGIN;

-- Ensure unique constraint exists (from previous migration but just in case)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maestro_conceptos_codigo_key') THEN
        ALTER TABLE maestro_conceptos ADD CONSTRAINT maestro_conceptos_codigo_key UNIQUE (codigo);
    END IF;
END $$;

-- Update/Insert all concepts from the image
-- Ordinales: Salarial (10-99), Prestacional (100-199), Parafiscal (200-299), Otros (300-500)
INSERT INTO maestro_conceptos (codigo, nombre, porcentaje, formula, grupo, orden) VALUES
('A', 'SALARIO BASICO MENSUAL', 0, 'Input', 'Salarial', 10),
('A''', 'VR DIARIO BASICO', 0, 'A / 30', 'Salarial', 15),
('B', 'REMUNERACION NOCT', 0, '(A''/8) * 0.35 * #hrs', 'Salarial', 20),
('C', 'HRS EXTRA DIURNAS', 0, '(A''/8) * 1.25 * #hrs', 'Salarial', 30),
('D', 'HRS EXTRA NOCT', 0, '(A''/8) * 1.75 * #hrs', 'Salarial', 40),
('F', 'DOM / FEST DIURNO', 0, '(A''/8) * 1.75 * #hrs', 'Salarial', 50),
('G', 'DOM / FEST NOCT', 0, '(A''/8) * 2.10 * #hrs', 'Salarial', 60),
('H', 'SUBSIDIO HABITACION', 0, 'Input', 'Salarial', 70),
('I', 'SUBSIDIO TRANSPORTE', 0, 'Input', 'Salarial', 80),
('J', 'PRIMA CONVENCIONAL', 0, 'Input', 'Salarial', 90),
('K', 'CESANTIAS', 8.334, '(A'' + I) * 8.33%', 'Prestacional', 100),
('L', 'INTERESES CESANTIAS', 12, 'K * 12%', 'Prestacional', 110),
('M', 'SUBSIDIO FAMILIAR', 4, 'SUM(A..J) * 4%', 'Parafiscal', 120),
('N', 'SENA', 2, 'SUM(A..J) * 2%', 'Parafiscal', 130),
('O', 'ICBF', 3, 'SUM(A..J) * 3%', 'Parafiscal', 140),
('P', 'I.S.S. (Pensión/Salud)', 18.8, 'SUM(A..J) * 18.8%', 'Parafiscal', 150),
('Q', 'FIC', 1.459, 'Input', 'Parafiscal', 160),
('R', 'COMPENSACION CASINO', 0, 'Input', 'Otros', 170),
('V', 'PRIMA SERVICIOS', 8.33, '(A'' + I) * 8.33%', 'Prestacional', 180),
('W', 'VACACIONES', 4.17, 'A'' * 4.17%', 'Prestacional', 190),
('Y', 'POLIZA COLECTIVA', 0, 'Input', 'Otros', 200),
('Z', 'PRIMA DE PRODUCCION', 0, 'Input', 'Otros', 210),
('AA', 'TOTAL DIA CALENDARIO', 0, 'SUM(A..Z)', 'Otros', 300),
('AB', 'TOTAL DIA HABIL', 0, 'AA * 7 / 5', 'Otros', 310),
('AC', 'VR. HH', 0, 'AB / 8.8', 'Otros', 320),
('AD', 'TOTAL 12 HORAS', 0, 'AB / 2', 'Otros', 330)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    porcentaje = EXCLUDED.porcentaje,
    formula = EXCLUDED.formula,
    grupo = EXCLUDED.grupo,
    orden = EXCLUDED.orden;

COMMIT;
