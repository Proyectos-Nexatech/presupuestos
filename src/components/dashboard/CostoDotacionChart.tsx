import { useState, useEffect, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { Users, HardHat } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManoObraRow {
    cat: string;
    tipo: string;
    valor_total: number;
    factor_eq_ma: number;
}

interface DotacionRow {
    valor_total: number | null;
    cant_proy: number;
    valor_unitario: number;
    frecuencia: number;
}

interface ChartDataPoint {
    nivel: string;
    Operativo: number;
    Administrativo: number;
}

type TipoFilter = 'TODOS' | 'Operativo' | 'Administrativo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val);

const COLOR_OPERATIVO = '#38bdf8';
const COLOR_ADMIN = 'hsl(22, 100%, 56%)'; // --primary orange

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                backgroundColor: 'rgba(15, 20, 40, 0.95)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                padding: '12px 16px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                minWidth: '180px',
            }}
        >
            <p style={{ fontWeight: 700, marginBottom: '8px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Nivel {label}
            </p>
            {payload.map((entry: any) => (
                <div key={entry.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: entry.color }} />
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>{entry.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'white' }}>{formatCOP(entry.value)}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const CostoDotacionChart = () => {
    const [manoObra, setManoObra] = useState<ManoObraRow[]>([]);
    const [totalEPP, setTotalEPP] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedNiveles, setSelectedNiveles] = useState<number[]>([]);
    const [tipoFilter, setTipoFilter] = useState<TipoFilter>('TODOS');

    const isSupabaseConfigured =
        import.meta.env.VITE_SUPABASE_URL &&
        !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    // ── Fetch ──────────────────────────────────────────────────────────────────

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        if (!isSupabaseConfigured) {
            // Mock data for development
            const mock: ManoObraRow[] = [
                { cat: '1', tipo: 'PERSONAL', valor_total: 280000, factor_eq_ma: 1 },
                { cat: '1', tipo: 'PERSONAL', valor_total: 310000, factor_eq_ma: 1 },
                { cat: '2', tipo: 'PERSONAL', valor_total: 420000, factor_eq_ma: 1 },
                { cat: '2', tipo: 'STAFF', valor_total: 650000, factor_eq_ma: 1 },
                { cat: '3', tipo: 'PERSONAL', valor_total: 380000, factor_eq_ma: 1 },
                { cat: '3', tipo: 'STAFF', valor_total: 890000, factor_eq_ma: 1 },
                { cat: '4', tipo: 'STAFF', valor_total: 1200000, factor_eq_ma: 1 },
                { cat: '4', tipo: 'PERSONAL', valor_total: 450000, factor_eq_ma: 1.2 },
            ];
            setManoObra(mock);
            setTotalEPP(3850000);
            setLoading(false);
            return;
        }

        try {
            const [manoRes, dotRes] = await Promise.all([
                supabase
                    .from('mano_obra')
                    .select('cat, tipo, valor_total, factor_eq_ma')
                    .in('tipo', ['PERSONAL', 'STAFF']),
                supabase
                    .from('dotacion')
                    .select('valor_total, cant_proy, valor_unitario, frecuencia'),
            ]);

            if (manoRes.data) {
                setManoObra(
                    manoRes.data.filter(
                        (r: ManoObraRow) => r.cat && !isNaN(parseInt(r.cat))
                    )
                );
            }

            if (dotRes.data) {
                const epp = (dotRes.data as DotacionRow[]).reduce((sum, row) => {
                    // Use stored valor_total if available, otherwise calculate
                    const vt = row.valor_total != null
                        ? row.valor_total
                        : row.cant_proy * (row.frecuencia ?? 1) * row.valor_unitario;
                    return sum + (vt || 0);
                }, 0);
                setTotalEPP(epp);
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Derived data ───────────────────────────────────────────────────────────

    const availableNiveles = useMemo(() => {
        const set = new Set<number>();
        manoObra.forEach(r => {
            const n = parseInt(r.cat);
            if (!isNaN(n)) set.add(n);
        });
        return Array.from(set).sort((a, b) => a - b);
    }, [manoObra]);

    const activeNiveles = selectedNiveles.length > 0 ? selectedNiveles : availableNiveles;

    const chartData = useMemo((): ChartDataPoint[] => {
        return activeNiveles.map(nivel => {
            const rows = manoObra.filter(r => parseInt(r.cat) === nivel);

            const operativoTotal = rows
                .filter(r => r.tipo === 'PERSONAL')
                .reduce((s, r) => s + (r.valor_total || 0), 0);

            const adminTotal = rows
                .filter(r => r.tipo === 'STAFF')
                .reduce((s, r) => s + (r.valor_total || 0), 0);

            return {
                nivel: String(nivel),
                Operativo: operativoTotal,
                Administrativo: adminTotal,
            };
        });
    }, [manoObra, activeNiveles]);

    const filteredChartData = useMemo(() => {
        if (tipoFilter === 'TODOS') return chartData;
        return chartData.map(d => ({
            ...d,
            Operativo: tipoFilter === 'Operativo' ? d.Operativo : 0,
            Administrativo: tipoFilter === 'Administrativo' ? d.Administrativo : 0,
        }));
    }, [chartData, tipoFilter]);

    const totalOperativo = useMemo(
        () => filteredChartData.reduce((s, d) => s + d.Operativo, 0),
        [filteredChartData]
    );
    const totalAdministrativo = useMemo(
        () => filteredChartData.reduce((s, d) => s + d.Administrativo, 0),
        [filteredChartData]
    );

    const toggleNivel = (n: number) => {
        setSelectedNiveles(prev =>
            prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
        );
    };

    const selectAllNiveles = () => setSelectedNiveles([]);

    const showOperativo = tipoFilter === 'TODOS' || tipoFilter === 'Operativo';
    const showAdmin = tipoFilter === 'TODOS' || tipoFilter === 'Administrativo';

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div
            className="glass"
            style={{
                marginTop: '2rem',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid hsl(var(--border))',
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(255,107,43,0.04) 100%)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                            <HardHat size={20} style={{ color: 'hsl(var(--primary))' }} />
                            Costo de Dotación por Cargo
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>
                            Segmentación multidimensional por Nivel y Tipo · ∑ TOTAL ITEM por cargo
                        </p>
                    </div>

                    {/* KPI Chips */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ backgroundColor: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '10px', padding: '0.5rem 1rem' }}>
                            <p style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                <Users size={10} style={{ display: 'inline', marginRight: '4px' }} />Operativo
                            </p>
                            <p style={{ fontWeight: 800, fontSize: '1rem', color: '#38bdf8', marginTop: '2px' }}>{formatCOP(totalOperativo)}</p>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,107,43,0.1)', border: '1px solid rgba(255,107,43,0.25)', borderRadius: '10px', padding: '0.5rem 1rem' }}>
                            <p style={{ fontSize: '0.65rem', color: 'hsl(var(--primary))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                <Users size={10} style={{ display: 'inline', marginRight: '4px' }} />Administrativo
                            </p>
                            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--primary))', marginTop: '2px' }}>{formatCOP(totalAdministrativo)}</p>
                        </div>
                        <div style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '0.5rem 1rem' }}>
                            <p style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>EPP Total</p>
                            <p style={{ fontWeight: 800, fontSize: '1rem', color: '#10b981', marginTop: '2px' }}>{formatCOP(totalEPP)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div
                style={{
                    padding: '1rem 2rem',
                    borderBottom: '1px solid hsl(var(--border))',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                }}
            >
                {/* Nivel filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                        Nivel
                    </span>
                    <button
                        onClick={selectAllNiveles}
                        style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: '1px solid',
                            transition: 'all 0.18s',
                            borderColor: selectedNiveles.length === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                            backgroundColor: selectedNiveles.length === 0 ? 'rgba(255,255,255,0.12)' : 'transparent',
                            color: selectedNiveles.length === 0 ? 'white' : 'rgba(255,255,255,0.45)',
                        }}
                    >
                        TODOS
                    </button>
                    {availableNiveles.map(n => {
                        const active = selectedNiveles.includes(n);
                        return (
                            <button
                                key={n}
                                onClick={() => toggleNivel(n)}
                                style={{
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    transition: 'all 0.18s',
                                    borderColor: active ? '#38bdf8' : 'rgba(255,255,255,0.15)',
                                    backgroundColor: active ? 'rgba(56,189,248,0.15)' : 'transparent',
                                    color: active ? '#38bdf8' : 'rgba(255,255,255,0.45)',
                                    minWidth: '28px',
                                }}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

                {/* Tipo filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                        Tipo
                    </span>
                    {(['TODOS', 'Operativo', 'Administrativo'] as TipoFilter[]).map(t => {
                        const active = tipoFilter === t;
                        const color = t === 'Operativo' ? '#38bdf8' : t === 'Administrativo' ? 'hsl(var(--primary))' : 'white';
                        return (
                            <button
                                key={t}
                                onClick={() => setTipoFilter(t)}
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    transition: 'all 0.18s',
                                    borderColor: active ? color : 'rgba(255,255,255,0.15)',
                                    backgroundColor: active ? `${color}22` : 'transparent',
                                    color: active ? color : 'rgba(255,255,255,0.45)',
                                }}
                            >
                                {t}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chart */}
            <div style={{ padding: '1.5rem 2rem 2rem' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px', color: 'hsl(var(--muted-foreground))', gap: '0.75rem' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid hsl(var(--primary))', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                        Cargando datos...
                    </div>
                ) : filteredChartData.length === 0 || (totalOperativo === 0 && totalAdministrativo === 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'hsl(var(--muted-foreground))', gap: '1rem' }}>
                        <HardHat size={40} style={{ opacity: 0.2 }} />
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontWeight: 600, marginBottom: '4px' }}>Sin datos de mano de obra</p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Agrega personal en la sección Mano de Obra para ver este indicador.</p>
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={filteredChartData}
                            margin={{ top: 8, right: 20, left: 10, bottom: 0 }}
                            barCategoryGap="30%"
                            barGap={4}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis
                                dataKey="nivel"
                                tickFormatter={v => `Niv. ${v}`}
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={v => {
                                    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                                    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
                                    return `$${v}`;
                                }}
                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                width={60}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            <Legend
                                wrapperStyle={{ fontSize: '0.78rem', paddingTop: '1rem' }}
                                formatter={(value) => (
                                    <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{value}</span>
                                )}
                            />
                            {showOperativo && (
                                <Bar dataKey="Operativo" fill={COLOR_OPERATIVO} radius={[5, 5, 0, 0]} maxBarSize={55}>
                                    {filteredChartData.map((_, idx) => (
                                        <Cell key={`op-${idx}`} fill={COLOR_OPERATIVO} fillOpacity={0.85} />
                                    ))}
                                </Bar>
                            )}
                            {showAdmin && (
                                <Bar dataKey="Administrativo" fill={COLOR_ADMIN} radius={[5, 5, 0, 0]} maxBarSize={55}>
                                    {filteredChartData.map((_, idx) => (
                                        <Cell key={`ad-${idx}`} fill={COLOR_ADMIN} fillOpacity={0.85} />
                                    ))}
                                </Bar>
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Aggregation note */}
            <div style={{ padding: '0.75rem 2rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'rgba(255,255,255,0.45)' }}>Lógica:</strong> El costo por nivel agrupa todos los cargos PERSONAL/STAFF del mismo NIVEL (cat) y suma su TOTAL ITEM. El EPP total proviene de la sección Dotación.
                </p>
            </div>
        </div>
    );
};
