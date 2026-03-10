# Especificaciones Técnicas: Sistema de Gestión de Presupuestos y Costos Operativos (SGPCO)

## 1. Objetivo del Proyecto
Migrar el ecosistema de control presupuestal basado en Excel a una plataforma web centralizada para la gestión global de insumos, control de cumplimiento de personal y generación dinámica de cuadros económicos basados en Análisis de Precios Unitarios (APU).

## 2. Arquitectura de Datos (Módulos Globales)
### 2.1. Maestro de Insumos (Base Global)
- Materiales / Equipos / Herramientas / Transporte / Seguros.
- Campos: ID, Descripción, Unidad, Precio Base, Fecha, Categoría.
### 2.2. Maestro de Mano de Obra e Ingeniería de Turnos
- Perfiles de cargos y Selección de intensidad horaria (24H, 15H, 12H, 8H).
- Costos de Cumplimiento: Exámenes Médicos, Certificaciones y Dotación.
### 2.3. Matriz de Rendimientos
- Base de datos de rendimientos estándar por actividad.

## 3. Matriz de Roles y Validaciones de Seguridad (RBAC)
Control de acceso basado en roles para integridad de costos:
- **Super Admin:** Gestión de usuarios, IVA y porcentajes de AIU globales.
- **Dir. Compras:** Edición de la Tabla Base (Precios globales).
- **RRHH / SISO:** Actualización de Certificaciones, Exámenes y Dotación.
- **Analista Costos:** Creación de APUs y armado del Cuadro Económico.
- **Validaciones:** Bloqueo de presupuesto aprobado y alertas de vencimiento de certificados.

## 4. Diagrama de Flujo: Conexión de Tablas y Datos
1. **Nivel Maestro:** Tabla Base + Config. Turnos + Datos RRHH.
2. **Procesamiento:** El APU extrae costos brutos y aplica factores de turno/rendimiento.
3. **Salida:** El Cuadro Económico consolida cantidades y aplica AIU/IVA.

## 5. Requerimientos de Auditoría (Logs)
El sistema debe registrar un Log inalterable de:
- Cambios en precios globales (Quién, Cuándo, Valor anterior/nuevo).
- Modificación de rendimientos en APU de proyectos activos.
- IP y Fecha/Hora de aprobación de presupuestos finales.

## 6. Integración de la Portada e Info
El módulo de exportación debe generar:
- **Portada:** Logo corporativo, datos de cliente y proyecto.
- **Info:** Términos comerciales y notas aclaratorias.

## 7. Especificación del Cuadro Económico
| Columna | Tipo | Lógica |
| :--- | :--- | :--- |
| ITEMS | Texto | Numeración jerárquica automática. |
| DESCRIPCIÓN | Texto | Nombre de actividad (APU). |
| UNIDAD | Texto | m, m2, kg, etc. |
| CANTIDAD | Numérico | Input de proyecto. |
| RENDIMIENTO | Numérico | Extraído de tabla global. |
| RENDIMIENTO/UD | Calculado | 1 / Rendimiento. |
| PRECIO/UD SUMINISTRO | Dinámico | Materiales + Equipos del APU. |
| PRECIO/UD MONTAJE | Dinámico | Mano de Obra x Turno x Rend/Ud. |
| TOTAL HH | Calculado | Cantidad x Rendimiento/Ud. |
| PRECIO UNITARIO | Calculado | Suministro + Montaje. |
| PRECIO TOTAL | Calculado | Cantidad x Precio Unitario. |

## 8. Criterios de Aceptación
1. Recalculo automático al cambiar turnos (8H a 24H).
2. Bloqueo de firmas si falta cumplimiento RRHH.
3. Notificación de actualización masiva de precios globales.
4. Exportación idéntica al formato corporativo actual.
