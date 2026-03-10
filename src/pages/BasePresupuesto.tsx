import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';

interface Insumo {
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

const TIPOS = ['PERSONAL', 'HERRAMIENTAS', 'EQUIPOS', 'TRANSPORTE', 'MATERIALES', 'SEGUROS Y OTROS'];
const UNIDADES = ['UN', 'ML', 'KG', 'PD', 'GL', 'M2', 'M3', 'LB', 'H', 'DIA', 'MES', 'GLN', 'EST', 'PAQ', 'NPT'];

const BasePresupuesto = () => {
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [form, setForm] = useState<Omit<Insumo, 'id' | 'created_at'>>({
        descripcion: '',
        unid: '',
        turno: '',
        tipo: 'MATERIALES',
        valor_dia: 0,
        factor_eq_ma: 0,
        iva: 0,
        valor_total_unitario: 0,
        grupo: '',
        cat: '',
        total_horas: 0,
        valor_total: 0,
        porcentaje_eq: 0,
        vr_hh: 0
    });

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    // Automatic calculations for IVA and Total Unitario
    useEffect(() => {
        const ivaPercent = form.tipo === 'PERSONAL' ? 0 : 0.19;
        const calculatedIvaAmount = form.valor_dia * ivaPercent;
        const calculatedTotalUnitario = form.valor_dia + form.factor_eq_ma + calculatedIvaAmount;

        // Only update if values are different to prevent infinite loops
        if (form.iva !== calculatedIvaAmount || form.valor_total_unitario !== calculatedTotalUnitario) {
            setForm(prev => ({
                ...prev,
                iva: Number(calculatedIvaAmount.toFixed(2)),
                valor_total_unitario: Number(calculatedTotalUnitario.toFixed(2))
            }));
        }
    }, [form.tipo, form.valor_dia, form.factor_eq_ma]);

    useEffect(() => {
        fetchInsumos();
    }, []);

    const fetchInsumos = async () => {
        setLoading(true);
        if (!isSupabaseConfigured) {
            setInsumos([
                { id: '1', descripcion: 'EJEMPLO INSUMO', unid: 'GL', turno: '8H', tipo: 'MATERIALES', valor_dia: 100000, factor_eq_ma: 1, iva: 19, valor_total_unitario: 119000, grupo: 'MAT', cat: '1', total_horas: 8, valor_total: 800000, porcentaje_eq: 0, vr_hh: 12500 },
            ]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('insumos').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching insumos:', error);
        } else {
            setInsumos(data || []);
        }
        setLoading(false);
    };

    const handleDownloadTemplate = () => {
        const headers = ['DESCRIPCION', 'UNID', 'TURNO', 'TIPO', 'VALOR DIA', 'FACTOR EQ-MA', 'IVA', 'VALOR TOTAL', 'TOTAL HORAS', 'VALOR TOTAL', '% EQ', 'VR. HH'];
        const row = ['EJEMPLO INSUMO', 'GL', '8H', 'MATERIALES', '100000', '1', '19000', '119000', '8', '800000', '0', '12500'];
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + row.join(";");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_base_presupuesto.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    tipo: columns[3]?.trim() || 'MATERIALES',
                    valor_dia: Number(columns[4]?.trim().replace(',', '.')) || 0,
                    factor_eq_ma: Number(columns[5]?.trim().replace(',', '.')) || 0,
                    iva: Number(columns[6]?.trim().replace(',', '.')) || 0,
                    valor_total_unitario: Number(columns[7]?.trim().replace(',', '.')) || 0,
                    total_horas: Number(columns[8]?.trim().replace(',', '.')) || 0,
                    valor_total: Number(columns[9]?.trim().replace(',', '.')) || 0,
                    porcentaje_eq: Number(columns[10]?.trim().replace(',', '.')) || 0,
                    vr_hh: Number(columns[11]?.trim().replace(',', '.')) || 0,
                    grupo: '',
                    cat: '',
                    created_at: new Date().toISOString()
                };
            }).filter(i => i.descripcion !== '');

