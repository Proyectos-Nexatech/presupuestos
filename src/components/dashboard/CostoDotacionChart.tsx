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
import { Percent, Calculator } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const COSTO_DOTACION_UNITARIO = 1432376;
const DIAS_VIGENCIA = 360;
const COSTO_DIARIO_DOTACION = COSTO_DOTACION_UNITARIO / DIAS_VIGENCIA;

const COLOR_OPERATIVO = '#38bdf8';
const COLOR_ADMIN = 'hsl(22, 100%, 56%)'; // --primary orange

// ─── Types ────────────────────────────────────────────────────────────────────
interface ManoObraRow {
    cat: string;
    tipo: string;
    valor_dia: number;
}

interface ChartDataPoint {
    nivel: string;
    Operativo: number;           // Impact %
    Administrativo: number;      // Impact %
    avgValorDiaOp: number;
    avgValorDiaAd: number;
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

const formatPct = (val: number) => `${val.toFixed(2)}%`;

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
                minWidth: '220px',
            }}
        >
            <p style={{ fontWeight: 700, marginBottom: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Nivel {label}
            </p>
            {payload.map((entry: any) => {
                const isOp = entry.name === 'Operativo';
                const avgVal = isOp ? entry.payload.avgValorDiaOp : entry.payload.avgValorDiaAd;
                
                return (
                    <div key={entry.name} style={{ marginBottom: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: entry.color, textTransform: 'uppercase' }}>{entry.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Valor Día Prom:</span>
                            <span style={{ color: 'white', fontWeight: 600 }}>{formatCOP(avgVal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '2px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Impacto Dotación:</span>
                            <span style={{ color: 'white', fontWeight: 800 }}>{formatPct(entry.value)}</span>
                        </div>
                    </div>
                );
            })}
            <div style={{ marginTop: '4px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center' }}>
                Basado en amortización a {DIAS_VIGENCIA} días
            </div>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const CostoDotacionChart = () => {
    const [manoObra, setManoObra] = useState<ManoObraRow[]>([]);
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
            // Mock data with VALOR DIA
            const mock: ManoObraRow[] = [
                { cat: '1', tipo: 'PERSONAL', valor_dia: 45000 },
                { cat: '1', tipo: 'PERSONAL', valor_dia: 48000 },
                { cat: '2', tipo: 'PERSONAL', valor_dia: 55000 },
                { cat: '2', tipo: 'STAFF', valor_dia: 120000 },
                { cat: '3', tipo: 'PERSONAL', valor_dia: 68000 },
                { cat: '3', tipo: 'STAFF', valor_dia: 180000 },
                { cat: '4', tipo: 'STAFF', valor_dia: 250000 },
                { cat: '4', tipo: 'PERSONAL', valor_dia: 85000 },
            ];
            setManoObra(mock);
            setLoading(false);
            return;
        }

        try {
            const { data } = await supabase
                .from('mano_obra')
                .select('cat, tipo, valor_dia')
                .in('tipo', ['PERSONAL', 'STAFF']);

            if (data) {
                setManoObra(
                    data.filter((r: any) => r.cat && !isNaN(parseInt(r.cat)))
                );
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

            const opRows = rows.filter(r => r.tipo === 'PERSONAL');
            const adRows = rows.filter(r => r.tipo === 'STAFF');

            const avgOp = opRows.length > 0 
                ? opRows.reduce((s, r) => s + (r.valor_dia || 0), 0) / opRows.length 
                : 0;
            
            const avgAd = adRows.length > 0 
                ? adRows.reduce((s, r) => s + (r.valor_dia || 0), 0) / adRows.length 
                : 0;

            // Metric: (Costo Diario Dotacion / AVG Valor Dia) * 100
            const impactOp = avgOp > 0 ? (COSTO_DIARIO_DOTACION / avgOp) * 100 : 0;
            const impactAd = avgAd > 0 ? (COSTO_DIARIO_DOTACION / avgAd) * 100 : 0;

            return {
                nivel: String(nivel),
                Operativo: impactOp,
                Administrativo: impactAd,
                avgValorDiaOp: avgOp,
                avgValorDiaAd: avgAd
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

    const maxImpact = useMemo(() => {
        const vals = filteredChartData.flatMap(d => [d.Operativo, d.Administrativo]);
        return Math.max(...vals, 5); // Minimum 5% for scale
    }, [filteredChartData]);

    const toggleNivel = (n: number) => {
        setSelectedNiveles(prev =>
            prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n].sort((a, b) => a - b)
        );
    };

    const selectAllNiveles = () => setSelectedNiveles([]);

    const showOperativo = (tipoFilter === 'TODOS' || tipoFilter === 'Operativo');
    const showAdmin = (tipoFilter === 'TODOS' || tipoFilter === 'Administrativo');

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
                        <h3 style={{ fontWeight: 700, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                            <Percent size={20} style={{ color: 'hsl(var(--primary))' }} />
                            Impacto Relativo de Dotación por Cargo
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                            Métrica porcentual: Costo amortizado de dotación vs. VALOR DIA promedio
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))', fontWeight: 700, textTransform: 'uppercase' }}>Costo Dotación</p>
                            <p style={{ fontWeight: 800, fontSize: '1rem', color: 'white' }}>{formatCOP(COSTO_DOTACION_UNITARIO)}</p>
                        </div>
                        <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.65rem', color: 'hsl(var(--muted-foreground))', fontWeight: 700, textTransform: 'uppercase' }}>Amortización Día</p>
                            <p style={{ fontWeight: 800, fontSize: '1rem', color: '#10b981' }}>{formatCOP(COSTO_DIARIO_DOTACION)}</p>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nivel</span>
                    <button
                        onClick={selectAllNiveles}
                        style={{
                            padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: '1px solid', transition: 'all 0.18s',
                            borderColor: selectedNiveles.length === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                            backgroundColor: selectedNiveles.length === 0 ? 'rgba(255,255,255,0.12)' : 'transparent',
                            color: selectedNiveles.length === 0 ? 'white' : 'rgba(255,255,255,0.45)',
                        }}
                    >TODOS</button>
                    {availableNiveles.map(n => {
                        const active = selectedNiveles.includes(n);
                        return (
                            <button key={n} onClick={() => toggleNivel(n)}
                                style={{
                                    padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: '1px solid', transition: 'all 0.18s',
                                    borderColor: active ? '#38bdf8' : 'rgba(255,255,255,0.15)',
                                    backgroundColor: active ? 'rgba(56,189,248,0.15)' : 'transparent',
                                    color: active ? '#38bdf8' : 'rgba(255,255,255,0.45)',
                                    minWidth: '28px',
                                }}
                            >{n}</button>
                        );
                    })}
                </div>

                <div style={{ width: '1px', height: '28px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tipo</span>
                    {(['TODOS', 'Operativo', 'Administrativo'] as TipoFilter[]).map(t => {
                        const active = tipoFilter === t;
                        const color = t === 'Operativo' ? '#38bdf8' : t === 'Administrativo' ? 'hsl(var(--primary))' : 'white';
                        return (
                            <button key={t} onClick={() => setTipoFilter(t)}
                                style={{
                                    padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: '1px solid', transition: 'all 0.18s',
                                    borderColor: active ? color : 'rgba(255,255,255,0.15)',
                                    backgroundColor: active ? `${color}22` : 'transparent',
                                    color: active ? color : 'rgba(255,255,255,0.45)',
                                }}
                            >{t}</button>
                        );
                    })}
                </div>
            </div>

            {/* Chart Area */}
            <div style={{ padding: '2rem 2rem 1.5rem' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'hsl(var(--muted-foreground))' }}>
                        Cargando métricas...
                    </div>
                ) : filteredChartData.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', opacity: 0.5 }}>
                        <Calculator size={48} style={{ marginBottom: '1rem' }} />
                        <p>No hay datos de Mano de Obra para los niveles seleccionados.</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={filteredChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barGap={8}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                                dataKey="nivel" 
                                tickFormatter={v => `Nivel ${v}`}
                                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}
                                tickLine={false}
                            />
                            <YAxis 
                                tickFormatter={v => `${v}%`}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                                domain={[0, Math.ceil(maxImpact * 1.2)]}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.8rem' }}>{v}</span>} />
                            
                            {showOperativo && (
                                <Bar dataKey="Operativo" name="Operativo" fill={COLOR_OPERATIVO} radius={[4, 4, 0, 0]} maxBarSize={60}>
                                    {filteredChartData.map((_, idx) => (
                                        <Cell key={`op-${idx}`} fill={COLOR_OPERATIVO} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            )}
                            {showAdmin && (
                                <Bar dataKey="Administrativo" name="Administrativo" fill={COLOR_ADMIN} radius={[4, 4, 0, 0]} maxBarSize={60}>
                                    {filteredChartData.map((_, idx) => (
                                        <Cell key={`ad-${idx}`} fill={COLOR_ADMIN} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Footer / Logic Legend */}
            <div style={{ padding: '0 2rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calculator size={14} /> Fórmula de Impacto
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                            Impacto % = [(Costo Dotación / 360 días) / AVG(Valor Día del Nivel)] × 100
                        </p>
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.4 }}>
                    <p style={{ fontSize: '0.7rem', textAlign: 'right', fontStyle: 'italic' }}>
                        * Indica el peso porcentual de la dotación sobre el costo diario del trabajador por nivel.
                    </p>
                </div>
            </div>
        </div>
    );
};

