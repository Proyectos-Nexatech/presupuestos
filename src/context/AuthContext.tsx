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
        // No llamamos a setLoading(true) si ya está cargando o si ya tenemos el perfil
        // a menos que sea una recarga explícita.
        try {
            console.log("Fetching profile for:", userId);
            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout de base de datos')), 8000)
            );

            const result = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (result.error) {
                console.error("Error fetching profile:", result.error);
                setProfile(null);
            } else {
                console.log("Profile fetched successfully");
                setProfile(result.data as Profile);
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
