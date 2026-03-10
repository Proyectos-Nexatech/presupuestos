-- Migration to sync insumos table schema with mano_obra table
ALTER TABLE insumos 
DROP COLUMN IF EXISTS unidad,
DROP COLUMN IF EXISTS precio_base,
DROP COLUMN IF EXISTS categoria,
DROP COLUMN IF EXISTS fecha;

ALTER TABLE insumos
ADD COLUMN IF NOT EXISTS unid text default '',
ADD COLUMN IF NOT EXISTS turno text default '',
ADD COLUMN IF NOT EXISTS valor_dia numeric default 0,
ADD COLUMN IF NOT EXISTS factor_eq_ma numeric default 0,
ADD COLUMN IF NOT EXISTS iva numeric default 0,
ADD COLUMN IF NOT EXISTS valor_total_unitario numeric default 0,
ADD COLUMN IF NOT EXISTS grupo text default '',
ADD COLUMN IF NOT EXISTS cat text default '',
ADD COLUMN IF NOT EXISTS total_horas numeric default 0,
ADD COLUMN IF NOT EXISTS valor_total numeric default 0,
ADD COLUMN IF NOT EXISTS porcentaje_eq numeric default 0,
ADD COLUMN IF NOT EXISTS vr_hh numeric default 0,
ADD COLUMN IF NOT EXISTS created_at timestamptz default now();
