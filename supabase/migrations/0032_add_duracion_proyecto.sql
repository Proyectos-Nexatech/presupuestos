-- Add duracion_proyecto to config_presupuesto
INSERT INTO config_presupuesto (clave, valor, descripcion) 
VALUES ('duracion_proyecto', 90, 'Duración total del proyecto en días')
ON CONFLICT (clave) DO NOTHING;
