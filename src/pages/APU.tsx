import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, ChevronRight, ChevronLeft, Search, CheckCircle2, AlertCircle, ArrowLeft, FileDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { exportAllApusToCsv } from '../utils/exportApuCsv';
import { useFormulas } from '../context/FormulaContext';

interface APUItem {
    id: string;
    tipo: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    precio_unitario: number;
    rendimiento_item: number; // New: Variable c for Labor, 1 for others
    total_horas?: number;
    recurso_id?: string;
}

interface APUMetadata {
    id?: string;
    cuadro_economico_id: string;
    rendimiento: number;
    turno_factor: number;
    horas_diarias: number;
    unidad: string;
}

interface ActivityInfo {
    item: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
}

const STEPS = [
    { id: 1, title: 'Configuración', description: 'Rendimiento y Turno' },
    { id: 2, title: 'Mano de Obra', description: 'Personal requerido' },
    { id: 3, title: 'Materiales', description: 'Insumos necesarios' },
    { id: 4, title: 'Equipos/Htas', description: 'Equipos y Herramientas' },
    { id: 5, title: 'Transportes/Otros', description: 'Costos adicionales' },
    { id: 6, title: 'Resultados', description: 'Resumen de costos unitarios' }
];


const APUEditor = () => {
    const { id: activityId } = useParams();
    const navigate = useNavigate();
    const { evaluate } = useFormulas();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activity, setActivity] = useState<ActivityInfo | null>(null);
    const [metadata, setMetadata] = useState<APUMetadata>({
        cuadro_economico_id: activityId || '',
        rendimiento: 5,
        turno_factor: 1,
        horas_diarias: 8.8,
        unidad: ''
    });
    const [items, setItems] = useState<APUItem[]>([]);

    // Resource Picker State
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerType, setPickerType] = useState<string>('');
    const [pickerResources, setPickerResources] = useState<any[]>([]);
    const [pickerSearch, setPickerSearch] = useState('');
    const [itemsList, setItemsList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [existingAPUs, setExistingAPUs] = useState<any[]>([]);
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [selectedCopyId, setSelectedCopyId] = useState('');
    const [isPushModalOpen, setIsPushModalOpen] = useState(false);
    const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
    const [pushSearchTerm, setPushSearchTerm] = useState('');
    const [exporting, setExporting] = useState(false);

    // Salary Data for dynamic calculations
    const [matrix, setMatrix] = useState<any[]>([]);
    const [staffMatrix, setStaffMatrix] = useState<any[]>([]);
    const [shiftsConfig, setShiftsConfig] = useState<any[]>([]);
    const [salaryConcepts, setSalaryConcepts] = useState<any[]>([]);
    const [laborResources, setLaborResources] = useState<any[]>([]);
    const [factorLluvia] = useState(() => {
        const saved = localStorage.getItem('factor_lluvia');
        return saved ? parseFloat(saved) : 0;
    });


    useEffect(() => {
        if (activityId) {
            fetchData();
            fetchCuadroItems(true); // Carga en segundo plano para el modal de copia
        } else {
            fetchCuadroItems();
        }
    }, [activityId]);

    const fetchCuadroItems = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cuadro_economico')
                .select('id, item, descripcion, unidad, cantidad')
                .order('created_at', { ascending: true });
            if (error) throw error;
            setItemsList(data || []);

            // Also fetch activities that already have APUs
            const { data: apuData } = await supabase.from('apus').select('cuadro_economico_id');
            const apuIds = apuData?.map(a => a.cuadro_economico_id) || [];

            const withApu = (data || []).filter(item => apuIds.includes(item.id) && item.id !== activityId);
            setExistingAPUs(withApu);
        } catch (err) {
            console.error('Error fetching items:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        if (!activityId) return;
        setLoading(true);
        // Clear previous state to avoid showing stale data
        setActivity(null);
        setItems([]);

        try {
            // 1. Fetch Activity Info and APU Metadata in parallel
            const [actRes, apuRes, conceptsRes, shiftsRes, matrixRes, staffMatrixRes, laborRes] = await Promise.all([
                supabase.from('cuadro_economico').select('*').eq('id', activityId).single(),
                supabase.from('apus').select('*').eq('cuadro_economico_id', activityId).maybeSingle(),
                supabase.from('maestro_conceptos').select('*').order('orden', { ascending: true }),
                supabase.from('configuracion_turnos').select('*'),
                supabase.from('matriz_costos_calculados').select('*'),
                supabase.from('staff_matrix_results').select('*'),
                supabase.from('mano_obra').select('*')
            ]);

            if (actRes.error) throw actRes.error;
            setActivity(actRes.data);
            setSalaryConcepts(conceptsRes.data || []);
            setShiftsConfig(shiftsRes.data || []);
            setMatrix(matrixRes.data || []);
            setStaffMatrix(staffMatrixRes.data || []);
            setLaborResources(laborRes.data || []);

            setMetadata(prev => ({
                ...prev,
                id: apuRes.data?.id,
                unidad: apuRes.data?.unidad || actRes.data.unidad || '',
                rendimiento: apuRes.data?.rendimiento ? Number(apuRes.data.rendimiento) : 5,
                turno_factor: apuRes.data?.turno_factor ? Number(apuRes.data.turno_factor) : 1,
                horas_diarias: apuRes.data?.horas_diarias ? Number(apuRes.data.horas_diarias) : 8.8
            }));

            // 2. If APU exists, fetch items
            if (apuRes.data?.id) {
                const { data: itemsData, error: itemsError } = await supabase
                    .from('apu_items')
                    .select('*')
                    .eq('apu_id', apuRes.data.id);

                if (itemsError) throw itemsError;
                setItems(itemsData.map(i => ({
                    ...i,
                    cantidad: Number(i.cantidad),
                    precio_unitario: Number(i.precio_unitario),
                    rendimiento_item: i.rendimiento_item ? Number(i.rendimiento_item) : 1,
                    total_horas: i.total_horas ? Number(i.total_horas) : undefined
                })));
            }
        } catch (err) {
            console.error('Error fetching APU data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAPU = async () => {
        setSaving(true);
        try {
            let apuId = metadata.id;

            // 1. Save or Update Metadata
            const metaPayload = {
                cuadro_economico_id: activityId,
                rendimiento: metadata.rendimiento,
                turno_factor: metadata.turno_factor,
                horas_diarias: metadata.horas_diarias,
                unidad: metadata.unidad
            };

            if (metadata.id) {
                const { error } = await supabase.from('apus').update(metaPayload).eq('id', metadata.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('apus').insert([metaPayload]).select().single();
                if (error) throw error;
                apuId = data.id;
                setMetadata(prev => ({ ...prev, id: apuId }));
            }

            // 2. Save Items (Delete and Insert strategy for simplicity in MVP)
            const { error: delError } = await supabase.from('apu_items').delete().eq('apu_id', apuId);
            if (delError) throw delError;

            const itemsPayload = items.map(item => ({
                apu_id: apuId,
                tipo: item.tipo,
                descripcion: item.descripcion,
                unidad: item.unidad,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                rendimiento_item: item.rendimiento_item || 1,
                total_horas: item.total_horas,
                recurso_id: item.recurso_id
            }));

            if (itemsPayload.length > 0) {
                const { error: insError } = await supabase.from('apu_items').insert(itemsPayload);
                if (insError) throw insError;
            }

            // 3. Update Cuadro Economico totals
            const { suministro, montaje, total, totalHH } = getTotals;
            await supabase.from('cuadro_economico').update({
                rendimiento: metadata.rendimiento,
                precio_ud_suministro: suministro,
                precio_ud_montaje: montaje,
                precio_unitario: total,
                precio_total: total * (activity?.cantidad || 0),
                total_hh: Math.ceil(totalHH * (activity?.cantidad || 0))
            }).eq('id', activityId);

            alert('APU guardado exitosamente.');
        } catch (err: any) {
            console.error('Error saving APU:', err);
            alert(`Error al guardar: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const openPicker = async (type: string) => {
        console.log('Opening picker for:', type);
        setPickerType(type);
        setPickerSearch('');
        setIsPickerOpen(true);

        let table = type === 'PERSONAL' ? 'mano_obra' : 'insumos';
        let query = supabase.from(table).select('*');

        if (type !== 'PERSONAL') {
            if (type === 'TRANSPORTE') {
                // Handle common misspelling in base data 'TRASNPORTE' and variations/casing
                query = query.or('tipo.ilike.%TRANSPORTE%,tipo.ilike.%TRASNPORTE%');
            } else if (type === 'HERRAMIENTAS') {
                // Handle singular/plural variations
                query = query.or('tipo.ilike.%HERRAMIENTA%');
            } else {
                query = query.ilike('tipo', `%${type}%`);
            }
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching picker resources:', error);
        } else {
            console.log(`Found ${data?.length || 0} resources for ${type}`);
            setPickerResources(data || []);
        }
    };

    const addResource = (res: any) => {
        const price = pickerType === 'PERSONAL'
            ? getEffectiveLaborValue(res.id)
            : (res.valor_dia || res.valor_total_unitario || res.precio_base || 0);

        const newItem: APUItem = {
            id: Math.random().toString(36).substr(2, 9),
            tipo: pickerType,
            descripcion: res.descripcion || res.perfil || '',
            unidad: res.unid || res.unidad || '',
            cantidad: 1,
            precio_unitario: price,
            rendimiento_item: pickerType === 'PERSONAL' ? (metadata.rendimiento || 1) : 1,
            total_horas: res.total_horas || 0,
            recurso_id: res.id
        };
        setItems(prev => [...prev, newItem]);
        setIsPickerOpen(false);
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateItemCantidad = (id: string, cant: number) => {
        const val = cant <= 0 ? 0.0001 : cant;
        setItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: val } : i));
    };

    const updateItemRendimiento = (id: string, rend: number) => {
        const val = rend <= 0 ? 0.0001 : rend;
        setItems(prev => prev.map(i => i.id === id ? { ...i, rendimiento_item: val } : i));
    };

    const updateItemPrecio = (id: string, price: number) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, precio_unitario: price } : i));
    };

    const copyFromApu = async (sourceActivityId: string) => {
        if (!sourceActivityId) return;
        const sourceActivity = existingAPUs.find(a => a.id === sourceActivityId);
        const sourceName = sourceActivity ? sourceActivity.item : '';
        setLoading(true);
        try {
            // Fetch source APU metadata
            const { data: sourceApu, error: apuErr } = await supabase
                .from('apus')
                .select('*')
                .eq('cuadro_economico_id', sourceActivityId)
                .single();

            if (apuErr) throw apuErr;

            // Fetch source APU items
            const { data: sourceItems, error: itemsErr } = await supabase
                .from('apu_items')
                .select('*')
                .eq('apu_id', sourceApu.id);

            if (itemsErr) throw itemsErr;

            // Update current metadata (keep current unit if already set, or copy from source)
            setMetadata(prev => ({
                ...prev,
                rendimiento: Number(sourceApu.rendimiento),
                turno_factor: Number(sourceApu.turno_factor),
                unidad: prev.unidad || sourceApu.unidad
            }));

            // Map source items to new items with fresh IDs
            const newItems: APUItem[] = sourceItems.map(i => ({
                id: Math.random().toString(36).substr(2, 9),
                tipo: i.tipo,
                descripcion: i.descripcion,
                unidad: i.unidad,
                cantidad: Number(i.cantidad),
                precio_unitario: Number(i.precio_unitario),
                rendimiento_item: i.rendimiento_item ? Number(i.rendimiento_item) : 1,
                total_horas: i.total_horas ? Number(i.total_horas) : undefined,
                recurso_id: i.recurso_id
            }));

            setItems(newItems);
            setIsCopyModalOpen(false);
            alert('Información del APU ' + sourceName + ' copiada exitosamente. No olvides guardar para confirmar.');
        } catch (err: any) {
            console.error('Error copying APU:', err);
            alert('Error al copiar el APU: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyCurrentToSelected = async () => {
        if (selectedTargetIds.length === 0) return;
        if (!window.confirm(`¿Estás seguro de copiar este APU a ${selectedTargetIds.length} actividades? Se reemplazará cualquier configuración previa en ellas.`)) return;

        setSaving(true);
        try {
            const { suministro, montaje, total, totalHH } = getTotals;

            for (const targetId of selectedTargetIds) {
                // 1. Get/Create Metadata
                const { data: existingApu } = await supabase.from('apus').select('id').eq('cuadro_economico_id', targetId).maybeSingle();

                let apuId;
                const metaPayload = {
                    cuadro_economico_id: targetId,
                    rendimiento: metadata.rendimiento,
                    turno_factor: metadata.turno_factor,
                    horas_diarias: metadata.horas_diarias,
                    unidad: metadata.unidad
                };

                if (existingApu) {
                    await supabase.from('apus').update(metaPayload).eq('id', existingApu.id);
                    apuId = existingApu.id;
                } else {
                    const { data, error } = await supabase.from('apus').insert([metaPayload]).select().single();
                    if (error) throw error;
                    apuId = data.id;
                }

                // 2. Items (Delete and Insert)
                await supabase.from('apu_items').delete().eq('apu_id', apuId);

                const itemsPayload = items.map(item => ({
                    apu_id: apuId,
                    tipo: item.tipo,
                    descripcion: item.descripcion,
                    unidad: item.unidad,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    rendimiento_item: item.rendimiento_item || 1,
                    total_horas: item.total_horas,
                    recurso_id: item.recurso_id
                }));

                if (itemsPayload.length > 0) {
                    const { error: insError } = await supabase.from('apu_items').insert(itemsPayload);
                    if (insError) throw insError;
                }

                // 3. Update totals in Cuadro Económico
                const { data: targetActivity } = await supabase.from('cuadro_economico').select('cantidad').eq('id', targetId).single();

                await supabase.from('cuadro_economico').update({
                    rendimiento: metadata.rendimiento,
                    precio_ud_suministro: suministro,
                    precio_ud_montaje: montaje,
                    precio_unitario: total,
                    precio_total: total * (targetActivity?.cantidad || 0),
                    total_hh: Math.ceil(totalHH * (targetActivity?.cantidad || 0))
                }).eq('id', targetId);
            }

            alert(`APU propagado exitosamente a ${selectedTargetIds.length} actividades.`);
            setIsPushModalOpen(false);
            setSelectedTargetIds([]);
        } catch (err: any) {
            console.error('Error in mass copy:', err);
            alert('Error al propagar el APU: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getEffectiveLaborValue = (recursoId: string) => {
        const laborRes = laborResources.find(r => r.id === recursoId);
        if (!laborRes) return 0;

        const isStaff = laborRes.tipo === 'STAFF';
        const catRaw = String(laborRes.cat || '0').match(/\d+/);
        const catNum = catRaw ? parseInt(catRaw[0]) : 0;
        const shiftSpec = (shiftsConfig || []).find(s => (s.nombre || '').toUpperCase().trim() === (laborRes.turno || '').toUpperCase().trim());
        const shiftId = shiftSpec?.id;

        const currentMtx = isStaff ? staffMatrix : matrix;

        if (catNum && shiftId && currentMtx.length > 0 && salaryConcepts.length > 0) {
            const findSC = (code: string) => salaryConcepts.find(c => c.codigo.trim().toUpperCase() === code.trim().toUpperCase());
            const getM = (code: string) => {
                const c = findSC(code);
                if (!c) return 0;
                const queryField = isStaff ? 'nivel' : 'categoria';
                return (currentMtx.find(m => m[queryField] === catNum && m.turno_id === shiftId && m.concepto_id === c.id)?.valor_final) || 0;
            };

            // Return the Total Día Hábil (AB) directly from the matrix which is already dynamically calculated
            return getM('AB');
        }
        return laborRes.valor_dia || 0;
    };

    const getTotals = useMemo(() => {
        const personalTotal = items
            .filter(i => i.tipo === 'PERSONAL')
            .reduce((sum, i) => {
                const price = i.recurso_id ? getEffectiveLaborValue(i.recurso_id) : i.precio_unitario;

                // Use dynamic formula MO_UNIT: (num_trab * salario_diario) / rendimiento
                const val = evaluate('MO_UNIT', {
                    num_trab: i.cantidad,
                    salario_diario: price,
                    rendimiento: i.rendimiento_item || 1
                });
                return sum + val;
            }, 0);

        const materialsTotal = items
            .filter(i => i.tipo === 'MATERIALES')
            .reduce((sum, i) => sum + (i.cantidad * i.precio_unitario), 0);

        const equipHtasTotal = items
            .filter(i => i.tipo === 'EQUIPOS' || i.tipo === 'HERRAMIENTAS')
            .reduce((sum, i) => sum + ((i.cantidad * i.precio_unitario) / (i.rendimiento_item || 1)), 0);

        const othersTotal = items
            .filter(i => i.tipo === 'TRANSPORTE' || i.tipo === 'SEGUROS Y OTROS')
            .reduce((sum, i) => sum + ((i.cantidad * i.precio_unitario) / (i.rendimiento_item || 1)), 0);

        const suministro = materialsTotal + equipHtasTotal + othersTotal;
        const montaje = personalTotal * metadata.turno_factor;
        const total = suministro + montaje;
        const totalHH = items
            .filter(i => i.tipo === 'PERSONAL')
            .reduce((sum, i) => sum + (i.cantidad / (i.rendimiento_item || 1)) * (metadata.horas_diarias || 8.8), 0) * metadata.turno_factor;

        return { suministro, montaje, total, totalHH };
    }, [items, metadata, laborResources, matrix, staffMatrix, shiftsConfig, factorLluvia]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando datos del APU...</div>;


    const filteredItems = itemsList.filter(i =>
        i.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!activityId) {
        const handleExport = async () => {
            setExporting(true);
            try {
                await exportAllApusToCsv();
            } catch (err: any) {
                alert('Error al exportar: ' + err.message);
            } finally {
                setExporting(false);
            }
        };

        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Análisis de Precios Unitarios (APU)</h1>
                        <p style={{ color: 'hsl(var(--muted-foreground))' }}>Selecciona una actividad del Cuadro Económico para editar su APU.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.6rem 1.25rem',
                                borderRadius: 'var(--radius)',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                border: '1px solid rgba(56,189,248,0.4)',
                                backgroundColor: 'rgba(56,189,248,0.08)',
                                color: '#38bdf8',
                                cursor: exporting ? 'not-allowed' : 'pointer',
                                opacity: exporting ? 0.6 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            <FileDown size={18} />
                            {exporting ? 'Generando CSV...' : 'Exportar APUs (CSV)'}
                        </button>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                            <input
                                type="text"
                                placeholder="Buscar actividad..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '0.6rem 1rem 0.6rem 2.5rem', color: 'white' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="glass" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid hsl(var(--border))' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>ITEM</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>DESCRIPCIÓN</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>UNID</th>
                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>CANT</th>
                                <th style={{ padding: '1rem' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{item.item}</td>
                                    <td style={{ padding: '1rem' }}>{item.descripcion}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>{item.unidad}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>{item.cantidad}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => navigate(`/apu/${item.id}`)}
                                            className="glass"
                                            style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600 }}
                                        >
                                            Configurar APU
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (!activity) return <div style={{ padding: '2rem', textAlign: 'center' }}>Actividad no encontrada.</div>;

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // CONFIG
                return (
                    <div className="glass" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>RENDIMIENTO (UD/DÍA)</label>
                                <input
                                    type="number"
                                    value={metadata.rendimiento}
                                    onChange={e => setMetadata(prev => ({ ...prev, rendimiento: Number(e.target.value) }))}
                                    style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '0.75rem', color: 'white' }}
                                />
                                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>¿Cuántas unidades se completan en un día (8H)?</p>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>TURNO DE TRABAJO (FACTOR)</label>
                                <select
                                    value={metadata.turno_factor}
                                    onChange={e => setMetadata(prev => ({ ...prev, turno_factor: Number(e.target.value) }))}
                                    style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '0.75rem', color: 'white' }}
                                >
                                    <option value={1} style={{ backgroundColor: 'black' }}>8 Horas (Factor 1.0)</option>
                                    <option value={1.5} style={{ backgroundColor: 'black' }}>12 Horas (Factor 1.5)</option>
                                    <option value={3} style={{ backgroundColor: 'black' }}>24 Horas (Factor 3.0)</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', marginBottom: '0.75rem' }}>UNIDAD</label>
                                <input
                                    type="text"
                                    value={metadata.unidad}
                                    onChange={e => setMetadata(prev => ({ ...prev, unidad: e.target.value }))}
                                    style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '0.75rem', color: 'white' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div style={{ padding: '2rem', border: '1px dashed hsl(var(--primary))', borderRadius: '12px', textAlign: 'center', backgroundColor: 'rgba(var(--primary), 0.05)' }}>
                                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>¿Quieres ahorrar tiempo?</h4>
                                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
                                    Copia la información de un APU ya completado a este.
                                </p>
                                <button
                                    onClick={() => setIsCopyModalOpen(true)}
                                    className="glass"
                                    style={{ padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700, border: '1px solid hsl(var(--primary))', color: 'hsl(var(--primary))' }}
                                >
                                    Copiar de otro APU
                                </button>
                            </div>
                            <div style={{ padding: '2rem', border: '1px dashed #22c55e', borderRadius: '12px', textAlign: 'center', backgroundColor: 'rgba(34, 197, 94, 0.05)' }}>
                                <h4 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Propagar este APU</h4>
                                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem' }}>
                                    Copia este APU a múltiples actividades a la vez.
                                </p>
                                <button
                                    onClick={() => setIsPushModalOpen(true)}
                                    className="glass"
                                    style={{ padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700, border: '1px solid #22c55e', color: '#22c55e' }}
                                >
                                    Copiar a otros APUs
                                </button>
                            </div>
                        </div>
                        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid hsl(var(--primary))' }}>
                            <p style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={16} />
                                <strong>Consejo:</strong> Asegúrate de que el rendimiento sea coherente con la unidad seleccionada. Un rendimiento mayor reduce el costo unitario de mano de obra.
                            </p>
                        </div>
                    </div>
                );
            case 2:
            case 3:
            case 4:
            case 5:
                const mapping = { 2: ['PERSONAL'], 3: ['MATERIALES'], 4: ['EQUIPOS', 'HERRAMIENTAS'], 5: ['TRANSPORTE', 'SEGUROS Y OTROS'] };
                const currentTypes = (mapping as any)[currentStep];
                const stepItems = items.filter(i => currentTypes.includes(i.tipo));

                const stepInstructions = {
                    2: "Define el personal necesario. El costo se calcula dividiendo el valor unitario del personal entre el rendimiento diario.",
                    3: "Agrega materiales e insumos. Estandarización: VALOR = Precio Unit. * Cantidad.",
                    4: "Incluye herramientas y equipos. Estandarización: VALOR = Precio Unit. * Cantidad.",
                    5: "Costos adicionales y transportes. Estandarización: VALOR = Precio Unit. * Cantidad."
                };

                return (
                    <div className="glass" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{STEPS[currentStep - 1].title}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--primary))', fontWeight: 500, marginTop: '0.25rem' }}>
                                    {(stepInstructions as any)[currentStep]}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                {currentStep === 2 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>HORAS DIARIAS:</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={metadata.horas_diarias}
                                            onChange={e => setMetadata(prev => ({ ...prev, horas_diarias: Number(e.target.value) }))}
                                            style={{ width: '60px', background: 'transparent', border: 'none', color: 'white', fontWeight: 700, outline: 'none', textAlign: 'center' }}
                                        />
                                    </div>
                                )}
                                {currentTypes.map((t: string) => (
                                    <button key={t} onClick={() => openPicker(t)} style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(255, 107, 43, 0.2)' }}>
                                        <Plus size={16} /> Agregar {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid hsl(var(--border))' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>DESCRIPCIÓN</th>
                                    {currentStep === 3 ? (
                                        <>
                                            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>UND.</th>
                                            <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>PRECIO UNIT. (d)</th>
                                            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>CANTIDAD (e)</th>
                                            <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>VALOR (d*e)</th>
                                        </>
                                    ) : (
                                        <>
                                            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                                                {currentStep === 2 ? '# TRAB (a)' : currentStep === 4 ? 'CANT. (f)' : currentStep === 5 ? 'CANT.' : 'CANT.'}
                                            </th>
                                            <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                                                {currentStep === 2 ? 'SALARIO DIARIO (b)' : currentStep === 4 ? 'VALOR/DIA (g)' : 'TARIFA/DIA'}
                                            </th>
                                            <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>
                                                {currentStep === 5 ? 'REND/DIAS' : 'REND.'}
                                            </th>
                                            <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>VALOR (Unit.)</th>
                                            {currentStep === 2 && (
                                                <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>HORAS HOMBRE</th>
                                            )}
                                        </>
                                    )}
                                    <th style={{ padding: '1rem', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {stepItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ opacity: 0.2 }}><Plus size={48} /></div>
                                                <span>Aún no has agregado elementos de {currentTypes.join('/')}.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    stepItems.map(item => {
                                        const price = item.tipo === 'PERSONAL' && item.recurso_id ? getEffectiveLaborValue(item.recurso_id) : item.precio_unitario;
                                        const isSimple = item.tipo === 'MATERIALES';
                                        const rowValue = isSimple
                                            ? (item.cantidad * item.precio_unitario)
                                            : (item.cantidad * price) / (item.rendimiento_item || 1);

                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="row-hover">
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: 500 }}>{item.descripcion}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))' }}>{item.tipo}</div>
                                                </td>

                                                {!isSimple ? (
                                                    <>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                value={item.cantidad}
                                                                onChange={e => updateItemCantidad(item.id, Number(e.target.value))}
                                                                style={{ width: '70px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.4rem', color: 'white', textAlign: 'center' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem' }}>
                                                            {item.tipo === 'PERSONAL' ? (
                                                                `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    value={item.precio_unitario}
                                                                    onChange={e => updateItemPrecio(item.id, Number(e.target.value))}
                                                                    style={{ width: '100px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.4rem', color: 'white', textAlign: 'right' }}
                                                                />
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                value={item.rendimiento_item}
                                                                onChange={e => updateItemRendimiento(item.id, Number(e.target.value))}
                                                                style={{ width: '70px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.4rem', color: 'white', textAlign: 'center' }}
                                                            />
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{item.unidad}</td>
                                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                            <input
                                                                type="number"
                                                                value={item.precio_unitario}
                                                                onChange={e => updateItemPrecio(item.id, Number(e.target.value))}
                                                                style={{ width: '100px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.4rem', color: 'white', textAlign: 'right' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                            <input
                                                                type="number"
                                                                step="0.001"
                                                                value={item.cantidad}
                                                                onChange={e => updateItemCantidad(item.id, Number(e.target.value))}
                                                                style={{ width: '80px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.4rem', color: 'white', textAlign: 'center' }}
                                                            />
                                                        </td>
                                                    </>
                                                )}

                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'hsl(var(--primary))' }}>
                                                    ${rowValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                                </td>
                                                {currentStep === 2 && (
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                                                        {((item.cantidad / (item.rendimiento_item || 1)) * (activity?.cantidad || 0) * (metadata.horas_diarias || 0)).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                                    </td>
                                                )}
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <button onClick={() => removeItem(item.id)} style={{ color: '#f87171', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {currentStep === 2 && stepItems.length > 0 && (
                                <tfoot style={{ borderTop: '2px solid hsl(var(--border))', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <tr>
                                        <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.875rem' }}>TOTALES:</td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--primary))' }}>
                                            ${stepItems.reduce((acc, item) => {
                                                const price = item.recurso_id ? getEffectiveLaborValue(item.recurso_id) : item.precio_unitario;
                                                return acc + (item.cantidad * price) / (item.rendimiento_item || 1);
                                            }, 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--primary))' }}>
                                            {Math.ceil(stepItems.reduce((acc, item) => {
                                                const hh = (item.cantidad / (item.rendimiento_item || 1)) * (activity?.cantidad || 0) * (metadata.horas_diarias || 0);
                                                return acc + hh;
                                            }, 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                );
            case 6: // RESULTS
                const { suministro, montaje, total } = getTotals;
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div className="glass" style={{ padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Resumen de Costos</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>Suministros (Materiales/Otros)</span>
                                    <span style={{ fontWeight: 600 }}>${suministro.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>Mano de Obra (Montaje)</span>
                                    <span style={{ fontWeight: 600 }}>${montaje.toLocaleString()}</span>
                                </div>
                                <div style={{ height: '1px', backgroundColor: 'hsl(var(--border))' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>COSTO UNITARIO TOTAL</span>
                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'hsl(var(--primary))' }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <p style={{ fontSize: '0.875rem', color: '#4ade80' }}>
                                    Este valor se actualizará automáticamente en el Cuadro Económico al guardar.
                                </p>
                            </div>
                        </div>
                        <div className="glass" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={48} style={{ color: 'hsl(var(--primary))' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>¡APU Completo!</h3>
                                <p style={{ color: 'hsl(var(--muted-foreground))' }}>Has finalizado todos los pasos. Haz clic en "Guardar APU" para finalizar.</p>
                            </div>
                            <button
                                onClick={handleSaveAPU}
                                disabled={saving}
                                style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '1rem 2rem', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}
                            >
                                <Save size={20} /> {saving ? 'Guardando...' : 'GUARDAR TODO Y FINALIZAR'}
                            </button>
                        </div>
                    </div>
                );
        }
    };

    const filteredResources = pickerResources.filter(r => {
        const search = pickerSearch.toLowerCase();
        const desc = (r.descripcion || r.perfil || '').toLowerCase();
        return desc.includes(search);
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <button onClick={() => navigate('/cuadro-economico')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
                        <ArrowLeft size={16} /> Volver al Cuadro Económico
                    </button>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>APU: {activity.item}</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.1rem' }}>{activity.descripcion}</p>
                </div>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {STEPS.map((step) => {
                    const isActive = step.id === currentStep;
                    const isPast = step.id < currentStep;
                    return (
                        <div
                            key={step.id}
                            onClick={() => setCurrentStep(step.id)}
                            className="glass"
                            style={{
                                flex: 1,
                                minWidth: '160px',
                                padding: '1rem',
                                cursor: 'pointer',
                                border: isActive ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                                position: 'relative',
                                opacity: isActive || isPast ? 1 : 0.6
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: isPast ? '#22c55e' : (isActive ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.1)'),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                }}>
                                    {isPast ? <CheckCircle2 size={16} /> : step.id}
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{step.title}</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>{step.description}</div>
                        </div>
                    );
                })}
            </div>

            {/* Content Area */}
            <div style={{ minHeight: '400px', marginBottom: '2rem' }}>
                {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button
                    disabled={currentStep === 1}
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="glass"
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, opacity: currentStep === 1 ? 0.3 : 1 }}
                >
                    <ChevronLeft size={20} /> Anterior
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleSaveAPU} disabled={saving} className="glass" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <Save size={20} /> {saving ? 'Guardando...' : 'Guardar Progreso'}
                    </button>
                    {currentStep < 6 && (
                        <button
                            onClick={() => setCurrentStep(prev => prev + 1)}
                            style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem 2rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                        >
                            Siguiente <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Resource Picker Modal */}
            <Modal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} title={`Seleccionar ${pickerType}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                        <input
                            type="text"
                            placeholder="Buscar recurso..."
                            value={pickerSearch}
                            onChange={e => setPickerSearch(e.target.value)}
                            style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'white' }}
                        />
                    </div>
                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredResources.map(res => (
                            <div
                                key={res.id}
                                onClick={() => addResource(res)}
                                style={{ padding: '0.75rem', border: '1px solid hsl(var(--border))', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{res.descripcion}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{res.unid || res.unidad} | \${(res.valor_total_unitario || res.precio_base || 0).toLocaleString()}</div>
                                </div>
                                <Plus size={18} style={{ color: 'hsl(var(--primary))' }} />
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Copy APU Modal */}
            <Modal isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} title="Copiar Información de APU">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>
                        Selecciona el APU del cual deseas copiar los recursos y la configuración. Esto reemplazará lo que tengas actualmente en este APU.
                    </p>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>SELECCIONAR ACTIVIDAD ORIGEN</label>
                        <select
                            value={selectedCopyId}
                            onChange={e => setSelectedCopyId(e.target.value)}
                            style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '0.75rem', color: 'white' }}
                        >
                            <option value="" style={{ backgroundColor: 'black' }}>-- Seleccionar APU --</option>
                            {existingAPUs.map(apu => (
                                <option key={apu.id} value={apu.id} style={{ backgroundColor: 'black' }}>
                                    {apu.item} - {apu.descripcion.substring(0, 50)}...
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            onClick={() => setIsCopyModalOpen(false)}
                            className="glass"
                            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }}
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={!selectedCopyId}
                            onClick={() => copyFromApu(selectedCopyId)}
                            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', backgroundColor: 'hsl(var(--primary))', color: 'white', fontWeight: 700, opacity: selectedCopyId ? 1 : 0.5 }}
                        >
                            Copiar Ahora
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Push Copy Modal */}
            <Modal
                isOpen={isPushModalOpen}
                onClose={() => setIsPushModalOpen(false)}
                title="Propagar este APU a múltiples actividades"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                        Selecciona las actividades a las que deseas copiar la configuración actual.
                        <strong> Esto sobrescribirá cualquier dato previo en ellas.</strong>
                    </p>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                            <input
                                type="text"
                                placeholder="Buscar actividad..."
                                value={pushSearchTerm}
                                onChange={e => setPushSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', color: 'white' }}
                            />
                        </div>
                        <button
                            onClick={() => {
                                const filteredIds = itemsList
                                    .filter(item => item.id !== activityId)
                                    .filter(item =>
                                        item.item.toLowerCase().includes(pushSearchTerm.toLowerCase()) ||
                                        item.descripcion.toLowerCase().includes(pushSearchTerm.toLowerCase())
                                    )
                                    .map(i => i.id);

                                if (selectedTargetIds.length >= filteredIds.length && filteredIds.length > 0) {
                                    setSelectedTargetIds([]);
                                } else {
                                    setSelectedTargetIds(filteredIds);
                                }
                            }}
                            className="glass"
                            style={{ padding: '0 1rem', borderRadius: '4px', fontSize: '0.75rem' }}
                        >
                            {selectedTargetIds.length > 0 ? 'Deseleccionar' : 'Sel. Filtrados'}
                        </button>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '0.5rem' }}>
                        {itemsList
                            .filter(item => item.id !== activityId)
                            .filter(item =>
                                item.item.toLowerCase().includes(pushSearchTerm.toLowerCase()) ||
                                item.descripcion.toLowerCase().includes(pushSearchTerm.toLowerCase())
                            )
                            .map(item => (
                                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedTargetIds.includes(item.id)}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setSelectedTargetIds(prev => [...prev, item.id]);
                                            } else {
                                                setSelectedTargetIds(prev => prev.filter(id => id !== item.id));
                                            }
                                        }}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <div style={{ fontSize: '0.875rem' }}>
                                        <div style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{item.item}</div>
                                        <div style={{ opacity: 0.8, fontSize: '0.8rem' }}>{item.descripcion}</div>
                                    </div>
                                </label>
                            ))}
                        {itemsList.filter(item => item.id !== activityId).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))' }}>No hay otras actividades disponibles.</div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            onClick={() => setIsPushModalOpen(false)}
                            className="glass"
                            style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={copyCurrentToSelected}
                            disabled={selectedTargetIds.length === 0 || saving}
                            style={{
                                flex: 2,
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: '#22c55e',
                                color: 'white',
                                fontWeight: 700,
                                opacity: (selectedTargetIds.length === 0 || saving) ? 0.5 : 1
                            }}
                        >
                            {saving ? 'Copiando...' : `Propagar a ${selectedTargetIds.length} actividades`}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default APUEditor;
