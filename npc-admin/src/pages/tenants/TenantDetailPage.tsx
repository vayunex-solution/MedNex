import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Activity } from 'lucide-react';
import { tenantService } from '@/services/tenant.service';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/feedback/Skeleton';
import { formatDateTime, getErrorMessage } from '@/lib/utils';
import { toast } from '@/stores/ui.store';

export default function TenantDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', uuid],
    queryFn: () => tenantService.getTenant(uuid!),
    enabled: !!uuid,
  });

  const { data: health } = useQuery({
    queryKey: ['tenant-health', uuid],
    queryFn: () => tenantService.getTenantHealth(uuid!),
    enabled: !!uuid,
  });

  const activateMut = useMutation({
    mutationFn: () => tenantService.activateTenant(uuid!),
    onSuccess: () => { toast.success('Tenant activated'); qc.invalidateQueries({ queryKey: ['tenant', uuid] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const suspendMut = useMutation({
    mutationFn: () => tenantService.suspendTenant(uuid!),
    onSuccess: () => { toast.success('Tenant suspended'); qc.invalidateQueries({ queryKey: ['tenant', uuid] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const archiveMut = useMutation({
    mutationFn: () => tenantService.archiveTenant(uuid!),
    onSuccess: () => { toast.success('Tenant archived'); qc.invalidateQueries({ queryKey: ['tenant', uuid] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  if (!tenant) return (
    <div className="flex flex-col items-center gap-4 py-24">
      <p className="text-lg font-semibold text-primary">Tenant not found</p>
      <Button variant="ghost" onClick={() => navigate('/tenants')} leftIcon={<ArrowLeft size={14} />}>Back</Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/tenants')}>
        Back to Tenants
      </Button>

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-primary">{tenant.name}</h1>
              <Badge variant="status" status={tenant.status} dot>{tenant.status}</Badge>
            </div>
            <p className="text-sm text-secondary mt-1 font-mono">slug: {tenant.slug}</p>
            {tenant.domain && <p className="text-xs text-secondary mt-0.5">{tenant.domain}</p>}
          </div>
          <div className="flex gap-2">
            {tenant.status !== 'active' && (
              <Button size="sm" variant="outline" onClick={() => activateMut.mutate()} loading={activateMut.isPending}>
                Activate
              </Button>
            )}
            {tenant.status === 'active' && (
              <Button size="sm" variant="outline" onClick={() => suspendMut.mutate()} loading={suspendMut.isPending}>
                Suspend
              </Button>
            )}
            {tenant.status !== 'archived' && (
              <Button size="sm" variant="danger" onClick={() => archiveMut.mutate()} loading={archiveMut.isPending}>
                Archive
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details */}
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4">Tenant Details</h2>
          <div className="space-y-2.5 text-sm">
            {[
              { label: 'Email', value: tenant.email ?? '—' },
              { label: 'UUID', value: <span className="font-mono text-xs">{tenant.uuid}</span> },
              { label: 'Created', value: formatDateTime(tenant.createdAt) },
              { label: 'Updated', value: formatDateTime(tenant.updatedAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-secondary shrink-0">{label}</span>
                <span className="font-medium text-primary text-right">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Health */}
        {health && (
          <Card>
            <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <Activity size={14} /> Tenant Health
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Businesses', value: health.businessCount },
                { label: 'Branches', value: health.branchCount },
                { label: 'Total Users', value: health.userCount },
                { label: 'Active Users', value: health.activeUserCount },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{value}</p>
                  <p className="text-xs text-secondary mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {health.subscriptionStatus && (
              <div className="mt-4 pt-4 border-t border-base flex justify-between text-sm">
                <span className="text-secondary">Subscription</span>
                <Badge variant="status" status={health.subscriptionStatus} dot>
                  {health.subscriptionStatus}
                </Badge>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
