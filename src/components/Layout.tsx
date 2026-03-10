import { useState } from 'react';
import {
    LayoutDashboard,
    Package,
    Users,
    Calculator,
    FileText,
    Settings,
    History,
    LogOut,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Map,
    TrendingDown,
    ShieldCheck,
    Hexagon,
    Stethoscope,
    HardHat,
    DollarSign,
    Briefcase,
    PlusCircle
} from 'lucide-react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    path: string;
    collapsed: boolean;
    active: boolean;
    highlighted?: boolean;
}

const SidebarItem = ({ icon, label, path, collapsed, active, highlighted }: SidebarItemProps) => (
    <Link
        to={path}
        className={`sidebar-item ${active ? 'active' : ''} ${highlighted ? 'highlighted' : ''}`}
        title={collapsed ? label : undefined}
    >
        <div style={{ minWidth: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            {icon}
        </div>
        {!collapsed && <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>}
    </Link>
);

const SidebarGroup = ({ icon, label, items, collapsed, pathname }: any) => {
    const isChildActive = items.some((item: any) => pathname === item.path);
    const [isOpen, setIsOpen] = useState(isChildActive);

    if (collapsed) {
        return (
            <div className={`sidebar-item ${isChildActive ? 'active' : ''}`} title={label}>
                <div style={{ minWidth: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    {icon}
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '0.25rem' }}>
            <div
                className={`sidebar-item ${isOpen ? 'group-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ cursor: 'pointer', justifyContent: 'space-between' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ minWidth: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        {icon}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--muted-foreground))' }}>{label}</span>
                </div>
                <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'hsl(var(--muted-foreground))' }} />
            </div>
            {isOpen && (
                <div style={{ paddingLeft: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: '1.25rem' }}>
                    {items.map((item: any) => (
                        <SidebarItem
                            key={item.path}
                            {...item}
                            collapsed={collapsed}
                            active={pathname === item.path}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const Layout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const { profile, signOut } = useAuth();

    const menuItems = [
        { type: 'item', icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { type: 'item', icon: <Map size={20} />, label: 'Hoja de Ruta', path: '/hoja-de-ruta', highlighted: true },
        { type: 'item', icon: <Package size={20} />, label: 'Base Presupuesto', path: '/base-presupuesto' },
        {
            type: 'group',
            label: 'Gestión de Talento',
            icon: <Users size={20} />,
            items: [
                { icon: <Briefcase size={18} />, label: 'Cargos', path: '/maestro-cargos' },
                { icon: <DollarSign size={18} />, label: 'Salarios', path: '/salarios' },
                { icon: <Users size={18} />, label: 'Mano de Obra', path: '/mano-obra' },
            ]
        },
        {
            type: 'group',
            label: 'Costos Adicionales',
            icon: <PlusCircle size={20} />,
            items: [
                { icon: <Stethoscope size={18} />, label: 'Exámenes Médicos', path: '/examenes-medicos' },
                { icon: <ShieldCheck size={18} />, label: 'Certificación Alturas', path: '/certificacion-alturas' },
                { icon: <Hexagon size={18} />, label: 'Certificados Confinados', path: '/certificados-confinados' },
                { icon: <HardHat size={18} />, label: 'Dotación', path: '/dotacion' },
            ]
        },
        { type: 'item', icon: <TrendingDown size={20} />, label: 'Rendimientos', path: '/rendimientos' },
        { type: 'item', icon: <Calculator size={20} />, label: 'APU', path: '/apu' },
        { type: 'item', icon: <FileText size={20} />, label: 'Cuadro Económico', path: '/cuadro-economico' },
        { type: 'item', icon: <History size={20} />, label: 'Auditoría', path: '/auditoria' },
    ];

    const isConsultor = profile?.rol === 'consultor';
    const isRRHH = profile?.rol === 'rrhh';

    const visibleMenuItems = menuItems.filter(item => {
        if (isConsultor) {
            // Consultor shouldn't see groups or APU/CE
            if (item.type === 'group' || ['/apu', '/cuadro-economico', '/auditoria'].includes(item.path as string)) return false;
        }
        if (isRRHH) {
            if (['/apu', '/cuadro-economico', '/auditoria'].includes(item.path as string)) return false;
        }
        return true;
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>
            {/* Sidebar */}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 0.5rem' }}>
                    {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Calculator size={20} color="white" />
                            </div>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>SGPCO</span>
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="nav-toggle"
                    >
                        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="custom-scrollbar">
                    {visibleMenuItems.map((item, idx) => (
                        item.type === 'group' ? (
                            <SidebarGroup
                                key={idx}
                                {...item}
                                collapsed={collapsed}
                                pathname={location.pathname}
                            />
                        ) : (
                            <SidebarItem
                                key={item.path}
                                {...(item as any)}
                                collapsed={collapsed}
                                active={location.pathname === item.path}
                            />
                        )
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
                    {profile?.rol === 'admin' && (
                        <SidebarGroup
                            icon={<Settings size={20} />}
                            label="Configuración"
                            collapsed={collapsed}
                            pathname={location.pathname}
                            items={[
                                { icon: <Calculator size={18} />, label: 'Fórmulas', path: '/configuracion' },
                                { icon: <Users size={18} />, label: 'Usuarios', path: '/configuracion/usuarios' }
                            ]}
                        />
                    )}
                    <div className="sidebar-item" onClick={signOut} style={{ cursor: 'pointer', marginTop: '0.25rem' }}>
                        <div style={{ minWidth: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                            <LogOut size={20} />
                        </div>
                        {!collapsed && <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>Cerrar Sesión</span>}
                    </div>

                    {!collapsed && profile && (
                        <div style={{ padding: '0.75rem 1rem', marginTop: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{profile.nombre || 'Administrador'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase' }}>{profile.rol}</div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                <div style={{ width: '100%', padding: '0 1rem' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
