-- Rename the 'valor_total_1' column to avoid 'tota' typo in naming mentally and make schema clear
ALTER TABLE mano_obra RENAME COLUMN valor_total_1 TO valor_total_unitario;
