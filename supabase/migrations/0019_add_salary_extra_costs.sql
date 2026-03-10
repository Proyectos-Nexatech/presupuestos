-- Add extra cost concepts for salary matrix
BEGIN;

INSERT INTO maestro_conceptos (codigo, nombre, porcentaje, formula, grupo, orden) VALUES
('X', 'DOT. IMPLE. SEGUR + ARNES', 0, 'Input', 'Otros', 250),
('U', 'HIELO Y AGUA', 0, 'Input', 'Otros', 260),
('S', 'SUBSIDIO ALIMENTACION', 0, 'Input', 'Otros', 270),
('T', 'EXAMENES DE INGRESO', 0, 'Input', 'Otros', 280)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    grupo = EXCLUDED.grupo,
    orden = EXCLUDED.orden;

COMMIT;
