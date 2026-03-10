-- Insertion of dynamic formulas for other modules (Examenes Medicos, Alturas, Confinados, Cuadro Economico)

INSERT INTO config_formulas (seccion, variable_nombre, descripcion, formula_expresion, tipo, orden)
VALUES
('Examenes Medicos', 'EXAM_TOT', 'Valor Total Examen', 'n * u', 'formula', 600),
('Examenes Medicos', 'EXAM_DIA', 'Valor Día Examen', 'V_TOT / D_PROY', 'formula', 610)
ON CONFLICT (variable_nombre) DO UPDATE SET formula_expresion = EXCLUDED.formula_expresion;

INSERT INTO config_formulas (seccion, variable_nombre, descripcion, formula_expresion, tipo, orden)
VALUES
('Certificacion Alturas', 'CERT_TOT', 'Valor Total Certificación', 'n * u', 'formula', 700),
('Certificacion Alturas', 'CERT_DIA', 'Valor Día Certificación', 'V_TOT / D_PROY', 'formula', 710)
ON CONFLICT (variable_nombre) DO UPDATE SET formula_expresion = EXCLUDED.formula_expresion;

INSERT INTO config_formulas (seccion, variable_nombre, descripcion, formula_expresion, tipo, orden)
VALUES
('Certificados Confinados', 'CONF_TOT', 'Valor Total Cert. Confinados', 'n * u', 'formula', 800),
('Certificados Confinados', 'CONF_DIA', 'Valor Día Cert. Confinados', 'V_TOT / D_PROY', 'formula', 810)
ON CONFLICT (variable_nombre) DO UPDATE SET formula_expresion = EXCLUDED.formula_expresion;

INSERT INTO config_formulas (seccion, variable_nombre, descripcion, formula_expresion, tipo, orden)
VALUES
('Cuadro Economico', 'ADMIN_COST', 'Administración', 'DIRECTO * 0.15', 'formula', 900),
('Cuadro Economico', 'IMP_COST', 'Imprevisto', 'DIRECTO * 0.02', 'formula', 910),
('Cuadro Economico', 'UTIL_COST', 'Utilidad', 'DIRECTO * 0.08', 'formula', 920),
('Cuadro Economico', 'IVA_COST', 'IVA', 'SUBTOTAL * 0.19', 'formula', 930)
ON CONFLICT (variable_nombre) DO UPDATE SET formula_expresion = EXCLUDED.formula_expresion;
