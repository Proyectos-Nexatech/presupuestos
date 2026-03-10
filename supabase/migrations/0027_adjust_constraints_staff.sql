BEGIN;

-- 1. Ajustar etiquetas y relax check
-- Note: We drop existing check constraints if they exist. We guess names but use IF EXISTS for safety or find them.
-- Since they were often unnamed in previous migrations, we search/replace or drop by name.
-- In Supabase, often they are named table_column_check.

ALTER TABLE etiquetas_categorias DROP CONSTRAINT IF EXISTS etiquetas_categorias_categoria_check;
ALTER TABLE etiquetas_categorias ADD CONSTRAINT etiquetas_categorias_categoria_check CHECK (categoria BETWEEN 1 AND 10);

ALTER TABLE etiquetas_categorias DROP CONSTRAINT IF EXISTS etiquetas_categorias_turno_id_categoria_key;
ALTER TABLE etiquetas_categorias DROP CONSTRAINT IF EXISTS etiquetas_categorias_unique_key;
ALTER TABLE etiquetas_categorias ADD CONSTRAINT etiquetas_categorias_unique_key UNIQUE (turno_id, categoria, tipo_persona);

-- 2. Ajustar matriz para mayor seguridad y relax check
ALTER TABLE matriz_costos_calculados DROP CONSTRAINT IF EXISTS matriz_costos_calculados_categoria_check;
ALTER TABLE matriz_costos_calculados ADD CONSTRAINT matriz_costos_calculados_categoria_check CHECK (categoria BETWEEN 1 AND 10);

ALTER TABLE matriz_costos_calculados DROP CONSTRAINT IF EXISTS matriz_costos_calculados_unique_key;
ALTER TABLE matriz_costos_calculados ADD CONSTRAINT matriz_costos_calculados_unique_key UNIQUE (categoria, turno_id, concepto_id, tipo_persona);

-- 3. Relax checks for staff tables
ALTER TABLE staff_salaries_2026 DROP CONSTRAINT IF EXISTS staff_salaries_2026_nivel_check;
ALTER TABLE staff_salaries_2026 ADD CONSTRAINT staff_salaries_2026_nivel_check CHECK (nivel BETWEEN 1 AND 10);

ALTER TABLE staff_matrix_results DROP CONSTRAINT IF EXISTS staff_matrix_results_nivel_check;
ALTER TABLE staff_matrix_results ADD CONSTRAINT staff_matrix_results_nivel_check CHECK (nivel BETWEEN 1 AND 10);

COMMIT;
