import { useState, useEffect, Fragment } from 'react';
import { Save, Info, X, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useFormulas } from '../context/FormulaContext';
import './Salarios.css';

interface Concept {
    id: string;
    codigo: string;
    nombre: string;
    porcentaje: number;
    formula: string;
    grupo: string;
    orden: number;
    created_at?: string;
}

interface Shift {
    id: string;
    nombre: string;
    factor_multiplicador: number;
    es_12h: boolean;
}

interface MatrixValue {
    categoria: number;
    turno_id: string;
    concepto_id: string;
    valor_final: number;
    tipo_persona?: string;
}

interface CategoryLabel {
    turno_id: string;
    categoria: number;
    labels: string[];
    tipo_persona?: string;
}

interface StaffSalary {
    id?: string;
    nivel: number;
    cargo_nombre: string;
    salario_basico: number;
    prima_mensual: number;
    prima_produccion_diaria: number;
}

interface MaestroCargo {
    id: string;
    nombre_cargo: string;
    tipo: 'OPERATIVO' | 'ADMINISTRATIVO';
    nivel: number;
    activo: boolean;
}

type PersonType = 'OPERATIVO' | 'ADMINISTRATIVO';

const MasterCell = ({ concept, onUpdateFormula, onUpdatePercent }: {
    concept: Concept,
    onUpdateFormula: (id: string, val: string) => void,
    onUpdatePercent: (id: string, val: number) => void
}) => {
    const [localVal, setLocalVal] = useState<string | number>(concept.porcentaje > 0 ? concept.porcentaje : (concept.formula || ''));

    useEffect(() => {
        setLocalVal(concept.porcentaje > 0 ? concept.porcentaje : (concept.formula || ''));
    }, [concept]);

    const handleCommit = () => {
        if (concept.porcentaje > 0) {
            if (Number(localVal) !== concept.porcentaje) {
                onUpdatePercent(concept.id, Number(localVal));
            }
        } else {
            if (String(localVal) !== (concept.formula || '')) {
                onUpdateFormula(concept.id, String(localVal));
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCommit();
        if (e.key === 'Escape') setLocalVal(concept.porcentaje > 0 ? concept.porcentaje : (concept.formula || ''));
    };

    const isPercentage = !['HN', 'X', 'U', 'S', 'T'].includes(concept.codigo.trim().toUpperCase());
    if (concept.porcentaje > 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                <input
                    type="number"
                    className={`cell-input center ${isPercentage ? 'percentage' : 'master-input-highlight'}`}
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={handleCommit}
                    onKeyDown={handleKeyDown}
                    style={{ width: isPercentage ? '45px' : '75px' }}
                />
                {isPercentage && <span style={{ fontSize: '0.7rem' }}>%</span>}
            </div>
        );
    }

    return (
        <input
            className={`cell-input center ${concept.formula?.toUpperCase() === 'INPUT' ? 'master-input-highlight' : ''}`}
            value={localVal}
            onChange={e => setLocalVal(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            style={{ fontSize: '0.8rem', width: '100%', fontWeight: 700 }}
        />
    );
};

const MatrixCell = ({ val, concept, category, activePersonType, isCalc, onUpdate }: {
    val: number,
    concept: Concept,
    category: number,
    activePersonType: string,
    isCalc: boolean,
    onUpdate: (cat: number, cid: string, v: number) => void
}) => {
    const [localVal, setLocalVal] = useState<string>((val === null || val === undefined || isNaN(val) || val === 0) ? '' : val.toString());

    useEffect(() => {
        setLocalVal((val === null || val === undefined || isNaN(val) || val === 0) ? '' : val.toString());
    }, [val]);

    const handleCommit = () => {
        const num = parseFloat(localVal) || 0;
        if (num !== val) {
            onUpdate(category, concept.id, num);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setLocalVal((val === null || val === undefined || isNaN(val) || val === 0) ? '' : val.toString());
    };

    const isRestricted = activePersonType === 'STAFF' && ['X', 'S'].includes(concept.codigo.trim().toUpperCase());

    return (
        <>
            <span className="currency-symbol">{concept.codigo === 'HN' ? '' : '$'}</span>
            <input
                type="number"
                className={`cell-input right currency ${isCalc ? 'calc-field' : 'input-highlight'}`}
                value={localVal}
                onChange={e => setLocalVal(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={handleKeyDown}
                readOnly={isCalc || isRestricted}
                placeholder="0"
                style={{ width: '100%', fontWeight: isCalc ? 700 : 400 }}
            />
        </>
    );
};

const CargoSelector = ({
    selected,
    options,
    onUpdate
}: {
    selected: string[],
    options: MaestroCargo[],
    onUpdate: (newSelected: string[]) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const isAllSelected = options.length > 0 && options.every(opt => selected.includes(opt.nombre_cargo));

    const handleToggle = (name: string) => {
        if (name === 'TODOS') {
            if (isAllSelected) {
                onUpdate([]);
            } else {
                onUpdate(options.map(o => o.nombre_cargo));
            }
        } else {
            if (selected.includes(name)) {
                onUpdate(selected.filter(s => s !== name));
            } else {
                onUpdate([...selected, name]);
            }
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div
                className="cargo-selector-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected.length === 0 ? (
                    <span style={{ color: '#555', fontSize: '0.7rem', padding: '4px' }}>- Seleccionar -</span>
                ) : (
                    selected.map((sel, idx) => (
                        <div key={`${sel}-${idx}`} className="cargo-chip" title={sel}>
                            {sel}
                            <X
                                size={12}
                                style={{ cursor: 'pointer', opacity: 0.6 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdate(selected.filter((_, i) => i !== idx));
                                }}
                            />
                        </div>
                    ))
                )}
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                    <ChevronDown size={14} />
                </div>
            </div>

            {isOpen && (
                <>
                    <div className="overlay-close" onClick={() => setIsOpen(false)} />
                    <div className="dropdown-container">
                        <div
                            className={`dropdown-item is-todos ${isAllSelected ? 'is-selected' : ''}`}
                            onClick={() => handleToggle('TODOS')}
                        >
                            <div className={`checkbox-custom ${isAllSelected ? 'checked-todos' : ''}`}>
                                {isAllSelected && <Check size={12} color="white" />}
                            </div>
                            <span>{isAllSelected ? 'DESELECCIONAR TODOS' : 'SELECCIONAR TODOS'}</span>
                        </div>
                        {options.map(opt => {
                            const isSelected = selected.includes(opt.nombre_cargo);
                            return (
                                <div
                                    key={opt.id}
                                    className={`dropdown-item ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() => handleToggle(opt.nombre_cargo)}
                                >
                                    <div className={`checkbox-custom ${isSelected ? 'checked' : ''}`}>
                                        {isSelected && <Check size={10} color="white" />}
                                    </div>
                                    <span>{opt.nombre_cargo}</span>
                                </div>
                            );
                        })}
                        {options.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.7rem', color: '#555' }}>
                                No hay cargos creados para este nivel.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const Salarios = () => {
    const { evaluate } = useFormulas();
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [activeShiftId, setActiveShiftId] = useState<string>('');
    const [activePersonType, setActivePersonType] = useState<PersonType>('OPERATIVO');
    const [matrix, setMatrix] = useState<MatrixValue[]>([]);
    const [staffMatrix, setStaffMatrix] = useState<MatrixValue[]>([]);
    const [labels, setLabels] = useState<CategoryLabel[]>([]);
    const [staffSalaries, setStaffSalaries] = useState<StaffSalary[]>([]);
    const [maestroCargos, setMaestroCargos] = useState<MaestroCargo[]>([]);
    const [factorLluvia, setFactorLluvia] = useState(0);
    const [duracionProyecto, setDuracionProyecto] = useState(90);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const currentShift = shifts.find(s => s.id === activeShiftId);
    const categories = activePersonType === 'ADMINISTRATIVO' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6, 7, 8];


    useEffect(() => {
        fetchData();
    }, []);

    const formatCOP = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val);
    };

    const handleFormulaUpdate = async (conceptId: string, newVal: string) => {
        if (window.confirm('¿Está seguro de que desea modificar la regla de cálculo maestro (% / REF)? Esto afectará a todas las categorías.')) {
            setConcepts(prev => {
                const updated = prev.map(c => c.id === conceptId ? { ...c, formula: newVal } : c);
                const target = updated.find(c => c.id === conceptId);
                if (target) {
                    const { id, created_at, ...clean } = target;
                    supabase.from('maestro_conceptos').upsert([clean], { onConflict: 'codigo' })
                        .then(({ error }) => {
                            if (error) console.error('Error auto-saving master concept:', error);
                            else console.log('Master concept updated and saved to Supabase');
                        });
                }
                return updated;
            });
        }
    };

    const updateDuracionProyecto = async (val: number) => {
        setDuracionProyecto(val);
        // We'll also update the concepts state so the table reflects it immediately
        setConcepts(prev => {
            return prev.map(c => {
                const code = c.codigo.trim().toUpperCase();
                if (code === 'T' || code === 'U') {
                    return { ...c, formula: `Dynamic (D=${val})` };
                }
                return c;
            });
        });

        const { error } = await supabase.from('config_presupuesto').upsert({ clave: 'duracion_proyecto', valor: val }, { onConflict: 'clave' });
        if (error) console.error('Error saving duracion_proyecto:', error);

        // Refresh data to get new totals based on this duration
        fetchData();
    };

    const handlePercentageMasterUpdate = async (conceptId: string, newVal: number) => {
        if (window.confirm('¿Desea cambiar el porcentaje de ley para este concepto? Esto recalculará todos los niveles.')) {
            setConcepts(prev => {
                const updated = prev.map(c => c.id === conceptId ? { ...c, porcentaje: newVal } : c);
                const target = updated.find(c => c.id === conceptId);

                if (target) {
                    const { id, created_at, ...clean } = target;
                    supabase.from('maestro_conceptos').upsert([clean], { onConflict: 'codigo' })
                        .then(({ error }) => {
                            if (error) console.error('Error auto-saving master concept:', error);
                        });
                }
                return updated;
            });
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // First fetch global config for duration
            const { data: configDuracion } = await supabase.from('config_presupuesto').select('valor').eq('clave', 'duracion_proyecto').single();
            const durProj = configDuracion ? Number(configDuracion.valor) : 90;
            setDuracionProyecto(durProj);

            const [conceptsRes, shiftsRes, matrixRes, labelsRes, examenesRes, alturasRes, confinadosRes, staffSalariesRes, staffMatrixRes, maestroCargosRes, configRes] = await Promise.all([
                supabase.from('maestro_conceptos').select('*').order('orden', { ascending: true }),
                supabase.from('configuracion_turnos').select('*').order('nombre', { ascending: true }),
                supabase.from('matriz_costos_calculados').select('*'),
                supabase.from('etiquetas_categorias').select('*'),
                supabase.from('examenes_medicos').select('num_examenes_periodo, valor_unitario'),
                supabase.from('certificacion_alturas').select('num_personas_periodo, valor_unitario'),
                supabase.from('certificados_confinados').select('num_personas_periodo, valor_unitario'),
                supabase.from('staff_salaries_2026').select('*').order('nivel', { ascending: true }),
                supabase.from('staff_matrix_results').select('*'),
                supabase.from('maestro_cargos').select('*').eq('activo', true).order('nivel', { ascending: true }).order('nombre_cargo', { ascending: true }),
                supabase.from('config_presupuesto').select('valor').eq('clave', 'factor_lluvia').single()
            ]);

            if (configRes.data) setFactorLluvia(Number(configRes.data.valor));

            if (conceptsRes.error) throw conceptsRes.error;
            if (shiftsRes.error) throw shiftsRes.error;

            let fetchedConcepts = (conceptsRes.data || []) as Concept[];

            // Calculate dynamic T (Examenes de Ingreso)
            const sumExamenes = (examenesRes.data || []).reduce((acc, curr) => acc + ((curr.num_examenes_periodo * curr.valor_unitario) / durProj), 0);

            // Calculate dynamic U (Certificaciones / Gastos de Campo)
            const sumAlturas = (alturasRes.data || []).reduce((acc, curr) => acc + ((curr.num_personas_periodo * curr.valor_unitario) / durProj), 0);
            const sumConfinados = (confinadosRes.data || []).reduce((acc, curr) => acc + ((curr.num_personas_periodo * curr.valor_unitario) / durProj), 0);
            const totalCertificaciones = sumAlturas + sumConfinados;

            fetchedConcepts = fetchedConcepts.map(c => {
                const code = c.codigo.trim().toUpperCase();
                if (code === 'T') {
                    return { ...c, porcentaje: Number(sumExamenes.toFixed(2)), formula: `Dynamic (D=${duracionProyecto})` };
                }
                if (code === 'U') {
                    return { ...c, porcentaje: Number(totalCertificaciones.toFixed(2)), formula: `Dynamic (D=${duracionProyecto})` };
                }
                return c;
            });

            setConcepts(fetchedConcepts);
            setShifts(shiftsRes.data || []);
            setMatrix((matrixRes.data || []).map((m: any) => ({ ...m, tipo_persona: m.tipo_persona || 'OP' })));
            setStaffMatrix((staffMatrixRes.data || []).map((m: any) => ({ ...m, categoria: m.nivel, tipo_persona: 'STAFF' })));
            setLabels((labelsRes.data || []).map(l => ({
                ...l,
                tipo_persona: l.tipo_persona === 'STAFF' || l.tipo_persona === 'ADMINISTRATIVO' ? 'ADMINISTRATIVO' : 'OPERATIVO'
            })) as CategoryLabel[]);

            setStaffSalaries(staffSalariesRes.data || []);

            const normalizedCargos = (maestroCargosRes.data || []).map(c => ({
                ...c,
                tipo: c.tipo === 'STAFF' || c.tipo === 'ADMINISTRATIVO' ? 'ADMINISTRATIVO' : 'OPERATIVO'
            })) as MaestroCargo[];
            setMaestroCargos(normalizedCargos);

            if (shiftsRes.data && shiftsRes.data.length > 0) {
                setActiveShiftId(shiftsRes.data[0].id);
            }
        } catch (err) {
            console.error('Error loading normalized data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && concepts.length > 0 && activeShiftId) {
            const isStaff = activePersonType === 'ADMINISTRATIVO';
            const currentMtx = isStaff ? [...staffMatrix] : [...matrix];

            let anyChanged = false;
            categories.forEach(cat => {
                const filterFn = (m: MatrixValue) => m.categoria === cat && m.turno_id === activeShiftId;
                const beforeValues = currentMtx.filter(filterFn).map(m => `${m.concepto_id}:${m.valor_final}`).sort().join('|');

                recalculateRow(currentMtx, cat, activeShiftId, staffSalaries);

                const afterValues = currentMtx.filter(filterFn).map(m => `${m.concepto_id}:${m.valor_final}`).sort().join('|');
                if (beforeValues !== afterValues) anyChanged = true;
            });

            if (anyChanged) {
                if (isStaff) setStaffMatrix(currentMtx);
                else setMatrix(currentMtx);
            }
        }
    }, [loading, activeShiftId, concepts, activePersonType, staffSalaries, factorLluvia]);

    const getCellValue = (cat: number, conceptoId: string) => {
        const isStaff = activePersonType === 'ADMINISTRATIVO';
        const currentMtx = isStaff ? staffMatrix : matrix;
        const entry = currentMtx.find(m => m.categoria === cat && m.concepto_id === conceptoId && m.turno_id === activeShiftId);

        if (entry) return entry.valor_final;

        if (!isStaff) {
            const concept = concepts.find(c => c.id === conceptoId);
            if (concept) {
                const code = concept.codigo.trim().toUpperCase();
                if (['A', 'I', 'HN', 'PM'].includes(code)) return concept.porcentaje || 0;
            }
        }
        return 0;
    };

    const updateCellValue = (cat: number, conceptoId: string, inputVal: number) => {
        const val = isNaN(inputVal) ? 0 : Number(inputVal.toFixed(2));
        const isStaff = activePersonType === 'ADMINISTRATIVO';

        const concept = concepts.find(c => c.id === conceptoId);
        if (!concept) return;

        const code = concept.codigo.trim().toUpperCase();

        if (isStaff && ['A', 'PM'].includes(code)) {
            const current = staffSalaries.find(s => s.nivel === cat);
            const currentVal = code === 'A' ? (current?.salario_basico || 0) : (current?.prima_mensual || 0);

            if (currentVal > 0 && val !== currentVal) {
                const action = val === 0 ? 'ELIMINAR (poner a 0)' : 'CAMBIAR';
                const msg = `Está intentando ${action} el valor de "${concept.nombre}" para el NIVEL ${cat}.\n\nValor actual: ${formatCOP(currentVal)}\nNuevo valor: ${formatCOP(val)}\n\n¿Desea confirmar este cambio?`;
                if (!window.confirm(msg)) return;
            }
        }

        const newMatrix = isStaff ? [...staffMatrix] : [...matrix];
        updateMatrixVal(newMatrix, cat, conceptoId, activeShiftId, val);

        let currentStaffToPass: StaffSalary[] | undefined = undefined;
        if (isStaff) {
            const newStaff = [...staffSalaries];
            let sIdx = newStaff.findIndex(s => s.nivel === cat);
            if (sIdx === -1) {
                newStaff.push({ nivel: cat, cargo_nombre: `NIVEL ${cat}`, salario_basico: 0, prima_mensual: 0, prima_produccion_diaria: 0 });
                sIdx = newStaff.length - 1;
            }
            if (code === 'A') newStaff[sIdx].salario_basico = val;
            if (code === 'PM') {
                newStaff[sIdx].prima_mensual = val;
                newStaff[sIdx].prima_produccion_diaria = val / 30;
            }
            setStaffSalaries(newStaff);
            currentStaffToPass = newStaff;
        }

        recalculateRow(newMatrix, cat, activeShiftId, currentStaffToPass);

        if (isStaff) setStaffMatrix(newMatrix);
        else setMatrix(newMatrix);
    };

    const recalculateRow = (mtx: MatrixValue[], cat: number, tId: string, currentStaffSalaries?: StaffSalary[]) => {
        const findC = (code: string) => concepts.find(c => c.codigo.trim().toUpperCase() === code.trim().toUpperCase());

        const getVal = (code: string) => {
            const c = findC(code);
            if (!c) return 0;
            return mtx.find(m => m.categoria === cat && m.concepto_id === c.id && m.turno_id === tId)?.valor_final || 0;
        };

        const updateVal = (code: string, val: number) => {
            const c = findC(code);
            if (c) updateMatrixVal(mtx, cat, c.id, tId, Number(val.toFixed(2)));
        };

        // 1. BASE INPUTS
        const isStaff = activePersonType === 'ADMINISTRATIVO';
        const salariesToUse = currentStaffSalaries || staffSalaries;
        const staffData = isStaff ? salariesToUse.find(s => s.nivel === cat) : null;

        const A = isStaff ? (staffData?.salario_basico || 0) : getVal('A');
        const PM = isStaff ? (staffData?.prima_mensual || 0) : getVal('PM');
        const Z_input = isStaff ? (PM / 30) : getVal('Z'); // Temporary Z

        // Sync inputs to matrix
        if (isStaff) {
            updateVal('A', A);
            updateVal('PM', PM);
            updateVal('Z', Z_input);
        }

        // 2. FOUNDATIONAL DERIVATIONS (A', HN)
        const APrime = evaluate("A'", { A });
        updateVal("A'", APrime);

        const HN = evaluate('HN', {});
        updateVal('HN', HN);

        const ADoublePrime = evaluate("A''", { "A'": APrime, HN });
        updateVal("A''", ADoublePrime);

        // 3. FULL SCOPE ITERATION
        const baseH = APrime / 8;

        // Helper to get all current values for scope
        const buildScope = () => {
            const scope: Record<string, any> = {
                A, PM, "A'": APrime, "A''": ADoublePrime, HN, baseH,
                Factor_Lluvia: factorLluvia / 100, isStaff
            };
            concepts.forEach(c => {
                const code = c.codigo.trim().toUpperCase();
                if (!(code in scope)) {
                    scope[code] = getVal(code);
                }
            });
            return scope;
        };

        // Sequential Evaluation groups
        const groups = [
            ['B', 'C', 'D', 'F', 'G', 'H', 'I', 'J'], // Recargos & Subsidies
            ['X', 'U', 'S', 'T'],                     // Extra costs
            ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'V', 'W', 'Y', 'Z'], // Benefits
            ['AA', 'AE', 'AB', 'AC', 'AD']             // Totals
        ];

        groups.forEach(group => {
            const currentScope = buildScope();
            group.forEach(code => {
                const val = evaluate(code, currentScope);
                updateVal(code, val);
                currentScope[code] = val;
            });
        });
    };

    const updateMatrixVal = (mtx: MatrixValue[], cat: number, cId: string, tId: string, val: number) => {
        const idx = mtx.findIndex(m => m.categoria === cat && m.concepto_id === cId && m.turno_id === tId);
        if (idx !== -1) mtx[idx].valor_final = val;
        else mtx.push({ categoria: cat, turno_id: tId, concepto_id: cId, valor_final: val });
    };

    const handleSave = async () => {
        setSaving(true);
        function cleanRecord(item: any) {
            const { id, created_at, updated_at, ...rest } = item;
            return rest;
        }

        try {
            const { error: err1 } = await supabase.from('maestro_conceptos').upsert(concepts.map(cleanRecord), { onConflict: 'codigo' });
            if (err1) throw err1;

            const opMatrix = matrix.filter(m => m.tipo_persona === 'OP' || !m.tipo_persona).map(m => ({ ...m, tipo_persona: 'OP' }));
            const { error: err2 } = await supabase.from('matriz_costos_calculados').upsert(opMatrix.map(cleanRecord), { onConflict: 'categoria, turno_id, concepto_id, tipo_persona' });
            if (err2) throw err2;

            const stMatrix = staffMatrix.filter(m => m.tipo_persona === 'STAFF').map(m => ({
                ...m,
                nivel: m.categoria,
                tipo_persona: 'STAFF'
            }));
            const { error: err2s } = await supabase.from('staff_matrix_results').upsert(stMatrix.map(cleanRecord), { onConflict: 'nivel, turno_id, concepto_id' });
            if (err2s) throw err2s;

            const { error: errConfig } = await supabase.from('config_presupuesto').upsert({ clave: 'factor_lluvia', valor: factorLluvia }, { onConflict: 'clave' });
            if (errConfig) throw errConfig;

            const cleanLabels = labels.map(l => ({
                ...l,
                tipo_persona: l.tipo_persona === 'ADMINISTRATIVO' || l.tipo_persona === 'STAFF' ? 'STAFF' : 'OP'
            }));
            const { error: err3 } = await supabase.from('etiquetas_categorias').upsert(cleanLabels.map(cleanRecord), { onConflict: 'turno_id, categoria, tipo_persona' });
            if (err3) throw err3;

            const { error: err4 } = await supabase.from('staff_salaries_2026').upsert(staffSalaries.map(cleanRecord), { onConflict: 'nivel' });
            if (err4) throw err4;

            alert('Datos sincronizados con Supabase correctamente.');
        } catch (err) {
            console.error('Error saving matrix:', err);
            alert('Error al guardar los datos: ' + (err as any).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="salarios-container">
            <div className="header-section">
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Módulo de Salarios y Prestaciones</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>Estructura de costos laborales basada en turnos y categorías.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="glass" style={{ padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '8px' }}>
                        <Info size={16} style={{ color: 'hsl(var(--primary))' }} />
                        <div>
                            <span style={{ fontSize: '0.65rem', display: 'block', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', fontWeight: 700 }}>DURACIÓN ESTIMADA DEL PROYECTO (DÍAS)</span>
                            <input
                                type="number"
                                value={duracionProyecto}
                                onChange={(e) => updateDuracionProyecto(Number(e.target.value))}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 800, width: '60px', outline: 'none', fontSize: '1rem' }}
                            />
                        </div>
                    </div>
                    <div className="shift-info-badge">
                        <Info size={16} />
                        <span>Visualizando: {currentShift?.nombre}</span>
                    </div>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        <Save size={18} />
                        {saving ? 'Guardando...' : 'Sincronizar Supabase'}
                    </button>
                </div>
            </div>

            <div className="tabs-container">
                {shifts.map(shift => (
                    <button
                        key={shift.id}
                        className={`tab-item ${activeShiftId === shift.id ? 'active' : ''}`}
                        onClick={() => setActiveShiftId(shift.id)}
                    >
                        {shift.nombre}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div className="person-type-tabs" style={{ display: 'flex', gap: '4px', backgroundColor: 'hsl(var(--muted)/0.3)', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                    <button
                        onClick={() => setActivePersonType('OPERATIVO')}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: activePersonType === 'OPERATIVO' ? 'white' : 'transparent',
                            color: activePersonType === 'OPERATIVO' ? 'black' : 'gray',
                            boxShadow: activePersonType === 'OPERATIVO' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer'
                        }}
                    >OPERATIVOS</button>
                    <button
                        onClick={() => setActivePersonType('ADMINISTRATIVO')}
                        style={{
                            padding: '6px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: activePersonType === 'ADMINISTRATIVO' ? 'white' : 'transparent',
                            color: activePersonType === 'ADMINISTRATIVO' ? 'black' : 'gray',
                            boxShadow: activePersonType === 'ADMINISTRATIVO' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer'
                        }}
                    >ADMINISTRATIVOS</button>
                </div>

                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255, 255, 255, 0.1)', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>FACTOR LLUVIA</span>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                type="number"
                                step="0.01"
                                value={factorLluvia}
                                onChange={(e) => setFactorLluvia(parseFloat(e.target.value) || 0)}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '6px',
                                    padding: '0.4rem 1.8rem 0.4rem 0.6rem',
                                    color: 'hsl(var(--primary))',
                                    outline: 'none',
                                    textAlign: 'right',
                                    fontWeight: 800,
                                    fontSize: '0.9rem'
                                }}
                            />
                            <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8, color: 'hsl(var(--primary))' }}>%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass grid-wrapper">
                {loading ? (
                    <div className="loading-overlay">Cargando base de datos maestra...</div>
                ) : (
                    <div className="salary-scroll-box">
                        <table className="salary-table">
                            <thead>
                                <tr className="header-roles">
                                    <th colSpan={3}></th>
                                    {categories.map(n => {
                                        const isStaff = activePersonType === 'ADMINISTRATIVO';
                                        const cargosDelNivel = maestroCargos.filter(c => c.tipo === activePersonType && c.nivel === n);
                                        const selectedCargos = isStaff
                                            ? (staffSalaries.find(s => s.nivel === n)?.cargo_nombre?.split(', ').filter(Boolean) || [])
                                            : (labels.find(l => l.turno_id === activeShiftId && l.categoria === n)?.labels || []);

                                        return (
                                            <th key={n} className="cat-header">
                                                <div className="cat-num">Nivel {n}</div>
                                                <CargoSelector
                                                    selected={selectedCargos}
                                                    options={cargosDelNivel}
                                                    onUpdate={(newSelection) => {
                                                        if (isStaff) {
                                                            const newStaff = [...staffSalaries];
                                                            const idx = newStaff.findIndex(s => s.nivel === n);
                                                            const cargoString = newSelection.join(', ');
                                                            if (idx !== -1) {
                                                                newStaff[idx].cargo_nombre = cargoString;
                                                                setStaffSalaries(newStaff);
                                                            } else {
                                                                newStaff.push({ nivel: n, cargo_nombre: cargoString, salario_basico: 0, prima_mensual: 0, prima_produccion_diaria: 0 });
                                                                setStaffSalaries(newStaff);
                                                            }
                                                        } else {
                                                            const newLabels = [...labels];
                                                            const idx = newLabels.findIndex(l => l.turno_id === activeShiftId && l.categoria === n);
                                                            if (idx !== -1) newLabels[idx].labels = newSelection;
                                                            else newLabels.push({ turno_id: activeShiftId, categoria: n, labels: newSelection, tipo_persona: 'OPERATIVO' });
                                                            setLabels(newLabels);
                                                        }
                                                    }}
                                                />
                                            </th>
                                        );
                                    })}
                                </tr>
                                <tr className="header-cols">
                                    <th style={{ width: '40px' }}>IT</th>
                                    <th style={{ textAlign: 'left' }}>CONCEPTO</th>
                                    <th style={{ width: '80px' }}>% / REF</th>
                                    {categories.map(n => (
                                        <th key={n} style={{ textAlign: 'right' }}>VALOR</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {concepts.map((concept) => {
                                    const code = concept.codigo.trim().toUpperCase();
                                    const isCalc = activePersonType === 'ADMINISTRATIVO'
                                        ? ["A'", "A''", 'HN', 'Q', 'X', 'U', 'S', 'T', 'Z', 'AE', 'K', 'L', 'M', 'N', 'O', 'P', 'V', 'W', 'AA', 'AB', 'AC', 'AD'].includes(code) && code !== 'A' && code !== 'PM'
                                        : ["A'", "A''", 'HN', 'Q', 'X', 'U', 'S', 'T', 'Z', 'AE', 'K', 'L', 'M', 'N', 'O', 'P', 'V', 'W', 'AA', 'AB', 'AC', 'AD'].includes(code);
                                    const isTotal = ['AA', 'AB', 'AC', 'AD', 'AE'].includes(code);
                                    const isHighlightRow = ['X', 'U', 'S', 'T', 'AE'].includes(code);
                                    const isHNRow = code === 'HN';
                                    const isSpacer = code === 'X';

                                    return (
                                        <Fragment key={concept.id}>
                                            {isSpacer && (
                                                <tr className="spacer-row" style={{ height: '2rem', backgroundColor: 'transparent' }}>
                                                    <td colSpan={3 + categories.length}></td>
                                                </tr>
                                            )}
                                            <tr className={`${isTotal ? 'row-group-otros' : `row-group-${concept.grupo.toLowerCase()}`} ${isHighlightRow ? 'row-highlight-extra' : ''} ${isHNRow ? 'row-highlight-hn' : ''}`}>
                                                <td className="center bold">{concept.codigo}</td>
                                                <td className="left">
                                                    <div style={{ fontWeight: 600 }}>{concept.nombre}</div>
                                                    <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{concept.grupo}</div>
                                                </td>
                                                <td className="center">
                                                    <MasterCell
                                                        concept={concept}
                                                        onUpdateFormula={handleFormulaUpdate}
                                                        onUpdatePercent={handlePercentageMasterUpdate}
                                                    />
                                                </td>
                                                {categories.map(n => {
                                                    const val = getCellValue(n, concept.id);
                                                    return (
                                                        <td key={n} className="value-cell" style={{ textAlign: 'right' }}>
                                                            <div className="currency-wrapper" style={{ justifyContent: 'flex-end' }}>
                                                                {isTotal ? (
                                                                    <span style={{ fontWeight: 800 }}>{formatCOP(val)}</span>
                                                                ) : (
                                                                    <MatrixCell
                                                                        val={val}
                                                                        concept={concept}
                                                                        category={n}
                                                                        activePersonType={activePersonType}
                                                                        isCalc={isCalc}
                                                                        onUpdate={updateCellValue}
                                                                    />
                                                                )}
                                                            </div>
                                                            {val > 0 && !isTotal && <div className="formatted-val">{Number(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="footer-legend">
                <div className="legend-item"><span className="dot salarial"></span> Salarial</div>
                <div className="legend-item"><span className="dot prestacional"></span> Prestacional</div>
                <div className="legend-item"><span className="dot parafiscal"></span> Parafiscal</div>
                <div className="legend-item"><span className="dot calc"></span> Automático</div>
            </div>
        </div>
    );
};

export default Salarios;
