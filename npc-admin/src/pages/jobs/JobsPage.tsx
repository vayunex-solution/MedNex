import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Cpu } from 'lucide-react';

export default function JobsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-primary">Background Jobs</h1>
        <p className="text-sm text-secondary mt-0.5">Persistent job queue with DLQ and retry tracking</p>
      </div>
      <Card className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="p-5 rounded-full bg-violet-50 dark:bg-violet-950">
          <Cpu size={32} className="text-violet-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-primary">Job Queue Monitor</p>
          <p className="text-sm text-secondary max-w-sm mt-1">
            The backend job queue is operational. A management UI for viewing pending, running, failed, and dead jobs is available in Phase 5.1.
          </p>
        </div>
        <Badge>Coming in Phase 5.1</Badge>
      </Card>
    </div>
  );
}
