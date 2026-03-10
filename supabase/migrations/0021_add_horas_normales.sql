-- Migration to add HORAS NORMALES and BASICO DIARIO (A'')
BEGIN;

INSERT INTO maestro_conceptos (codigo, nombre, porcentaje, formula, grupo, orden) VALUES
('HN', 'HORAS NORMALES', 0, 'Input', 'Salarial', 16),
('A''''', 'BASICO DIARIO', 0, '(HN * A'') / 8', 'Salarial', 17)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    formula = EXCLUDED.formula,
    orden = EXCLUDED.orden,
    grupo = EXCLUDED.grupo;

COMMIT;
