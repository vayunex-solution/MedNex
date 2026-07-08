import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { branchService } from '@/services/branch.service';
import { DataTable } from '@/components/data/DataTable';
import { Pagination } from '@/components/data/Pagination';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDateTime } from '@/lib/utils';
import type { Branch } from '@/types/platform.types';

export default function BranchesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as { _t: ReturnType<typeof setTimeout> })._t);
    (window as unknown as { _t: ReturnType<typeof setTimeout> })._t = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 400);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['branches', page, debouncedSearch],
    queryFn: () => branchService.listBranches({ page, limit: 20, search: debouncedSearch }),
  });

  const branches = data?.data ?? [];
  const meta = data?.meta;

  const columns: ColumnDef<Branch, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Branch',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-semibold text-primary">{row.original.name}</p>
          <p className="text-xs font-mono text-secondary">{row.original.branchCode ?? '—'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => <span className="text-sm text-secondary">{(getValue() as string) ?? '—'}</span>,
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ getValue }) => <span className="text-sm text-secondary">{(getValue() as string) ?? '—'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return <Badge variant="status" status={s} dot>{s}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => <span className="text-xs text-secondary">{formatDateTime(getValue() as string)}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Branches</h1>
          <p className="text-sm text-secondary mt-0.5">{meta?.total ?? 0} branches across all businesses</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => refetch()}>Refresh</Button>
      </div>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-base">
          <div className="max-w-sm">
            <Input placeholder="Search branches…" value={search} onChange={(e) => handleSearch(e.target.value)} leftAddon={<Search size={14} />} />
          </div>
        </div>
        <div className="p-4">
          <DataTable data={branches} columns={columns} loading={isLoading} emptyMessage="No branches found." />
        </div>
        {meta && (
          <div className="px-4 border-t border-base">
            <Pagination page={page} totalPages={meta.totalPages} hasNext={meta.hasNext} hasPrev={meta.hasPrev} onPageChange={setPage} total={meta.total} limit={20} />
          </div>
        )}
      </Card>
    </div>
  );
}
