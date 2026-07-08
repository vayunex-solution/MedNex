import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Download, UserCheck, UserX, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { userService } from '@/services/user.service';
import { tenantService } from '@/services/tenant.service';
import { businessService } from '@/services/business.service';
import { branchService } from '@/services/branch.service';
import { DataTable } from '@/components/data/DataTable';
import { Pagination } from '@/components/data/Pagination';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import { toast } from '@/stores/ui.store';
import type { PlatformUser, CreateUserDto } from '@/types/auth.types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().min(1, 'Role is required').default('employee'),
  userType: z.enum(['super_admin', 'developer', 'tenant_owner', 'business_owner', 'branch_manager', 'employee', 'service_account', 'system', 'bot', 'customer']).default('employee'),
  tenantUuid: z.string().uuid('Please select a valid tenant'),
  businessUuid: z.string().uuid('Please select a valid business'),
  branchUuid: z.string().uuid('Please select a valid branch'),
});

type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<PlatformUser[]>([]);
  const [bulkAction, setBulkAction] = useState<'activate' | 'suspend' | 'delete' | null>(null);

  // Debounce search
  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as { _searchTimer: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch],
    queryFn: () => userService.listUsers({ page, limit: 20, search: debouncedSearch }),
  });

  const bulkActivateMut = useMutation({
    mutationFn: (uuids: string[]) => userService.bulkActivate({ uuids }),
    onSuccess: ({ processed }) => {
      toast.success(`Activated ${processed} users`);
      qc.invalidateQueries({ queryKey: ['users'] });
      setSelectedRows([]);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const bulkSuspendMut = useMutation({
    mutationFn: (uuids: string[]) => userService.bulkSuspend({ uuids }),
    onSuccess: ({ processed }) => {
      toast.success(`Suspended ${processed} users`);
      qc.invalidateQueries({ queryKey: ['users'] });
      setSelectedRows([]);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (uuids: string[]) => userService.bulkDelete({ uuids }),
    onSuccess: ({ processed }) => {
      toast.success(`Deleted ${processed} users`);
      qc.invalidateQueries({ queryKey: ['users'] });
      setSelectedRows([]);
    },
  });

  const [createOpen, setCreateOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'employee',
      userType: 'employee',
    },
  });

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: () => tenantService.listTenants({ page: 1, limit: 100 }),
    enabled: createOpen,
  });

  const { data: businessesData } = useQuery({
    queryKey: ['businesses-list'],
    queryFn: () => businessService.listBusinesses({ page: 1, limit: 100 }),
    enabled: createOpen,
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => branchService.listBranches({ page: 1, limit: 100 }),
    enabled: createOpen,
  });

  const createMut = useMutation({
    mutationFn: (dto: CreateUserDto) => userService.createUser(dto),
    onSuccess: () => {
      toast.success('User created successfully');
      qc.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleBulkConfirm = () => {
    const uuids = selectedRows.map((r) => r.uuid);
    if (bulkAction === 'activate') bulkActivateMut.mutate(uuids);
    if (bulkAction === 'suspend') bulkSuspendMut.mutate(uuids);
    if (bulkAction === 'delete') bulkDeleteMut.mutate(uuids);
    setBulkAction(null);
  };

  const users = data?.data ?? [];
  const meta = data?.meta;

  const columns: ColumnDef<PlatformUser, unknown>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="rounded border-slate-300 dark:border-slate-700 text-primary-600"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-slate-300 dark:border-slate-700 text-primary-600"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar name={row.original.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary truncate">{row.original.name}</p>
            <p className="text-xs text-secondary truncate">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'userType',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="text-xs font-mono text-secondary">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => (
        <Badge>{getValue() as string}</Badge>
      ),
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
      accessorKey: 'lastLoginAt',
      header: 'Last Login',
      cell: ({ getValue }) => (
        <span className="text-xs text-secondary">{formatDateTime(getValue() as string)}</span>
      ),
    },
  ];

  const isBulkLoading = bulkActivateMut.isPending || bulkSuspendMut.isPending || bulkDeleteMut.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">Users</h1>
          <p className="text-sm text-secondary mt-0.5">
            Manage platform users · {meta?.total ?? 0} total
          </p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          Create User
        </Button>
      </div>

      <Card padding="none">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base flex-wrap">
          <div className="flex-1 min-w-48 max-w-sm">
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              leftAddon={<Search size={14} />}
            />
          </div>

          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-sm text-secondary">{selectedRows.length} selected</span>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<UserCheck size={14} />}
                onClick={() => setBulkAction('activate')}
                loading={bulkActivateMut.isPending}
              >
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<UserX size={14} />}
                onClick={() => setBulkAction('suspend')}
              >
                Suspend
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={14} />}
                onClick={() => setBulkAction('delete')}
              >
                Delete
              </Button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" leftIcon={<Download size={14} />}>
              Export
            </Button>
          </div>
        </div>

        <div className="p-4">
          <DataTable
            data={users}
            columns={columns}
            loading={isLoading}
            onRowClick={(row) => navigate(`/users/${row.uuid}`)}
            onSelectionChange={setSelectedRows}
            emptyMessage="No users found. Create the first user to get started."
          />
        </div>

        {meta && (
          <div className="px-4 border-t border-base">
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              hasNext={meta.hasNext}
              hasPrev={meta.hasPrev}
              onPageChange={setPage}
              total={meta.total}
              limit={20}
            />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={bulkAction !== null}
        onClose={() => setBulkAction(null)}
        onConfirm={handleBulkConfirm}
        title={`${bulkAction === 'activate' ? 'Activate' : bulkAction === 'suspend' ? 'Suspend' : 'Delete'} ${selectedRows.length} users?`}
        description={
          bulkAction === 'delete'
            ? 'This action will soft-delete the selected users. They can be restored later.'
            : `This will ${bulkAction} all selected users immediately.`
        }
        confirmLabel={bulkAction === 'activate' ? 'Activate' : bulkAction === 'suspend' ? 'Suspend' : 'Delete'}
        variant={bulkAction === 'delete' ? 'danger' : 'primary'}
        loading={isBulkLoading}
      />

      {/* Create User Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); reset(); }}
        title="Create Platform User"
        description="Add a new user to the platform and assign their initial tenant, business, and branch workspace memberships."
        size="lg"
      >
        <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              required
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Email Address"
              placeholder="e.g. john@example.com"
              type="email"
              required
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Initial Password"
              placeholder="••••••••"
              type="password"
              required
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">User Type</label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                required
                {...register('userType')}
              >
                <option value="employee">Employee</option>
                <option value="super_admin">Super Admin</option>
                <option value="developer">Developer</option>
                <option value="tenant_owner">Tenant Owner</option>
                <option value="business_owner">Business Owner</option>
                <option value="branch_manager">Branch Manager</option>
                <option value="customer">Customer</option>
              </select>
              {errors.userType && <p className="text-xs text-red-500">{errors.userType.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Initial Role"
              placeholder="e.g. pharmacist, cashier"
              required
              error={errors.role?.message}
              {...register('role')}
            />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tenant Workspace</label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                required
                {...register('tenantUuid')}
              >
                <option value="">Select Tenant</option>
                {tenantsData?.data.map((t) => (
                  <option key={t.uuid} value={t.uuid}>{t.name}</option>
                ))}
              </select>
              {errors.tenantUuid && <p className="text-xs text-red-500">{errors.tenantUuid.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Business</label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                required
                {...register('businessUuid')}
              >
                <option value="">Select Business</option>
                {businessesData?.data.map((b) => (
                  <option key={b.uuid} value={b.uuid}>{b.name}</option>
                ))}
              </select>
              {errors.businessUuid && <p className="text-xs text-red-500">{errors.businessUuid.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Branch</label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                required
                {...register('branchUuid')}
              >
                <option value="">Select Branch</option>
                {branchesData?.data.map((b) => (
                  <option key={b.uuid} value={b.uuid}>{b.name}</option>
                ))}
              </select>
              {errors.branchUuid && <p className="text-xs text-red-500">{errors.branchUuid.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base">
            <Button variant="ghost" type="button" onClick={() => { setCreateOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
