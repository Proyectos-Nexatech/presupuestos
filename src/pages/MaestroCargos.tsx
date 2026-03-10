import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Check, X, Upload, Download, FileText, AlertCircle, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';

interface Cargo {
    id: string;
    nombre_cargo: string;
    tipo: 'OPERATIVO' | 'ADMINISTRATIVO';
    nivel: number;
    activo: boolean;
    created_at?: string;
}

const NIVELES_OP = [1, 2, 3, 4, 5, 6, 7, 8];
const NIVELES_STAFF = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const defaultForm = {
    nombre_cargo: '',
    tipo: 'OPERATIVO' as 'OPERATIVO' | 'ADMINISTRATIVO',
    nivel: 1,
    activo: true,
};

const MaestroCargos = () => {
    const [cargos, setCargos] = useState<Cargo[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState<'TODOS' | 'OPERATIVO' | 'ADMINISTRATIVO'>('TODOS');
    const [filterNivel, setFilterNivel] = useState<number | 'TODOS'>('TODOS');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
    const [form, setForm] = useState(defaultForm);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Cargo; direction: 'asc' | 'desc' } | null>(null);

    // CSV Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [previewCargos, setPreviewCargos] = useState<Partial<Cargo>[]>([]);

    useEffect(() => {
        fetchCargos();
    }, []);

    const fetchCargos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('maestro_cargos')
            .select('*')
            .order('tipo', { ascending: true })
            .order('nivel', { ascending: true })
            .order('nombre_cargo', { ascending: true });

        if (error) console.error('Error fetching cargos:', error);

        // Normalize data for UI (OP -> OPERATIVO, STAFF -> ADMINISTRATIVO)
        const normalizedData = (data || []).map(c => ({
            ...c,
            tipo: c.tipo === 'STAFF' || c.tipo === 'ADMINISTRATIVO' ? 'ADMINISTRATIVO' : 'OPERATIVO'
        }));

        setCargos(normalizedData as Cargo[]);
        setLoading(false);
    };

    const openModal = (cargo?: Cargo) => {
        if (cargo) {
            setEditingCargo(cargo);
            setForm({
                nombre_cargo: cargo.nombre_cargo,
                tipo: cargo.tipo,
                nivel: cargo.nivel,
                activo: cargo.activo,
            });
        } else {
            setEditingCargo(null);
            setForm(defaultForm);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nombre_cargo.trim()) return;
        setSaving(true);

        // Map back to DB types
        const payload = {
            ...form,
            nombre_cargo: form.nombre_cargo.trim(),
            tipo: form.tipo === 'ADMINISTRATIVO' ? 'STAFF' : 'OP'
        };

        try {
            if (editingCargo) {
                const { error } = await supabase
                    .from('maestro_cargos')
                    .update(payload)
                    .eq('id', editingCargo.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('maestro_cargos')
                    .insert([payload]);
                if (error) throw error;
            }
            await fetchCargos();
            setIsModalOpen(false);
        } catch (err: any) {
            alert('Error al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cargo: Cargo) => {
        if (!window.confirm(`¿Desea eliminar el cargo "${cargo.nombre_cargo}"?\nEsta acción no se puede deshacer.`)) return;
        const { error } = await supabase.from('maestro_cargos').delete().eq('id', cargo.id);
        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            setCargos(prev => prev.filter(c => c.id !== cargo.id));
        }
    };

    const handleToggleActivo = async (cargo: Cargo) => {
        const { error } = await supabase
            .from('maestro_cargos')
            .update({ activo: !cargo.activo })
            .eq('id', cargo.id);
        if (!error) {
            setCargos(prev => prev.map(c => c.id === cargo.id ? { ...c, activo: !c.activo } : c));
        }
    };

    const nivelesDisponibles = form.tipo === 'ADMINISTRATIVO' ? NIVELES_STAFF : NIVELES_OP;

    const filtered = cargos.filter(c => {
        const matchSearch = c.nombre_cargo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchTipo = filterTipo === 'TODOS' || c.tipo === filterTipo;
        const matchNivel = filterNivel === 'TODOS' || c.nivel === filterNivel;
        return matchSearch && matchTipo && matchNivel;
    }).sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        if (a[key] === b[key]) return 0;
        const modifier = direction === 'asc' ? 1 : -1;

        // Handle numeric or string comparison
        if (typeof a[key] === 'string' && typeof b[key] === 'string') {
            return (a[key] as string).localeCompare(b[key] as string) * modifier;
        }
        return ((a[key] as any) > (b[key] as any) ? 1 : -1) * modifier;
    });

    const handleSort = (key: keyof Cargo) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const SortIcon = ({ column }: { column: keyof Cargo }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
    };

    const inputStyle = {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid hsl(var(--border))',
        borderRadius: '6px',
        padding: '0.5rem 0.75rem',
        color: 'white',
        outline: 'none',
    };

    const downloadTemplate = () => {
        // Usamos punto y coma para que Excel lo reconozca en columnas independientes automáticamente en regiones latinas
        const headers = "nombre_cargo;tipo;nivel;activo\n";
        const examples = "COORDINADOR HSE;ADMINISTRATIVO;1;verdadero\nAUXILIAR III;OPERATIVO;2;verdadero\n";
        const blob = new Blob([headers + examples], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_cargos.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImportFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                parseCSV(text);
            };
            reader.readAsText(file);
        }
    };

    const parseCSV = (text: string) => {
        const rows = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
        if (rows.length < 2) return;

        // Detectamos si el separador es coma o punto y coma
        const separator = rows[0].includes(';') ? ';' : ',';
        const headers = rows[0].split(separator).map(h => h.trim().toLowerCase());

        const data = rows.slice(1).map(row => {
            const values = row.split(separator).map(v => v.trim());
            const obj: any = {};
            headers.forEach((h, i) => {
                if (h === 'nivel') obj[h] = parseInt(values[i]);
                else if (h === 'activo') obj[h] = ['true', 'verdadero', '1', 'si', 'sí'].includes(values[i].toLowerCase());
                else if (h === 'tipo') {
                    const val = values[i].toUpperCase();
                    obj[h] = val.includes('ADMIN') ? 'ADMINISTRATIVO' : 'OPERATIVO';
                }
                else if (h === 'nombre_cargo') obj[h] = values[i];
            });
            return obj;
        });
        setPreviewCargos(data);
    };

    const handleSyncBudget = async () => {
        setLoading(true);
        try {
            const [labelsRes, staffRes] = await Promise.all([
                supabase.from('etiquetas_categorias').select('*'),
                supabase.from('staff_salaries_2026').select('*')
            ]);

            const existingNames = new Set(cargos.map(c => c.nombre_cargo.toUpperCase()));
            const toInsert: any[] = [];

            // Operational Roles
            (labelsRes.data || []).forEach((l: any) => {
                (l.labels || []).forEach((label: string) => {
                    const name = label.trim().toUpperCase();
                    if (name && !existingNames.has(name)) {
                        toInsert.push({
                            nombre_cargo: label.trim(),
                            tipo: 'OP',
                            nivel: l.categoria,
                            activo: true
                        });
                        existingNames.add(name);
                    }
                });
            });

            // Staff Roles
            (staffRes.data || []).forEach((s: any) => {
                const names = s.cargo_nombre?.split(',').map((c: string) => c.trim()).filter(Boolean) || [];
                names.forEach((name: string) => {
                    const upper = name.toUpperCase();
                    if (!existingNames.has(upper)) {
                        toInsert.push({
                            nombre_cargo: name,
                            tipo: 'STAFF',
                            nivel: s.nivel,
                            activo: true
                        });
                        existingNames.add(upper);
                    }
                });
            });

            if (toInsert.length > 0) {
                const { error } = await supabase.from('maestro_cargos').insert(toInsert);
                if (error) throw error;
                alert(`Se han sincronizado ${toInsert.length} nuevos cargos.`);
                fetchCargos();
            } else {
                alert('No hay nuevos cargos para sincronizar.');
            }
        } catch (err: any) {
            alert('Error al sincronizar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const processImport = async () => {
        if (previewCargos.length === 0) return;
        if (!window.confirm(`¿Está seguro de que desea importar ${previewCargos.length} cargos? Los cargos existentes con el mismo nombre podrían duplicarse.`)) return;

        setSaving(true);
        try {
            const { error } = await supabase.from('maestro_cargos').insert(previewCargos);
            if (error) throw error;
            alert('Importación exitosa');
            setIsImportModalOpen(false);
            setImportFile(null);
            setPreviewCargos([]);
            fetchCargos();
        } catch (err: any) {
            alert('Error en importación: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}>Maestro de Cargos</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>Administre los cargos operativos y administrativos para la liquidación de salarios.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={handleSyncBudget}
                        style={{
                            padding: '0.75rem 1.25rem',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            backgroundColor: 'rgba(56,189,248,0.1)',
                            border: '1px solid rgba(56,189,248,0.4)',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <FileText size={18} /> Sincronizar desde Presupuesto
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        style={{
                            padding: '0.75rem 1.25rem',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            backgroundColor: 'rgba(167,139,250,0.1)',
                            border: '1px solid rgba(167,139,250,0.4)',
                            color: '#a78bfa',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Upload size={18} /> Importar CSV
                    </button>
                    <button
                        onClick={() => openModal()}
                        style={{
                            backgroundColor: 'hsl(var(--primary))',
                            color: 'white',
                            padding: '0.75rem 1.25rem',
                            borderRadius: 'var(--radius)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Plus size={18} /> Nuevo Cargo
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                    <input
                        type="text"
                        placeholder="Buscar cargo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                    />
                </div>

                {/* Tipo Filter */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'hsl(var(--muted)/0.3)', padding: '4px', borderRadius: '8px' }}>
                    {(['TODOS', 'OPERATIVO', 'ADMINISTRATIVO'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterTipo(t)}
                            style={{
                                padding: '5px 14px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: filterTipo === t ? 'hsl(var(--primary))' : 'transparent',
                                color: filterTipo === t ? 'white' : 'gray',
                            }}
                        >{t}</button>
                    ))}
                </div>

                {/* Nivel Filter */}
                <select
                    value={filterNivel}
                    onChange={e => setFilterNivel(e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value))}
                    style={{ ...inputStyle, width: 'auto', appearance: 'none', paddingRight: '1.5rem' }}
                >
                    <option value="TODOS" style={{ backgroundColor: '#0a0a0a' }}>Todos los niveles</option>
                    {[...Array(10)].map((_, i) => (
                        <option key={i + 1} value={i + 1} style={{ backgroundColor: '#0a0a0a' }}>Nivel {i + 1}</option>
                    ))}
                </select>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Cargos', value: cargos.length, color: 'hsl(var(--primary))' },
                    { label: 'Operativos', value: cargos.filter(c => c.tipo === 'OPERATIVO').length, color: '#22c55e' },
                    { label: 'Administrativos', value: cargos.filter(c => c.tipo === 'ADMINISTRATIVO').length, color: '#a78bfa' },
                    { label: 'Activos', value: cargos.filter(c => c.activo).length, color: '#38bdf8' },
                ].map(stat => (
                    <div key={stat.label} className="glass" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', borderLeft: `3px solid ${stat.color}`, minWidth: '140px' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass" style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>Cargando cargos...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>No se encontraron cargos con los filtros aplicados.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid hsl(var(--border))', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                <th onClick={() => handleSort('nombre_cargo')} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>NOMBRE CARGO <SortIcon column="nombre_cargo" /></div>
                                </th>
                                <th onClick={() => handleSort('tipo')} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>TIPO <SortIcon column="tipo" /></div>
                                </th>
                                <th onClick={() => handleSort('nivel')} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>NIVEL <SortIcon column="nivel" /></div>
                                </th>
                                <th onClick={() => handleSort('activo')} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>ACTIVO <SortIcon column="activo" /></div>
                                </th>
                                <th style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    ACCIONES
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((cargo, idx) => (
                                <tr
                                    key={cargo.id}
                                    style={{
                                        borderBottom: '1px solid hsl(var(--border)/0.5)',
                                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                                        transition: 'background-color 0.15s',
                                    }}
                                >
                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{cargo.nombre_cargo}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            backgroundColor: cargo.tipo === 'ADMINISTRATIVO' ? 'rgba(167,139,250,0.15)' : 'rgba(34,197,94,0.15)',
                                            color: cargo.tipo === 'ADMINISTRATIVO' ? '#a78bfa' : '#22c55e',
                                            border: `1px solid ${cargo.tipo === 'ADMINISTRATIVO' ? 'rgba(167,139,250,0.3)' : 'rgba(34,197,94,0.3)'}`,
                                        }}>{cargo.tipo}</span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>Nivel {cargo.nivel}</span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <button
                                            onClick={() => handleToggleActivo(cargo)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                                                backgroundColor: cargo.activo ? 'rgba(56,189,248,0.15)' : 'rgba(100,100,100,0.1)',
                                                color: cargo.activo ? '#38bdf8' : 'gray',
                                            }}
                                        >
                                            {cargo.activo ? <><Check size={12} /> Activo</> : <><X size={12} /> Inactivo</>}
                                        </button>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => openModal(cargo)}
                                                style={{ padding: '0.375rem', borderRadius: '6px', border: '1px solid hsl(var(--border))', backgroundColor: 'transparent', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
                                                title="Editar"
                                            ><Edit2 size={14} /></button>
                                            <button
                                                onClick={() => handleDelete(cargo)}
                                                style={{ padding: '0.375rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer' }}
                                                title="Eliminar"
                                            ><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCargo ? 'Editar Cargo' : 'Nuevo Cargo'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'hsl(var(--muted-foreground))' }}>NOMBRE DEL CARGO *</label>
                        <input
                            required
                            type="text"
                            value={form.nombre_cargo}
                            onChange={e => setForm({ ...form, nombre_cargo: e.target.value })}
                            placeholder="Ej: Coordinador HSE"
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'hsl(var(--muted-foreground))' }}>TIPO *</label>
                            <select
                                value={form.tipo}
                                onChange={e => setForm({ ...form, tipo: e.target.value as 'OPERATIVO' | 'ADMINISTRATIVO', nivel: 1 })}
                                style={{ ...inputStyle, appearance: 'none' }}
                            >
                                <option value="OPERATIVO" style={{ backgroundColor: '#0a0a0a' }}>Operativo</option>
                                <option value="ADMINISTRATIVO" style={{ backgroundColor: '#0a0a0a' }}>Administrativo</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'hsl(var(--muted-foreground))' }}>NIVEL *</label>
                            <select
                                value={form.nivel}
                                onChange={e => setForm({ ...form, nivel: Number(e.target.value) })}
                                style={{ ...inputStyle, appearance: 'none' }}
                            >
                                {nivelesDisponibles.map(n => (
                                    <option key={n} value={n} style={{ backgroundColor: '#0a0a0a' }}>Nivel {n}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                            type="checkbox"
                            id="activo"
                            checked={form.activo}
                            onChange={e => setForm({ ...form, activo: e.target.checked })}
                            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                        />
                        <label htmlFor="activo" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>Cargo activo (visible en Salarios)</label>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="glass"
                            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)', fontWeight: 600 }}
                        >Cancelar</button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{ flex: 1, backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius)', fontWeight: 600 }}
                        >{saving ? 'Guardando...' : editingCargo ? 'Actualizar' : 'Crear Cargo'}</button>
                    </div>
                </form>
            </Modal>
            {/* Import CSV Modal */}
            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importar Cargos desde CSV">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Step by Step */}
                    <div className="glass" style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} /> Pasos para la importación:
                        </h3>
                        <ol style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <li>Descargue la <strong>plantilla oficial</strong>.</li>
                            <li>Diligencie el archivo. Excel lo abrirá en columnas independientes automáticamente (separado por punto y coma).</li>
                            <li>Use <strong>ADMINISTRATIVO</strong> u <strong>OPERATIVO</strong> para el tipo.</li>
                            <li>Suba el archivo aquí y verifique los datos.</li>
                        </ol>
                    </div>

                    <button
                        onClick={downloadTemplate}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start',
                            fontSize: '0.85rem', color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600
                        }}
                    >
                        <Download size={16} /> Descargar Plantilla CSV
                    </button>

                    <div style={{ border: '2px dashed hsl(var(--border))', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                        />
                        <Upload size={32} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.5rem' }} />
                        <div style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>
                            {importFile ? <span style={{ color: 'white' }}>Archivo: {importFile.name}</span> : 'Haga clic o arrastre su archivo .csv aquí'}
                        </div>
                    </div>

                    {previewCargos.length > 0 && (
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid hsl(var(--border))', borderRadius: '4px' }}>
                            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'hsl(var(--muted))' }}>
                                    <tr>
                                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>Cargo</th>
                                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>Tipo</th>
                                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>Nivel</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewCargos.map((c, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border)/0.3)' }}>
                                            <td style={{ padding: '4px 8px' }}>{c.nombre_cargo}</td>
                                            <td style={{ padding: '4px 8px' }}>{c.tipo}</td>
                                            <td style={{ padding: '4px 8px' }}>{c.nivel}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {previewCargos.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '6px', color: '#eab308', fontSize: '0.8rem' }}>
                            <AlertCircle size={16} />
                            <span>Se cargarán {previewCargos.length} registros. Por favor verifique los datos.</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsImportModalOpen(false);
                                setImportFile(null);
                                setPreviewCargos([]);
                            }}
                            className="glass"
                            style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)', fontWeight: 600 }}
                        >Cerrar</button>
                        <button
                            onClick={processImport}
                            disabled={saving || previewCargos.length === 0}
                            style={{ flex: 1, backgroundColor: 'hsl(var(--primary))', color: 'white', padding: '0.75rem', borderRadius: 'var(--radius)', fontWeight: 600 }}
                        >{saving ? 'Importando...' : 'Confirmar Subida'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MaestroCargos;
