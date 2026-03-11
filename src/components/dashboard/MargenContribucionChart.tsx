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
    ReferenceLine,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLOR_VENTA = '#38bdf8';
const COLOR_COSTO = 'hsl(22, 100%, 56%)';
const COLOR_MARGEN_POS = '#10b981';
const COLOR_MARGEN_NEG = '#f43f5e';

const COST_TIPOS = ['PERSONAL', 'MATERIAL', 'MATERIALES', 'EQUIPO', 'EQUIPOS', 'HERRAMIENTAS', 'TRANSPORTE'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface APURaw {
    id: string;
    cuadro_economico_id: string;
    cuadro_economico: {
        descripcion: string;
        precio_total: number;
        proyecto: string | null;
    };
}

interface APUItemRaw {
    apu_id: string;
    tipo: string;
    cantidad: number;
    precio_unitario: number;
}

interface MargenDataPoint {
    nombre: string;
    precioVenta: number;
    costoDirecto: number;
    margen: number;
    margenPct: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val);

const abbrev = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
    return `${sign}$${abs}`;
};

const truncate = (s: string, len = 22) => s.length > len ? s.slice(0, len) + '…' : s;

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const venta = payload.find((p: any) => p.dataKey === 'precioVenta')?.value ?? 0;
    const costo = payload.find((p: any) => p.dataKey === 'costoDirecto')?.value ?? 0;
    const margen = venta - costo;
    const margenPct = venta > 0 ? ((margen / venta) * 100).toFixed(1) : '0';
    const isPos = margen >= 0;

    return (
        <div style={{
            backgroundColor: 'rgba(10,15,35,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '12px 16px',
            minWidth: '220px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                {label}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <span style={{ color: COLOR_VENTA }}>💰 Precio Venta</span>
                    <span style={{ fontWeight: 700, color: 'white' }}>{formatCOP(venta)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <span style={{ color: COLOR_COSTO }}>🔧 Costo Directo</span>
                    <span style={{ fontWeight: 700, color: 'white' }}>{formatCOP(costo)}</span>
                </div>
                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <span style={{ color: isPos ? COLOR_MARGEN_POS : COLOR_MARGEN_NEG }}>
                        {isPos ? '↑' : '↓'} Margen
                    </span>
                    <span style={{ fontWeight: 800, color: isPos ? COLOR_MARGEN_POS : COLOR_MARGEN_NEG }}>
                        {formatCOP(margen)} ({margenPct}%)
                    </span>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
interface Props {
    proyectoFilter: string;
}

export const MargenContribucionChart = ({ proyectoFilter }: Props) => {
    const [allData, setAllData] = useState<MargenDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'rentables' | 'costosos'>('rentables');

    const isSupabaseConfigured =
        import.meta.env.VITE_SUPABASE_URL &&
        !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        if (!isSupabaseConfigured) {
            // Mock data
            const mock: MargenDataPoint[] = [
                { nombre: 'Excavación mecánica', precioVenta: 8500000, costoDirecto: 5100000, margen: 3400000, margenPct: 40 },
                { nombre: 'Concreto estructural', precioVenta: 12000000, costoDirecto: 7800000, margen: 4200000, margenPct: 35 },
                { nombre: 'Relleno compactado', precioVenta: 3200000, costoDirecto: 2800000, margen: 400000, margenPct: 12.5 },
                { nombre: 'Inst. tubería PVC', precioVenta: 6700000, costoDirecto: 3900000, margen: 2800000, margenPct: 42 },
                { nombre: 'Acero de refuerzo', precioVenta: 14000000, costoDirecto: 11500000, margen: 2500000, margenPct: 18 },
                { nombre: 'Encofrado madera', precioVenta: 4800000, costoDirecto: 5200000, margen: -400000, margenPct: -8 },
                { nombre: 'Impermeabilización', precioVenta: 9200000, costoDirecto: 9800000, margen: -600000, margenPct: -6.5 },
                { nombre: 'Pintura epóxica', precioVenta: 2100000, costoDirecto: 2400000, margen: -300000, margenPct: -14 },
                { nombre: 'Suministro bomba', precioVenta: 18000000, costoDirecto: 12000000, margen: 6000000, margenPct: 33 },
                { nombre: 'Pavimento flexible', precioVenta: 22000000, costoDirecto: 10000000, margen: 12000000, margenPct: 54.5 },
            ];
            setAllData(mock);
            setLoading(false);
            return;
        }

        try {
            // Fetch APUs with their cuadro_economico data
            const { data: apus, error: apuErr } = await supabase
                .from('apus')
                .select(`
                    id,
                    cuadro_economico_id,
                    cuadro_economico!inner(descripcion, precio_total, proyecto)
                `);

            if (apuErr) throw apuErr;

            // Fetch all apu_items
            const apuIds = (apus || []).map((a: any) => a.id);
            if (apuIds.length === 0) {
                setAllData([]);
                setLoading(false);
                return;
            }

            const { data: items, error: itemsErr } = await supabase
                .from('apu_items')
                .select('apu_id, tipo, cantidad, precio_unitario')
                .in('apu_id', apuIds);

            if (itemsErr) throw itemsErr;

            // Aggregate per APU
            const points: MargenDataPoint[] = (apus as APURaw[])
                .filter((a) => {
                    if (proyectoFilter === 'TODOS') return true;
                    return a.cuadro_economico?.proyecto === proyectoFilter;
                })
                .map((a) => {
                    const ce = a.cuadro_economico;
                    const precioVenta = Number(ce?.precio_total ?? 0);
                    const myItems: APUItemRaw[] = (items || []).filter((i: any) => i.apu_id === a.id);

                    const costoDirecto = myItems
                        .filter(i => COST_TIPOS.some(t => (i.tipo || '').toUpperCase().includes(t)))
                        .reduce((s, i) => s + Number(i.cantidad) * Number(i.precio_unitario), 0);

                    const margen = precioVenta - costoDirecto;
                    const margenPct = precioVenta > 0 ? (margen / precioVenta) * 100 : 0;

                    return {
                        nombre: truncate(ce?.descripcion || 'Sin descripción'),
                        precioVenta,
                        costoDirecto,
                        margen,
                        margenPct,
                    };
                });

            setAllData(points);
        } catch (err) {
            console.error('Error fetching margen data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Re-filter when proyectoFilter changes
    useEffect(() => {
        if (isSupabaseConfigured) fetchData();
    }, [proyectoFilter]);

    const displayData = useMemo(() => {
        const sorted = [...allData].sort((a, b) => b.margen - a.margen);
        if (view === 'rentables') return sorted.slice(0, 5);
        return sorted.slice(-5).reverse();
    }, [allData, view]);

    const isEmpty = !loading && allData.length === 0;

    return (
        <div className="glass" style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                padding: '1.5rem 2rem',
                borderBottom: '1px solid hsl(var(--border))',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.06) 0%, rgba(16,185,129,0.04) 100%)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <BarChart2 size={20} style={{ color: '#10b981' }} />
                            Margen de Contribución
                        </h3>
                        <p style={{ fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>
                            Precio de Venta vs. Costo Directo por APU
                        </p>
                    </div>
                    {/* Toggle */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => setView('rentables')} style={{
                            padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                            cursor: 'pointer', border: '1px solid', transition: 'all 0.18s',
                            borderColor: view === 'rentables' ? COLOR_MARGEN_POS : 'rgba(255,255,255,0.12)',
                            backgroundColor: view === 'rentables' ? 'rgba(16,185,129,0.15)' : 'transparent',
                            color: view === 'rentables' ? COLOR_MARGEN_POS : 'rgba(255,255,255,0.4)',
                            display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                            <TrendingUp size={12} /> Top 5 Rentables
                        </button>
                        <button onClick={() => setView('costosos')} style={{
                            padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                            cursor: 'pointer', border: '1px solid', transition: 'all 0.18s',
                            borderColor: view === 'costosos' ? COLOR_MARGEN_NEG : 'rgba(255,255,255,0.12)',
                            backgroundColor: view === 'costosos' ? 'rgba(244,63,94,0.15)' : 'transparent',
                            color: view === 'costosos' ? COLOR_MARGEN_NEG : 'rgba(255,255,255,0.4)',
                            display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                            <TrendingDown size={12} /> Top 5 Costosos
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ padding: '1.5rem 1rem 1rem', flex: 1 }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '280px', color: 'hsl(var(--muted-foreground))' }}>
                        Cargando APUs...
                    </div>
                ) : isEmpty ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', opacity: 0.4, gap: '1rem' }}>
                        <BarChart2 size={48} />
                        <p style={{ textAlign: 'center' }}>No hay APUs guardados para calcular el margen.<br /><small>Guarda al menos un APU para ver este indicador.</small></p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={displayData}
                            layout="vertical"
                            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                            barGap={3}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis
                                type="number"
                                tickFormatter={abbrev}
                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="nombre"
                                width={130}
                                tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            <Legend
                                wrapperStyle={{ fontSize: '0.75rem', paddingTop: '12px' }}
                                formatter={v => <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{v}</span>}
                            />
                            <Bar dataKey="precioVenta" name="Precio Venta" fill={COLOR_VENTA} radius={[0, 4, 4, 0]} maxBarSize={18} fillOpacity={0.85} />
                            <Bar dataKey="costoDirecto" name="Costo Directo" fill={COLOR_COSTO} radius={[0, 4, 4, 0]} maxBarSize={18} fillOpacity={0.85} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Footer note */}
            <div style={{ padding: '0 2rem 1rem' }}>
                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                    * Costo Directo incluye: MO, Materiales, Equipos, Herramientas y Transporte.
                </p>
            </div>
        </div>
    );
};
