import { cn, getStatusColor } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'status' | 'outline';
  status?: string;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'default', status, className, dot = false }: BadgeProps) {
  const statusClass = status ? getStatusColor(status) : '';

  const baseClass = cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
    variant === 'status' && statusClass,
    variant === 'default' &&
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    variant === 'outline' &&
      'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400',
    className
  );

  return (
    <span className={baseClass}>
      {dot && (
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            status === 'active' || status === 'UP' ? 'bg-emerald-500' :
            status === 'suspended' || status === 'DEGRADED' ? 'bg-amber-500' :
            status === 'deleted' || status === 'DOWN' || status === 'locked' ? 'bg-red-500' :
            'bg-slate-400'
          )}
        />
      )}
      {children}
    </span>
  );
}
