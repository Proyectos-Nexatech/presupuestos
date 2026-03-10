

const Dashboard = () => {
    return (
        <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard</h1>
            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2rem' }}>
                Resumen general de presupuestos e indicadores clave.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                {[
                    { label: 'Proyectos Activos', value: '12', change: '+2 este mes' },
                    { label: 'Presupuesto Total', value: '$45.2M', change: '+12.5%' },
                    { label: 'APUs Generados', value: '156', change: '+24' },
                    { label: 'Alertas RRHH', value: '3', change: 'Pendientes' },
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
        </div>
    );
};

export default Dashboard;
