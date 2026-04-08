import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ScanLine, ShieldCheck, FileText, BarChart3,
  Settings, Users, LogOut, Shield, Eye,
} from 'lucide-react';

/* ── Nav configs per role ──────────────────── */
const SUPER_ADMIN_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/policies',   icon: FileText,        label: 'Policy Manager' },
  { to: '/checks',     icon: ShieldCheck,     label: 'Compliance Checks' },
  { to: '/scans',      icon: ScanLine,        label: 'Scan Results' },
  { to: '/reports',    icon: BarChart3,       label: 'Reports' },
  { to: '/manage-admins', icon: Users,        label: 'Manage Admins', badge: 'SUPER' },
  { to: '/frameworks', icon: ShieldCheck,     label: 'Frameworks' },
  { to: '/settings',   icon: Settings,        label: 'Settings', spacer: true },
];

const ADMIN_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/policies',   icon: FileText,        label: 'Policy Manager' },
  { to: '/checks',     icon: ShieldCheck,     label: 'Compliance Checks' },
  { to: '/scans',      icon: ScanLine,        label: 'Scan Results' },
  { to: '/reports',    icon: BarChart3,       label: 'Reports' },
  { to: '/frameworks', icon: ShieldCheck,     label: 'Frameworks' },
  { to: '/settings',   icon: Settings,        label: 'Settings', spacer: true },
];

const AUDITOR_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/policies',   icon: FileText,        label: 'Policies', badge: 'VIEW' },
  { to: '/checks',     icon: ShieldCheck,     label: 'Compliance Checks' },
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

  const navItems = NAV_MAP[role] || ADMIN_NAV;
  const portalLabel = PORTAL_LABELS[role] || 'Admin Portal';
  const BrandIcon = BRAND_ICONS[role] || Shield;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-[#0f172a] text-[#94a3b8]">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#38bdf8]">
            <BrandIcon className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="text-sm font-bold text-white block">GRC Compliance</span>
            <span className="text-xs text-[#94a3b8]">{portalLabel}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-2 flex flex-col gap-0.5 px-2 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, badge, spacer }) => (
            <div key={to}>
              {spacer && <div className="mt-6" />}
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#1e293b] text-white border-r-[3px] border-[#38bdf8]'
                      : 'hover:bg-[#1e293b]/60 hover:text-white'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{label}</span>
                {badge === 'SUPER' && (
                  <span className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    SUPER
                  </span>
                )}
                {badge === 'VIEW' && (
                  <span className="rounded-full bg-gray-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    VIEW
                  </span>
                )}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="px-2 pb-5">
          {user && (
            <div className="mb-2 px-4 py-2 text-xs text-[#64748b]">
              Logged in as <span className="text-white font-semibold">{user.username}</span>
            </div>
          )}
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
        <main className="flex-1 overflow-y-auto bg-[#f4f6f9] p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
