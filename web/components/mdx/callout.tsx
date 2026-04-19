import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export function Callout({ type = 'note', children }: { type?: 'note' | 'warn' | 'success'; children: React.ReactNode }) {
  const config = {
    note: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', icon: <Info className="h-4 w-4 text-blue-600" /> },
    warn: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', icon: <AlertTriangle className="h-4 w-4 text-amber-700" /> },
    success: { border: 'border-green-500/30', bg: 'bg-green-500/5', icon: <CheckCircle2 className="h-4 w-4 text-green-700" /> },
  }[type];
  return (
    <aside className={cn('my-6 rounded-md border p-4 flex gap-3', config.border, config.bg)}>
      <div className="shrink-0 mt-0.5">{config.icon}</div>
      <div className="text-sm [&>p]:my-0">{children}</div>
    </aside>
  );
}
