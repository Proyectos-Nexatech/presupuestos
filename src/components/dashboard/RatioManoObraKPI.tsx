import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { Hammer } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface APUItemRaw {
    apu_id: string;
    tipo: string;
    cantidad: number;
    precio_unitario: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val);

// ─── Gauge colour by RMO ─────────────────────────────────────────────────────
const getRMOColor = (pct: number) => {
    if (pct <= 40) return '#10b981';  // green — healthy
    if (pct <= 60) return '#f59e0b';  // amber — elevated
    return '#f43f5e';                 // red — high
};

const getRMOLabel = (pct: number) => {
    if (pct <= 40) return { text: 'Saludable', color: '#10b981' };
    if (pct <= 60) return { text: 'Elevado', color: '#f59e0b' };
    return { text: 'Alto', color: '#f43f5e' };
};

// ─── Custom Donut Centre ──────────────────────────────────────────────────────
const DonutLabel = ({ cx, cy, pct }: { cx: number; cy: number; pct: number }) => {
    const color = getRMOColor(pct);
    return (
        <>
            <text x={cx} y={cy - 10} textAnchor="middle" fill={color} fontSize={32} fontWeight={800}>
                {pct.toFixed(1)}%
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={11} fontWeight={600}>
                RATIO MO/PRESUPUESTO
            </text>
        </>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────
interface Props {
    proyectoFilter: string;
}

export const RatioManoObraKPI = ({ proyectoFilter }: Props) => {
    const [totalMO, setTotalMO] = useState(0);
    const [totalPresupuesto, setTotalPresupuesto] = useState(0);
    const [loading, setLoading] = useState(true);

    const isSupabaseConfigured =
        import.meta.env.VITE_SUPABASE_URL &&
        !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    const fetchData = async () => {
        setLoading(true);

        if (!isSupabaseConfigured) {
            // Mock: 38% RMO
            setTotalMO(17100000);
            setTotalPresupuesto(45000000);
            setLoading(false);
            return;
        }

        try {
            // 1. Get cuadro_economico totals (filtered by project)
            let ceQuery = supabase
                .from('cuadro_economico')
                .select('id, precio_total, proyecto');

            const { data: ceData, error: ceErr } = await ceQuery;
            if (ceErr) throw ceErr;

            const filtered = (ceData || []).filter((row: any) => {
                if (proyectoFilter === 'TODOS') return true;
                return row.proyecto === proyectoFilter;
            });

            const presupuesto = filtered.reduce((s: number, r: any) => s + Number(r.precio_total ?? 0), 0);
            const filteredIds = filtered.map((r: any) => r.id);

            if (filteredIds.length === 0) {
                setTotalMO(0);
                setTotalPresupuesto(presupuesto);
                setLoading(false);
                return;
            }

            // 2. Get APUs for those cuadro_economico rows
            const { data: apus, error: apuErr } = await supabase
                .from('apus')
                .select('id, cuadro_economico_id')
                .in('cuadro_economico_id', filteredIds);
            if (apuErr) throw apuErr;

            const apuIds = (apus || []).map((a: any) => a.id);
            if (apuIds.length === 0) {
                setTotalMO(0);
                setTotalPresupuesto(presupuesto);
                setLoading(false);
                return;
            }

            // 3. Get PERSONAL items only
            const { data: items, error: itemsErr } = await supabase
                .from('apu_items')
                .select('apu_id, tipo, cantidad, precio_unitario')
                .in('apu_id', apuIds)
                .eq('tipo', 'PERSONAL');

            if (itemsErr) throw itemsErr;

            const mo = (items as APUItemRaw[] || []).reduce(
                (s, i) => s + Number(i.cantidad) * Number(i.precio_unitario),
                0
            );

            setTotalMO(mo);
            setTotalPresupuesto(presupuesto);
        } catch (err) {
            console.error('Error fetching RMO data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [proyectoFilter]);

    const rmo = useMemo(() =>
        totalPresupuesto > 0 ? (totalMO / totalPresupuesto) * 100 : 0,
        [totalMO, totalPresupuesto]
    );

    const pieData = [
        { name: 'Mano de Obra', value: rmo },
        { name: 'Otros', value: Math.max(0, 100 - rmo) },
    ];

    const rmoColor = getRMOColor(rmo);
    const rmoLabel = getRMOLabel(rmo);

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
                background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(244,63,94,0.04) 100%)',
            }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Hammer size={20} style={{ color: '#f59e0b' }} />
                    Ratio de Mano de Obra (RMO)
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>
                    % del presupuesto correspondiente a MO · Fórmula: (Total MO / Presupuesto Total) × 100
                </p>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '260px', color: 'hsl(var(--muted-foreground))' }}>
                        Calculando RMO...
                    </div>
                ) : totalPresupuesto === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', opacity: 0.4, gap: '1rem' }}>
                        <Hammer size={48} />
                        <p style={{ textAlign: 'center' }}>Sin datos de presupuesto disponibles.</p>
                    </div>
                ) : (
                    <>
                        {/* Donut */}
                        <div style={{ position: 'relative', width: '100%' }}>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={72}
                                        outerRadius={100}
                                        startAngle={90}
                                        endAngle={-270}
                                        paddingAngle={2}
                                        dataKey="value"
                                        isAnimationActive={true}
                                    >
                                        <Cell fill={rmoColor} fillOpacity={0.9} />
                                        <Cell fill="rgba(255,255,255,0.06)" />
                                    </Pie>
                                    <Tooltip
                                        formatter={(val: number) => [`${val.toFixed(2)}%`]}
                                        contentStyle={{
                                            backgroundColor: 'rgba(10,15,35,0.95)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px',
                                            color: 'white',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Centre label — overlaid */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -52%)',
                                textAlign: 'center',
                                pointerEvents: 'none',
                            }}>
                                <p style={{ fontSize: '2.4rem', fontWeight: 900, color: rmoColor, lineHeight: 1 }}>
                                    {rmo.toFixed(1)}%
                                </p>
                                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '4px' }}>
                                    RMO
                                </p>
                            </div>
                        </div>

                        {/* Status badge */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '0.35rem 1rem', borderRadius: '20px',
                            backgroundColor: `${rmoColor}18`,
                            border: `1px solid ${rmoColor}40`,
                            marginBottom: '1.25rem',
                        }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: rmoColor }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: rmoColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                {rmoLabel.text}
                            </span>
                        </div>

                        {/* KPI chips */}
                        <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <div style={{
                                flex: 1, minWidth: '140px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '10px', padding: '0.75rem 1rem',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Mano de Obra</p>
                                <p style={{ fontSize: '1.05rem', fontWeight: 800, color: rmoColor, marginTop: '4px' }}>{formatCOP(totalMO)}</p>
                            </div>
                            <div style={{
                                flex: 1, minWidth: '140px',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '10px', padding: '0.75rem 1rem',
                                textAlign: 'center',
                            }}>
                                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Presupuesto Total</p>
                                <p style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginTop: '4px' }}>{formatCOP(totalPresupuesto)}</p>
                            </div>
                        </div>

                        {/* Reference */}
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)' }}>
                            <span>● Verde: RMO ≤ 40%</span>
                            <span>● Ámbar: 40–60%</span>
                            <span>● Rojo: &gt; 60%</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