            if (isSupabaseConfigured) {
                try {
                    const { error } = await supabase.from('insumos').insert(newItems);
                    if (error) throw error;
                    fetchInsumos();
                } catch (error: any) {
                    console.error('Error uploading CSV:', error);
                    alert(`Error al subir los datos a Supabase: \${error.message || 'Error desconocido'}`);
                }
            } else {
                const withIds = newItems.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) }));
                setInsumos([...insumos, ...withIds as Insumo[]]);
            }
            setIsUploadModalOpen(false);
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleOpenModal = (insumo?: Insumo) => {
        if (insumo) {
            setEditingInsumo(insumo);
            setForm({
                descripcion: insumo.descripcion,
                unid: insumo.unid,
                turno: insumo.turno,
                tipo: insumo.tipo || TIPOS[4],
                valor_dia: insumo.valor_dia,
                factor_eq_ma: insumo.factor_eq_ma,
                iva: insumo.iva,
                valor_total_unitario: insumo.valor_total_unitario,
                grupo: insumo.grupo,
                cat: insumo.cat,
                total_horas: insumo.total_horas,
                valor_total: insumo.valor_total,
                porcentaje_eq: insumo.porcentaje_eq,
                vr_hh: insumo.vr_hh
            });
        } else {
            setEditingInsumo(null);
            setForm({
                descripcion: '',
                unid: '',
                turno: '',
                tipo: 'MATERIALES',
                valor_dia: 0,
                factor_eq_ma: 0,
                iva: 0,
                valor_total_unitario: 0,
                grupo: '',
                cat: '',
                total_horas: 0,
                valor_total: 0,
                porcentaje_eq: 0,
                vr_hh: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...form,
            created_at: new Date().toISOString()
        };

        if (!isSupabaseConfigured) {
            if (editingInsumo) {
                setInsumos(insumos.map(i => i.id === editingInsumo.id ? { ...i, ...payload } : i));
            } else {
                setInsumos([{ ...payload, id: Math.random().toString(36).substr(2, 9) } as Insumo, ...insumos]);
            }
            setIsModalOpen(false);
            setLoading(false);
            return;
        }

        try {
            if (editingInsumo) {
                const { error } = await supabase.from('insumos').update(payload).eq('id', editingInsumo.id);
                if (error) throw error;
                setInsumos(insumos.map(i => i.id === editingInsumo.id ? { ...i, ...payload } : i));
            } else {
                const { data, error } = await supabase.from('insumos').insert([payload]).select();
                if (error) throw error;
                if (data) setInsumos([data[0], ...insumos]);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error('Error saving insumo:', err);
            alert('Error al guardar en Supabase.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este ítem?')) return;
        const previous = [...insumos];
        setInsumos(insumos.filter(i => i.id !== id));

        if (!isSupabaseConfigured) return;

        try {
            const { error } = await supabase.from('insumos').delete().eq('id', id);
            if (error) throw error;
        } catch (err) {
            console.error('Error deleting insumo:', err);
            setInsumos(previous);
            alert('Error al eliminar.');
        }
    };

    const columns = [
        {
            header: 'DESCRIPCION',
            accessor: 'descripcion' as keyof Insumo,
            render: (row: Insumo) => <div>{row.descripcion}</div>
        },
        { header: 'UNID', accessor: 'unid' as keyof Insumo },
        { header: 'TURNO', accessor: 'turno' as keyof Insumo },
        {
            header: 'TIPO',
            accessor: 'tipo' as keyof Insumo,
            render: (item: Insumo) => (
                <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid hsl(var(--border))',
                    whiteSpace: 'nowrap'
                }}>
                    {item.tipo}
                </span>
            )
        },
        {
            header: 'VALOR DIA',
            accessor: 'valor_dia' as keyof Insumo,
            render: (row: Insumo) => Number(row.valor_dia).toLocaleString('es-CO', { maximumFractionDigits: 2 })
        },
        {
            header: 'FACTOR EQ-MA',
            accessor: 'factor_eq_ma' as keyof Insumo,
            render: (row: Insumo) => Number(row.factor_eq_ma).toLocaleString('es-CO', { maximumFractionDigits: 2 })
        },
        {
            header: 'IVA',
            accessor: 'iva' as keyof Insumo,
            render: (row: Insumo) => Number(row.iva).toLocaleString('es-CO', { maximumFractionDigits: 2 })
        },
        {
            header: 'VALOR TOTAL',
            accessor: 'valor_total_unitario' as keyof Insumo,
            render: (row: Insumo) => Number(row.valor_total_unitario).toLocaleString('es-CO', { maximumFractionDigits: 2 })
        },
        {
            header: 'TOTAL HORAS',
            accessor: 'total_horas' as keyof Insumo,
            render: (row: Insumo) => Number(row.total_horas).toLocaleString('es-CO', { maximumFractionDigits: 2 })
        },
        {
            header: 'VALOR TOTAL',
            accessor: 'valor_total' as keyof Insumo,
            render: (row: Insumo) => <span style={{ fontWeight: 600 }}>{Number(row.valor_total).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span>
        },
        {
            header: '% EQ',
            accessor: 'porcentaje_eq' as keyof Insumo,
            render: (row: Insumo) => `${Number(row.porcentaje_eq)}%`
        },
        {
            header: 'VR. HH',
            accessor: 'vr_hh' as keyof Insumo,
            render: (row: Insumo) => Number(row.vr_hh).toLocaleString('es-CO', { maximumFractionDigits: 2 })
        },
    ];

    const InputField = ({ label, field, type = 'text', step = '1', readOnly = false }: { label: string, field: keyof typeof form, type?: string, step?: string, readOnly?: boolean }) => (
        <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>{label}</label>
            <input
                required={!readOnly}
                readOnly={readOnly}
                type={type}
                step={step}
                value={form[field]}
                onChange={(e) => !readOnly && setForm({ ...form, [field]: type === 'number' ? Number(e.target.value) : e.target.value })}
                style={{
                    width: '100%',
                    backgroundColor: readOnly ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                    border: readOnly ? '1px dashed hsl(var(--border))' : '1px solid hsl(var(--border))',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    color: readOnly ? 'hsl(var(--muted-foreground))' : 'white',
                    outline: 'none',
                    cursor: readOnly ? 'not-allowed' : 'text'
                }}
            />
        </div>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Base Presupuesto</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Maestro global de insumos, materiales y equipos.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
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

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                    <input
                        type="text"
                        placeholder="Buscar por descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'white', outline: 'none' }}
                    />
                </div>
            </div>

            <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius)' }}>
                <DataTable
                    columns={columns}
                    data={insumos.filter(i => i.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))}
                    onEdit={(item) => handleOpenModal(item)}
                    onDelete={(item) => handleDelete(item.id)}
                    pagination={true}
                />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingInsumo ? 'Editar Ítem de Presupuesto' : 'Nuevo Ítem de Presupuesto'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <InputField label="DESCRIPCION" field="descripcion" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>UNID</label>
                            <select
                                value={form.unid}
                                onChange={(e) => setForm({ ...form, unid: e.target.value })}
                                style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white', outline: 'none', appearance: 'none' }}
                            >
                                <option value="" disabled style={{ backgroundColor: 'black' }}>Seleccionar...</option>
                                {UNIDADES.map(u => <option key={u} value={u} style={{ backgroundColor: 'black' }}>{u}</option>)}
                            </select>
                        </div>
                        <InputField label="TURNO (8H/12H...)" field="turno" />
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>TIPO</label>
                            <select
                                value={form.tipo}
                                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                                style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white', outline: 'none', appearance: 'none' }}
                            >
                                {TIPOS.map(t => <option key={t} value={t} style={{ backgroundColor: 'black' }}>{t}</option>)}
                            </select>
                        </div>
                        <InputField label="VALOR DIA" field="valor_dia" type="number" step="0.01" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <InputField label="FACTOR EQ-MA" field="factor_eq_ma" type="number" step="0.01" />
                        <InputField label="IVA (COP)" field="iva" type="number" step="0.01" readOnly={true} />
                        <InputField label="VALOR TOTAL" field="valor_total_unitario" type="number" step="0.01" readOnly={true} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <InputField label="TOTAL HORAS" field="total_horas" type="number" step="0.01" />
                        <InputField label="VALOR TOTAL (Final)" field="valor_total" type="number" step="0.01" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <InputField label="% EQ" field="porcentaje_eq" type="number" step="0.01" />
                        <InputField label="VR. HH" field="vr_hh" type="number" step="0.01" />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="glass"
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: 'rgba(255,255,255,0.9)',
                                fontWeight: 600
                            }}
                        >
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

            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Cargar Base Presupuesto desde CSV">
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

export default BasePresupuesto;
