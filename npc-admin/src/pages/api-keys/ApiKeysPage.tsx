import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/feedback/Skeleton';
import { formatDateTime, timeAgo, getErrorMessage } from '@/lib/utils';
import { toast } from '@/stores/ui.store';
import type { ApiKey } from '@/types/auth.types';

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: authService.listApiKeys,
  });

  const createMut = useMutation({
    mutationFn: () => authService.createApiKey(newKeyName),
    onSuccess: (data) => {
      setCreatedKey(data.key ?? null);
      setNewKeyName('');
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const revokeMut = useMutation({
    mutationFn: (uuid: string) => authService.revokeApiKey(uuid),
    onSuccess: () => { toast.success('API key revoked'); qc.invalidateQueries({ queryKey: ['api-keys'] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    createMut.mutate();
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      toast.success('API key copied to clipboard');
    }
  };

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">API Keys</h1>
          <p className="text-sm text-secondary mt-0.5">Manage programmatic access credentials</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
          Create Key
        </Button>
      </div>

      {/* Keys list */}
      <div className="space-y-3">
        {!keys || keys.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-secondary">No API keys created yet.</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)} leftIcon={<Plus size={14} />}>
              Create your first key
            </Button>
          </Card>
        ) : (
          keys.map((key) => <KeyRow key={key.uuid} apiKey={key} onRevoke={() => revokeMut.mutate(key.uuid)} />)
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreatedKey(null); }}
        title={createdKey ? 'API Key Created' : 'Create API Key'}
        description={
          createdKey
            ? 'Copy and store this key now — it will not be shown again.'
            : 'Give your key a descriptive name to identify its purpose.'
        }
        footer={
          createdKey ? (
            <Button onClick={() => { setCreateOpen(false); setCreatedKey(null); }}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} loading={createMut.isPending} disabled={!newKeyName.trim()}>
                Create
              </Button>
            </>
          )
        }
      >
        {createdKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                ⚠ Store this key securely. You cannot retrieve it again.
              </span>
            </div>
            <div className="flex gap-2">
              <code className={`flex-1 rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-mono text-primary overflow-x-auto ${!showKey ? 'filter blur-sm select-none' : ''}`}>
                {createdKey}
              </code>
              <div className="flex flex-col gap-1.5">
                <Button size="xs" variant="ghost" onClick={() => setShowKey((s) => !s)}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
                <Button size="xs" variant="ghost" onClick={copyKey}>
                  <Copy size={14} />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <Input
            label="Key name"
            placeholder="e.g. Production Integration"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            required
          />
        )}
      </Modal>
    </div>
  );
}

function KeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: () => void }) {
  return (
    <Card className="flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-primary">{apiKey.name}</p>
        </div>
        <p className="text-xs font-mono text-secondary mt-0.5">
          {apiKey.keyPrefix}•••••••••••••••
        </p>
        <div className="flex gap-4 mt-1.5 text-xs text-secondary">
          <span>Created: {formatDateTime(apiKey.createdAt)}</span>
          {apiKey.lastUsedAt && <span>Last used: {timeAgo(apiKey.lastUsedAt)}</span>}
          {apiKey.expiresAt && (
            <span>
              Expires: {formatDateTime(apiKey.expiresAt)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date() ? (
          <Badge variant="status" status="deleted">Expired</Badge>
        ) : (
          <Badge variant="status" status="active" dot>Active</Badge>
        )}
        <Button size="xs" variant="danger" leftIcon={<Trash2 size={12} />} onClick={onRevoke}>
          Revoke
        </Button>
      </div>
    </Card>
  );
}
