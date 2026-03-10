import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Map,
    CheckCircle2,
    Circle,
    ArrowRight,
    Briefcase,
    DollarSign,
    Users,
    Package,
    TrendingDown,
    Calculator,
    FileText
} from 'lucide-react';

interface RoadmapStep {
    id: number;
    title: string;
    description: string;
    path: string;
    icon: React.ReactNode;
}

const steps: RoadmapStep[] = [
    {
        id: 1,
        title: "Definición de Cargos",
        description: "Inicia creando el listado de cargos operativos y administrativos en el Maestro de Cargos.",
        path: "/maestro-cargos",
        icon: <Briefcase size={24} />
    },
    {
        id: 2,
        title: "Configuración de Costos",
        description: "Configura los Salarios, Dotación y Exámenes para establecer el costo real diario por nivel.",
        path: "/salarios",
        icon: <DollarSign size={24} />
    },
    {
        id: 3,
        title: "Validación de Mano de Obra",
        description: "Revisa el consolidado en la matriz para asegurar que los costos hora/hombre sean correctos.",
        path: "/mano-obra",
        icon: <Users size={24} />
    },
    {
        id: 4,
        title: "Estructura del Presupuesto",
        description: "Carga los capítulos e ítems en la Base de Presupuesto.",
        path: "/base-presupuesto",
        icon: <Package size={24} />
    },
    {
        id: 5,
        title: "Asignación de Rendimientos",
        description: "Define la productividad esperada para cada labor técnica.",
        path: "/rendimientos",
        icon: <TrendingDown size={24} />
    },
    {
        id: 6,
        title: "Análisis de Precios (APU)",
        description: "Vincula materiales, equipos y la mano de obra configurada previamente.",
        path: "/apu",
        icon: <Calculator size={24} />
    },
    {
        id: 7,
        title: "Cierre Económico",
        description: "Verifica los márgenes y genera la oferta final en el Cuadro Económico.",
        path: "/cuadro-economico",
        icon: <FileText size={24} />
    }
];

const HojaDeRuta = () => {
    const navigate = useNavigate();
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('roadmap_completed');
        if (saved) {
            setCompletedSteps(JSON.parse(saved));
        }
    }, []);

    const toggleStep = (id: number) => {
        const newCompleted = completedSteps.includes(id)
            ? completedSteps.filter(sid => sid !== id)
            : [...completedSteps, id];

        setCompletedSteps(newCompleted);
        localStorage.setItem('roadmap_completed', JSON.stringify(newCompleted));
    };

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Map size={40} style={{ color: 'hsl(var(--primary))' }} />
                    Hoja de Ruta
                </h1>
                <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '1.1rem', maxWidth: '800px' }}>
                    Sigue estos pasos secuenciales para configurar correctamente tu presupuesto. Asegúrate de completar cada módulo antes de pasar al siguiente para garantizar la integridad de los datos.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '900px' }}>
                {steps.map((step, index) => {
                    const isCompleted = completedSteps.includes(step.id);
                    const isNext = completedSteps.length === index;

                    return (
                        <div
                            key={step.id}
                            className="glass"
                            style={{
                                display: 'flex',
                                gap: '2rem',
                                padding: '1.5rem',
                                borderRadius: '16px',
                                border: isNext ? '2px solid hsl(var(--primary))' : '1px solid rgba(255,255,255,0.1)',
                                backgroundColor: isNext ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                opacity: (index > completedSteps.length + 1) ? 0.6 : 1
                            }}
                        >
                            {/* Step Indicator */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                    onClick={() => toggleStep(step.id)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: isCompleted ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.05)',
                                        border: `2px solid ${isCompleted ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.2)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: isNext ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none'
                                    }}
                                >
                                    {isCompleted ? <CheckCircle2 size={24} color="white" /> : <Circle size={24} color="rgba(255,255,255,0.3)" />}
                                </div>
                                {index < steps.length - 1 && (
                                    <div style={{ width: '2px', flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                                )}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            color: isNext ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                                            backgroundColor: isNext ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase'
                                        }}>
                                            Paso {step.id}
                                        </span>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: isCompleted ? 'rgba(255,255,255,0.6)' : 'white' }}>
                                            {step.title}
                                        </h3>
                                    </div>
                                    <div style={{ color: isNext ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.2)' }}>
                                        {step.icon}
                                    </div>
                                </div>

                                <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1.25rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                    {step.description}
                                </p>

                                <button
                                    onClick={() => navigate(step.path)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        color: isNext ? 'white' : 'rgba(255,255,255,0.4)',
                                        backgroundColor: isNext ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.05)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Ir al módulo <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HojaDeRuta;
