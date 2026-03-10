import { useState, useEffect } from 'react';
import {
    RotateCcw, ShieldAlert, CheckCircle2,
    AlertCircle, Play, Clock, Settings
} from 'lucide-react';
import { useFormulas } from '../context/FormulaContext';
import { supabase } from '../lib/supabase';
import * as math from 'mathjs';

const GestorFormulas = () => {
    const { formulas, updateFormula, saveVersion, restoreVersion, loading } = useFormulas();
    const [activeTab, setActiveTab] = useState<'Salarios' | 'APU' | 'Dotacion' | 'Global' | 'Examenes Medicos' | 'Certificacion Alturas' | 'Certificados Confinados' | 'Cuadro Economico'>('Salarios');
    const [versions, setVersions] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempFormula, setTempFormula] = useState('');
    const [testResult, setTestResult] = useState<number | null>(null);
    const [testError, setTestError] = useState<string | null>(null);
    const [showVersionModal, setShowVersionModal] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');

    useEffect(() => {
        fetchVersions();
    }, []);

    const fetchVersions = async () => {
        const { data } = await supabase
            .from('config_formula_versions')
            .select('*')
            .order('created_at', { ascending: false });
        setVersions(data || []);
    };

    const handleTest = (formula: string) => {
        setTestError(null);
        setTestResult(null);

        // Mock scope based on common variables
        const scope = {
            A: 3000000,
            PM: 500000,
            "A'": 100000,
            HN: 8.8,
            "A''": 110000,
            K: 250000,
            Factor_Lluvia: 0.3,
            AA: 4500000,
            AB: 8000000,
            D_PROY: 90,
            D_ITEM: 30,
            C_PROY: 2,
            V_UNIT: 50000,
            num_trab: 1,
            salario_diario: 150000,
            rendimiento: 5
        };

        try {
            const result = math.evaluate(formula, scope);
            setTestResult(Number(result));
        } catch (err: any) {
            setTestError(err.message);
        }
    };

    const handleSaveFormula = async (id: string) => {
        if (window.confirm('¿Está seguro de modificar esta fórmula? Alterará los resultados financieros de todos los presupuestos.')) {
            await updateFormula(id, { formula_expresion: tempFormula });
            setEditingId(null);
        }
    };

    const handleCreateVersion = async () => {
        if (!newVersionName) return;
        await saveVersion(newVersionName);
        setNewVersionName('');
        setShowVersionModal(false);
        fetchVersions();
    };

    const sections = ['Salarios', 'APU', 'Dotacion', 'Global', 'Examenes Medicos', 'Certificacion Alturas', 'Certificados Confinados', 'Cuadro Economico'];

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando motor de fórmulas...</div>;

    const filteredFormulas = formulas.filter(f => f.seccion === activeTab);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Settings size={32} color="hsl(var(--primary))" />
                        Gestor de Fórmulas
                    </h1>
                    <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>Centralización y control del motor de cálculos dinámicos de SGPCO.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setShowVersionModal(true)}
                        className="glass"
                        style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'white' }}
                    >
                        <Clock size={18} />
                        Versiones
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="glass"
                        style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'white' }}
                    >
                        <RotateCcw size={18} />
                        Recargar
                    </button>
                </div>
            </header>

            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', color: '#f87171' }}>
                <ShieldAlert size={24} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>ADVERTENCIA: Modificar estas fórmulas alterará los resultados financieros de todos los presupuestos actuales y futuros. Use el botón de Validar antes de guardar.</p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '1rem' }}>
                {sections.map(s => (
                    <button
                        key={s}
                        onClick={() => setActiveTab(s as any)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius)',
                            border: 'none',
                            backgroundColor: activeTab === s ? 'hsl(var(--primary))' : 'transparent',
                            color: activeTab === s ? 'white' : 'hsl(var(--muted-foreground))',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {s.toUpperCase()}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem' }}>
                {filteredFormulas.map(f => (
                    <div key={f.id} className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 800, marginRight: '0.5rem' }}>
                                    {f.variable_nombre}
                                </span>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginTop: '0.5rem' }}>{f.descripcion}</h3>
                            </div>
                            {f.tipo === 'constante' && <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase' }}>Factor Fijo</span>}
                            {f.tipo === 'input' && <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>Entrada Manual</span>}
                        </div>

                        {editingId === f.id ? (
                            <div style={{ marginTop: '1rem' }}>
                                <textarea
                                    value={tempFormula}
                                    onChange={(e) => setTempFormula(e.target.value)}
                                    style={{
                                        width: '100%',
                                        backgroundColor: 'rgba(0,0,0,0.3)',
                                        border: '1px solid hsl(var(--primary))',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        color: 'white',
                                        fontFamily: 'monospace',
                                        fontSize: '1rem',
                                        minHeight: '80px',
                                        outline: 'none'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button
                                        onClick={() => handleTest(tempFormula)}
                                        className="btn-secondary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
                                    >
                                        <Play size={14} /> Validar
                                    </button>
                                    <button
                                        onClick={() => handleSaveFormula(f.id)}
                                        style={{ backgroundColor: 'hsl(var(--primary))', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        style={{ backgroundColor: 'transparent', color: 'white', border: '1px solid hsl(var(--border))', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                                {testResult !== null && (
                                    <div style={{ marginTop: '1rem', padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(52, 211, 153, 0.1)', color: '#34d399', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CheckCircle2 size={16} />
                                        Resultado (Ejemplo): <strong>{testResult.toLocaleString()}</strong>
                                    </div>
                                )}
                                {testError && (
                                    <div style={{ marginTop: '1rem', padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <AlertCircle size={16} />
                                        Error: {testError}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', color: '#60a5fa', fontSize: '1.2rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {f.formula_expresion === 'INPUT' ? '___' : f.formula_expresion}
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingId(f.id);
                                        setTempFormula(f.formula_expresion);
                                        setTestResult(null);
                                        setTestError(null);
                                    }}
                                    style={{ marginTop: '1rem', backgroundColor: 'transparent', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary))', padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Editar Ecuación
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Version Modal */}
            {showVersionModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass" style={{ width: '500px', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={24} color="hsl(var(--primary))" />
                            Gestión de Versiones
                        </h2>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '0.5rem' }}>Crear Punto de Restauración</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    placeholder="Ej: Configuración Inicial 2026"
                                    value={newVersionName}
                                    onChange={(e) => setNewVersionName(e.target.value)}
                                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border))', borderRadius: '6px', padding: '0.5rem', color: 'white', outline: 'none' }}
                                />
                                <button onClick={handleCreateVersion} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Crear</button>
                            </div>
                        </div>

                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <label style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', display: 'block', marginBottom: '1rem' }}>Historial de Versiones</label>
                            {versions.map(v => (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'white' }}>{v.nombre_version}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>{new Date(v.created_at).toLocaleString()}</div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('¿Restaurar esta versión? Se sobrescribirán todas las fórmulas actuales.')) {
                                                restoreVersion(v.id);
                                                setShowVersionModal(false);
                                            }
                                        }}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Restaurar
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowVersionModal(false)}
                            style={{ width: '100%', marginTop: '2rem', backgroundColor: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))', padding: '0.75rem', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestorFormulas;
