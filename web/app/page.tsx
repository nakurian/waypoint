import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhaseBadge } from '@/components/mdx/phase-badge';
import { loadAllPhases } from '@/lib/content-loaders/phases';
import path from 'node:path';

export default async function Home() {
  const phases = await loadAllPhases(path.resolve(process.cwd(), '../content/phases'));
  const realCount = phases.filter((p) => p.status === 'real').length;

  return (
    <>
      {/* Hero */}
      <section className="dark bg-waypoint-navy text-foreground">
        <div className="container py-20">
          <p className="text-sm uppercase tracking-wider text-waypoint-cyan mb-4">IBS Software · AI-enabled SDLC</p>
          <h1 className="text-5xl font-bold tracking-tight mb-4 max-w-3xl">An AI-SDLC for IBS.</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            New joiner? Pick your role, your IDE, and your domain pack. Run one install command and ship a real PR by day five.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link href="/phase/00">Read the docs →</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/role">Install now</Link>
            </Button>
            <Link
              href="/packs/compare"
              className="text-sm text-muted-foreground hover:text-waypoint-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-sm"
            >
              See the packs →
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Claude Code · Copilot · Cursor &nbsp;·&nbsp; {realCount} real phases · {phases.length - realCount} roadmap phases
          </p>
        </div>
      </section>

      {/* Feature strip */}
      <section className="container py-16 grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Single source of truth</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            One content repo serves three IDEs. Installers are thin transformers over the same content — no per-IDE drift.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pluggable domain packs</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            `ibs-core` ships always; verticals add (never override). Today: `cruise` + `ota`. Add your own with one PR.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Review-before-merge, enforced</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            Every PR carries a human-written explanation. Not policy — a skill stage. Auditable evidence, every time.
          </CardContent>
        </Card>
      </section>

      {/* Phase grid */}
      <section className="container pb-20">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Browse the 12 phases</h2>
          <p className="text-muted-foreground mt-1">
            Every phase of the AI-enabled SDLC, from onboarding to disposition. Click any card to jump in.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {phases.map((p) => (
            <Link
              key={p.phase}
              href={`/phase/${p.phase}`}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-xl"
            >
              <Card className="h-full transition-colors group-hover:border-waypoint-cyan">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-muted-foreground">Phase {p.phase}</span>
                    {p.status === 'coming-soon' && <PhaseBadge status="coming-soon" />}
                  </div>
                  <CardTitle className="text-lg mt-2 group-hover:text-waypoint-cyan">{p.name}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
