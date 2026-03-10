import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Stethoscope, Calculator, Calendar, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useFormulas } from '../context/FormulaContext';

interface ExamenMedico {
    id: string;
    tipo_examen: string;
    frecuencia: string;
    num_examenes_periodo: number;
    valor_unitario: number;
    valor_total?: number;
    valor_mes_total_personas?: number;
}

const ExamenesMedicos = () => {
    const { evaluate } = useFormulas();
    const [examenes, setExamenes] = useState<ExamenMedico[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingExamen, setEditingExamen] = useState<ExamenMedico | null>(null);
    const [loading, setLoading] = useState(false);
    const [duracionProyecto, setDuracionProyecto] = useState(90);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [form, setForm] = useState({
        tipo_examen: '',
        frecuencia: '',
        num_examenes_periodo: 0,
        valor_unitario: 0
    });

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    useEffect(() => {
        fetchExamenes();
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

    const fetchExamenes = async () => {
        setLoading(true);
        if (!isSupabaseConfigured) {
            const mockData: ExamenMedico[] = [
                { id: '1', tipo_examen: 'Examen médico ocupacional', frecuencia: 'Ingreso-Retiro', num_examenes_periodo: 2, valor_unitario: 33559 },
                { id: '2', tipo_examen: 'Examen médico ocupacional con énfasis en osteomuscular', frecuencia: 'Ingreso', num_examenes_periodo: 0, valor_unitario: 49760 },
                { id: '3', tipo_examen: 'Examen médico ocupacional con énfasis en trabajo en altura', frecuencia: 'Ingreso-Periodico', num_examenes_periodo: 1, valor_unitario: 49760 },
                { id: '4', tipo_examen: 'Audiometría tamiz', frecuencia: '-', num_examenes_periodo: 0, valor_unitario: 20251 },
            ];
            setExamenes(mockData);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('examenes_medicos').select('*').order('tipo_examen');
        if (error) {
            console.error('Error fetching examenes:', error);
        } else {
            setExamenes(data || []);
        }
        setLoading(false);
    };

    const handleDownloadTemplate = () => {
        // En español latinoamérica (Excel usa punto y coma como separador si la coma es decimal)
        const headers = ['Tipo de Examen', 'Frecuencia', 'Num Examenes Periodo', 'Valor Unitario'];
        const row = ['Examen médico ocupacional', 'Ingreso-Retiro', '2', '33559'];

        // Añadir el BOM de UTF-8 para que Excel reconozca tildes correctamente
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + row.join(";");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_examenes_latam.csv");
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

            // Detectar separador (punto y coma o coma)
            const delimiter = rows[0].includes(';') ? ';' : ',';
            const dataRows = rows.slice(1);

            const newExamenes = dataRows.map(row => {
                const columns = row.split(delimiter);
                return {
                    tipo_examen: columns[0]?.trim() || '',
                    frecuencia: columns[1]?.trim() || '',
                    num_examenes_periodo: Number(columns[2]?.trim().replace(',', '.')) || 0,
                    valor_unitario: Number(columns[3]?.trim().replace(',', '.')) || 0
                };
            }).filter(ex => ex.tipo_examen !== '');

            if (isSupabaseConfigured) {
                try {
                    const { error } = await supabase.from('examenes_medicos').insert(newExamenes);
                    if (error) throw error;
                    fetchExamenes();
                } catch (error) {
                    console.error('Error uploading CSV:', error);
                    alert('Error al subir los datos a Supabase. Verifique que las columnas coincidan con la plantilla.');
                }
            } else {
                const withIds = newExamenes.map(ex => ({ ...ex, id: Math.random().toString(36).substr(2, 9) }));
                setExamenes([...withIds, ...examenes]);
            }
            setIsUploadModalOpen(false);
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleOpenModal = (examen?: ExamenMedico) => {
        if (examen) {
            setEditingExamen(examen);
            setForm({
                tipo_examen: examen.tipo_examen,
                frecuencia: examen.frecuencia,
                num_examenes_periodo: examen.num_examenes_periodo,
                valor_unitario: examen.valor_unitario
            });
        } else {
            setEditingExamen(null);
            setForm({ tipo_examen: '', frecuencia: '', num_examenes_periodo: 0, valor_unitario: 0 });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!isSupabaseConfigured) {
            if (editingExamen) {
                setExamenes(examenes.map(ex => ex.id === editingExamen.id ? { ...ex, ...form } : ex));
            } else {
                setExamenes([{ ...form, id: Math.random().toString(36).substr(2, 9) }, ...examenes]);
            }
            setIsModalOpen(false);
            setLoading(false);
            return;
        }

        try {
            if (editingExamen) {
                const { error } = await supabase.from('examenes_medicos').update(form).eq('id', editingExamen.id);
                if (error) throw error;
                fetchExamenes();
            } else {
                const { error } = await supabase.from('examenes_medicos').insert([form]);
                if (error) throw error;
                fetchExamenes();
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error('Error saving examen:', err);
            alert('Error al guardar en Supabase.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este examen?')) return;
        if (!isSupabaseConfigured) {
            setExamenes(examenes.filter(ex => ex.id !== id));
            return;
        }

        try {
            const { error } = await supabase.from('examenes_medicos').delete().eq('id', id);
            if (error) throw error;
            fetchExamenes();
        } catch (err) {
            console.error('Error deleting examen:', err);
            alert('Error al eliminar.');
        }
    };

    const filteredData = examenes.filter(ex =>
        ex.tipo_examen.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculations based on the dynamic formula engine
    const processedData = filteredData.map(ex => {
        // Use dynamic formula EXAM_TOT: n * u
        const valorTotal = evaluate('EXAM_TOT', {
            n: ex.num_examenes_periodo,
            u: ex.valor_unitario
        });

        // Use dynamic formula EXAM_DIA: V_TOT / D_PROY
        const costoPorDia = evaluate('EXAM_DIA', {
            V_TOT: valorTotal,
            D_PROY: duracionProyecto
        });

        return {
            ...ex,
            valor_total: valorTotal,
            valor_mes_total_personas: costoPorDia
        };
    });

    const totals = {
        numExamenes: processedData.reduce((acc: number, curr: any) => acc + (curr.num_examenes_periodo || 0), 0),
        valorTotal: processedData.reduce((acc: number, curr: any) => acc + (curr.valor_total || 0), 0),
        valorMes: processedData.reduce((acc: number, curr: any) => acc + (curr.valor_mes_total_personas || 0), 0)
    };

    const columns = [
        { header: 'Tipos de Exámenes', accessor: 'tipo_examen' as const },
        { header: 'Frecuencia', accessor: 'frecuencia' as const },
        { header: 'No. Exámenes/Periodo (n)', accessor: (item: any) => Number(item.num_examenes_periodo).toFixed(2) },
        { header: 'Valor Unitario (u)', accessor: (item: any) => `$${Number(item.valor_unitario).toLocaleString()}` },
        {
            header: 'VALOR TOTAL (T)',
            accessor: (item: any) => (
                <span style={{ fontWeight: 600 }}>
                    ${Number(item.valor_total).toLocaleString()}
                </span>
            )
        },
        {
            header: 'Costo por Día (C)',
            accessor: (item: any) => (
                <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>
                    ${Number(item.valor_mes_total_personas).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
            )
        },
    ];

    const TableFooter = () => (
        <tr>
            <td colSpan={2} style={{ padding: '1rem', fontWeight: 700, textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>TOTAL</td>
            <td style={{ padding: '1rem', fontWeight: 700, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>{totals.numExamenes.toFixed(2)}</td>
            <td style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></td>
            <td style={{ padding: '1rem', fontWeight: 700, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>${totals.valorTotal.toLocaleString()}</td>
            <td style={{ padding: '1rem', fontWeight: 700, color: 'hsl(var(--primary))', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>${totals.valorMes.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
            <td style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}></td>
        </tr>
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Stethoscope size={32} style={{ color: 'hsl(var(--primary))' }} />
                        Exámenes Médicos
                    </h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Gestión de tipos de exámenes, frecuencias y costos proyectados.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Calendar size={18} style={{ color: 'hsl(var(--muted-foreground))' }} />
                        <div>
                            <span style={{ fontSize: '0.75rem', display: 'block', color: 'hsl(var(--muted-foreground))' }}>DURACIÓN ESTIMADA DEL PROYECTO (DÍAS)</span>
                            <input
                                type="number"
                                value={duracionProyecto}
                                onChange={(e) => updateDuracionProyecto(Number(e.target.value))}
                                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 700, width: '50px', outline: 'none' }}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        style={{
                            padding: '0.75rem 1.25rem',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            color: 'white',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.25)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.15)'}
                    >
                        <FileSpreadsheet size={18} />
                        Cargar CSV
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                    >
                        <Plus size={18} />
                        Nuevo Examen
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                    <input
                        type="text"
                        placeholder="Buscar exámenes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'white', outline: 'none' }}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Costo VALOR TOTAL', value: `$${totals.valorTotal.toLocaleString()}`, icon: <Calculator size={20} /> },
                    { label: 'Total Costo por Día', value: `$${totals.valorMes.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: <Calculator size={20} /> },
                ].map((card, i) => (
                    <div key={i} className="glass" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}>{card.label}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{card.value}</h3>
                        </div>
                        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '12px', color: 'hsl(var(--primary))' }}>
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={processedData}
                onEdit={(item) => handleOpenModal(item)}
                onDelete={(item) => handleDelete(item.id)}
                footer={<TableFooter />}
            />

            {/* Modal de Carga CSV */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Cargar Exámenes desde CSV"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem' }}>
                    <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px dashed hsl(var(--primary))', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
                        <Download size={32} style={{ color: 'hsl(var(--primary))', marginBottom: '1rem', margin: '0 auto' }} />
                        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>1. Descarga la Plantilla</h3>
                        <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }}>
                            Utiliza nuestro formato CSV para asegurar que los datos se carguen correctamente.
                        </p>
                        <button
                            onClick={handleDownloadTemplate}
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.4)', color: 'white', padding: '0.625rem 1.25rem', borderRadius: '4px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                        >
                            <Download size={16} />
                            Bajar Plantilla .csv
                        </button>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontWeight: 600, marginBottom: '1rem' }}>2. Sube tu archivo</h3>
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleCSVUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            style={{ width: '100%', backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '1rem', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <Upload size={20} />
                            {loading ? 'Procesando...' : 'Seleccionar Archivo y Cargar'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Formulario Detallado */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingExamen ? 'Editar Examen' : 'Nuevo Examen'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tipo de Examen</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Audiometría tamiz"
                            value={form.tipo_examen}
                            onChange={(e) => setForm({ ...form, tipo_examen: e.target.value })}
                            style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Frecuencia</label>
                        <input
                            type="text"
                            placeholder="Ej: Ingreso-Periodico"
                            value={form.frecuencia}
                            onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}
                            style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>No. Exámenes/Periodo</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={form.num_examenes_periodo}
                                onChange={(e) => setForm({ ...form, num_examenes_periodo: Number(e.target.value) })}
                                style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Valor Unitario</label>
                            <input
                                required
                                type="number"
                                value={form.valor_unitario}
                                onChange={(e) => setForm({ ...form, valor_unitario: Number(e.target.value) })}
                                style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }}
                            />
                        </div>
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
        </div>
    );
};

export default ExamenesMedicos;
