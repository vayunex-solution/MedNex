import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  RefreshCw, Plus, ArrowLeft, Play, AlertTriangle
} from 'lucide-react';
import * as echarts from 'echarts';
import { toast } from '@/stores/ui.store';

interface ApiKey {
  uuid: string;
  name: string;
  environment: string;
  key: string;
  scopes: string[];
  status: string;
  expiresAt: string;
}

interface Webhook {
  uuid: string;
  url: string;
  environment: string;
  events: string[];
  status: string;
}

interface FeatureFlag {
  uuid: string;
  key: string;
  value: string;
  description: string;
}

interface Domain {
  uuid: string;
  domain: string;
  environment: string;
  status: string;
}

interface Application {
  uuid: string;
  name: string;
  displayName: string;
  slug: string;
  description: string;
  category: string;
  environment: string;
  productionUrl: string;
  sdkVersion: string;
  healthScore: number;
}

export default function ApplicationDetailsPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('keys');
  const [app, setApp] = useState<Application | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  // Operations/Provisioning States
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [provisionJobs, setProvisionJobs] = useState<any[]>([]);
  const [selectedTenantUuid, setSelectedTenantUuid] = useState('');
  const [selectedUserUuid, setSelectedUserUuid] = useState('');
  const [provisioning, setProvisioning] = useState(false);

  // New keys forms
  const [keyName, setKeyName] = useState('');
  const [keyEnv, setKeyEnv] = useState('production');
  const [newKeyDetails, setNewKeyDetails] = useState<{ key: string, secret: string } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnv, setWebhookEnv] = useState('production');
  const [domainName, setDomainName] = useState('');
  const [domainEnv, setDomainEnv] = useState('production');
  const [flagKey, setFlagKey] = useState('');
  const [flagVal, setFlagVal] = useState('false');

  const chartRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('npc_access_token') ?? ''}`,
  });

  // Fetch all details — live data only, no mock fallbacks
  const fetchDetails = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      const appRes = await fetch(`/api/v1/platform/applications/${uuid}`, { headers });
      if (appRes.ok) {
        const body = await appRes.json();
        setApp(body.data);
      } else {
        const body = await appRes.json().catch(() => ({}));
        toast.error(body?.message || `Application not found (${appRes.status})`);
        setApp(null);
      }

      const keysRes = await fetch(`/api/v1/platform/applications/${uuid}/api-keys`, { headers });
      setApiKeys(keysRes.ok ? (await keysRes.json()).data || [] : []);

      const whRes = await fetch(`/api/v1/platform/applications/${uuid}/webhooks`, { headers });
      setWebhooks(whRes.ok ? (await whRes.json()).data || [] : []);

      const flagsRes = await fetch(`/api/v1/platform/applications/${uuid}/feature-flags`, { headers });
      setFlags(flagsRes.ok ? (await flagsRes.json()).data || [] : []);

      const domainsRes = await fetch(`/api/v1/platform/applications/${uuid}/domains`, { headers });
      setDomains(domainsRes.ok ? (await domainsRes.json()).data || [] : []);

      // Telemetry logs
      const logsRes = await fetch(`/api/v1/platform/applications/${uuid}/logs`, { headers });
      setLogs(logsRes.ok ? (await logsRes.json()).data || [] : []);

      // Fetch tenants, users, and operations jobs
      const tenantsRes = await fetch('/api/v1/platform/tenants', { headers });
      if (tenantsRes.ok) {
        const tBody = await tenantsRes.json();
        setTenants(tBody.data?.rows || tBody.data || []);
      }

      const usersRes = await fetch('/api/v1/platform/users', { headers });
      if (usersRes.ok) {
        const uBody = await usersRes.json();
        setUsers(uBody.data?.rows || uBody.data || []);
      }

      const jobsRes = await fetch(`/api/v1/platform/applications/${uuid}/operations/jobs`, { headers });
      if (jobsRes.ok) {
        const jBody = await jobsRes.json();
        setProvisionJobs(jBody.data || []);
      }

    } catch {
      toast.error('Network error — could not reach the NPC backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [uuid]);

  // ECharts render logic for analytics
  useEffect(() => {
    if (activeTab === 'analytics' && chartRef.current && app) {
      const chart = echarts.init(chartRef.current);
      const option = {
        tooltip: { trigger: 'axis' },
        legend: { data: ['Requests Count', 'Error Rate'], bottom: 0 },
        grid: { left: '3%', right: '4%', top: '8%', containLabel: true },
        xAxis: {
          type: 'category',
          data: ['Jul 02', 'Jul 03', 'Jul 04', 'Jul 05', 'Jul 06', 'Jul 07', 'Jul 08']
        },
        yAxis: [
          { type: 'value', name: 'Requests' },
          { type: 'value', name: 'Errors (%)', max: 100 }
        ],
        series: [
          {
            name: 'Requests Count',
            type: 'bar',
            barWidth: '40%',
            data: [420, 510, 380, 620, 710, 850, 940],
            itemStyle: { color: '#6366f1' }
          },
          {
            name: 'Error Rate',
            type: 'line',
            yAxisIndex: 1,
            data: [1.2, 0.8, 2.5, 0.4, 1.1, 0.9, 0.5],
            itemStyle: { color: '#ef4444' },
            lineStyle: { width: 3 }
          }
        ]
      };
      chart.setOption(option);
      return () => { chart.dispose(); };
    }
  }, [activeTab, app]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;
    try {
      const res = await fetch(`/api/v1/platform/applications/${uuid}/api-keys`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: keyName, environment: keyEnv, scopes: ['user:read'] })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data && body.data.key) {
          setNewKeyDetails({ key: body.data.key, secret: body.data.secret });
        }
        toast.success('Generated new API Key successfully');
        setKeyName('');
        fetchDetails();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Failed to generate key');
      }
    } catch {
      toast.error('Network error — failed to generate key');
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl) return;
    try {
      const res = await fetch(`/api/v1/platform/applications/${uuid}/webhooks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url: webhookUrl, environment: webhookEnv, events: ['user.created'] })
      });
      if (res.ok) {
        toast.success('Registered Webhook successfully');
        setWebhookUrl('');
        fetchDetails();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Failed to register webhook');
      }
    } catch {
      toast.error('Network error — failed to register webhook');
    }
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName) return;
    try {
      const res = await fetch(`/api/v1/platform/applications/${uuid}/domains`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ domain: domainName, environment: domainEnv })
      });
      if (res.ok) {
        toast.success('Registered domain successfully. Pending verification.');
        setDomainName('');
        fetchDetails();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Failed to register domain');
      }
    } catch {
      toast.error('Network error — failed to register domain');
    }
  };

  const handleUpsertFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagKey) return;
    try {
      const res = await fetch(`/api/v1/platform/applications/${uuid}/feature-flags`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ key: flagKey, value: flagVal, description: 'User defined flag' })
      });
      if (res.ok) {
        toast.success('Feature Flag state synchronized');
        setFlagKey('');
        fetchDetails();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Failed to update flag');
      }
    } catch {
      toast.error('Network error — failed to update flag');
    }
  };

  // Ping verification test (APP-209)
  const handleVerify = async (type: string, itemUuid: string) => {
    try {
      const res = await fetch(`/api/v1/platform/applications/${uuid}/connections/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type, itemUuid })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data?.success) {
          toast.success(body.data?.message || 'Connection verified successfully');
        } else {
          toast.error(body.data?.message || 'Connection test failed');
        }
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Verification request failed');
      }
    } catch {
      toast.error('Network error — verification failed');
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const res = await fetch(`/api/v1/platform/applications/${uuid}/connections/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type: 'application', itemUuid: '' })
      });
      if (res.ok) {
        const body = await res.json();
        if (body.data?.success) {
          toast.success(body.data?.message || 'Connection verified successfully');
        } else {
          toast.error(body.data?.message || 'Connection test failed');
        }
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Verification request failed');
      }
    } catch {
      toast.error('Network error — verification failed');
    } finally {
      setTestingConnection(false);
    }
  };

  // Secret Rotation (APP-208)
  const handleRotate = async (type: string, itemUuid: string) => {
    if (!confirm('Are you sure you want to rotate this credential? Existing integrations using the old secret will fail.')) return;
    try {
      const res = await fetch(`/api/v1/platform/applications/${uuid}/secrets/rotate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type, itemUuid })
      });
      if (res.ok) {
        toast.success('Credentials rotated successfully. Make sure to update your clients.');
        fetchDetails();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Rotation failed');
      }
    } catch {
      toast.error('Network error — rotation failed');
    }
  };

  const handleProvisionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantUuid || !selectedUserUuid) {
      toast.error('Please select both a tenant and an owner user');
      return;
    }

    try {
      setProvisioning(true);
      const res = await fetch(`/api/v1/platform/applications/${uuid}/provision`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tenantUuid: selectedTenantUuid,
          ownerUserUuid: selectedUserUuid
        })
      });

      if (res.ok) {
        toast.success('Provisioning job successfully queued!');
        setSelectedTenantUuid('');
        setSelectedUserUuid('');
        fetchDetails();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Failed to queue provisioning job');
      }
    } catch {
      toast.error('Network error — failed to trigger provisioning');
    } finally {
      setProvisioning(false);
    }
  };

  const handleRetryJob = async (jobUuid: string) => {
    try {
      const res = await fetch(`/api/v1/platform/applications/operations/jobs/${jobUuid}/retry`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        toast.success('Job rescheduled for retry successfully!');
        fetchDetails();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Failed to reschedule job');
      }
    } catch {
      toast.error('Network error — failed to retry job');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-base bg-card">
        <AlertTriangle size={28} className="text-amber-500" />
        <p className="text-sm font-semibold text-primary">Application not found</p>
        <button onClick={() => navigate('/applications')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">← Back to Registry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb back */}
      <button 
        onClick={() => navigate('/applications')}
        className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
      >
        <ArrowLeft size={14} /> Back to Registry
      </button>

      {/* Header Panel */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-base bg-card p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">{app.displayName || app.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
              app.environment === 'production' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-slate-100 text-secondary'
            }`}>
              {app.environment}
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">{app.description}</p>
        </div>

        {/* Health Score & Test Connection Widget */}
        <div className="flex items-center gap-6 border-l border-base pl-6">
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className={`flex items-center gap-1.5 rounded-lg border border-base bg-card px-3 py-1.5 text-xs font-semibold text-primary hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
              testingConnection ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw size={14} className={testingConnection ? 'animate-spin' : ''} />
            {testingConnection ? 'Verifying...' : 'Test Connection'}
          </button>

          <div className="flex items-center gap-3 border-l border-base pl-6">
            <div className="text-right">
              <span className="text-[10px] font-bold text-secondary uppercase block">Health Score</span>
              <span className="text-2xl font-bold text-primary">{app.healthScore}%</span>
            </div>
            <div className={`h-3 w-3 rounded-full animate-pulse ${
              app.healthScore > 90 ? 'bg-emerald-500' : app.healthScore > 70 ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-base gap-6 text-sm font-semibold">
        <button 
          onClick={() => setActiveTab('keys')}
          className={`pb-3 border-b-2 transition-all ${activeTab === 'keys' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}
        >
          API Keys
        </button>
        <button 
          onClick={() => setActiveTab('provision')}
          className={`pb-3 border-b-2 transition-all ${activeTab === 'provision' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}
        >
          Tenant Provisioning
        </button>
        <button 
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 border-b-2 transition-all ${activeTab === 'webhooks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}
        >
          Webhooks
        </button>
        <button 
          onClick={() => setActiveTab('flags')}
          className={`pb-3 border-b-2 transition-all ${activeTab === 'flags' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}
        >
          Feature Flags
        </button>
        <button 
          onClick={() => setActiveTab('domains')}
          className={`pb-3 border-b-2 transition-all ${activeTab === 'domains' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}
        >
          Domains
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 border-b-2 transition-all ${activeTab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}
        >
          API Analytics
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`pb-3 border-b-2 transition-all ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}
        >
          Centralized Logs
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-4">
        {activeTab === 'keys' && (
          <div className="space-y-4">
            {newKeyDetails && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">⚠️ New API Key Generated</h4>
                  <button 
                    onClick={() => setNewKeyDetails(null)} 
                    className="text-xs text-secondary hover:text-primary"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-400">
                  Please copy this key and secret now. For security reasons, the secret will not be displayed again.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-secondary uppercase block font-sans">API Key</span>
                    <div className="flex items-center gap-2 rounded-lg border border-base bg-card px-3 py-1.5 font-mono text-xs text-primary">
                      <span className="select-all break-all flex-1">{newKeyDetails.key}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(newKeyDetails.key);
                          toast.success('API Key copied to clipboard!');
                        }}
                        className="text-[10px] text-indigo-600 font-semibold hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-secondary uppercase block font-sans">Client Secret</span>
                    <div className="flex items-center gap-2 rounded-lg border border-base bg-card px-3 py-1.5 font-mono text-xs text-primary">
                      <span className="select-all break-all flex-1">{newKeyDetails.secret}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(newKeyDetails.secret);
                          toast.success('Secret copied to clipboard!');
                        }}
                        className="text-[10px] text-indigo-600 font-semibold hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid gap-6 md:grid-cols-3">
            {/* Keys Table */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-primary">Connected API keys</h3>
              <div className="overflow-hidden rounded-xl border border-base bg-card">
                <table className="min-w-full divide-y divide-base">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-secondary uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Key Preview</th>
                      <th className="px-4 py-2.5">Env</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base text-xs text-secondary">
                    {apiKeys.map(k => (
                      <tr key={k.uuid}>
                        <td className="px-4 py-3 font-semibold text-primary">{k.name}</td>
                        <td className="px-4 py-3 font-mono">{k.key}</td>
                        <td className="px-4 py-3 capitalize">{k.environment}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            k.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {k.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button 
                            onClick={() => handleVerify('api-key', k.uuid)}
                            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600"
                            title="Verify connection"
                          >
                            <Play size={14} />
                          </button>
                          <button 
                            onClick={() => handleRotate('api-key', k.uuid)}
                            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600"
                            title="Rotate secret"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create Key Panel */}
            <div className="rounded-xl border border-base bg-card p-5 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Plus size={16} /> Generate API Key
              </h3>
              <form onSubmit={handleCreateKey} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Handshake key"
                    value={keyName}
                    onChange={e => setKeyName(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Environment</label>
                  <select
                    value={keyEnv}
                    onChange={e => setKeyEnv(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                    <option value="local">Local</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Generate Key Pair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'webhooks' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-primary font-bold">Registered Webhooks</h3>
              <div className="overflow-hidden rounded-xl border border-base bg-card">
                <table className="min-w-full divide-y divide-base">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-secondary uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-4 py-2.5">Endpoint URL</th>
                      <th className="px-4 py-2.5">Env</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base text-xs text-secondary">
                    {webhooks.map(w => (
                      <tr key={w.uuid}>
                        <td className="px-4 py-3 font-semibold text-primary truncate max-w-sm">{w.url}</td>
                        <td className="px-4 py-3 capitalize">{w.environment}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            w.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button 
                            onClick={() => handleVerify('webhook', w.uuid)}
                            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600"
                            title="Test ping payload"
                          >
                            <Play size={14} />
                          </button>
                          <button 
                            onClick={() => handleRotate('webhook', w.uuid)}
                            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600"
                            title="Rotate signing secret"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-base bg-card p-5 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Plus size={16} /> Add Webhook
              </h3>
              <form onSubmit={handleCreateWebhook} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Target Endpoint URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://client-api.com/webhooks"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Environment</label>
                  <select
                    value={webhookEnv}
                    onChange={e => setWebhookEnv(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                    <option value="local">Local</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Onboard Webhook
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'flags' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-primary">SaaS Feature Toggles</h3>
              <div className="overflow-hidden rounded-xl border border-base bg-card">
                <table className="min-w-full divide-y divide-base">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-secondary uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-4 py-2.5">Key</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base text-xs text-secondary">
                    {flags.map(f => (
                      <tr key={f.uuid}>
                        <td className="px-4 py-3 font-semibold text-primary font-mono">{f.key}</td>
                        <td className="px-4 py-3">{f.description}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            f.value === 'true' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-secondary'
                          }`}>
                            {f.value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-base bg-card p-5 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Plus size={16} /> Sync Flag State
              </h3>
              <form onSubmit={handleUpsertFlag} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Flag Key</label>
                  <input
                    type="text"
                    required
                    placeholder="enable_billing_v2"
                    value={flagKey}
                    onChange={e => setFlagKey(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">State Value</label>
                  <select
                    value={flagVal}
                    onChange={e => setFlagVal(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="true">True (Enabled)</option>
                    <option value="false">False (Disabled)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Save Flag Configuration
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-base font-bold text-primary">Registered Domains</h3>
              <div className="overflow-hidden rounded-xl border border-base bg-card">
                <table className="min-w-full divide-y divide-base">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-secondary uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-4 py-2.5">Domain</th>
                      <th className="px-4 py-2.5">Env</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base text-xs text-secondary">
                    {domains.map(d => (
                      <tr key={d.uuid}>
                        <td className="px-4 py-3 font-semibold text-primary">{d.domain}</td>
                        <td className="px-4 py-3 capitalize">{d.environment}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            d.status === 'verified' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-base bg-card p-5 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Plus size={16} /> Register Domain
              </h3>
              <form onSubmit={handleCreateDomain} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Domain Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. app.domain.com"
                    value={domainName}
                    onChange={e => setDomainName(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Environment</label>
                  <select
                    value={domainEnv}
                    onChange={e => setDomainEnv(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  Add Domain
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'provision' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-primary">Operation & Provisioning Jobs</h3>
                <button 
                  onClick={fetchDetails} 
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  <RefreshCw size={12} /> Refresh Queue
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-base bg-card">
                <table className="min-w-full divide-y divide-base">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-secondary uppercase tracking-wider text-left">
                    <tr>
                      <th className="px-4 py-2.5">Operation</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Retries</th>
                      <th className="px-4 py-2.5">Last Error</th>
                      <th className="px-4 py-2.5">Triggered At</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base text-xs text-secondary">
                    {provisionJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-secondary">
                          No operations triggered yet for this application.
                        </td>
                      </tr>
                    ) : (
                      provisionJobs.map((job: any) => (
                        <tr key={job.uuid}>
                          <td className="px-4 py-3 font-semibold text-primary capitalize">{job.operationType}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              job.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                              job.status === 'failed' || job.status === 'dead_letter' ? 'bg-rose-50 text-rose-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">{job.retryCount} / {job.maxRetries}</td>
                          <td className="px-4 py-3 break-all max-w-[200px]" title={job.lastError}>
                            {job.lastError || '-'}
                          </td>
                          <td className="px-4 py-3">{new Date(job.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            {(job.status === 'failed' || job.status === 'dead_letter') && (
                              <button
                                onClick={() => handleRetryJob(job.uuid)}
                                className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded font-bold hover:bg-indigo-100 transition-colors"
                              >
                                Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-base bg-card p-5 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Plus size={16} /> Trigger Provisioning
              </h3>
              <form onSubmit={handleProvisionTenant} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Select Tenant</label>
                  <select
                    required
                    value={selectedTenantUuid}
                    onChange={e => setSelectedTenantUuid(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenants.map((t: any) => (
                      <option key={t.uuid} value={t.uuid}>{t.name} ({t.slug})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary mb-1">Select Owner User</label>
                  <select
                    required
                    value={selectedUserUuid}
                    onChange={e => setSelectedUserUuid(e.target.value)}
                    className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs text-primary focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Choose Owner User --</option>
                    {users.map((u: any) => (
                      <option key={u.uuid} value={u.uuid}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {provisioning ? 'Queuing Job...' : 'Provision Tenant'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-primary">Live API Monitoring & Analytics</h3>
            <div className="rounded-xl border border-base bg-card p-5">
              <div ref={chartRef} className="h-80 w-full" />
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-primary">Centralized Application Audit Stream</h3>
            <div className="rounded-xl border border-base bg-card p-4 space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 text-xs text-secondary border-b border-base pb-3 last:border-b-0 last:pb-0">
                  <span className={`inline-flex items-center rounded px-1 text-[9px] font-bold uppercase ${
                    log.level === 'error' ? 'bg-red-50 text-red-700' : log.level === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {log.level}
                  </span>
                  <div className="flex-1">
                    <p className="text-primary font-medium">{log.message}</p>
                    <span className="text-[10px] text-secondary font-mono mt-0.5 block">{log.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
