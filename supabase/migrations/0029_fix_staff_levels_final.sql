-- Final migration to ensure all constraints support levels 1-10 for administrative staff
-- and fix any missing unique constraints for upserts.

BEGIN;

-- 1. Relax check constraints on all relevant tables to support up to 10 levels
ALTER TABLE IF EXISTS etiquetas_categorias DROP CONSTRAINT IF EXISTS etiquetas_categorias_categoria_check;
ALTER TABLE etiquetas_categorias ADD CONSTRAINT etiquetas_categorias_categoria_check CHECK (categoria BETWEEN 1 AND 10);

ALTER TABLE IF EXISTS matriz_costos_calculados DROP CONSTRAINT IF EXISTS matriz_costos_calculados_categoria_check;
ALTER TABLE matriz_costos_calculados ADD CONSTRAINT matriz_costos_calculados_categoria_check CHECK (categoria BETWEEN 1 AND 10);

ALTER TABLE IF EXISTS staff_salaries_2026 DROP CONSTRAINT IF EXISTS staff_salaries_2026_nivel_check;
ALTER TABLE staff_salaries_2026 ADD CONSTRAINT staff_salaries_2026_nivel_check CHECK (nivel BETWEEN 1 AND 10);

ALTER TABLE IF EXISTS staff_matrix_results DROP CONSTRAINT IF EXISTS staff_matrix_results_nivel_check;
ALTER TABLE staff_matrix_results ADD CONSTRAINT staff_matrix_results_nivel_check CHECK (nivel BETWEEN 1 AND 10);

-- 2. Ensure unique constraints are correctly set for upserts (if not already there)
ALTER TABLE IF EXISTS etiquetas_categorias DROP CONSTRAINT IF EXISTS etiquetas_categorias_turno_id_categoria_tipo_persona_key;
ALTER TABLE etiquetas_categorias ADD CONSTRAINT etiquetas_categorias_unique_key_v2 UNIQUE (turno_id, categoria, tipo_persona);

ALTER TABLE IF EXISTS staff_salaries_2026 DROP CONSTRAINT IF EXISTS staff_salaries_2026_nivel_key;
ALTER TABLE staff_salaries_2026 ADD CONSTRAINT staff_salaries_2026_nivel_unique UNIQUE (nivel);

-- 3. Seed missing levels for 9 and 10 in staff_salaries_2026 if they don't exist
INSERT INTO staff_salaries_2026 (nivel, cargo_nombre, salario_basico, prima_mensual, prima_produccion_diaria) VALUES
(9, 'NIVELES 9 Y 10 (ADMINISTRATIVO)', 0, 0, 0),
(10, 'NIVELES 9 Y 10 (ADMINISTRATIVO)', 0, 0, 0)
ON CONFLICT (nivel) DO NOTHING;

COMMIT;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
