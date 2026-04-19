import { AlertTriangle } from 'lucide-react';

export function StubBanner({ target, lead }: { target: string; lead?: string }) {
  return (
    <aside className="my-6 rounded-md border-2 border-amber-500/50 bg-amber-500/10 p-4 flex gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="text-sm">
        <strong className="block mb-1">Coming in Waypoint {target}</strong>
        This page isn&apos;t blank — it&apos;s a scoped placeholder so you know what&apos;s intended.
        {lead && <> Owner: <code>{lead}</code>.</>}
      </div>
    </aside>
  );
}
