-- Fix Unique Constraint and update formulas
BEGIN;

-- Add UNIQUE constraint to codigo if it doesn't already exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maestro_conceptos_codigo_key') THEN
        ALTER TABLE maestro_conceptos ADD CONSTRAINT maestro_conceptos_codigo_key UNIQUE (codigo);
    END IF;
END $$;

-- Insert A' - SALARIO BASICO DIA
INSERT INTO maestro_conceptos (codigo, nombre, porcentaje, formula, grupo, orden)
VALUES ('A''', 'SALARIO BASICO DIA', 0, 'A/30', 'Salarial', 15)
ON CONFLICT (codigo) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    formula = EXCLUDED.formula,
    orden = EXCLUDED.orden;

-- Update AB (Total Dia Habil) to ensure its formula/logic is correct
UPDATE maestro_conceptos 
SET formula = 'A * factor'
WHERE codigo = 'AB';

-- Update K - CESANTIAS formula text
UPDATE maestro_conceptos 
SET formula = '(A'' + H) * 8.33%', porcentaje = 8.33
WHERE codigo = 'K';

COMMIT;
