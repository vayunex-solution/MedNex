import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, GitBranch, Shield,
  FileText, Cpu, Activity, Key, Settings, ChevronRight,
  Layers, Terminal, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui.store';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    icon: <LayoutDashboard size={18} />, to: '/dashboard' },
  { label: 'Applications', icon: <Layers size={18} />,          to: '/applications' },
  { label: 'Users',        icon: <Users size={18} />,           to: '/users' },
  { label: 'Tenants',      icon: <Globe size={18} />,           to: '/tenants' },
  { label: 'Businesses',   icon: <Building2 size={18} />,       to: '/businesses' },
  { label: 'Branches',     icon: <GitBranch size={18} />,       to: '/branches' },
  { label: 'Roles',        icon: <Shield size={18} />,          to: '/roles' },
  { label: 'Audit Center', icon: <FileText size={18} />,        to: '/audit' },
  { label: 'Background Jobs', icon: <Cpu size={18} />,          to: '/jobs' },
  { label: 'Outbox',       icon: <Layers size={18} />,          to: '/outbox' },
  { label: 'Health',       icon: <Activity size={18} />,        to: '/health' },
  { label: 'API Keys',     icon: <Key size={18} />,             to: '/api-keys' },
  { label: 'Settings',     icon: <Settings size={18} />,        to: '/settings' },
];

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-base transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-base">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-600">
          <Terminal size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="text-sm font-bold text-primary leading-tight">NPC Admin</p>
            <p className="text-[10px] text-secondary leading-tight">Nex Platform Core</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-base">
        <div
          className={cn(
            'rounded-lg px-2 py-1.5 text-xs text-secondary text-center',
            collapsed && 'px-0'
          )}
        >
          {collapsed ? 'v1' : 'NPC v1.0.0'}
        </div>
      </div>
    </aside>
  );
}

function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
          'group relative',
          isActive
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="shrink-0">{item.icon}</span>
          {!collapsed && (
            <span className="flex-1 animate-fade-in truncate">{item.label}</span>
          )}
          {!collapsed && item.badge && (
            <span className={cn(
              'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              isActive ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
            )}>
              {item.badge}
            </span>
          )}
          {/* Tooltip for collapsed mode */}
          {collapsed && (
            <div className="pointer-events-none absolute left-full ml-3 z-50 hidden group-hover:flex items-center">
              <div className="rounded-md bg-slate-900 dark:bg-slate-700 px-2.5 py-1.5 text-xs text-white shadow-lg whitespace-nowrap">
                {item.label}
              </div>
              <ChevronRight size={8} className="text-slate-900 dark:text-slate-700 -ml-1" />
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}
