import { Layers } from 'lucide-react';

export function WorkspaceSwitcher() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-base bg-card px-3 py-1.5">
      <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      <div className="flex flex-col items-start text-left">
        <span className="text-xs font-semibold text-primary leading-none">Platform Core</span>
        <span className="text-[9px] text-secondary leading-none mt-0.5">NPC Control Plane</span>
      </div>
    </div>
  );
}
