import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—';
  try { return format(new Date(date), fmt); }
  catch { return '—'; }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try { return format(new Date(date), 'dd MMM yyyy, HH:mm'); }
  catch { return '—'; }
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return '—'; }
}

export function truncate(str: string, length = 40): string {
  return str.length > length ? str.slice(0, length) + '…' : str;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    active:        'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
    inactive:      'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800',
    suspended:     'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
    archived:      'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950',
    deleted:       'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
    locked:        'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
    pending:       'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
    email_pending: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
    completed:     'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
    failed:        'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
    running:       'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950',
    dead:          'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950',
    'UP':          'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
    'DOWN':        'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
    'DEGRADED':    'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
  };
  return map[status] ?? 'text-slate-500 bg-slate-100 dark:bg-slate-800';
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    return e?.response?.data?.message ?? e?.message ?? 'An unexpected error occurred';
  }
  return 'An unexpected error occurred';
}
