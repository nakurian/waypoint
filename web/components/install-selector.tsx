'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CopyButton } from '@/components/copy-button';
import { buildInstallCommand, buildCloneInstallCommand, type Role, type IDE } from '@/lib/install-command';

interface PackMeta { name: string; description?: string; vertical: string; }

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: 'developer', label: 'Developer' },
  { value: 'analyst',   label: 'Analyst' },
  { value: 'manager',   label: 'Manager' },
  { value: 'qa',        label: 'QA' },
];

// IDE uses a native <select> (not Radix) so that <option aria-disabled>
// is always present in the DOM for testability — Radix Select portals
// items behind the trigger, which is flaky in jsdom. Visual presentation
// is adequate for a small fixed list; Claude is the only available option.
const IDE_OPTIONS: Array<{ value: IDE; label: string; available: boolean }> = [
  { value: 'claude',  label: 'Claude Code',     available: true },
  { value: 'copilot', label: 'GitHub Copilot',  available: false },
  { value: 'cursor',  label: 'Cursor',          available: false },
];

export function InstallSelector({ availablePacks }: { availablePacks: PackMeta[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [role, setRole] = useState<Role>((params.get('role') as Role) || 'developer');
  const [ide, setIde]   = useState<IDE>((params.get('ide') as IDE) || 'claude');
  const [packs, setPacks] = useState<string[]>(
    (params.get('pack')?.split(',').filter(Boolean)) || ([availablePacks[0]?.name].filter(Boolean) as string[]),
  );

  useEffect(() => {
    const p = new URLSearchParams();
    p.set('role', role);
    p.set('ide', ide);
    p.set('pack', packs.join(','));
    router.replace(`/install?${p.toString()}`, { scroll: false });
  }, [role, ide, packs, router]);

  const togglePack = useCallback((name: string) => {
    setPacks((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  }, []);

  const npmCommand = packs.length > 0
    ? buildInstallCommand({ role, ide, packs })
    : '# pick at least one pack';

  // Clone path only wraps the Claude installer for now (Copilot/Cursor land in Plan 3).
  // When the user has selected a non-claude IDE, hide the clone block entirely
  // rather than crashing on the builder's throw.
  const cloneCommand = ide === 'claude' && packs.length > 0
    ? buildCloneInstallCommand({ role, ide, packs })
    : null;

  return (
    <div className="grid gap-6">
      <div className="grid md:grid-cols-3 gap-4">
        {/* Role */}
        <div>
          <label className="text-sm font-medium mb-2 block" htmlFor="role-select">Role</label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger id="role-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* IDE — native <select> for accessibility + testability */}
        <div>
          <label className="text-sm font-medium mb-2 block" htmlFor="ide-select">IDE</label>
          <select
            id="ide-select"
            aria-label="IDE"
            className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={ide}
            onChange={(e) => {
              const next = e.target.value as IDE;
              const opt = IDE_OPTIONS.find((o) => o.value === next);
              if (opt && opt.available) setIde(next);
            }}
          >
            {IDE_OPTIONS.map((o) => (
              <option
                key={o.value}
                value={o.value}
                disabled={!o.available}
                aria-disabled={!o.available}
              >
                {o.label}{!o.available ? ' (Plan 3)' : ''}
              </option>
            ))}
          </select>
        </div>
        {/* Packs */}
        <div>
          <label className="text-sm font-medium mb-2 block">Packs</label>
          <div className="border rounded-md p-2 space-y-1">
            {availablePacks.map((p) => (
              <label key={p.name} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  role="checkbox"
                  aria-label={p.name}
                  checked={packs.includes(p.name)}
                  onChange={() => togglePack(p.name)}
                />
                <span>{p.name}</span>
                {p.description ? (
                  <span className="text-muted-foreground text-xs">— {p.description}</span>
                ) : null}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <p className="text-sm font-medium">Copy a command:</p>

        {/*
          Clone method — works today. Rendered first because it's the path
          that actually functions before the package is published to npm.
          Hidden when ide !== 'claude' (Copilot/Cursor ship in Plan 3).
        */}
        {cloneCommand ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              From clone (available today)
            </p>
            <div className="border rounded-md p-4 font-mono text-sm bg-muted/30 flex items-center justify-between gap-4">
              <code className="break-all">{cloneCommand}</code>
              <CopyButton value={cloneCommand} />
            </div>
          </div>
        ) : null}

        {/* npm method — works after Waypoint v1.0 publishes. */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            From npm (after Waypoint v1.0 publishes)
          </p>
          <div className="border rounded-md p-4 font-mono text-sm bg-muted/30 flex items-center justify-between gap-4">
            <code className="break-all">{npmCommand}</code>
            <CopyButton value={npmCommand} />
          </div>
        </div>
      </div>
      {/*
        The <noscript> fallback lives in app/install/page.tsx (the server
        component). It must render to static HTML regardless of whether the
        client island hydrates; emitting it from this client component is
        redundant since the Suspense boundary skips SSR for the island.
      */}
    </div>
  );
}
