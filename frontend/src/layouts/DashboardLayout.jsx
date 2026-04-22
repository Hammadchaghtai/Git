import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Toast from '../components/Toast';
import {
  LayoutDashboard, ScanLine, ShieldCheck, FileText, BarChart3,
  Settings, Users, LogOut, Shield, Eye, Moon, Sun
} from 'lucide-react';

/* ── Nav configs per role ──────────────────── */
const SUPER_ADMIN_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/policies',   icon: FileText,        label: 'Policy Manager' },
  { to: '/scans',      icon: ScanLine,        label: 'Scan Results' },
  { to: '/reports',    icon: BarChart3,       label: 'Reports' },
  { to: '/manage-admins', icon: Users,        label: 'Manage Admins', badge: 'SUPER' },
  { to: '/frameworks', icon: ShieldCheck,     label: 'Frameworks' },
  { to: '/settings',   icon: Settings,        label: 'Settings', spacer: true },
];

const ADMIN_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/policies',   icon: FileText,        label: 'Policy Manager' },
  { to: '/scans',      icon: ScanLine,        label: 'Scan Results' },
  { to: '/reports',    icon: BarChart3,       label: 'Reports' },
  { to: '/frameworks', icon: ShieldCheck,     label: 'Frameworks' },
  { to: '/settings',   icon: Settings,        label: 'Settings', spacer: true },
];

const AUDITOR_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/policies',   icon: FileText,        label: 'Policies', badge: 'VIEW' },
  { to: '/scans',      icon: ScanLine,        label: 'Scan Results' },
  { to: '/reports',    icon: BarChart3,       label: 'Reports' },
  { to: '/frameworks', icon: ShieldCheck,     label: 'Frameworks' },
];

const NAV_MAP = {
  super_admin: SUPER_ADMIN_NAV,
  admin: ADMIN_NAV,
  auditor: AUDITOR_NAV,
};

const PORTAL_LABELS = {
  super_admin: 'Super Admin Portal',
  admin: 'Admin Portal',
  auditor: 'Auditor Portal',
};

const BRAND_ICONS = {
  super_admin: Shield,
  admin: Shield,
  auditor: Eye,
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, logout, role } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const navItems = NAV_MAP[role] || ADMIN_NAV;
  const portalLabel = PORTAL_LABELS[role] || 'Admin Portal';
  const BrandIcon = BRAND_ICONS[role] || Shield;

  const [denialToast, setDenialToast] = useState(null);

  useEffect(() => {
    const handleDenial = (e) => {
      setDenialToast(e.detail.message);
    };
    window.addEventListener('grc-access-denial', handleDenial);
    return () => window.removeEventListener('grc-access-denial', handleDenial);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800 transition-colors duration-300">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/20">
            <BrandIcon className="h-6 w-6 text-white" />
          </div>
          <div className="leading-tight">
            <span className="text-[15px] font-bold text-slate-900 dark:text-white block tracking-tight">Antigravity</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{portalLabel}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-4 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, badge, spacer }) => (
            <div key={to}>
              {spacer && <div className="h-px bg-slate-100 dark:bg-slate-800 my-6 mx-2" />}
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 group ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 border-r-[4px] border-brand-600'
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className={`h-[20px] w-[20px] transition-colors ${badge ? 'text-brand-600' : ''}`} />
                <span className="flex-1">{label}</span>
                {badge === 'SUPER' && (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-tighter">
                    Admin
                  </span>
                )}
                {badge === 'VIEW' && (
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">
                    Audit
                  </span>
                )}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* Bottom Actions: Theme & Logout */}
        <div className="px-4 pb-6 flex flex-col gap-1">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {isDarkMode ? <Sun className="h-[20px] w-[20px]" /> : <Moon className="h-[20px] w-[20px]" />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            {/* Toggle switch UI */}
            <div className={`w-10 h-5 rounded-full p-1 transition-all duration-300 ${isDarkMode ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-transform duration-300 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
          >
            <LogOut className="h-[18px] w-[18px]" />
            {role === 'auditor' ? 'Exit to Login' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Auditor read-only banner */}
        {role === 'auditor' && (
          <div className="bg-gradient-to-r from-gray-600 to-gray-500 px-4 py-2 text-center text-sm font-medium text-white">
            👁️ Auditor View — Read-Only Access
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0b0e14] p-8 transition-colors duration-300">
          <Outlet />
        </main>
        
        {/* Global Access Denial Toast */}
        <Toast 
          message={denialToast} 
          type="error" 
          onClose={() => setDenialToast(null)} 
        />
      </div>
    </div>
  );
}
