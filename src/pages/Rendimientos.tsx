import { useState, useEffect } from 'react';
import { Search, TrendingDown } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';

interface CuadroEconomicoItem {
    id: string;
    item: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    rendimiento: number;
}

const Rendimientos = () => {
    const [items, setItems] = useState<CuadroEconomicoItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CuadroEconomicoItem | null>(null);
    const [formRendimiento, setFormRendimiento] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    // Metadata
    const [cliente] = useState('MEXICHEM');

    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        const mockData: CuadroEconomicoItem[] = [
            { id: '1', item: '1.1', descripcion: 'PREFABRICACION DE ANILLOS PARA LIMPIEZA DE PSE (PLY 4E A PLY 7E) DE ACUERDO A PLANO DE MRC', unidad: 'UN', cantidad: 4, rendimiento: 8 },
            { id: '2', item: '1.2', descripcion: 'PREFABRICACION DE TUBERIAS PARA ANILLOS DE LIMPIEZA DE PSE (PLY 4E A PLY 7E) DE ACUERDO A ISOMETRIAS DE MRC', unidad: 'PD', cantidad: 144, rendimiento: 25 },
            { id: '3', item: '1.3', descripcion: 'PREFABRICACION DE TUBERIAS DE PSV TESTIGO PSV-PX50 (PLY-4E A PLY-7E) DE ACUERDO A ISOMETRIAS DE MRC', unidad: 'NPT', cantidad: 96, rendimiento: 28 },
            { id: '4', item: '1.4', descripcion: 'SUMINISTRO Y FABRICACION SOPORTES PARA LINEA DE LIMPIEZA DE PSE', unidad: 'KG', cantidad: 60, rendimiento: 200 }
        ];

        if (!isSupabaseConfigured) {
            setItems(mockData);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('cuadro_economico')
            .select('id, item, descripcion, unidad, cantidad, rendimiento')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching rendimientos:', error);
            setItems(mockData);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const handleOpenModal = (item: CuadroEconomicoItem) => {
        setEditingItem(item);
        setFormRendimiento(item.rendimiento);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        setLoading(true);

        if (!isSupabaseConfigured) {
            setItems(items.map(c => c.id === editingItem.id ? { ...c, rendimiento: formRendimiento } : c));
            setIsModalOpen(false);
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('cuadro_economico')
                .update({ rendimiento: formRendimiento })
                .eq('id', editingItem.id);

            if (error) throw error;
            fetchItems();
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('Error saving rendimiento:', err);
            alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = items.filter(c =>
        c.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.item.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        { header: 'ITEMS', accessor: 'item' as const },
        { header: 'DESCRIPCION', accessor: (row: any) => <div style={{ minWidth: '350px' }}>{row.descripcion}</div> },
        { header: 'UNIDAD', accessor: 'unidad' as const },
        { header: 'CANTIDAD', accessor: (row: any) => Number(row.cantidad).toLocaleString('es-CO') },
        { header: 'REND', accessor: (row: any) => <span style={{ fontWeight: 600, color: 'hsl(var(--primary))' }}>{Number(row.rendimiento).toLocaleString('es-CO')}</span> },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <TrendingDown size={32} style={{ color: 'hsl(var(--primary))' }} />
                        Rendimientos
                    </h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>Listado de ítems y edición exclusiva del rendimiento asociado al cuadro económico.</p>
                </div>
            </div>

            {/* Metadata Header (Readonly) */}
            <div className="glass" style={{ display: 'flex', gap: '2rem', padding: '1rem 1.5rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
                <div>
                    <label style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600 }}>Cliente</label>
                    <div style={{ fontWeight: 700 }}>{cliente}</div>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                    * Los campos adicionales se editan desde la sección "Cuadro Económico"
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }} className="no-print">
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                    <input type="text" placeholder="Buscar ítem o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', padding: '0.75rem 1rem 0.75rem 2.5rem', color: 'white', outline: 'none' }} />
                </div>
            </div>

            <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius)' }}>
                <DataTable
                    columns={columns}
                    data={filteredData}
                    onEdit={(item) => handleOpenModal(item)}
                />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modificar Rendimiento">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {editingItem && (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 600, color: 'hsl(var(--primary))', marginBottom: '0.25rem' }}>{editingItem.item}</div>
                            <div style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>{editingItem.descripcion}</div>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600, color: 'white' }}>NUEVO RENDIMIENTO</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            value={formRendimiento}
                            onChange={(e) => setFormRendimiento(Number(e.target.value))}
                            style={{ width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '2px solid hsl(var(--primary))', borderRadius: '4px', padding: '0.75rem', color: 'white', fontSize: '1.1rem', fontWeight: 600, textAlign: 'center' }}
                        />
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
                        <button type="submit" disabled={loading} style={{ flex: 1, backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius)', fontWeight: 600 }}>{loading ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Rendimientos;
