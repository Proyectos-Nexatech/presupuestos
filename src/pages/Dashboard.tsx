import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CostoDotacionChart } from '../components/dashboard/CostoDotacionChart';
import { MargenContribucionChart } from '../components/dashboard/MargenContribucionChart';
import { RatioManoObraKPI } from '../components/dashboard/RatioManoObraKPI';
import { FolderOpen } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({
        proyectos: '0',
        presupuesto: '$0',
        apus: '0',
        alertas: '3'
    });
    const [proyectos, setProyectos] = useState<string[]>([]);
    const [selectedProyecto, setSelectedProyecto] = useState<string>('TODOS');

    const isSupabaseConfigured =
        import.meta.env.VITE_SUPABASE_URL &&
        !import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

    // ── Fetch available project names & Real Stats ───────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            if (!isSupabaseConfigured) {
                setProyectos(['PROYECTO EJEMPLO A', 'PROYECTO EJEMPLO B']);
                setStats({
                    proyectos: '2',
                    presupuesto: '$45.2M',
                    apus: '10',
                    alertas: '3'
                });
                return;
            }

            try {
                // 1. Fetch Projects for selector
                const { data: ceData, error: ceErr } = await supabase
                    .from('cuadro_economico')
                    .select('proyecto, precio_total, id');
                
                if (ceErr) throw ceErr;

                if (ceData) {
                    // Extract unique project names
                    const uniqueProjs = [...new Set(
                        ceData.map((r: any) => r.proyecto as string).filter(Boolean)
                    )].sort();
                    setProyectos(uniqueProjs);

                    // 2. Fetch APU count
                    const { count: apuCount } = await supabase
                        .from('apus')
                        .select('*', { count: 'exact', head: true });

                    // 3. Calculate Real Stats
                    const totalBudget = ceData.reduce((acc, curr) => acc + Number(curr.precio_total || 0), 0);
                    
                    setStats({
                        proyectos: String(uniqueProjs.length),
                        presupuesto: new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            maximumSignificantDigits: 3
                        }).format(totalBudget).replace('COP', '').trim(),
                        apus: String(apuCount || 0),
                        alertas: '3'
                    });
                }
            } catch (err) {
                console.error('Error fetching dashboard summary:', err);
            }
        };

        fetchData();
    }, [isSupabaseConfigured]);

    return (
        <div>
            {/* ── Page Header ────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Dashboard</h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))' }}>
                        Resumen general de presupuestos e indicadores clave.
                    </p>
                </div>

                {/* ── Global Project Filter ─────────────────────────────────── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <FolderOpen size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        Proyecto
                    </label>
                    <select
                        value={selectedProyecto}
                        onChange={e => setSelectedProyecto(e.target.value)}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            color: 'white',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                            minWidth: '160px',
                        }}
                    >
                        <option value="TODOS">TODOS</option>
                        {proyectos.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Summary KPI Cards ─────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {[
                    { label: 'Proyectos Activos', value: stats.proyectos, change: '+1 este mes' },
                    { label: 'Presupuesto Total', value: stats.presupuesto, change: 'Actualizado' },
                    { label: 'APUs Generados', value: stats.apus, change: 'Total base' },
                    { label: 'Alertas RRHH', value: stats.alertas, change: 'Pendientes' },
                ].map((stat, i) => (
                    <div key={i} className="glass" style={{ padding: '1.5rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'hsl(var(--muted-foreground))' }}>{stat.label}</p>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0' }}>{stat.value}</h3>
                        <p style={{ fontSize: '0.75rem', color: stat.change.includes('+') ? '#10b981' : '#f59e0b' }}>
                            {stat.change}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Proyectos Recientes ────────────────────────────────────────── */}
            <div style={{ marginTop: '2rem' }} className="glass">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))' }}>
                    <h3 style={{ fontWeight: 600 }}>Proyectos Recientes</h3>
                </div>
                <div style={{ padding: '1.5rem' }}>
                    <p style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '2rem' }}>
                        No hay proyectos recientes para mostrar.
                    </p>
                </div>
            </div>

            {/* ── APU Metrics Row: Margen + RMO ─────────────────────────────── */}
            <div style={{
                marginTop: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '1.5rem',
                alignItems: 'start',
            }}>
                <MargenContribucionChart proyectoFilter={selectedProyecto} />
                <RatioManoObraKPI proyectoFilter={selectedProyecto} />
            </div>

            {/* ── Indicador: Impacto Relativo de Dotación ───────────────────── */}
            <CostoDotacionChart />
        </div>
    );
};

export default Dashboard;
