import { Menu, Moon, Sun, LogOut, User, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUiStore } from '@/stores/ui.store';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { authService } from '@/services/auth.service';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { toast } from '@/stores/ui.store';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function Topbar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { theme, toggleTheme } = useThemeStore();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
      toast.success('Logged out successfully');
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b border-base bg-card px-4">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Workspace Switcher */}
      <WorkspaceSwitcher />

      {/* Breadcrumbs — spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Avatar name={user?.name} size="sm" />
            <div className="hidden md:flex flex-col items-start min-w-0">
              <p className="text-xs font-semibold text-primary truncate max-w-32">{user?.name}</p>
              <p className="text-[10px] text-secondary">{user?.role}</p>
            </div>
            <ChevronDown size={14} className={cn('text-secondary transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-1 z-50 w-52 rounded-xl border border-base bg-card shadow-panel animate-slide-up py-1">
                <div className="px-3 py-2.5 border-b border-base">
                  <p className="text-sm font-medium text-primary">{user?.name}</p>
                  <p className="text-xs text-secondary truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/settings/profile'); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <User size={14} />
                  Profile & Settings
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
