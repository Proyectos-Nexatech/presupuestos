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
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
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

            {/* ── Proyectos Recientes (Real Table) ────────────────────────── */}
            <div style={{ marginTop: '2rem' }} className="glass">
                <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Desglose por Proyecto</h3>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Base de datos: {isSupabaseConfigured ? 'Conectada' : 'Simulada'} • {new Date().toLocaleTimeString()}
                    </span>
                </div>
                <div style={{ padding: '1rem' }}>
                    {proyectos.length === 0 ? (
                        <p style={{ color: 'hsl(var(--muted-foreground))', textAlign: 'center', padding: '3rem' }}>
                            No hay proyectos con datos asignados aún. <br />
                            <small>Asigna un nombre de proyecto en el Cuadro Económico.</small>
                        </p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <th style={{ padding: '1rem' }}>NOMBRE DEL PROYECTO</th>
                                        <th style={{ padding: '1rem', textAlign: 'right' }}>VALOR TOTAL</th>
                                        <th style={{ padding: '1rem', textAlign: 'center' }}>ESTADO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proyectos.map((p) => (
                                        <tr key={p} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '1rem', fontWeight: 600, color: 'hsl(var(--primary))' }}>{p}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700 }}>
                                                {/* Budget info would need to be passed here, but stats.presupuesto is global. 
                                                    For now, let's show the global if there's only one, or a '+' if many */}
                                                {proyectos.length === 1 ? stats.presupuesto : 'Ver detalle'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>ACTIVO</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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
