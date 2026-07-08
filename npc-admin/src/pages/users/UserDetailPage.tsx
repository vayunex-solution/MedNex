import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserCheck, UserX, Smartphone, Shield, FileText, RotateCcw } from 'lucide-react';
import { userService } from '@/services/user.service';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/feedback/Skeleton';
import { formatDateTime, timeAgo, getErrorMessage } from '@/lib/utils';
import { toast } from '@/stores/ui.store';

export default function UserDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', uuid],
    queryFn: () => userService.getUserByUuid(uuid!),
    enabled: !!uuid,
  });

  const { data: devices } = useQuery({
    queryKey: ['user-devices', uuid],
    queryFn: () => userService.getUserDevices(uuid!),
    enabled: !!uuid,
  });

  const { data: audits } = useQuery({
    queryKey: ['user-audits', uuid],
    queryFn: () => userService.getUserAudits(uuid!),
    enabled: !!uuid,
  });

  const activateMut = useMutation({
    mutationFn: () => userService.activateUser(uuid!),
    onSuccess: () => { toast.success('User activated'); qc.invalidateQueries({ queryKey: ['user', uuid] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const suspendMut = useMutation({
    mutationFn: () => userService.suspendUser(uuid!),
    onSuccess: () => { toast.success('User suspended'); qc.invalidateQueries({ queryKey: ['user', uuid] }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const forceResetMut = useMutation({
    mutationFn: () => userService.forcePasswordReset(uuid!),
    onSuccess: () => toast.success('Password reset forced — user must change on next login'),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-lg font-semibold text-primary">User not found</p>
        <Button variant="ghost" onClick={() => navigate('/users')} leftIcon={<ArrowLeft size={14} />}>
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Back */}
      <Button variant="ghost" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/users')}>
        Back to Users
      </Button>

      {/* Profile header */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <Avatar name={user.name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-primary">{user.name}</h1>
              <Badge variant="status" status={user.status} dot>{user.status}</Badge>
            </div>
            <p className="text-sm text-secondary mt-1">{user.email}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-secondary">
              <span>Role: <span className="font-medium text-primary">{user.role}</span></span>
              <span>Type: <span className="font-medium text-primary">{user.userType}</span></span>
              <span>Last login: <span className="font-medium text-primary">{timeAgo(user.lastLoginAt)}</span></span>
              <span>Version: <span className="font-medium text-primary">v{user.version}</span></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {user.status !== 'active' && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<UserCheck size={14} />}
                onClick={() => activateMut.mutate()}
                loading={activateMut.isPending}
              >
                Activate
              </Button>
            )}
            {user.status === 'active' && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<UserX size={14} />}
                onClick={() => suspendMut.mutate()}
                loading={suspendMut.isPending}
              >
                Suspend
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => forceResetMut.mutate()}
              loading={forceResetMut.isPending}
            >
              Force Reset
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Status */}
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <Shield size={15} /> Verification & Security
          </h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Email Verified', value: user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt) : null },
              { label: 'Phone Verified', value: user.phoneVerifiedAt ? formatDateTime(user.phoneVerifiedAt) : null },
              { label: 'MFA Enabled', value: user.isMfaEnabled ? 'Yes' : 'No' },
              { label: 'Failed Attempts', value: String(user.failedAttempts) },
              { label: 'Password Changed', value: user.passwordChangedAt ? formatDateTime(user.passwordChangedAt) : '—' },
              { label: 'Last Login IP', value: user.lastLoginIp ?? '—' },
              { label: 'Created', value: formatDateTime(user.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-secondary">{label}</span>
                <span className="font-medium text-primary">
                  {value === null ? <Badge variant="status" status="inactive">Not verified</Badge> : value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Devices */}
        <Card>
          <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <Smartphone size={15} /> Active Devices
          </h2>
          {!devices || devices.length === 0 ? (
            <p className="text-sm text-secondary">No registered devices</p>
          ) : (
            <div className="space-y-3">
              {devices.map((d) => (
                <div key={d.uuid} className="flex items-start justify-between gap-2 py-2 border-b border-base last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">{d.deviceName}</p>
                    <p className="text-xs text-secondary">{d.browser} · {d.os}</p>
                    <p className="text-xs text-secondary">{d.ipAddress} · {timeAgo(d.lastActiveAt)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => userService.deleteUserDevice(uuid!, d.uuid).then(() => {
                      toast.success('Device removed');
                      qc.invalidateQueries({ queryKey: ['user-devices', uuid] });
                    })}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Audit trail */}
      <Card>
        <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <FileText size={15} /> Audit Trail
        </h2>
        {!audits || (audits as unknown[]).length === 0 ? (
          <p className="text-sm text-secondary">No audit logs found</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(audits as Record<string, unknown>[]).map((log, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-base last:border-0">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{String(log.action)}</p>
                  <p className="text-xs text-secondary">{String(log.details)}</p>
                </div>
                <span className="text-xs text-secondary shrink-0">{formatDateTime(String(log.createdAt))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
