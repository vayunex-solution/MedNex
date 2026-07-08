import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  onPageChange: (page: number) => void;
  total?: number;
  limit?: number;
}

export function Pagination({
  page, totalPages, hasNext, hasPrev, onPageChange, total, limit,
}: PaginationProps) {
  const from = total ? (page - 1) * (limit ?? 20) + 1 : null;
  const to = total ? Math.min(page * (limit ?? 20), total) : null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3">
      {total != null && (
        <p className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
          Showing {from}–{to} of {total}
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasPrev && page === 1}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft size={14} />}
        >
          Prev
        </Button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={idx} className="px-2 text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                page === p
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {p}
            </button>
          )
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasNext && page === totalPages}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight size={14} />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
