import Link from 'next/link';
import path from 'node:path';
import { loadAllPhases } from '@/lib/content-loaders/phases';
import { PhaseBadge } from '@/components/mdx/phase-badge';

export async function PhaseSidebar({ currentPhase }: { currentPhase: string }) {
  const phases = await loadAllPhases(path.resolve(process.cwd(), '../content/phases'));
  return (
    <aside className="w-64 shrink-0 border-r h-full pr-4 py-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Phases</div>
      <nav className="space-y-1">
        {phases.map((p) => (
          <Link
            key={p.phase}
            href={`/phase/${p.phase}`}
            className={`block px-2 py-1.5 rounded text-sm hover:bg-muted ${p.phase === currentPhase ? 'bg-muted font-medium' : ''}`}
          >
            <span className="text-muted-foreground mr-2 font-mono">{p.phase}</span>
            {p.name}
            {p.status === 'coming-soon' && <span className="ml-2"><PhaseBadge status="coming-soon" /></span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
