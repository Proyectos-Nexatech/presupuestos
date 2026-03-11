import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Upload, Download, FileSpreadsheet, Printer, Calculator, Check } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useFormulas } from '../context/FormulaContext';

interface CuadroEconomicoItem {
    id: string;
    item: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    rendimiento: number;
    rendimiento_ud: number;
    precio_ud_suministro: number;
    precio_ud_montaje: number;
    total_hh: number;
    precio_unitario?: number | null;
    precio_total?: number | null;
    proyecto?: string | null;
}

const UNIDADES = ['UN', 'ML', 'KG', 'PD', 'GL', 'M2', 'M3', 'LB', 'H', 'DIA', 'MES', 'GLN', 'EST', 'PAQ', 'NPT'];

const CuadroEconomico = () => {
    const navigate = useNavigate();
    const { evaluate } = useFormulas();
    const [items, setItems] = useState<CuadroEconomicoItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CuadroEconomicoItem | null>(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Metadata Persistence
    const [fechaOferta, setFechaOferta] = useState(() => {
        return localStorage.getItem('budget_fecha') || new Date().toISOString().split('T')[0];
    });
    const [codigoOferta, setCodigoOferta] = useState(() => localStorage.getItem('budget_codigo') || 'BI0011C');
    const [cliente, setCliente] = useState(() => localStorage.getItem('budget_cliente') || 'MEXICHEM');
    const [tituloOferta, setTituloOferta] = useState(() => localStorage.getItem('budget_titulo') || 'FABRICACIÓN E INSTALACIÓN DE ANILLOS DE LIMPIEZA DE PSE DE PLY-4E A PLY-7E');
    const [nombreProyecto, setNombreProyecto] = useState(() => localStorage.getItem('budget_proyecto') || 'PROYECTO GENERAL');

    // Update LocalStorage on change
    useEffect(() => { localStorage.setItem('budget_fecha', fechaOferta); }, [fechaOferta]);
    useEffect(() => { localStorage.setItem('budget_codigo', codigoOferta); }, [codigoOferta]);
    useEffect(() => { localStorage.setItem('budget_cliente', cliente); }, [cliente]);
    useEffect(() => { localStorage.setItem('budget_titulo', tituloOferta); }, [tituloOferta]);
    useEffect(() => { localStorage.setItem('budget_proyecto', nombreProyecto); }, [nombreProyecto]);

    // UI State for Summary Toggles
    const [useAdmin, setUseAdmin] = useState(true);
    const [useImprevisto, setUseImprevisto] = useState(true);
    const [useUtilidad, setUseUtilidad] = useState(true);

    // Persistent Logo State
    const [logo, setLogo] = useState<string | null>(() => localStorage.getItem('budget_logo'));
    const logoInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setLogo(base64);
            localStorage.setItem('budget_logo', base64);
        };
        reader.readAsDataURL(file);
    };

    // Form State
    const [form, setForm] = useState({
        item: '',
        descripcion: '',
        unidad: '',
        cantidad: 0,
        rendimiento: 0,
        rendimiento_ud: 0,
        precio_ud_suministro: 0,
        precio_ud_montaje: 0,
        total_hh: 0,
        precio_unitario: '',
        precio_total: '',
        proyecto: ''
    });

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        const mockData: CuadroEconomicoItem[] = [
            { id: '1', item: '1.1', descripcion: 'PREFABRICACION DE ANILLOS PARA LIMPIEZA DE PSE (PLY 4E A PLY 7E) DE ACUERDO A PLANO DE MRC', unidad: 'UN', cantidad: 4, rendimiento: 4, rendimiento_ud: 4, precio_ud_suministro: 3885, precio_ud_montaje: 207289, total_hh: 16 },
            { id: '2', item: '1.2', descripcion: 'PREFABRICACION DE TUBERIAS PARA ANILLOS DE LIMPIEZA DE PSE (PLY 4E A PLY 7E) DE ACUERDO A ISOMETRIAS DE MRC', unidad: 'PD', cantidad: 144, rendimiento: 51, rendimiento_ud: 1, precio_ud_suministro: 25535, precio_ud_montaje: 69515, total_hh: 203 },
            { id: '3', item: '1.3', descripcion: 'PREFABRICACION DE TUBERIAS DE PSV TESTIGO PSV-PX50 (PLY-4E A PLY-7E) DE ACUERDO A ISOMETRIAS DE MRC', unidad: 'NPT', cantidad: 96, rendimiento: 30, rendimiento_ud: 1, precio_ud_suministro: 10511, precio_ud_montaje: 42502, total_hh: 80 }
        ];

        if (!isSupabaseConfigured) {
            setItems(mockData);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase.from('cuadro_economico').select('*').order('created_at', { ascending: true });
        if (error) {
            console.error('Error fetching cuadro_economico:', error);
            setItems(mockData);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const handleDownloadTemplate = () => {
        const headers = ['ITEM', 'DESCRIPCION', 'UNIDAD', 'CANTIDAD', 'Rendimiento', 'Rendimiento/Ud (Hora-Hombre)', 'Precio/Ud Suministro', 'Precio/Ud Montaje', 'Total HH', 'PRECIO UNITARIO', 'PRECIO TOTAL'];
        const row = ['1.1', 'PREFABRICACION EJEMPLO', 'UN', '4', '4', '4', '3885', '207289', '16', '', ''];
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + row.join(";");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_cuadro_economico.csv");
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
                    item: columns[0]?.trim() || '',
                    descripcion: columns[1]?.trim() || '',
                    unidad: columns[2]?.trim() || '',
                    cantidad: Number(columns[3]?.trim().replace(',', '.')) || 0,
                    rendimiento: Number(columns[4]?.trim().replace(',', '.')) || 0,
                    rendimiento_ud: Number(columns[5]?.trim().replace(',', '.')) || 0,
                    precio_ud_suministro: Number(columns[6]?.trim().replace(',', '.')) || 0,
                    precio_ud_montaje: Number(columns[7]?.trim().replace(',', '.')) || 0,
                    total_hh: Number(columns[8]?.trim().replace(',', '.')) || 0,
                    precio_unitario: columns[9]?.trim() ? Number(columns[9]?.trim().replace(',', '.')) : null,
                    precio_total: columns[10]?.trim() ? Number(columns[10]?.trim().replace(',', '.')) : null,
                    proyecto: columns[11]?.trim() || nombreProyecto // Use global project name if column doesn't exist
                };
            }).filter(i => i.item !== '');

            if (isSupabaseConfigured) {
                try {
                    const { error } = await supabase.from('cuadro_economico').insert(newItems);
                    if (error) throw error;
                    fetchItems();
                } catch (error: any) {
                    console.error('Error uploading CSV:', error);
                    alert(`Error al subir los datos a Supabase: ${error.message || 'Error desconocido'}`);
                }
            } else {
                const withIds = newItems.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) }));
                setItems([...items, ...withIds]); // Append mock
            }
            setIsUploadModalOpen(false);
            setLoading(false);
        };
        reader.readAsText(file);
    };

    const handleOpenModal = (item?: CuadroEconomicoItem) => {
        if (item) {
            const originalItem = items.find(d => d.id === item.id) || item;
            setEditingItem(originalItem);
            setForm({
                item: originalItem.item,
                descripcion: originalItem.descripcion,
                unidad: originalItem.unidad,
                cantidad: originalItem.cantidad,
                rendimiento: originalItem.rendimiento,
                rendimiento_ud: originalItem.rendimiento_ud,
                precio_ud_suministro: originalItem.precio_ud_suministro,
                precio_ud_montaje: originalItem.precio_ud_montaje,
                total_hh: originalItem.total_hh,
                precio_unitario: originalItem.precio_unitario != null ? String(originalItem.precio_unitario) : '',
                precio_total: originalItem.precio_total != null ? String(originalItem.precio_total) : '',
                proyecto: originalItem.proyecto || nombreProyecto
            });
        } else {
            setEditingItem(null);
            setForm({ item: '', descripcion: '', unidad: '', cantidad: 0, rendimiento: 0, rendimiento_ud: 0, precio_ud_suministro: 0, precio_ud_montaje: 0, total_hh: 0, precio_unitario: '', precio_total: '', proyecto: nombreProyecto });
        }
        setIsModalOpen(true);
    };

    const [filterValues, setFilterValues] = useState<Record<string, string>>({});

    const handleFilterChange = (accessor: string, value: string) => {
        setFilterValues(prev => ({ ...prev, [accessor]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payloadToSave = {
            item: form.item,
            descripcion: form.descripcion,
            unidad: form.unidad,
            cantidad: form.cantidad,
            rendimiento: form.rendimiento,
            rendimiento_ud: form.rendimiento_ud,
            precio_ud_suministro: form.precio_ud_suministro,
            precio_ud_montaje: form.precio_ud_montaje,
            total_hh: form.total_hh,
            precio_unitario: form.precio_unitario !== '' ? Number(form.precio_unitario) : null,
            precio_total: form.precio_total !== '' ? Number(form.precio_total) : null,
            proyecto: form.proyecto
        };

        if (!isSupabaseConfigured) {
            if (editingItem) {
                setItems(items.map(c => c.id === editingItem.id ? { ...c, ...payloadToSave } : c));
            } else {
                setItems([{ ...payloadToSave, id: Math.random().toString(36).substr(2, 9) }, ...items]);
            }
            setIsModalOpen(false);
            setLoading(false);
            return;
        }

        try {
            if (editingItem) {
                const { error } = await supabase.from('cuadro_economico').update(payloadToSave).eq('id', editingItem.id);
                if (error) throw error;
                fetchItems();
            } else {
                const { error } = await supabase.from('cuadro_economico').insert([payloadToSave]);
                if (error) throw error;
                fetchItems();
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
            setItems(items.filter(c => c.id !== id));
            return;
        }

        try {
            const { error } = await supabase.from('cuadro_economico').delete().eq('id', id);
            if (error) throw error;
            fetchItems();
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Error al eliminar.');
        }
    };

    const processedItems = useMemo(() => {
        return items.map(c => {
            const calcUnitario = c.precio_ud_suministro + c.precio_ud_montaje;
            const pUnitario = c.precio_unitario != null ? c.precio_unitario : calcUnitario;
            const calcTotal = c.cantidad * pUnitario;
            const pTotal = c.precio_total != null ? c.precio_total : calcTotal;

            return {
                ...c,
                precio_unitario: pUnitario,
                precio_total: pTotal
            };
        });
    }, [items]);

    const filteredDataByColumn = useMemo(() => {
        return processedItems.filter((item: any) => {
            return Object.entries(filterValues).every(([key, value]) => {
                if (!value) return true;
                const itemValue = String(item[key] || '').toLowerCase();
                return itemValue.includes(value.toLowerCase());
            });
        });
    }, [processedItems, filterValues]);

    const formatCol = (val: number) => `$${Number(val || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // Budget Summary Calculations
    const totalCostoDirecto = useMemo(() => {
        return filteredDataByColumn.reduce((acc: number, curr: any) => acc + (Number(curr.precio_total) || 0), 0);
    }, [filteredDataByColumn]);

    const administracion = useAdmin ? evaluate('ADMIN_COST', { DIRECTO: totalCostoDirecto }) : 0;
    const imprevisto = useImprevisto ? evaluate('IMP_COST', { DIRECTO: totalCostoDirecto }) : 0;
    const utilidad = useUtilidad ? evaluate('UTIL_COST', { DIRECTO: totalCostoDirecto }) : 0;
    const subtotalFin = totalCostoDirecto + administracion + imprevisto + utilidad;
    const iva = evaluate('IVA_COST', { SUBTOTAL: subtotalFin });
    const totalFinal = subtotalFin + iva;

    const ToggleBtn = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
        <div
            onClick={onToggle}
            className="no-print"
            style={{
                display: 'flex',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontWeight: 800,
                width: '60px'
            }}
        >
            <div style={{ flex: 1, padding: '2px 0', textAlign: 'center', backgroundColor: active ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.05)', color: active ? 'white' : 'rgba(255,255,255,0.3)' }}>SI</div>
            <div style={{ flex: 1, padding: '2px 0', textAlign: 'center', backgroundColor: !active ? '#ef4444' : 'rgba(255,255,255,0.05)', color: !active ? 'white' : 'rgba(255,255,255,0.3)' }}>NO</div>
        </div>
    );

    const columns = [
        { header: 'ITEMS', accessor: 'item' as const },
        {
            header: 'DESCRIPCION',
            accessor: 'descripcion' as const,
            render: (row: any) => <div style={{ minWidth: '350px' }}>{row.descripcion}</div>
        },
        { header: 'UNIDAD', accessor: 'unidad' as const },
        {
            header: 'CANTIDAD',
            accessor: 'cantidad' as const,
            render: (row: any) => Number(row.cantidad).toLocaleString('es-CO')
        },
        {
            header: 'Rendimiento',
            accessor: 'rendimiento' as const,
            render: (row: any) => Number(row.rendimiento).toLocaleString('es-CO')
        },
        {
            header: 'Rendimiento/Ud',
            accessor: 'rendimiento_ud' as const,
            render: (row: any) => Number(row.rendimiento_ud).toLocaleString('es-CO')
        },
        {
            header: 'Precio/Ud Suministro',
            accessor: 'precio_ud_suministro' as const,
            render: (row: any) => formatCol(row.precio_ud_suministro)
        },
        {
            header: 'Precio/Ud Montaje',
            accessor: 'precio_ud_montaje' as const,
            render: (row: any) => formatCol(row.precio_ud_montaje)
        },
        {
            header: 'Total HH',
            accessor: 'total_hh' as const,
            render: (row: any) => Math.ceil(Number(row.total_hh)).toLocaleString('es-CO', { maximumFractionDigits: 0 })
        },
        {
            header: 'PRECIO UNITARIO',
            accessor: 'precio_unitario' as const,
            render: (row: any) => <span style={{ fontWeight: 600, color: 'hsl(var(--primary))' }}>{formatCol(row.precio_unitario)}</span>
        },
        {
            header: 'PRECIO TOTAL',
            accessor: 'precio_total' as const,
            render: (row: any) => <span style={{ fontWeight: 700 }}>{formatCol(row.precio_total)}</span>
        },
        {
            header: 'APU',
            noPrint: true,
            accessor: 'id' as const,
            render: (row: any) => (
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/apu/${row.id}`); }}
                    className="glass"
                    style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: 'white'
                    }}
                >
                    <Calculator size={14} /> APU
                </button>
            )
        },
    ];

    return (
        <div>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={32} style={{ color: 'hsl(var(--primary))' }} />
                        Cuadro Económico
                    </h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>Resumen financiero y económico de las partidas del presupuesto.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
                    <button onClick={() => window.print()} className="glass" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: 'white' }}>
                        <Printer size={18} /> Imprimir PDF
                    </button>
                    <button onClick={() => setIsUploadModalOpen(true)} className="glass" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, backgroundColor: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: 'white' }}>
                        <FileSpreadsheet size={18} /> Cargar CSV
                    </button>
                    <button onClick={() => handleOpenModal()} style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        <Plus size={18} /> Nuevo Ítem
                    </button>
                </div>
            </div>

            {/* Excel-Style Header Section - Dark/Glass UI with White Print Overrides */}
            <div className="glass" style={{
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '2rem',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}>
                <style>
                    {`
                        @media print {
                            .excel-header-container { background-color: white !important; color: #1a1a1a !important; border: 1px solid #000 !important; }
                            .excel-title-box { border-right: 1px solid #eee !important; background-color: white !important; }
                            .excel-metadata-label-cell { background-color: #f9fafb !important; color: #666 !important; border-right: 1px solid #eee !important; border-bottom: 1px solid #eee !important; }
                            .excel-metadata-value-cell { border-bottom: 1px solid #eee !important; color: #333 !important; background-color: white !important; }
                            .excel-header-row { border-bottom: 1px solid #eee !important; }
                            .excel-input-field { color: #1a1a1a !important; }
                            .excel-logo-box { background-color: #fafafa !important; border-left: 1px solid #eee !important; }
                        }
                    `}
                </style>
                <div className="excel-header-container" style={{ display: 'grid', gridTemplateColumns: '1fr 250px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {/* Title Section */}
                    <div className="excel-title-box" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                        <textarea
                            value={tituloOferta}
                            onChange={(e) => setTituloOferta(e.target.value)}
                            className="excel-input-field"
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                fontSize: '1.35rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                color: 'white',
                                resize: 'none',
                                outline: 'none',
                                lineHeight: '1.2'
                            }}
                            rows={3}
                        />
                    </div>

                    {/* Logo Section */}
                    <div
                        className="excel-logo-box"
                        style={{
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'background 0.2s',
                            backgroundColor: 'rgba(255,255,255,0.02)'
                        }}
                        onClick={() => logoInputRef.current?.click()}
                    >
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" style={{ display: 'none' }} />
                        {logo ? (
                            <>
                                <img src={logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain' }} />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLogo(null);
                                        localStorage.removeItem('budget_logo');
                                    }}
                                    className="no-print"
                                    style={{
                                        position: 'absolute',
                                        top: '5px',
                                        right: '5px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '20px',
                                        height: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        opacity: 0.6
                                    }}
                                    title="Eliminar logo"
                                >
                                    ✕
                                </button>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                <Upload size={24} style={{ marginBottom: '0.25rem', margin: '0 auto' }} />
                                <div style={{ fontSize: '0.6rem', fontWeight: 700 }}>SUBIR LOGO</div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                    <div style={{ width: '20px', height: '20px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></div>
                                    <div style={{ width: '25px', height: '25px', backgroundColor: '#b91c1c', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 900 }}>BI</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Economic Offer Bar - Using App Primary Color */}
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', borderTop: '1px solid rgba(59, 130, 246, 0.3)', borderBottom: '1px solid rgba(59, 130, 246, 0.3)', color: 'white', textAlign: 'center', padding: '0.4rem', fontWeight: 800, letterSpacing: '2px', fontSize: '0.9rem' }}>
                    OFERTA ECONOMICA
                </div>

                {/* Metadata Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
                    <div className="excel-header-row" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="excel-metadata-label-cell" style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.75rem', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>FECHA</div>
                        <div className="excel-metadata-value-cell" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                            <input className="excel-input-field" type="date" value={fechaOferta} onChange={e => setFechaOferta(e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'white', outline: 'none', fontSize: '0.85rem' }} />
                        </div>
                    </div>
                    <div className="excel-header-row" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="excel-metadata-label-cell" style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.75rem', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>CODIGO OFERTA</div>
                        <div className="excel-metadata-value-cell" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                            <input className="excel-input-field" type="text" value={codigoOferta} onChange={e => setCodigoOferta(e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'white', outline: 'none', width: '100%', fontSize: '0.85rem' }} />
                        </div>
                    </div>
                    <div className="excel-header-row" style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>
                        <div className="excel-metadata-label-cell" style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.75rem', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>CLIENTE</div>
                        <div className="excel-metadata-value-cell" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
                            <input className="excel-input-field" type="text" value={cliente} onChange={e => setCliente(e.target.value)} style={{ border: 'none', background: 'transparent', fontWeight: 600, color: 'white', outline: 'none', width: '100%', fontSize: '0.85rem' }} />
                        </div>
                    </div>
                    <div className="excel-header-row" style={{ display: 'grid', gridTemplateColumns: '150px 1fr' }}>
                        <div className="excel-metadata-label-cell" style={{ padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: '0.75rem', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>PROYECTO</div>
                        <div className="excel-metadata-value-cell" style={{ padding: '0.3rem 1rem', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.03)', gap: '1rem' }}>
                            <input
                                className="excel-input-field"
                                type="text"
                                value={nombreProyecto}
                                onChange={e => setNombreProyecto(e.target.value)}
                                style={{ border: 'none', background: 'transparent', fontWeight: 800, color: 'hsl(var(--primary))', outline: 'none', flex: 1, fontSize: '0.9rem', textTransform: 'uppercase' }}
                                placeholder="Asignar nombre de proyecto..."
                            />
                            {isSupabaseConfigured && (
                                <button
                                    onClick={async () => {
                                        if (!confirm(`¿Deseas asignar el proyecto "${nombreProyecto}" a TODOS los ítems actuales?`)) return;
                                        setLoading(true);
                                        const { error } = await supabase.from('cuadro_economico').update({ proyecto: nombreProyecto }).not('id', 'is', null);
                                        if (error) alert('Error: ' + error.message);
                                        else {
                                            alert('Proyecto asignado a todos los ítems exitosamente.');
                                            fetchItems();
                                        }
                                        setLoading(false);
                                    }}
                                    className="no-print"
                                    title="Vincular todos los ítems a este proyecto"
                                    style={{
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        color: '#10b981',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '4px',
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Check size={12} /> VINCULAR TODO
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={filteredDataByColumn}
                onEdit={(item) => handleOpenModal(item)}
                onDelete={(item) => handleDelete(item.id)}
                enableFilters={true}
                filterValues={filterValues}
                onFilterChange={handleFilterChange}
            />

            {/* Financial Summary Section */}
            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', paddingBottom: '3rem' }}>
                <div className="glass" style={{ width: '450px', padding: '0', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <tbody>
                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700, textAlign: 'left', color: 'white' }} colSpan={2}>TOTAL COSTO DIRECTO</td>
                                <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'white' }}>{formatCol(totalCostoDirecto)}</td>
                            </tr>
                            <tr className={!useAdmin ? 'no-print' : ''} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <td style={{ padding: '0.75rem 1.25rem', width: '45%', fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        Administración
                                        <ToggleBtn active={useAdmin} onToggle={() => setUseAdmin(!useAdmin)} />
                                    </div>
                                </td>
                                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>15%</td>
                                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: useAdmin ? 'white' : 'rgba(255,255,255,0.2)' }}>{formatCol(administracion)}</td>
                            </tr>
                            <tr className={!useImprevisto ? 'no-print' : ''} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        Imprevisto
                                        <ToggleBtn active={useImprevisto} onToggle={() => setUseImprevisto(!useImprevisto)} />
                                    </div>
                                </td>
                                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>2%</td>
                                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: useImprevisto ? 'white' : 'rgba(255,255,255,0.2)' }}>{formatCol(imprevisto)}</td>
                            </tr>
                            <tr className={!useUtilidad ? 'no-print' : ''} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        Utilidad
                                        <ToggleBtn active={useUtilidad} onToggle={() => setUseUtilidad(!useUtilidad)} />
                                    </div>
                                </td>
                                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>8%</td>
                                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: useUtilidad ? 'white' : 'rgba(255,255,255,0.2)' }}>{formatCol(utilidad)}</td>
                            </tr>
                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <td style={{ padding: '0.9rem 1.25rem', fontWeight: 700, textAlign: 'left', color: 'hsl(var(--primary))' }} colSpan={2}>SUB-TOTAL</td>
                                <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'hsl(var(--primary))' }}>{formatCol(subtotalFin)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 500, color: 'rgba(255, 255, 255, 0.8)' }}>IVA</td>
                                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>19%</td>
                                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: 'white' }}>{formatCol(iva)}</td>
                            </tr>
                            <tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                <td style={{ padding: '1.1rem 1.25rem', fontWeight: 800, textAlign: 'left', letterSpacing: '1px', fontSize: '1.1rem', color: 'white' }} colSpan={2}>TOTAL</td>
                                <td style={{ padding: '1.1rem 1.25rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--primary))' }}>{formatCol(totalFinal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Cargar Cuadro Económico desde CSV">
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Editar Ítem' : 'Nuevo Ítem'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>ÍTEM</label>
                            <input required type="text" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>DESCRIPCIÓN</label>
                            <input required type="text" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>PROYECTO</label>
                        <input required type="text" value={form.proyecto} onChange={(e) => setForm({ ...form, proyecto: e.target.value })} placeholder="Ej: Fase 1, Planta Norte..." style={{ width: '100%', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid hsl(var(--primary))', borderRadius: '4px', padding: '0.5rem', color: 'white', textTransform: 'uppercase' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>UNIDAD</label>
                            <select
                                value={form.unidad}
                                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '4px',
                                    padding: '0.5rem',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            >
                                <option value="" disabled style={{ backgroundColor: '#0f172a' }}>Seleccionar...</option>
                                {UNIDADES.map(u => (
                                    <option key={u} value={u} style={{ backgroundColor: '#0f172a' }}>{u}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>CANTIDAD</label>
                            <input required type="number" step="0.01" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total HH</label>
                            <input type="number" step="0.01" value={form.total_hh} onChange={(e) => setForm({ ...form, total_hh: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="glass" style={{ padding: '0.75rem', borderRadius: '8px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--primary))' }}>Rendimiento</label>
                            <input required type="number" step="0.01" value={form.rendimiento} onChange={(e) => setForm({ ...form, rendimiento: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                        <div className="glass" style={{ padding: '0.75rem', borderRadius: '8px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'hsl(var(--primary))' }}>Rendimiento/Ud</label>
                            <input required type="number" step="0.01" value={form.rendimiento_ud} onChange={(e) => setForm({ ...form, rendimiento_ud: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Precio/Ud Suministro</label>
                            <input required type="number" step="0.01" value={form.precio_ud_suministro} onChange={(e) => setForm({ ...form, precio_ud_suministro: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Precio/Ud Montaje</label>
                            <input required type="number" step="0.01" value={form.precio_ud_montaje} onChange={(e) => setForm({ ...form, precio_ud_montaje: Number(e.target.value) })} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>PRECIO UNITARIO (Manual Override)</label>
                            <input type="number" step="0.01" value={form.precio_unitario} onChange={(e) => setForm({ ...form, precio_unitario: e.target.value })} placeholder="Automático si se deja vacío" style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px dashed hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>PRECIO TOTAL (Manual Override)</label>
                            <input type="number" step="0.01" value={form.precio_total} onChange={(e) => setForm({ ...form, precio_total: e.target.value })} placeholder="Automático si se deja vacío" style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px dashed hsl(var(--border))', borderRadius: '4px', padding: '0.5rem', color: 'white' }} />
                        </div>
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
                                color: 'rgba(255,255,255,0.8)',
                                fontWeight: 600
                            }}
                        >
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} style={{ flex: 1, backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius)', fontWeight: 600 }}>{loading ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CuadroEconomico;
