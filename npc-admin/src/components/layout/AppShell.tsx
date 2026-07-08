import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '@/components/feedback/Toast';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';

export function AppShell() {
  const _collapsed = useUiStore((s) => s.sidebarCollapsed);
  void _collapsed;

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar />
        <main
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden p-6',
            'transition-all duration-300'
          )}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
