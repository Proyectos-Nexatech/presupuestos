-- Add 'tipo' column to mano_obra and insumos tables
ALTER TABLE mano_obra ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'PERSONAL';
ALTER TABLE insumos ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'MATERIALES';
