import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RolUsuario } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
    roles?: RolUsuario[];
    children?: React.ReactNode; // Optional, if using inside Routes but in v6 Outlet is preferred for layouts
}

// Custom error screen for access denied
const AccessDeniedScreen = () => (
    <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center'
    }}>
        <ShieldAlert size={64} style={{ color: 'hsl(var(--destructive, 0, 84.2%, 60.2%))', marginBottom: '1.5rem' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: 'white' }}>
            Acceso Denegado
        </h1>
        <p style={{ color: 'hsl(var(--muted-foreground))', maxWidth: '400px', marginBottom: '2rem' }}>
            No tienes el rol necesario para acceder a este módulo. Si crees que esto es un error, contacta a un administrador.
        </p>
        <button
            onClick={() => window.location.href = '/'}
            style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'hsl(var(--primary))',
                color: 'white',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
            }}
        >
            Volver al Dashboard
        </button>
    </div>
);

export const ProtectedRoute = ({ roles, children }: ProtectedRouteProps) => {
    const { user, profile, loading } = useAuth();

    // 1. Mostrar loading mientras chequea la sesión
    const [showSkip, setShowSkip] = useState(false);
    useEffect(() => {
        let t: any;
        if (loading) {
            t = setTimeout(() => setShowSkip(true), 5000);
        }
        return () => clearTimeout(t);
    }, [loading]);

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <p style={{ color: 'hsl(var(--muted-foreground))' }}>Evaluando permisos...</p>
                {showSkip && (
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '0.4rem 0.8rem', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid hsl(var(--border))', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                        Reintentar carga inmediata
                    </button>
                )}
            </div>
        );
    }

    // 2. Si no hay usuario, redirigir al login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Si hay roles requeridos y el usuario no cumple, acceso denegado
    if (roles && roles.length > 0) {
        if (!profile || !roles.includes(profile.rol)) {
            return <AccessDeniedScreen />;
        }
    }

    // 4. Si todo está bien, renderiza los hijos o el Outlet (si es route wrapper)
    return children ? <>{children}</> : <Outlet />;
};
