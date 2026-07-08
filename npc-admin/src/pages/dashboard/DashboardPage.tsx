import { useQuery } from '@tanstack/react-query';
import { Users, Globe, Building2, GitBranch, TrendingUp, Activity } from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { healthService } from '@/services/health.service';
import { StatCard, Card } from '@/components/ui/Card';
import { CardSkeleton } from '@/components/feedback/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils';
import ReactECharts from 'echarts-for-react';

export default function DashboardPage() {
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.getDashboard,
    refetchInterval: 30000,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthService.getHealth,
    refetchInterval: 15000,
  });

  const stats = [
    {
      title: 'Total Tenants',
      value: dashboard?.counts?.totalTenants ?? '—',
      subtitle: `${dashboard?.counts?.activeTenants ?? 0} active`,
      icon: <Globe size={20} className="text-indigo-600 dark:text-indigo-400" />,
      iconColor: 'bg-indigo-50 dark:bg-indigo-950',
    },
    {
      title: 'Total Users',
      value: dashboard?.counts?.totalUsers ?? '—',
      subtitle: `${dashboard?.counts?.activeSessions ?? 0} active`,
      icon: <Users size={20} className="text-emerald-600 dark:text-emerald-400" />,
      iconColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
    {
      title: 'Businesses',
      value: dashboard?.counts?.totalBusinesses ?? '—',
      subtitle: 'Registered',
      icon: <Building2 size={20} className="text-violet-600 dark:text-violet-400" />,
      iconColor: 'bg-violet-50 dark:bg-violet-950',
    },
    {
      title: 'Branches',
      value: dashboard?.counts?.totalBranches ?? '—',
      subtitle: 'Registered',
      icon: <GitBranch size={20} className="text-amber-600 dark:text-amber-400" />,
      iconColor: 'bg-amber-50 dark:bg-amber-950',
    },
  ];

  const chartOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 0, right: 0, top: 8, bottom: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: dashboard?.activity?.labels ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        data: dashboard?.activity?.data ?? [0, 0, 0, 0, 0, 0, 0],
        type: 'line',
        smooth: true,
        symbol: 'none',
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99,102,241,0.35)' },
              { offset: 1, color: 'rgba(99,102,241,0.02)' },
            ],
          },
        },
        lineStyle: { color: '#6366f1', width: 2.5 },
      },
    ],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
          <p className="text-sm text-secondary mt-0.5">Platform overview and key metrics</p>
        </div>
        {health && (
          <div className="flex items-center gap-2 rounded-full border border-base bg-card px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${health.status === 'UP' ? 'bg-emerald-500 animate-pulse-slow' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-secondary">System {health.status}</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {dashLoading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : stats.map((s) => (
              <StatCard
                key={s.title}
                title={s.title}
                value={s.value}
                subtitle={s.subtitle}
                icon={s.icon}
                iconColor={s.iconColor}
              />
            ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Activity chart */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-primary">Platform Activity</h2>
              <p className="text-xs text-secondary">User operations this week</p>
            </div>
            <TrendingUp size={18} className="text-secondary" />
          </div>
          <ReactECharts option={chartOption} style={{ height: 220 }} />
        </Card>

        {/* Health widget */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-primary">System Health</h2>
            <Activity size={18} className="text-secondary" />
          </div>
          {health ? (
            <div className="space-y-3">
              {health.checks && Object.entries(health.checks).map(([key, check]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-secondary capitalize">{key}</span>
                  <Badge variant="status" status={check.status} dot>
                    {check.status}
                  </Badge>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-base space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Cache hit rate</span>
                  <span className="font-medium text-primary">
                    {health.metrics?.cache?.hitRate != null
                      ? `${(health.metrics.cache.hitRate * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-secondary">Uptime</span>
                  <span className="font-medium text-primary">
                    {health.uptime ? `${Math.floor(health.uptime / 60)}m` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      {(() => {
        const activities = dashboard?.recentActivity
          ? [
              ...(dashboard.recentActivity.platform ?? []),
              ...(dashboard.recentActivity.tenant ?? []),
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          : [];

        if (activities.length === 0) return null;

        return (
          <Card>
            <h2 className="text-base font-semibold text-primary mb-4">Recent Audit Activity</h2>
            <div className="space-y-2">
              {activities.slice(0, 8).map((log, i) => (
                <div
                  key={log.id ?? i}
                  className="flex items-start gap-3 py-2 border-b border-base last:border-0"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary truncate">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-secondary"> · {log.module}</span>
                    </p>
                    <p className="text-xs text-secondary">{log.details}</p>
                  </div>
                  <span className="text-xs text-muted-color shrink-0">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
