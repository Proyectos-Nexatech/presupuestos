-- actualizando tabla mano_obra
ALTER TABLE IF EXISTS mano_obra
  DROP COLUMN IF EXISTS perfil,
  DROP COLUMN IF EXISTS intensidad,
  DROP COLUMN IF EXISTS costo_base_dia,
  DROP COLUMN IF EXISTS certificaciones_vencidas;

ALTER TABLE mano_obra
  ADD COLUMN IF NOT EXISTS descripcion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unid text,
  ADD COLUMN IF NOT EXISTS valor_dia numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factor_eq_ma numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total_1 numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grupo text,
  ADD COLUMN IF NOT EXISTS cat text,
  ADD COLUMN IF NOT EXISTS total_horas numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS porcentaje_eq numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vr_hh numeric DEFAULT 0;
