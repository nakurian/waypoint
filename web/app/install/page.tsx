import path from 'node:path';
import { Suspense } from 'react';
import { InstallSelector } from '@/components/install-selector';
import { listAvailablePacks } from '@/lib/content-loaders/packs';

export default async function InstallPage() {
  const packs = await listAvailablePacks(path.resolve(process.cwd(), '../packs'));
  return (
    <section className="container py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Install Waypoint</h1>
      <p className="text-muted-foreground mb-8">
        Pick your role, your IDE, and the domain packs for your team. Copy the command and run it in any workspace directory.
      </p>
      {/*
        useSearchParams() inside <InstallSelector> requires a Suspense boundary
        under Next 15 static export. Suspense means the interactive selector is
        not SSR'd into the exported HTML — the <noscript> fallback is rendered
        here at the server level so it survives in out/install/index.html.
      */}
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <InstallSelector availablePacks={packs} />
      </Suspense>
      <noscript>
        <div className="mt-6 text-sm border rounded-md p-4">
          <p className="mb-2">JavaScript disabled — static command matrix:</p>
          <ul className="font-mono space-y-1">
            <li>npx waypoint-claude init --role=developer --pack=cruise</li>
            <li>npx waypoint-claude init --role=developer --pack=ota</li>
            <li>npx waypoint-claude init --role=developer --pack=cruise --pack=ota</li>
          </ul>
        </div>
      </noscript>
    </section>
  );
}
