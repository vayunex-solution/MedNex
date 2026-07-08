import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { tenantService } from '@/services/tenant.service';
import { DataTable } from '@/components/data/DataTable';
import { Pagination } from '@/components/data/Pagination';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import { toast } from '@/stores/ui.store';
import type { Tenant, CreateTenantDto } from '@/types/platform.types';

const schema = z.object({
  tenantName: z.string().min(2, 'Tenant name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  ownerEmail: z.string().email('Invalid email address'),
  ownerPassword: z.string().min(6, 'Password must be at least 6 characters'),
  timezone: z.string().default('UTC'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('USD'),
  locale: z.string().default('en-US'),
});

type FormValues = z.infer<typeof schema>;

export default function TenantsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      locale: 'en-US',
    },
  });

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as unknown as { _t: ReturnType<typeof setTimeout> })._t);
    (window as unknown as { _t: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', page, debouncedSearch],
    queryFn: () => tenantService.listTenants({ page, limit: 20, search: debouncedSearch }),
  });

  const suspendMut = useMutation({
    mutationFn: (uuid: string) => tenantService.suspendTenant(uuid),
    onSuccess: () => { toast.success('Tenant suspended'); qc.invalidateQueries({ queryKey: ['tenants'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const activateMut = useMutation({
    mutationFn: (uuid: string) => tenantService.activateTenant(uuid),
    onSuccess: () => { toast.success('Tenant activated'); qc.invalidateQueries({ queryKey: ['tenants'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createMut = useMutation({
    mutationFn: (dto: CreateTenantDto) => tenantService.createTenant(dto),
    onSuccess: () => {
      toast.success('Tenant created successfully');
      qc.invalidateQueries({ queryKey: ['tenants'] });
      setCreateOpen(false);
      reset();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const tenants = data?.data ?? [];
  const meta = data?.meta;

  const columns: ColumnDef<Tenant, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Tenant',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-semibold text-primary">{row.original.name}</p>
          <p className="text-xs text-secondary font-mono">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ getValue }) => <span className="text-sm text-secondary">{(getValue() as string) ?? '—'}</span>,
    },
    {
      accessorKey: 'domain',
      header: 'Domain',
      cell: ({ getValue }) => (
        <span className="text-xs font-mono text-secondary">{(getValue() as string) ?? '—'}</span>
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
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-xs text-secondary">{formatDateTime(getValue() as string)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          {row.original.status !== 'active' ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => activateMut.mutate(row.original.uuid)}
              loading={activateMut.isPending}
            >
              Activate
            </Button>
          ) : (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => suspendMut.mutate(row.original.uuid)}
              loading={suspendMut.isPending}
            >
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Tenants</h1>
          <p className="text-sm text-secondary mt-0.5">{meta?.total ?? 0} registered tenants</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>New Tenant</Button>
      </div>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-base">
          <div className="max-w-sm">
            <Input
              placeholder="Search tenants…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              leftAddon={<Search size={14} />}
            />
          </div>
        </div>
        <div className="p-4">
          <DataTable
            data={tenants}
            columns={columns}
            loading={isLoading}
            onRowClick={(row) => navigate(`/tenants/${row.uuid}`)}
            emptyMessage="No tenants found."
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

      {/* Create Tenant Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); reset(); }}
        title="New Tenant Provisioning"
        description="Provision a new tenant and configure the primary super admin owner account."
        size="lg"
      >
        <form onSubmit={handleSubmit((v) => createMut.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tenant Name"
              placeholder="e.g. Acme Corp"
              required
              error={errors.tenantName?.message}
              {...register('tenantName')}
            />
            <Input
              label="Slug"
              placeholder="e.g. acme-corp"
              required
              error={errors.slug?.message}
              {...register('slug')}
            />
          </div>

          <div className="border-t border-base my-3 pt-3">
            <h3 className="text-sm font-semibold text-primary mb-2">Owner Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Owner Name"
                placeholder="John Doe"
                required
                error={errors.ownerName?.message}
                {...register('ownerName')}
              />
              <Input
                label="Owner Email"
                placeholder="owner@acme.com"
                type="email"
                required
                error={errors.ownerEmail?.message}
                {...register('ownerEmail')}
              />
            </div>
            <div className="mt-4">
              <Input
                label="Owner Password"
                placeholder="••••••••"
                type="password"
                required
                error={errors.ownerPassword?.message}
                {...register('ownerPassword')}
              />
            </div>
          </div>

          <div className="border-t border-base my-3 pt-3">
            <h3 className="text-sm font-semibold text-primary mb-2">Localization Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Timezone"
                placeholder="Asia/Kolkata"
                required
                error={errors.timezone?.message}
                {...register('timezone')}
              />
              <Input
                label="Currency"
                placeholder="INR"
                required
                error={errors.currency?.message}
                {...register('currency')}
              />
              <Input
                label="Locale"
                placeholder="en-US"
                required
                error={errors.locale?.message}
                {...register('locale')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base">
            <Button variant="ghost" type="button" onClick={() => { setCreateOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={createMut.isPending}>
              Provision Tenant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
