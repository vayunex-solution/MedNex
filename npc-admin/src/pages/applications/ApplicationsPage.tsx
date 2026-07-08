import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Layers, Globe, Radio, CheckCircle, AlertTriangle, 
  ArrowRight, Download, Terminal, Settings2, Code, ShieldCheck, 
  Compass, Laptop, Cpu, BookOpen, ExternalLink
} from 'lucide-react';
import { toast } from '@/stores/ui.store';

interface Application {
  uuid: string;
  name: string;
  displayName: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  environment: string;
  productionUrl: string;
  sdkVersion: string;
  healthScore: number;
}

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  // Form state
  const [newApp, setNewApp] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'SaaS Suite',
    environment: 'production',
    productionUrl: '',
    manifest: JSON.stringify({
      version: '1.0.0',
      capabilities: ['auth', 'billing', 'webhooks'],
      dependencies: [],
      requiredScopes: ['user:read', 'tenant:read']
    }, null, 2)
  });

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('npc_access_token') ?? ''}`,
  });

  // Fetch applications — live data only, no fallbacks
  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/platform/applications', { headers: getAuthHeaders() });
      if (res.ok) {
        const body = await res.json();
        setApps(body.data || []);
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || `Failed to load applications (${res.status})`);
        setApps([]);
      }
    } catch {
      toast.error('Network error — could not reach the NPC backend.');
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/platform/applications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newApp.name,
          slug: newApp.slug || newApp.name.toLowerCase().replace(/\s+/g, '-'),
          description: newApp.description,
          category: newApp.category,
          environment: newApp.environment,
          productionUrl: newApp.productionUrl,
          manifest: newApp.manifest,
        })
      });

      if (res.ok) {
        toast.success('SaaS Application registered successfully!');
        setIsWizardOpen(false);
        setWizardStep(1);
        fetchApps();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message || 'Failed to register application');
      }
    } catch {
      toast.error('Network error — check server logs.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Application Registry</h1>
          <p className="text-sm text-secondary">
            Onboard, configure, secure, and monitor every SaaS product connected to the Nex Core Control Plane.
          </p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 dark:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/20"
        >
          <Plus size={16} />
          Register Application
        </button>
      </div>

      {/* Connection Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-base bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950 p-2.5 text-indigo-600 dark:text-indigo-400">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">Connected Products</p>
              <h3 className="text-xl font-bold text-primary">{apps.length}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-base bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-2.5 text-emerald-600 dark:text-emerald-400">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">Online Nodes</p>
              <h3 className="text-xl font-bold text-primary">
                {apps.filter(a => a.healthScore > 50).length}
              </h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-base bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-50 dark:bg-violet-950 p-2.5 text-violet-600 dark:text-violet-400">
              <Cpu size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">SDK Versions</p>
              <h3 className="text-xl font-bold text-primary">v1.2 Active</h3>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-base bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-2.5 text-amber-600 dark:text-amber-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary">Control Status</p>
              <h3 className="text-xl font-bold text-primary">Encrypted</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Apps List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Compass size={18} /> Registered SaaS Applications
          </h2>

          {loading ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-base bg-card">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : apps.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-base bg-card p-6 text-center">
              <Layers className="h-8 w-8 text-secondary mb-2" />
              <p className="text-sm font-semibold text-primary">No SaaS applications found</p>
              <p className="text-xs text-secondary mt-1">Register a product using the Wizard to start.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {apps.map((app) => (
                <div
                  key={app.uuid}
                  onClick={() => navigate(`/applications/${app.uuid}`)}
                  className="group relative rounded-xl border border-base bg-card p-5 hover:border-indigo-500/50 hover:shadow-panel transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-secondary">
                        {app.category}
                      </span>
                      <h3 className="text-base font-bold text-primary mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-xs text-secondary mt-1 line-clamp-2 h-8">{app.description}</p>
                    </div>

                    {/* Health score badge */}
                    <div className="flex flex-col items-end">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        app.healthScore > 90 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                        app.healthScore > 70 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                        'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                        {app.healthScore}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-base pt-3 text-[11px] text-secondary">
                    <span className="flex items-center gap-1 font-mono">
                      <Terminal size={12} /> SDK v{app.sdkVersion || '1.0.0'}
                    </span>
                    <span className="flex items-center gap-1 capitalize font-semibold">
                      <Globe size={12} /> {app.environment}
                    </span>
                  </div>

                  <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={14} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SDK Download & Resources Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <Download size={18} /> SDK Download Center
          </h2>

          <div className="rounded-xl border border-base bg-card p-5 space-y-4 shadow-sm">
            <p className="text-xs text-secondary">
              Connect external SaaS engines using preconfigured Client SDK bundles supporting full JWT handshake and heartbeat syncing.
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold hover:border-slate-400 transition-all cursor-pointer">
                <span className="flex items-center gap-2 text-primary">
                  <Terminal size={14} className="text-indigo-500" /> Node.js Client SDK
                </span>
                <span className="text-[10px] text-secondary font-mono">v1.2.4</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold hover:border-slate-400 transition-all cursor-pointer">
                <span className="flex items-center gap-2 text-primary">
                  <Code size={14} className="text-emerald-500" /> PHP Laravel Integration
                </span>
                <span className="text-[10px] text-secondary font-mono">v1.0.2</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold hover:border-slate-400 transition-all cursor-pointer">
                <span className="flex items-center gap-2 text-primary">
                  <Laptop size={14} className="text-amber-500" /> Python FastAPI SDK
                </span>
                <span className="text-[10px] text-secondary font-mono">v0.9.1</span>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <div className="space-y-2 text-xs text-secondary">
              <span className="font-bold text-primary block">Useful Resources</span>
              <a href="#" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                <BookOpen size={12} /> Read Integration Guides <ExternalLink size={10} />
              </a>
              <a href="#" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                <Settings2 size={12} /> OpenAPI Specification <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Installation Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-base bg-card p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-base pb-3">
              <h3 className="text-lg font-bold text-primary">SaaS Installation Wizard</h3>
              <button 
                onClick={() => { setIsWizardOpen(false); setWizardStep(1); }}
                className="text-secondary hover:text-primary text-sm font-medium"
              >
                Cancel
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between my-4 text-xs">
              <div className={`pb-1 border-b-2 font-semibold ${wizardStep >= 1 ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}>
                1. Registry Details
              </div>
              <div className={`pb-1 border-b-2 font-semibold ${wizardStep >= 2 ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}>
                2. Manifest Setup
              </div>
              <div className={`pb-1 border-b-2 font-semibold ${wizardStep >= 3 ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-secondary'}`}>
                3. Summary & Confirm
              </div>
            </div>

            <form onSubmit={handleInstall} className="space-y-4">
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Application Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HotelNex"
                      value={newApp.name}
                      onChange={e => setNewApp({ ...newApp, name: e.target.value })}
                      className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Slug / Identifier</label>
                    <input
                      type="text"
                      placeholder="e.g. hotelnex"
                      value={newApp.slug}
                      onChange={e => setNewApp({ ...newApp, slug: e.target.value })}
                      className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Description</label>
                    <textarea
                      placeholder="Enter SaaS product summary..."
                      value={newApp.description}
                      onChange={e => setNewApp({ ...newApp, description: e.target.value })}
                      className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none h-16"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Category</label>
                      <select
                        value={newApp.category}
                        onChange={e => setNewApp({ ...newApp, category: e.target.value })}
                        className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none"
                      >
                        <option>SaaS Suite</option>
                        <option>Healthcare</option>
                        <option>Hospitality</option>
                        <option>Fintech</option>
                        <option>Utilities</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-secondary mb-1">Active Environment</label>
                      <select
                        value={newApp.environment}
                        onChange={e => setNewApp({ ...newApp, environment: e.target.value })}
                        className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="production">Production</option>
                        <option value="staging">Staging</option>
                        <option value="development">Development</option>
                        <option value="local">Local</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1">Production URL</label>
                    <input
                      type="url"
                      placeholder="https://app.domain.com"
                      value={newApp.productionUrl}
                      onChange={e => setNewApp({ ...newApp, productionUrl: e.target.value })}
                      className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-secondary">Application Manifest Configuration (JSON)</label>
                      <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5">
                        <AlertTriangle size={10} /> Scopes validation enforced
                      </span>
                    </div>
                    <textarea
                      value={newApp.manifest}
                      onChange={e => setNewApp({ ...newApp, manifest: e.target.value })}
                      className="w-full rounded-lg border border-base bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-mono text-primary focus:border-indigo-500 focus:outline-none h-48"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="rounded-xl border border-base bg-slate-50 dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle size={16} /> Summary of registry configuration ready
                  </div>
                  <div className="space-y-1 text-xs text-secondary">
                    <p><strong className="text-primary">Name:</strong> {newApp.name}</p>
                    <p><strong className="text-primary">Slug:</strong> {newApp.slug || newApp.name.toLowerCase().replace(/\s+/g, '-')}</p>
                    <p><strong className="text-primary">Category:</strong> {newApp.category}</p>
                    <p><strong className="text-primary">URL:</strong> {newApp.productionUrl || 'None specified'}</p>
                    <p><strong className="text-primary">Environment:</strong> <span className="capitalize">{newApp.environment}</span></p>
                  </div>
                </div>
              )}

              <div className="flex justify-between border-t border-base pt-3 mt-4">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(s => s - 1)}
                    className="rounded-lg border border-base bg-card hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-1.5 text-xs text-primary"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1 && !newApp.name) {
                        toast.error('Please enter application name');
                        return;
                      }
                      setWizardStep(s => s + 1);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Next <ArrowRight size={12} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    Confirm & Onboard
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
