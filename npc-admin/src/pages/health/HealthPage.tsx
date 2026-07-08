import { useQuery } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Database, HardDrive, Cpu, Activity } from 'lucide-react';
import { healthService } from '@/services/health.service';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/feedback/Skeleton';
import { formatDateTime } from '@/lib/utils';

function CheckIcon({ status }: { status: string }) {
  if (status === 'UP') return <CheckCircle size={16} className="text-emerald-500" />;
  if (status === 'DOWN') return <XCircle size={16} className="text-red-500" />;
  return <AlertTriangle size={16} className="text-amber-500" />;
}

export default function HealthPage() {
  const { data: health, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.getHealth,
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  if (!health) return (
    <div className="py-24 text-center">
      <p className="text-lg font-semibold text-red-600">Cannot reach health endpoint</p>
      <Button className="mt-4" variant="outline" onClick={() => refetch()}>Retry</Button>
    </div>
  );

  const cacheHitRate = health.metrics?.cache?.hitRate;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">System Health</h1>
          <p className="text-sm text-secondary mt-0.5">
            Last checked: {dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt)) : '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-base bg-card px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${health.status === 'UP' ? 'bg-emerald-500 animate-pulse-slow' : health.status === 'DEGRADED' ? 'bg-amber-500' : 'bg-red-500'}`} />
            <span className="text-sm font-semibold text-primary">Overall: {health.status}</span>
          </div>
          <Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Checks grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Object.entries(health.checks).map(([key, check]) => {
          const c = check as Record<string, unknown>;
          return (
            <Card key={key} hover className="flex items-center gap-4">
              <div className="shrink-0"><CheckIcon status={check.status} /></div>
              <div>
                <p className="text-sm font-semibold text-primary capitalize">{key}</p>
                <Badge variant="status" status={check.status}>{check.status}</Badge>
                {typeof c.latencyMs === 'number' && (
                  <p className="text-xs text-secondary mt-0.5">{c.latencyMs}ms</p>
                )}
                {typeof c.error === 'string' && (
                  <p className="text-xs text-red-500 mt-0.5 truncate max-w-48">{c.error}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>


      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cache */}
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <Database size={14} /> Cache Metrics
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">Hit Rate</span>
              <span className="font-semibold text-primary">
                {cacheHitRate != null ? `${(cacheHitRate * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Cache Hits</span>
              <span className="font-semibold text-primary">{health.metrics?.cache?.hits ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Cache Misses</span>
              <span className="font-semibold text-primary">{health.metrics?.cache?.misses ?? '—'}</span>
            </div>
            {cacheHitRate != null && (
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-primary-500 transition-all"
                  style={{ width: `${Math.min(100, cacheHitRate * 100)}%` }}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Queue */}
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <Cpu size={14} /> Job Queue
          </h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Completed', value: health.metrics?.queue?.completed, color: 'text-emerald-500' },
              { label: 'Failed', value: health.metrics?.queue?.failed, color: 'text-amber-500' },
              { label: 'Dead (DLQ)', value: health.metrics?.queue?.dead, color: 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between">
                <span className="text-secondary">{label}</span>
                <span className={`font-semibold ${color}`}>{value ?? '—'}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Memory */}
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <HardDrive size={14} /> Memory
          </h2>
          <div className="space-y-3 text-sm">
            {(() => {
              const mem = health.checks?.memory as Record<string, unknown> | undefined;
              return [
                { label: 'Heap Used', value: mem?.heapUsedMb != null ? `${mem.heapUsedMb} MB` : null },
                { label: 'Heap Total', value: mem?.heapTotalMb != null ? `${mem.heapTotalMb} MB` : null },
                { label: 'RSS', value: mem?.rssMb != null ? `${mem.rssMb} MB` : null },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-secondary">{label}</span>
                  <span className="font-semibold text-primary">{value ?? '—'}</span>
                </div>
              ));
            })()}

            <div className="flex justify-between">
              <span className="text-secondary">Uptime</span>
              <span className="font-semibold text-primary">
                {health.uptime ? `${Math.floor(health.uptime / 60)}m ${health.uptime % 60}s` : '—'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Environment */}
      <Card>
        <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <Activity size={14} /> Platform Info
        </h2>
        <div className="flex flex-wrap gap-6 text-sm">
          <div><span className="text-secondary">Version: </span><span className="font-mono font-medium text-primary">{health.version ?? '—'}</span></div>
          <div><span className="text-secondary">Environment: </span><Badge>{health.environment ?? '—'}</Badge></div>
          <div><span className="text-secondary">Timestamp: </span><span className="text-primary">{formatDateTime(health.timestamp)}</span></div>
        </div>
      </Card>
    </div>
  );
}
