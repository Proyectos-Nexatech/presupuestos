
-- Migration to add extra cost rows X, U, S, T
BEGIN;

INSERT INTO maestro_conceptos (codigo, nombre, porcentaje, formula, grupo, orden) VALUES
('X', 'DOT. IMPLE. SEGUR. + ARNES', 0, 'VR. ACTUAL/90 DIAS', 'Otros', 400),
('U', 'HIELO, AGUA', 0, 'Input', 'Otros', 410),
('S', 'SUBSIDIO ALIMENTACION', 0, 'Input', 'Otros', 420),
('T', 'EXAMENES DE INGRESO', 0, 'Input', 'Otros', 430)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    formula = EXCLUDED.formula,
    orden = EXCLUDED.orden;

COMMIT;
