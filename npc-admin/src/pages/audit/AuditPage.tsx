import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText } from 'lucide-react';

export default function AuditPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Audit Center</h1>
        <p className="text-sm text-secondary mt-0.5">Tamper-evident HMAC-SHA256 chained audit log</p>
      </div>
      <Card className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="p-5 rounded-full bg-primary-50 dark:bg-primary-950">
          <FileText size={32} className="text-primary-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-primary">Audit Center</p>
          <p className="text-sm text-secondary max-w-sm mt-1">
            Per-user audit trails are available in the User Detail page. Platform-wide audit log viewer coming in the next release.
          </p>
        </div>
        <Badge>Coming in Phase 5.1</Badge>
      </Card>
    </div>
  );
}
