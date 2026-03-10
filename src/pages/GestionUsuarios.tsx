import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCog, Check, AlertCircle, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { RolUsuario, Profile } from '../context/AuthContext';
import { DataTable } from '../components/ui/DataTable';

const GESTION_ROLES: RolUsuario[] = ['admin', 'coordinador', 'rrhh', 'consultor'];

const ROLE_COLORS: Record<RolUsuario, { bg: string, text: string }> = {
    admin: { bg: 'rgba(239, 68, 68, 0.15)', text: 'rgb(248, 113, 113)' }, // Rojo
    coordinador: { bg: 'rgba(59, 130, 246, 0.15)', text: 'rgb(96, 165, 250)' }, // Azul
    rrhh: { bg: 'rgba(16, 185, 129, 0.15)', text: 'rgb(52, 211, 153)' }, // Verde
    consultor: { bg: 'rgba(156, 163, 175, 0.15)', text: 'rgb(156, 163, 175)' } // Gris
};

const GestionUsuarios = () => {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNombre, setEditNombre] = useState('');
    const [editEmail, setEditEmail] = useState('');

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error fetching profiles:', error);
            showToast('Error al cargar usuarios', 'error');
        } else {
            setProfiles(data || []);
        }
        setLoading(false);
    };

    const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), type === 'warning' ? 6000 : 3000);
    };

    const handleEditUser = (row: Profile) => {
        setEditingId(row.id);
        setEditNombre(row.nombre || '');
        setEditEmail(row.email || '');
    };

    const handleSaveUser = async (row: Profile) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ nombre: editNombre, email: editEmail })
                .eq('id', row.id);

            if (error) throw error;

            setProfiles(profiles.map(p => p.id === row.id ? { ...p, nombre: editNombre, email: editEmail } : p));
            showToast('Información actualizada correctamente', 'success');
            setEditingId(null);

            if (row.email !== editEmail) {
                setTimeout(() => showToast('Aviso: Cambiaste el email en la tabla, pero la contraseña y correo oficial para iniciar sesión (Supabase Auth) debe cambiarlos el propio usuario.', 'warning'), 1500);
            }
        } catch (error: any) {
            console.error('Error updating user info:', error);
            showToast('Error al guardar los datos', 'error');
        }
    };

    const handleRoleChange = async (userId: string, newRole: RolUsuario) => {
        if (userId === user?.id) {
            showToast('No puedes cambiar tu propio rol por seguridad.', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ rol: newRole })
                .eq('id', userId);

            if (error) throw error;

            setProfiles(profiles.map(p => p.id === userId ? { ...p, rol: newRole } : p));
            showToast('Rol actualizado correctamente', 'success');
        } catch (error: any) {
            console.error('Error updating role:', error);
            showToast('Error al actualizar el rol', 'error');
        }
    };

    const filteredProfiles = profiles.filter(p =>
        (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            header: 'Usuario',
            accessor: (row: Profile) => {
                const isEditing = editingId === row.id;

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.875rem'
                        }}>
                            {row.nombre ? row.nombre.charAt(0).toUpperCase() : <UserCog size={16} />}
                        </div>
                        <div style={{ flex: 1, minWidth: '220px' }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <input
                                        type="text"
                                        value={editNombre}
                                        onChange={e => setEditNombre(e.target.value)}
                                        placeholder="Nombre completo"
                                        style={{ backgroundColor: 'black', border: '1px solid hsl(var(--primary))', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', width: '100%', outline: 'none', fontSize: '0.875rem' }}
                                    />
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={e => setEditEmail(e.target.value)}
                                        placeholder="Correo electrónico"
                                        style={{ backgroundColor: 'black', border: '1px solid hsl(var(--primary))', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', width: '100%', outline: 'none', fontSize: '0.75rem' }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontWeight: 600 }}>{row.nombre || 'Sin nombre'}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>{row.email}</div>
                                </>
                            )}
                        </div>
                    </div>
                );
            }
        },
        {
            header: 'Rol Actual',
            accessor: (row: Profile) => {
                const colors = ROLE_COLORS[row.rol] || ROLE_COLORS.consultor;
                const isEditing = editingId === row.id;
                const isCurrentUser = row.id === user?.id;

                if (isEditing) {
                    return (
                        <select
                            value={row.rol}
                            onChange={(e) => handleRoleChange(row.id, e.target.value as RolUsuario)}
                            disabled={isCurrentUser}
                            title={isCurrentUser ? "No puedes editar tu propio rol" : ""}
                            style={{
                                width: '120px',
                                backgroundColor: isCurrentUser ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                                padding: '0.25rem 0.5rem',
                                color: isCurrentUser ? 'hsl(var(--muted-foreground))' : 'white',
                                outline: 'none',
                                cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            {GESTION_ROLES.map(rol => (
                                <option key={rol} value={rol} style={{ backgroundColor: 'black' }}>
                                    {rol.charAt(0).toUpperCase() + rol.slice(1)}
                                </option>
                            ))}
                        </select>
                    );
                }

                return (
                    <span style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {row.rol}
                    </span>
                );
            }
        },
        {
            header: 'Acciones',
            accessor: (row: Profile) => {
                const isEditing = editingId === row.id;

                return (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {isEditing ? (
                            <>
                                <button onClick={() => handleSaveUser(row)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', backgroundColor: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                                    <Save size={14} /> Guardar
                                </button>
                                <button onClick={() => setEditingId(null)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', backgroundColor: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                                    <X size={14} /> Cancelar
                                </button>
                            </>
                        ) : (
                            <button onClick={() => handleEditUser(row)} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid hsl(var(--border))', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                                <Edit2 size={14} /> Editar
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : toast.type === 'warning' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    padding: '1rem 1.5rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    zIndex: 50,
                    backdropFilter: 'blur(4px)',
                    fontWeight: 500
                }}>
                    {toast.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                    {toast.message}
                </div>
            )}

            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Users size={32} color="hsl(var(--primary))" />
                    Gestión de Usuarios
                </h1>
                <p style={{ color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem' }}>
                    Administra los accesos y roles de los colaboradores en SGPCO.
                </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Buscar usuario por nombre o correo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '400px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        padding: '0.75rem 1rem',
                        color: 'white',
                        outline: 'none'
                    }}
                />
            </div>

            <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius)' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                        Cargando usuarios...
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={filteredProfiles}
                    />
                )}
            </div>
        </div>
    );
};

export default GestionUsuarios;
