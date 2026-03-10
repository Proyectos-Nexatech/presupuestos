import { useState, useEffect, useRef } from 'react';
import { Plus, Search, HardHat, Calendar, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useFormulas } from '../context/FormulaContext';

interface DotacionItem {
    id: string;
    descripcion: string;
    cant_proy: number;
    duracion_dias: number;
    valor_unitario: number;
    frecuencia?: number;
    valor_total?: number | null;
    valor_dia?: number | null;
}

const Dotacion = () => {
    const { evaluate } = useFormulas();
    const [dotaciones, setDotaciones] = useState<DotacionItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<DotacionItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [duracionProyecto, setDuracionProyecto] = useState(90);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [form, setForm] = useState({
        descripcion: '',
        cant_proy: 1,
        duracion_dias: 30,
        valor_unitario: 0,
        valor_total: '',
        valor_dia: ''
    });

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    useEffect(() => {
        fetchDotaciones();
        if (isSupabaseConfigured) fetchConfig();
    }, []);

    const fetchConfig = async () => {
        const { data, error } = await supabase
            .from('config_presupuesto')
            .select('valor')
            .eq('clave', 'duracion_proyecto')
            .single();

        if (error) {
            console.error('Error fetching duracion_proyecto:', error);
        } else if (data) {
            setDuracionProyecto(Number(data.valor));
        }
    };

    const updateDuracionProyecto = async (val: number) => {
        setDuracionProyecto(val);
        if (!isSupabaseConfigured) return;

        try {
            await supabase.from('config_presupuesto').upsert({
                clave: 'duracion_proyecto',
                valor: val,
                updated_at: new Date().toISOString()
            }, { onConflict: 'clave' });
        } catch (err) {
            console.error('Error saving duracion_proyecto:', err);
        }
    };

    const fetchDotaciones = async () => {
        setLoading(true);
        const mockData: DotacionItem[] = [
            { id: '1', descripcion: 'Pantalón', cant_proy: 2, duracion_dias: 90, valor_unitario: 50133 },
            { id: '2', descripcion: 'Camisa', cant_proy: 2, duracion_dias: 90, valor_unitario: 54589 },
            { id: '3', descripcion: 'Guantes', cant_proy: 1, duracion_dias: 15, valor_unitario: 14210 },
            { id: '4', descripcion: 'Cascos + barbuquejo', cant_proy: 1, duracion_dias: 120, valor_unitario: 28822 },
        ];

        if (!isSupabaseConfigured) {
            setDotaciones(mockData);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('dotacion').select('*').order('created_at', { ascending: true });
        if (error) {
            console.error('Error fetching dotaciones:', error);
            setDotaciones(mockData);
        } else {
            setDotaciones(data || []);
        }
        setLoading(false);
    };

    const handleDownloadTemplate = () => {
        const headers = ['Descripcion', 'Cant./Proy.', 'Duracion (Dias)', 'Frecuencia', 'Valor Unitario'];
        const row = ['Pantalón', '2', '90', '1', '50133'];
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + row.join(";");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_dotacion.csv");
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
                // Si la fila tiene 5 columnas, Valor Unitario está en el índice 4. Si tiene 4 (plantilla vieja), está en el 3.
                const valorUnitarioIndex = columns.length >= 5 ? 4 : 3;
                return {
                    descripcion: columns[0]?.trim() || '',
                    cant_proy: Number(columns[1]?.trim().replace(',', '.')) || 1,
                    duracion_dias: Number(columns[2]?.trim()) || 30,
                    valor_unitario: Number(columns[valorUnitarioIndex]?.trim().replace(',', '.')) || 0
                };
            }).filter(item => item.descripcion !== '');

            if (isSupabaseConfigured) {
                try {
                    const { error } = await supabase.from('dotacion').insert(newItems);
                    if (error) throw error;
                    fetchDotaciones();
                } catch (error: any) {
                    console.error('Error uploading CSV:', error);
                    alert(`Error al subir los datos a Supabase: ${error.message || 'Error desconocido'}`);
                }
            } else {
                const withIds = newItems.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) }));
                setDotaciones([...withIds, ...dotaciones]);
            }
            setIsUploadModalOpen(false);
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleOpenModal = (item?: DotacionItem) => {
        if (item) {
            const originalItem = dotaciones.find(d => d.id === item.id) || item;
            setEditingItem(originalItem);
            setForm({
                descripcion: originalItem.descripcion,
                cant_proy: originalItem.cant_proy,
                duracion_dias: originalItem.duracion_dias,
                valor_unitario: originalItem.valor_unitario,
                valor_total: originalItem.valor_total != null ? String(originalItem.valor_total) : '',
                valor_dia: originalItem.valor_dia != null ? String(originalItem.valor_dia) : ''
            });
        } else {
            setEditingItem(null);
            setForm({ descripcion: '', cant_proy: 1, duracion_dias: 30, valor_unitario: 0, valor_total: '', valor_dia: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payloadToSave = {
            descripcion: form.descripcion,
            cant_proy: form.cant_proy,
            duracion_dias: form.duracion_dias,
            valor_unitario: form.valor_unitario,
            valor_total: form.valor_total !== '' ? Number(form.valor_total) : null,
            valor_dia: form.valor_dia !== '' ? Number(form.valor_dia) : null
        };

        if (!isSupabaseConfigured) {
            if (editingItem) {
                setDotaciones(dotaciones.map(c => c.id === editingItem.id ? { ...c, ...payloadToSave } : c));
            } else {
                setDotaciones([{ ...payloadToSave, id: Math.random().toString(36).substr(2, 9) }, ...dotaciones]);
            }
            setIsModalOpen(false);
            setLoading(false);
            return;
        }

        try {
            if (editingItem) {
                const { error } = await supabase.from('dotacion').update(payloadToSave).eq('id', editingItem.id);
                if (error) throw error;
                fetchDotaciones();
            } else {
                const { error } = await supabase.from('dotacion').insert([payloadToSave]);
                if (error) throw error;
                fetchDotaciones();
            }
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('Error saving:', err);
            alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este registro?')) return;
        if (!isSupabaseConfigured) {
            setDotaciones(dotaciones.filter(c => c.id !== id));
            return;
        }

        try {
            const { error } = await supabase.from('dotacion').delete().eq('id', id);
            if (error) throw error;
            fetchDotaciones();
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Error al eliminar.');
        }
    };

    const filteredData = dotaciones.filter(c =>
        c.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const processedData = filteredData.map(c => {
        // Use dynamic formula FREC: ceil(D_PROY / D_ITEM)
        const frecuencia = evaluate('FREC', {
            D_PROY: duracionProyecto,
            D_ITEM: c.duracion_dias || 1
        });

        // Use dynamic formula V_DIA: (C_PROY * FREC * V_UNIT) / D_PROY
        const calcValorDia = evaluate('V_DIA', {
            C_PROY: c.cant_proy,
            FREC: frecuencia,
            V_UNIT: c.valor_unitario,
            D_PROY: duracionProyecto
        });

        const calcValorTotal = c.cant_proy * frecuencia * c.valor_unitario;

        return {
            ...c,
            frecuencia,
            valor_total: c.valor_total != null ? c.valor_total : calcValorTotal,
            valor_dia: c.valor_dia != null ? c.valor_dia : calcValorDia
        };
    });

    const totals = {
        valorTotal: processedData.reduce((acc, curr) => acc + (curr.valor_total || 0), 0),
        valorDia: processedData.reduce((acc, curr) => acc + (curr.valor_dia || 0), 0)
    };

    const columns = [
        { header: 'DESCRIPCION', accessor: 'descripcion' as const },
        { header: 'CANT./PROY.', accessor: (item: any) => Number(item.cant_proy) },
        { header: 'DURACION (Dias)', accessor: 'duracion_dias' as const },
        { header: 'FRECUENCIA', accessor: 'frecuencia' as const },
        { header: 'VALOR UNITARIO', accessor: (item: any) => `$${Number(item.valor_unitario).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        { header: 'VALOR TOTAL', accessor: (item: any) => <span style={{ fontWeight: 600 }}>${Number(item.valor_total).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> },
        { header: 'VALOR/DIA', accessor: (item: any) => <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>${Number(item.valor_dia).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> },
    ];

    const TableFooter = () => (
        <tr style={{ borderTop: '2px solid hsl(var(--border))', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
            <td colSpan={5} style={{ padding: '1rem', fontWeight: 700, textAlign: 'center' }}>Total</td>
            <td style={{ padding: '1rem', fontWeight: 700 }}>${Math.round(totals.valorTotal).toLocaleString()}</td>
            <td style={{ padding: '1rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>${Math.round(totals.valorDia).toLocaleString()}</td>
            <td className="no-print"></td>
        </tr>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <HardHat size={32} style={{ color: 'hsl(var(--primary))' }} />
                        Dotación
                    </h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>Gestión de la dotación necesaria para el proyecto y sus costos.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
                        <div>
                            <span style={{ fontSize: '0.75rem', display: 'block', color: 'hsl(var(--muted-foreground))' }}>DURACIÓN ESTIMADA DEL PROYECTO (DÍAS)</span>
                            <input type="number" value={duracionProyecto} onChange={(e) => updateDuracionProyecto(Number(e.target.value))} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 700, width: '50px', outline: 'none' }} />
                        </div>
                    </div>
                    <button onClick={() => setIsUploadModalOpen(true)} className="glass" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: 'white' }}>
                        <FileSpreadsheet size={18} /> Cargar CSV
                    </button>
                    <button onClick={() => handleOpenModal()} style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        <Plus size={18} /> Nueva Dotación
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                    <input type="text" placeholder="Buscar dotación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'white', outline: 'none' }} />
                </div>
            </div>

            <DataTable columns={columns} data={processedData} onEdit={(item) => handleOpenModal(item)} onDelete={(item) => handleDelete(item.id)} footer={<TableFooter />} />

            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Cargar desde CSV">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px dashed hsl(var(--primary))', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
                        <Download size={32} style={{ color: 'hsl(var(--primary))', marginBottom: '1rem', margin: '0 auto' }} />
                        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>1. Descarga la Plantilla</h3>
                        <button onClick={handleDownloadTemplate} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.4)', color: 'white', padding: '0.625rem 1.25rem', borderRadius: '4px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                            <Download size={16} /> Bajar Plantilla .csv
                        </button>
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Editar Dotación' : 'Nueva Dotación'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Descripción</label>
                        <input required type="text" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Cant./Proy.</label>
                            <input required type="number" step="0.01" value={form.cant_proy} onChange={(e) => setForm({ ...form, cant_proy: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Duración (Días)</label>
                            <input required type="number" value={form.duracion_dias} onChange={(e) => setForm({ ...form, duracion_dias: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Valor Unitario</label>
                        <input required type="number" step="0.01" value={form.valor_unitario} onChange={(e) => setForm({ ...form, valor_unitario: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>VALOR TOTAL (Manual)</label>
                            <input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} placeholder="Dejar vacío para cálculo automático" style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>VALOR/DÍA (Manual)</label>
                            <input type="number" step="0.01" value={form.valor_dia} onChange={(e) => setForm({ ...form, valor_dia: e.target.value })} placeholder="Dejar vacío para cálculo automático" style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="glass" style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)' }}>Cancelar</button>
                        <button type="submit" disabled={loading} style={{ flex: 1, backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius)', fontWeight: 600 }}>{loading ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Dotacion;
