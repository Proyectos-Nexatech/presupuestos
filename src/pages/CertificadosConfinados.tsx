import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Hexagon, Calendar, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useFormulas } from '../context/FormulaContext';

interface CertificadoConfinado {
    id: string;
    tipo_certificado: string;
    frecuencia: string;
    num_personas_periodo: number;
    valor_unitario: number;
    valor_total?: number;
    valor_mes_total_personas?: number;
}

const CertificadosConfinados = () => {
    const { evaluate } = useFormulas();
    const [certificados, setCertificados] = useState<CertificadoConfinado[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingCert, setEditingCert] = useState<CertificadoConfinado | null>(null);
    const [loading, setLoading] = useState(false);
    const [duracionProyecto, setDuracionProyecto] = useState(90);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [form, setForm] = useState({
        tipo_certificado: '',
        frecuencia: '',
        num_personas_periodo: 0,
        valor_unitario: 0
    });

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    useEffect(() => {
        fetchCertificados();
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

    const fetchCertificados = async () => {
        setLoading(true);
        const mockData: CertificadoConfinado[] = [
            { id: '1', tipo_certificado: 'TRABAJADOR ENTRANTE', frecuencia: '1', num_personas_periodo: 1, valor_unitario: 250000 },
            { id: '2', tipo_certificado: 'VIGIA', frecuencia: '1', num_personas_periodo: 1, valor_unitario: 220000 },
            { id: '3', tipo_certificado: 'SUPERVISOR', frecuencia: '1', num_personas_periodo: 1, valor_unitario: 320000 },
            { id: '4', tipo_certificado: 'ADMINISTRACION PROGRAMA DE GESTION', frecuencia: '1', num_personas_periodo: 1, valor_unitario: 200000 },
        ];

        if (!isSupabaseConfigured) {
            setCertificados(mockData);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('certificados_confinados').select('*').order('tipo_certificado');
        if (error) {
            console.error('Error fetching certificados:', error);
            setCertificados(mockData);
        } else {
            setCertificados(data || []);
        }
        setLoading(false);
    };

    const handleDownloadTemplate = () => {
        const headers = ['Tipo de Certificado', 'Frecuencia', 'Num Personas Periodo', 'Valor Unitario'];
        const row = ['TRABAJADOR ENTRANTE', '1', '1', '250000'];
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + row.join(";");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_certificados_confinados.csv");
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
                    tipo_certificado: columns[0]?.trim() || '',
                    frecuencia: columns[1]?.trim() || '',
                    num_personas_periodo: Number(columns[2]?.trim().replace(',', '.')) || 0,
                    valor_unitario: Number(columns[3]?.trim().replace(',', '.')) || 0
                };
            }).filter(item => item.tipo_certificado !== '');

            if (isSupabaseConfigured) {
                try {
                    const { error } = await supabase.from('certificados_confinados').insert(newItems);
                    if (error) throw error;
                    fetchCertificados();
                } catch (error) {
                    console.error('Error uploading CSV:', error);
                    alert('Error al subir los datos a Supabase.');
                }
            } else {
                const withIds = newItems.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) }));
                setCertificados([...withIds, ...certificados]);
            }
            setIsUploadModalOpen(false);
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleOpenModal = (cert?: CertificadoConfinado) => {
        if (cert) {
            setEditingCert(cert);
            setForm({
                tipo_certificado: cert.tipo_certificado,
                frecuencia: cert.frecuencia,
                num_personas_periodo: cert.num_personas_periodo,
                valor_unitario: cert.valor_unitario
            });
        } else {
            setEditingCert(null);
            setForm({ tipo_certificado: '', frecuencia: '', num_personas_periodo: 0, valor_unitario: 0 });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payloadToSave = {
            tipo_certificado: form.tipo_certificado,
            frecuencia: form.frecuencia,
            num_personas_periodo: form.num_personas_periodo,
            valor_unitario: form.valor_unitario
        };

        if (!isSupabaseConfigured) {
            if (editingCert) {
                setCertificados(certificados.map(c => c.id === editingCert.id ? { ...c, ...form } : c));
            } else {
                setCertificados([{ ...form, id: Math.random().toString(36).substr(2, 9) }, ...certificados]);
            }
            setIsModalOpen(false);
            setLoading(false);
            return;
        }

        try {
            if (editingCert) {
                const { error } = await supabase.from('certificados_confinados').update(payloadToSave).eq('id', editingCert.id);
                if (error) throw error;
                fetchCertificados();
            } else {
                const { error } = await supabase.from('certificados_confinados').insert([payloadToSave]);
                if (error) throw error;
                fetchCertificados();
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
            setCertificados(certificados.filter(c => c.id !== id));
            return;
        }

        try {
            const { error } = await supabase.from('certificados_confinados').delete().eq('id', id);
            if (error) throw error;
            fetchCertificados();
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Error al eliminar.');
        }
    };

    const filteredData = certificados.filter(c =>
        c.tipo_certificado.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const processedData = filteredData.map(c => {
        // Use dynamic formula CONF_TOT: n * u
        const valorTotal = evaluate('CONF_TOT', {
            n: c.num_personas_periodo,
            u: c.valor_unitario
        });

        // Use dynamic formula CONF_DIA: V_TOT / D_PROY
        const costoPorDia = evaluate('CONF_DIA', {
            V_TOT: valorTotal,
            D_PROY: duracionProyecto
        });

        return { ...c, valor_total: valorTotal, valor_mes_total_personas: costoPorDia };
    });

    const totals = {
        numPersonas: processedData.reduce((acc, curr) => acc + (curr.num_personas_periodo || 0), 0),
        valorTotal: processedData.reduce((acc, curr) => acc + (curr.valor_total || 0), 0),
        valorMes: processedData.reduce((acc, curr) => acc + (curr.valor_mes_total_personas || 0), 0)
    };

    const columns = [
        { header: 'Tipos de Certificado', accessor: 'tipo_certificado' as const },
        { header: 'Frecuencia', accessor: 'frecuencia' as const },
        { header: 'No. Personas/Periodo (n)', accessor: (item: any) => Number(item.num_personas_periodo).toFixed(2) },
        { header: 'Valor Unitario (u)', accessor: (item: any) => `$${Number(item.valor_unitario).toLocaleString()}` },
        { header: 'VALOR TOTAL (T)', accessor: (item: any) => <span style={{ fontWeight: 600 }}>${Number(item.valor_total).toLocaleString()}</span> },
        { header: 'Costo por Día (C)', accessor: (item: any) => <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>${Number(item.valor_mes_total_personas).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> },
    ];

    const TableFooter = () => (
        <tr>
            <td colSpan={2} style={{ padding: '1rem', fontWeight: 700, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>TOTAL</td>
            <td style={{ padding: '1rem', fontWeight: 700, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>{totals.numPersonas.toFixed(2)}</td>
            <td style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></td>
            <td style={{ padding: '1rem', fontWeight: 700, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>${totals.valorTotal.toLocaleString()}</td>
            <td style={{ padding: '1rem', fontWeight: 700, color: 'hsl(var(--primary))', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>${totals.valorMes.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            <td style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></td>
        </tr>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Hexagon size={32} style={{ color: 'hsl(var(--primary))' }} />
                        Certificados Confinados
                    </h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>Gestión de certificados de trabajo en espacios confinados y costos.</p>
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
                        <Plus size={18} /> Nuevo Certificado
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                    <input type="text" placeholder="Buscar certificados..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'white', outline: 'none' }} />
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCert ? 'Editar Certificado' : 'Nuevo Certificado'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tipo de Certificado</label>
                        <input required type="text" value={form.tipo_certificado} onChange={(e) => setForm({ ...form, tipo_certificado: e.target.value })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Frecuencia</label>
                        <input type="text" value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>No. Personas/Periodo</label>
                            <input required type="number" step="0.01" value={form.num_personas_periodo} onChange={(e) => setForm({ ...form, num_personas_periodo: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Valor Unitario</label>
                            <input required type="number" value={form.valor_unitario} onChange={(e) => setForm({ ...form, valor_unitario: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
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

export default CertificadosConfinados;
