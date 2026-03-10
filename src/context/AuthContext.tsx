import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type RolUsuario = 'admin' | 'coordinador' | 'rrhh' | 'consultor';

export interface Profile {
    id: string;
    nombre: string;
    email: string;
    rol: RolUsuario;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Verificación inicial inmediata del estado
        const checkInitialSession = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (isMounted) {
                    setSession(initialSession);
                    setUser(initialSession?.user ?? null);
                    if (initialSession?.user) {
                        await fetchProfile(initialSession.user.id);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error("Error checking initial session:", error);
                if (isMounted) setLoading(false);
            }
        };

        checkInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, currentSession) => {
                if (!isMounted) return;

                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    // Solo recargar el perfil si es un login o refresco inicial importante
                    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                        await fetchProfile(currentSession.user.id);
                    } else {
                        // Importante: Si cambia de pestaña y dispara TOKEN_REFRESHED,
                        // debemos asegurarnos de que no se quede colgado "Evaluando permisos"
                        setLoading(false);
                    }
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        // Fallback de seguridad: Si en 6 segundos no hay respuesta (Supabase caído o falta config), liberamos
        const timeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn("Auth timeout reached - unlocking UI");
                setLoading(false);
            }
        }, 6000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        setLoading(true);
        try {
            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            // Timeout defensivo nativo (10 segundos) por DB dormida
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout de base de datos')), 10000)
            );

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) {
                console.error("Error fetching profile:", error);
                setProfile(null);
            } else {
                setProfile(data as Profile);
            }
        } catch (err) {
            console.error("Unexpected error fetching profile:", err);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error("Error signing out:", err);
        } finally {
            setUser(null);
            setSession(null);
            setProfile(null);
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
