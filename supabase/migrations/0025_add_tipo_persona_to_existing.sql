-- Add tipo_persona to existing matrix and labels tables
ALTER TABLE matriz_costos_calculados 
    ADD COLUMN IF NOT EXISTS tipo_persona TEXT NOT NULL DEFAULT 'OP';

ALTER TABLE etiquetas_categorias 
    ADD COLUMN IF NOT EXISTS tipo_persona TEXT NOT NULL DEFAULT 'OP';

-- Update uniqueness if needed? 
-- The user didn't explicitly ask to change constraints, but for correctness:
-- For matriz_costos_calculados, the current unique is (categoria, turno_id, concepto_id).
-- Since we are moving staff to a separate table, NO CHANGE is strictly needed to the constraint
-- but it's good for robustness.
