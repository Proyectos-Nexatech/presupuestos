import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';

interface Cargo {
    id: string;
    descripcion: string;
    unid: string;
    turno: string;
    tipo: string;
    valor_dia: number;
    factor_eq_ma: number;
    iva: number;
    valor_total_unitario: number;
    grupo: string;
    cat: string;
    total_horas: number;
    valor_total: number;
    porcentaje_eq: number;
    vr_hh: number;
    created_at?: string;
}

const TIPOS = ['PERSONAL', 'STAFF', 'HERRAMIENTAS', 'EQUIPOS', 'TRANSPORTE', 'MATERIALES', 'SEGUROS Y OTROS'];

const ManoObra = () => {
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [matrix, setMatrix] = useState<any[]>([]);
    const [staffMatrix, setStaffMatrix] = useState<any[]>([]);
    const [staffBaseSalaries, setStaffBaseSalaries] = useState<any[]>([]);
    const [shifts_config, setShiftsConfig] = useState<any[]>([]);
    const [salaryConcepts, setSalaryConcepts] = useState<any[]>([]);
    const [factorLluvia, setFactorLluvia] = useState(0);

    const handleFactorLluviaChange = (val: number) => {
        setFactorLluvia(val);
    };

    // Form State
    const [form, setForm] = useState<Omit<Cargo, 'id' | 'created_at'>>({
        descripcion: '',
        unid: 'HH',
        turno: '',
        tipo: TIPOS[0],
        valor_dia: 0,
        factor_eq_ma: 1, // Default factor to 1
        iva: 0,
        valor_total_unitario: 0,
        grupo: '',
        cat: '1', // Nivel / Categoría
        total_horas: 8,
        valor_total: 0,
        porcentaje_eq: 0,
        vr_hh: 0
    });

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    useEffect(() => {
        fetchCargos();
        if (isSupabaseConfigured) fetchMatrixData();
    }, []);

    const fetchMatrixData = async () => {
        try {
            const [matrixRes, shiftsRes, conceptsRes, staffMatrixRes, staffSalariesRes, configRes] = await Promise.all([
                supabase.from('matriz_costos_calculados').select('*'),
                supabase.from('configuracion_turnos').select('*'),
                supabase.from('maestro_conceptos').select('*'),
                supabase.from('staff_matrix_results').select('*'),
                supabase.from('staff_salaries_2026').select('*'),
                supabase.from('config_presupuesto').select('valor').eq('clave', 'factor_lluvia').single()
            ]);

            if (configRes.data) setFactorLluvia(Number(configRes.data.valor));
            if (matrixRes.data) setMatrix(matrixRes.data);
            if (staffMatrixRes.data) setStaffMatrix(staffMatrixRes.data);
            if (staffSalariesRes.data) setStaffBaseSalaries(staffSalariesRes.data);
            if (shiftsRes.data) setShiftsConfig(shiftsRes.data || []);
            if (conceptsRes.data) setSalaryConcepts(conceptsRes.data || []);
            return {
                matrix: matrixRes.data,
                staffMatrix: staffMatrixRes.data,
                shifts: shiftsRes.data,
                concepts: conceptsRes.data,
                staffBaseSalaries: staffSalariesRes.data
            };
        } catch (err) {
            console.error('Error fetching matrix data:', err);
            return null;
        }
    };

    const fetchCargos = async () => {
        setLoading(true);
        if (!isSupabaseConfigured) {
            setCargos([
                { id: '1', descripcion: 'EJEMPLO OFICIAL', unid: 'HH', turno: '8H', tipo: 'PERSONAL', valor_dia: 45000, factor_eq_ma: 1.5, iva: 19, valor_total_unitario: 53550, grupo: 'A', cat: '1', total_horas: 8, valor_total: 428400, porcentaje_eq: 10, vr_hh: 5625 },
            ]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('mano_obra').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching cargos:', error);
        } else {
            setCargos(data || []);
        }
        setLoading(false);
    };

    const handleDownloadTemplate = () => {
        const headers = ['DESCRIPCION', 'UNID', 'TURNO', 'TIPO', 'VALOR DIA', 'FACTOR EQ-MA', 'IVA', 'VALOR TOTAL', 'GRUPO', 'CAT', 'TOTAL HORAS', 'VALOR TOTAL', '% EQ', 'VR. HH'];
        const row = ['EJEMPLO OFICIAL', 'HH', '8H', 'PERSONAL', '45000', '1.5', '19', '53550', 'A', '1', '8', '428400', '10', '5625'];
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + row.join(";");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_mano_obra.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSyncSalarios = async () => {
        if (!isSupabaseConfigured) return;
        setLoading(true);
        try {
            const [labelsRes, staffRes, shiftsRes, existingRes] = await Promise.all([
                supabase.from('etiquetas_categorias').select('*'),
                supabase.from('staff_salaries_2026').select('*'),
                supabase.from('configuracion_turnos').select('*'),
                supabase.from('mano_obra').select('descripcion')
            ]);

            const shifts = shiftsRes.data || [];
            const existingNames = new Set((existingRes.data || []).map((e: any) => e.descripcion.toUpperCase()));
            const rolesToAdd: any[] = [];

            // Operational Roles
            (labelsRes.data || []).forEach((l: any) => {
                const shift = shifts.find(s => s.id === l.turno_id);
                if (!shift) return;
                (l.labels || []).forEach((labelName: string) => {
                    if (!labelName) return;
                    const desc = `${labelName.toUpperCase()} ${shift.nombre}`;
                    if (!existingNames.has(desc.toUpperCase())) {
                        rolesToAdd.push({
                            descripcion: desc,
                            unid: 'DIA',
                            turno: shift.nombre,
                            tipo: 'PERSONAL',
                            grupo: 'MOB',
                            cat: l.categoria.toString(),
                            factor_eq_ma: 1,
                            iva: 0,
                            total_horas: 8
                        });
                        existingNames.add(desc.toUpperCase());
                    }
                });
            });

            // Staff Roles
            (staffRes.data || []).forEach((s: any) => {
                const cargos = s.cargo_nombre?.split(',').map((c: string) => c.trim()).filter(Boolean) || [];
                cargos.forEach((cargo: string) => {
                    shifts.forEach((shift: any) => {
                        const desc = `${cargo.toUpperCase()} ${shift.nombre}`;
                        if (!existingNames.has(desc.toUpperCase())) {
                            rolesToAdd.push({
                                descripcion: desc,
                                unid: 'DIA',
                                turno: shift.nombre,
                                tipo: 'STAFF',
                                grupo: 'MOB',
                                cat: s.nivel.toString(),
                                factor_eq_ma: 1,
                                iva: 0,
                                total_horas: 8
                            });
                            existingNames.add(desc.toUpperCase());
                        }
                    });
                });
            });

            if (rolesToAdd.length > 0) {
                const { error } = await supabase.from('mano_obra').insert(rolesToAdd);
                if (error) throw error;
                alert(`Se han sincronizado ${rolesToAdd.length} nuevos cargos desde el módulo de salarios.`);
            } else {
                alert('Todos los cargos de salarios ya están presentes en la tabla.');
            }
            fetchCargos();
        } catch (err: any) {
            console.error('Error syncing roles:', err);
            alert('Error al sincronizar cargos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };


    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const rows = text.split(/\r?\n/).filter(r => r.trim() !== '');
            if (rows.length < 2) {
                alert('El archivo CSV está vacío o no tiene el formato correcto.');
                setLoading(false);
                return;
            }

            const delimiter = rows[0].includes(';') ? ';' : ',';
            const dataRows = rows.slice(1);

            const newItems = dataRows.map(row => {
                const columns = row.split(delimiter);

                return {
                    descripcion: columns[0]?.trim() || '',
                    unid: columns[1]?.trim() || '',
                    turno: columns[2]?.trim() || '',
                    tipo: columns[3]?.trim() || 'PERSONAL',
                    valor_dia: Number(columns[4]?.trim().replace(',', '.')) || 0,
                    factor_eq_ma: Number(columns[5]?.trim().replace(',', '.')) || 0,
                    iva: Number(columns[6]?.trim().replace(',', '.')) || 0,
                    valor_total_unitario: Number(columns[7]?.trim().replace(',', '.')) || 0,
                    grupo: columns[8]?.trim() || '',
                    cat: columns[9]?.trim() || '',
                    total_horas: Number(columns[10]?.trim().replace(',', '.')) || 0,
                    valor_total: Number(columns[11]?.trim().replace(',', '.')) || 0,
                    porcentaje_eq: Number(columns[12]?.trim().replace(',', '.')) || 0,
                    vr_hh: Number(columns[13]?.trim().replace(',', '.')) || 0,
                    created_at: new Date().toISOString()
                };
            }).filter(i => i.descripcion !== '');

            if (isSupabaseConfigured) {
                try {
                    const { error } = await supabase.from('mano_obra').insert(newItems);
                    if (error) throw error;
                    fetchCargos();
                } catch (error: any) {
                    console.error('Error uploading CSV:', error);
                    alert(`Error al subir los datos a Supabase: \${error.message || 'Error desconocido'}`);
                }
            } else {
                const withIds = newItems.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) }));
                setCargos([...cargos, ...withIds as Cargo[]]);
            }
            setIsUploadModalOpen(false);
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleOpenModal = async (cargo?: Cargo) => {
        const freshData = isSupabaseConfigured ? await fetchMatrixData() : null;

        if (cargo) {
            setEditingCargo(cargo);
            const initialForm = {
                descripcion: cargo.descripcion,
                unid: cargo.unid,
                turno: cargo.turno,
                tipo: cargo.tipo || TIPOS[0],
                valor_dia: cargo.valor_dia,
                factor_eq_ma: cargo.factor_eq_ma,
                iva: cargo.iva,
                valor_total_unitario: cargo.valor_total_unitario,
                grupo: cargo.grupo,
                cat: cargo.cat,
                total_horas: cargo.total_horas,
                valor_total: cargo.valor_total,
                porcentaje_eq: cargo.porcentaje_eq,
                vr_hh: cargo.vr_hh
            };
            setForm(initialForm);
            // If it's PERSONAL and was saved with 0s, try to recalculate immediately
            if (['PERSONAL', 'STAFF'].includes(initialForm.tipo) && (initialForm.valor_dia === 0 || initialForm.vr_hh === 0)) {
                updateCalculations(initialForm, freshData?.matrix || [], freshData?.concepts || [], freshData?.staffMatrix || []);
            }
        } else {
            setEditingCargo(null);
            setForm({
                descripcion: '',
                unid: 'HH',
                turno: '',
                tipo: TIPOS[0],
                valor_dia: 0,
                factor_eq_ma: 1,
                iva: 0,
                valor_total_unitario: 0,
                grupo: '',
                cat: '1',
                total_horas: 8,
                valor_total: 0,
                porcentaje_eq: 0,
                vr_hh: 0
            });
        }
        setIsModalOpen(true);
    };

    const updateCalculations = (updatedForm: typeof form, matrixData?: any[], conceptsData?: any[], staffMatrixData?: any[]) => {
        // Safe numeric conversion
        const safeNum = (v: any) => {
            const n = parseFloat(String(v));
            return isNaN(n) ? 0 : n;
        };

        const isStaff = updatedForm.tipo === 'STAFF';
        const mtx = isStaff ? (staffMatrixData || staffMatrix) : (matrixData || matrix);
        const concepts = conceptsData || salaryConcepts;

        const catRaw = String(updatedForm.cat || '0').match(/\d+/);
        const catNum = catRaw ? parseInt(catRaw[0]) : 0;
        const shiftId = (shifts_config || []).find(s => (s.nombre || '').toUpperCase().trim() === (updatedForm.turno || '').toUpperCase().trim())?.id;

        if (['PERSONAL', 'STAFF'].includes(updatedForm.tipo) && catNum && shiftId && (mtx || []).length > 0 && (concepts || []).length > 0) {
            const acConcept = concepts.find(c => (c.codigo || '').trim().toUpperCase() === 'AC');
            const abConcept = concepts.find(c => (c.codigo || '').trim().toUpperCase() === 'AB');

            if (acConcept && abConcept) {
                const abId = abConcept.id;
                const acId = acConcept.id;

                const queryField = isStaff ? 'nivel' : 'categoria';
                const valHabValue = mtx.find(m => m[queryField] === catNum && m.turno_id === shiftId && m.concepto_id === abId)?.valor_final;
                const vrHhValue = mtx.find(m => m[queryField] === catNum && m.turno_id === shiftId && m.concepto_id === acId)?.valor_final;

                const baseAb = safeNum(valHabValue);
                const vrHhBase = safeNum(vrHhValue);

                const factorLl = 1; // Factor Lluvia is already included in AB/AC from Salarios matrix
                const valDia = baseAb * factorLl;
                const vrHh = vrHhBase * factorLl;

                const iva = safeNum(updatedForm.iva);
                const factorEq = safeNum(updatedForm.factor_eq_ma) || 1;
                const totalUnit = valDia * (1 + (iva / 100));

                setForm({
                    ...updatedForm,
                    valor_dia: valDia,
                    vr_hh: vrHh,
                    valor_total_unitario: totalUnit,
                    valor_total: totalUnit * factorEq
                });
            }
        } else {
            const base = safeNum(updatedForm.valor_dia);
            const iva = safeNum(updatedForm.iva);
            const factor = safeNum(updatedForm.factor_eq_ma) || 1;
            const totalUnit = base * (1 + (iva / 100));

            setForm({
                ...updatedForm,
                valor_total_unitario: totalUnit,
                valor_total: totalUnit * factor
            });
        }
    };

    // Auto-update if modal is open and matrix/concepts arrive
    useEffect(() => {
        if (isModalOpen && ['PERSONAL', 'STAFF'].includes(form.tipo) && matrix.length > 0 && salaryConcepts.length > 0) {
            updateCalculations(form);
        }
    }, [isModalOpen, matrix.length, staffMatrix.length, salaryConcepts.length, factorLluvia]);

    const getEffectiveValues = (row: Cargo) => {
        const isStaff = row.tipo === 'STAFF' || row.tipo === 'ADMINISTRATIVO';
        if (row.tipo !== 'PERSONAL' && !isStaff) {
            return {
                valor_dia: row.valor_dia,
                vr_hh: row.vr_hh,
                valor_total_unitario: row.valor_total_unitario,
                valor_total: row.valor_total
            };
        }

        const catRaw = String(row.cat || '0').match(/\d+/);
        const catNum = catRaw ? parseInt(catRaw[0]) : 0;
        const shift = shifts_config.find(s => (s.nombre || '').toUpperCase().trim() === (row.turno || '').toUpperCase().trim());
        const shiftId = shift?.id;

        const findSC = (code: string) => salaryConcepts.find(c => c.codigo.trim().toUpperCase() === code.trim().toUpperCase());
        const abConcept = findSC('AB');
        const acConcept = findSC('AC');

        // Look into BOTH matrix tables just in case
        let abValue = 0;
        let acValue = 0;
        let found = false;

        if (catNum && shiftId && salaryConcepts.length > 0) {
            // Priority matrix depending on type
            const matricesToCheck = isStaff ? [staffMatrix, matrix] : [matrix, staffMatrix];

            for (const mtx of matricesToCheck) {
                if (!mtx || mtx.length === 0) continue;

                // Try to find with 'nivel' or 'categoria'
                const entryAB = mtx.find(m =>
                    (m.nivel === catNum || m.categoria === catNum) &&
                    m.turno_id === shiftId &&
                    m.concepto_id === abConcept?.id
                );
                const entryAC = mtx.find(m =>
                    (m.nivel === catNum || m.categoria === catNum) &&
                    m.turno_id === shiftId &&
                    m.concepto_id === acConcept?.id
                );

                if (entryAB) {
                    abValue = entryAB.valor_final || 0;
                    acValue = entryAC?.valor_final || (abValue / 8.8);
                    found = true;
                    break;
                }
            }
        }

        // STAFF FALLBACK CALCULATION if not found in matrix
        if (!found && isStaff && catNum && staffBaseSalaries.length > 0) {
            const staffBase = staffBaseSalaries.find(s => s.nivel === catNum);
            if (staffBase) {
                const A = staffBase.salario_basico || 0;
                const PM = staffBase.prima_mensual || 0;

                // Simplified calculation matching Salarios.tsx logic:
                // AA = (A/30) + Prestaciones (approx 68% for staff) + PM/30
                const APrime = A / 30;
                const Z = PM / 30;

                // Re-calculating AA precisely from master concepts
                const getRef = (code: string) => (findSC(code)?.porcentaje || 0) / 100;
                const sumAtoG = APrime; // Approx if others are 0
                const sumAtoJ = APrime; // Approx if others are 0

                const K = getRef('K') * sumAtoJ;
                const L = getRef('L') * K;
                const M = getRef('M') * sumAtoG;
                const N = getRef('N') * sumAtoG;
                const O = getRef('O') * sumAtoG;
                const P = getRef('P') * sumAtoG;
                const Q = (A / 40) / 30;
                const V = getRef('V') * sumAtoJ;
                const W = getRef('W') * sumAtoJ;

                // AE Costos fijos
                const AE = 25584 + 18000; // Dotacion + Alimentacion per Salarios.tsx

                const AA = APrime + K + L + M + N + O + P + Q + V + W + Z;
                const ABBase = (AA * 7 / 5) + AE;
                abValue = ABBase * (1 + (factorLluvia / 100)); // Apply factor to fallback
                acValue = abValue / 8.8;
                found = true;
            }
        }

        if (found) {
            const factorLl = 1; // Factor Lluvia is already included in AB/AC from Salarios matrix
            const valor_dia = abValue * factorLl;
            const vr_hh = acValue * factorLl;
            const valor_total_unitario = valor_dia * (1 + ((row.iva || 0) / 100));
            const valor_total = valor_total_unitario * (row.factor_eq_ma || 1);

            return { valor_dia, vr_hh, valor_total_unitario, valor_total };
        }

        return {
            valor_dia: row.valor_dia,
            vr_hh: row.vr_hh,
            valor_total_unitario: row.valor_total_unitario,
            valor_total: row.valor_total
        };
    };

    const handleFormChange = (field: keyof typeof form, value: any) => {
        const updated = { ...form, [field]: value };
        const triggerFields = ['cat', 'turno', 'valor_dia', 'iva', 'factor_eq_ma', 'tipo'];
        if (triggerFields.includes(field)) {
            updateCalculations(updated);
        } else {
            setForm(updated);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const safeNum = (v: any) => {
            const n = parseFloat(String(v));
            return isNaN(n) ? 0 : n;
        };

        const payload = {
            ...form,
            valor_dia: safeNum(form.valor_dia),
            factor_eq_ma: safeNum(form.factor_eq_ma),
            iva: safeNum(form.iva),
            valor_total_unitario: safeNum(form.valor_total_unitario),
            valor_total: safeNum(form.valor_total),
            porcentaje_eq: safeNum(form.porcentaje_eq),
            vr_hh: safeNum(form.vr_hh),
            total_horas: safeNum(form.total_horas),
            created_at: new Date().toISOString()
        };

        if (!isSupabaseConfigured) {
            if (editingCargo) {
                setCargos(cargos.map(c => c.id === editingCargo.id ? { ...c, ...payload } : c));
            } else {
                setCargos([{ ...payload, id: Math.random().toString(36).substr(2, 9) } as Cargo, ...cargos]);
            }
            setIsModalOpen(false);
            setLoading(false);
            return;
        }

        try {
            if (editingCargo) {
                const { error } = await supabase.from('mano_obra').update(payload).eq('id', editingCargo.id);
                if (error) throw error;
                setCargos(cargos.map(c => c.id === editingCargo.id ? { ...c, ...payload } : c));
            } else {
                const { data, error } = await supabase.from('mano_obra').insert([payload]).select();
                if (error) throw error;
                if (data) setCargos([data[0], ...cargos]);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error('Error saving cargo:', err);
            alert('Error al guardar en Supabase.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este ítem?')) return;
        const previous = [...cargos];
        setCargos(cargos.filter(c => c.id !== id));

        if (!isSupabaseConfigured) return;

        try {
            const { error } = await supabase.from('mano_obra').delete().eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error('Error deleting cargo:', err);
            setCargos(previous);
            alert('Error al eliminar.');
        }
    };

    const columns = [
        { header: 'DESCRIPCION', accessor: 'descripcion' as const },
        { header: 'NIVEL', accessor: 'cat' as const },
        { header: 'UNIDAD', accessor: 'unid' as const },
        { header: 'TURNO', accessor: 'turno' as const },
        {
            header: 'VALOR DIA',
            accessor: 'valor_dia',
            render: (row: Cargo) => {
                const vals = getEffectiveValues(row);
                return Number(vals.valor_dia || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
            }
        },
        {
            header: 'TIPO',
            accessor: 'tipo',
            render: (item: Cargo) => (
                <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid hsl(var(--border))',
                    whiteSpace: 'nowrap'
                }}>
                    {item.tipo === 'PERSONAL' ? 'OPERATIVO' : item.tipo === 'STAFF' ? 'ADMINISTRATIVO' : item.tipo}
                </span>
            )
        },
        { header: 'FACTOR', accessor: 'factor_eq_ma', render: (row: Cargo) => Number(row.factor_eq_ma || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 }) },
        {
            header: 'VALOR T. UNIT',
            accessor: 'valor_total_unitario',
            render: (row: Cargo) => {
                const vals = getEffectiveValues(row);
                return Number(vals.valor_total_unitario || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
            }
        },
        { header: 'HRS/DIA', accessor: 'total_horas', render: (row: Cargo) => Number(row.total_horas || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 }) },
        {
            header: 'TOTAL ITEM',
            accessor: 'valor_total',
            render: (row: Cargo) => {
                const vals = getEffectiveValues(row);
                return <span style={{ fontWeight: 600 }}>{Number(vals.valor_total || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>;
            }
        },
        { header: '% EQ', accessor: 'porcentaje_eq', render: (row: Cargo) => `${Number(row.porcentaje_eq || 0)}%` },
        {
            header: 'VR. HH',
            accessor: 'vr_hh',
            render: (row: Cargo) => {
                const vals = getEffectiveValues(row);
                return Number(vals.vr_hh || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
            }
        },
        { header: 'GRUPO', accessor: 'grupo' as const },
        { header: 'IVA', accessor: 'iva', render: (row: Cargo) => `${Number(row.iva || 0)}%` },
    ];



    const InputField = ({ label, field, type = 'text', step = '1', readOnly = false }: { label: string, field: keyof typeof form, type?: string, step?: string, readOnly?: boolean }) => (
        <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>{label}</label>
            <input
                required
                type={type}
                step={step}
                readOnly={readOnly}
                value={form[field]}
                onChange={(e) => handleFormChange(field, type === 'number' ? Number(e.target.value) : e.target.value)}
                style={{ width: '100%', backgroundColor: readOnly ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white', outline: 'none', cursor: readOnly ? 'not-allowed' : 'text' }}
            />
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Mano de Obra e Ingeniería de Turnos</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Control de mano de obra y recursos asociados en este presupuesto.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
                    <button onClick={handleSyncSalarios} className="glass" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'white' }}>
                        <Plus size={18} /> Sincronizar Salarios
                    </button>
                    <button onClick={() => setIsUploadModalOpen(true)} className="glass" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: 'white' }}>
                        <FileSpreadsheet size={18} /> Cargar CSV
                    </button>

                    <button
                        onClick={() => handleOpenModal()}
                        style={{
                            backgroundColor: 'hsl(var(--primary))',
                            color: 'white',
                            padding: '0.75rem 1.25rem',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600
                        }}
                    >
                        <Plus size={18} />
                        Nuevo Ítem
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                    <input
                        type="text"
                        placeholder="Buscar por descripción, grupo o categoría..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'white', outline: 'none' }}
                    />
                </div>

                <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Factor Lluvia</span>
                        <div style={{ position: 'relative', width: '100px' }}>
                            <input
                                type="number"
                                step="0.01"
                                value={factorLluvia}
                                onChange={(e) => handleFactorLluviaChange(parseFloat(e.target.value) || 0)}
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

            <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius)' }}>
                <DataTable
                    columns={columns}
                    data={cargos.filter(c => {
                        const search = searchTerm.toLowerCase();
                        return (
                            c.descripcion.toLowerCase().includes(search) ||
                            (c.cat || '').toString().toLowerCase().includes(search) ||
                            (c.turno || '').toLowerCase().includes(search) ||
                            (c.tipo || '').toLowerCase().includes(search) ||
                            (c.grupo || '').toLowerCase().includes(search)
                        );
                    })}
                    onEdit={(item) => handleOpenModal(item)}
                    onDelete={(item) => handleDelete(item.id)}
                    pagination={true}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCargo ? 'Editar Ítem de Mano de Obra' : 'Nuevo Ítem de Mano de Obra'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <InputField label="DESCRIPCION" field="descripcion" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        <InputField label="UNID" field="unid" />
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>TURNO</label>
                            <select
                                value={form.turno}
                                onChange={(e) => handleFormChange('turno', e.target.value)}
                                style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white', outline: 'none', appearance: 'none' }}
                            >
                                <option value="">Seleccione Turno</option>
                                {shifts_config.map(s => <option key={s.id} value={s.nombre} style={{ backgroundColor: 'black' }}>{s.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>TIPO</label>
                            <select
                                value={form.tipo}
                                onChange={(e) => handleFormChange('tipo', e.target.value)}
                                style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white', outline: 'none', appearance: 'none' }}
                            >
                                {TIPOS.map(t => <option key={t} value={t} style={{ backgroundColor: 'black' }}>{t}</option>)}
                            </select>
                        </div>
                        {['PERSONAL', 'STAFF'].includes(form.tipo) ? (
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>NIVEL (Salarial)</label>
                                <select
                                    value={form.cat}
                                    onChange={(e) => handleFormChange('cat', e.target.value)}
                                    style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white', outline: 'none', appearance: 'none' }}
                                >
                                    {(form.tipo === 'STAFF' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6, 7, 8]).map(n => (
                                        <option key={n} value={n} style={{ backgroundColor: 'black' }}>Nivel {n}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <InputField label="CAT / REF" field="cat" />
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        <InputField label="VALOR DIA" field="valor_dia" type="number" step="0.01" readOnly={['PERSONAL', 'STAFF'].includes(form.tipo)} />
                        <InputField label="FACTOR EQ-MA" field="factor_eq_ma" type="number" step="0.01" />
                        <InputField label="IVA (%)" field="iva" type="number" step="0.01" />
                        <InputField label="VALOR TOTAL UNIT." field="valor_total_unitario" type="number" step="0.01" readOnly />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <InputField label="GRUPO" field="grupo" />
                        <InputField label="TOTAL HORAS" field="total_horas" type="number" step="0.01" />
                        <InputField label="VALOR TOTAL" field="valor_total" type="number" step="0.01" readOnly />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <InputField label="% EQ" field="porcentaje_eq" type="number" step="0.01" />
                        <InputField label="VR. HH (Costo Hora)" field="vr_hh" type="number" step="0.01" readOnly={['PERSONAL', 'STAFF'].includes(form.tipo)} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="glass" style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ flex: 1, backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius)', fontWeight: 600 }}
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Cargar Mano de Obra desde CSV">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px dashed hsl(var(--primary))', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
                        <Download size={32} style={{ color: 'hsl(var(--primary))', marginBottom: '1rem', margin: '0 auto' }} />
                        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>1. Descarga la Plantilla</h3>
                        <button onClick={handleDownloadTemplate} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.4)', color: 'white', padding: '0.625rem 1.25rem', borderRadius: '4px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                            <Download size={16} /> Bajar Plantilla .csv
                        </button>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>La primera fila debe contener los títulos exactos.</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>2. Sube tu archivo</h3>
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={loading} style={{ width: '100%', backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '1rem', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Upload size={20} /> {loading ? 'Procesando...' : 'Seleccionar Archivo y Cargar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ManoObra;
