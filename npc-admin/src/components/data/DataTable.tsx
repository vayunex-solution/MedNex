import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/feedback/Skeleton';

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  onSelectionChange?: (rows: TData[]) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<TData>({
  data,
  columns,
  loading,
  onRowClick,
  onSelectionChange,
  emptyMessage = 'No records found.',
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      if (onSelectionChange) {
        const selectedRows = Object.keys(newSelection)
          .filter((k) => newSelection[k])
          .map((k) => data[parseInt(k)]);
        onSelectionChange(selectedRows);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: !!onSelectionChange,
  });

  if (loading) return <TableSkeleton rows={6} cols={columns.length} />;

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-base', className)}>
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-base bg-slate-50/50 dark:bg-slate-900/50">
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400',
                      canSort && 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <span className="shrink-0">
                          {sortDir === 'asc' ? <ChevronUp size={14} /> :
                           sortDir === 'desc' ? <ChevronDown size={14} /> :
                           <ChevronsUpDown size={14} className="opacity-40" />}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center text-slate-400 dark:text-slate-600">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(
                  'bg-card transition-colors duration-100',
                  onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50',
                  row.getIsSelected() && 'bg-primary-50/30 dark:bg-primary-950/20'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-primary whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
