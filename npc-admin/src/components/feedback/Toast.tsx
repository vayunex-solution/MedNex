import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore, type Toast } from '@/stores/ui.store';

const iconMap = {
  success: <CheckCircle size={18} className="text-emerald-500" />,
  error:   <XCircle size={18} className="text-red-500" />,
  warning: <AlertTriangle size={18} className="text-amber-500" />,
  info:    <Info size={18} className="text-blue-500" />,
};

const borderMap = {
  success: 'border-l-emerald-500',
  error:   'border-l-red-500',
  warning: 'border-l-amber-500',
  info:    'border-l-blue-500',
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useUiStore((s) => s.removeToast);

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-xl p-4 shadow-panel',
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
        'border-l-4 animate-slide-in',
        borderMap[toast.type]
      )}
    >
      <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
