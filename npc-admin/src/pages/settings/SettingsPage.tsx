import { Link, useParams } from 'react-router-dom';
import { User, Sun, Moon, Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'profile', label: 'Profile', icon: <User size={15} /> },
  { id: 'sessions', label: 'Sessions', icon: <Smartphone size={15} /> },
  { id: 'appearance', label: 'Appearance', icon: <Sun size={15} /> },
];

export default function SettingsPage() {
  const { tab = 'profile' } = useParams<{ tab?: string }>();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: authService.getSessions,
    enabled: tab === 'sessions',
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-primary">Settings</h1>
        <p className="text-sm text-secondary mt-0.5">Manage your account preferences</p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Sidebar */}
        <div className="md:w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map((t) => (
              <Link
                key={t.id}
                to={`/settings/${t.id}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
                )}
              >
                {t.icon}
                {t.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === 'profile' && (
            <Card>
              <h2 className="text-base font-semibold text-primary mb-6">Profile Information</h2>
              <div className="flex items-center gap-4 mb-6">
                <Avatar name={user?.name} size="xl" />
                <div>
                  <p className="text-lg font-bold text-primary">{user?.name}</p>
                  <p className="text-sm text-secondary">{user?.email}</p>
                  <div className="flex gap-2 mt-1.5">
                    <Badge>{user?.role}</Badge>
                    <Badge variant="status" status="active" dot>Active</Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm border-t border-base pt-4">
                {[
                  { label: 'User ID', value: user?.uuid },
                  { label: 'User Type', value: user?.userType },
                  { label: 'Role', value: user?.role },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-secondary">{label}</span>
                    <span className="font-medium text-primary font-mono text-xs">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'sessions' && (
            <Card>
              <h2 className="text-base font-semibold text-primary mb-4">Active Sessions</h2>
              {!sessions || sessions.length === 0 ? (
                <p className="text-secondary text-sm">No active sessions.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div key={s.uuid} className="flex items-start justify-between gap-4 py-2 border-b border-base last:border-0">
                      <div>
                        <p className="text-sm font-medium text-primary">{s.userAgent}</p>
                        <p className="text-xs text-secondary">{s.ipAddress}</p>
                      </div>
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => authService.revokeSession(s.uuid)}
                      >
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab === 'appearance' && (
            <Card>
              <h2 className="text-base font-semibold text-primary mb-4">Appearance</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Color scheme</p>
                  <p className="text-xs text-secondary mt-0.5">Switch between light and dark mode</p>
                </div>
                <Button
                  variant="outline"
                  leftIcon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { if (theme !== t) toggleTheme(); }}
                    className={cn(
                      'rounded-xl border-2 p-4 text-center transition-all',
                      theme === t
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className={cn(
                      'h-12 rounded-lg mb-2',
                      t === 'light' ? 'bg-white border border-slate-200' : 'bg-slate-900 border border-slate-800'
                    )} />
                    <p className="text-xs font-medium text-primary capitalize">{t} Mode</p>
                    {theme === t && <Badge className="mt-1">Active</Badge>}
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
