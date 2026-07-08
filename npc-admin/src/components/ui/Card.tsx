import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ children, className, padding = 'md', hover = false }: CardProps) {
  const padMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };

  return (
    <div
      className={cn(
        'rounded-2xl bg-card border border-base shadow-card',
        padMap[padding],
        hover && 'transition-shadow duration-200 hover:shadow-panel',
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  iconColor?: string;
  subtitle?: string;
}

export function StatCard({ title, value, change, changeType = 'neutral', icon, iconColor, subtitle }: StatCardProps) {
  const changeColor = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-500 dark:text-slate-400',
  }[changeType];

  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-primary">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
        )}
        {change && (
          <p className={cn('mt-1 text-xs font-medium', changeColor)}>{change}</p>
        )}
      </div>
      {icon && (
        <div className={cn('p-3 rounded-xl shrink-0', iconColor ?? 'bg-primary-50 dark:bg-primary-950')}>
          {icon}
        </div>
      )}
    </Card>
  );
}
