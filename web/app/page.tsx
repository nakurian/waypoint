import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadAllPhases } from '@/lib/content-loaders/phases';
import path from 'node:path';

export default async function Home() {
  const phases = await loadAllPhases(path.resolve(process.cwd(), '../content/phases'));
  const realCount = phases.filter((p) => p.status === 'real').length;

  return (
    <>
      {/* Hero */}
      <section className="dark bg-waypoint-navy text-primary-foreground">
        <div className="container py-20">
          <p className="text-sm uppercase tracking-wider text-waypoint-cyan mb-4">IBS Software · AI-enabled SDLC</p>
          <h1 className="text-5xl font-bold tracking-tight mb-4 max-w-3xl">An AI-SDLC for IBS.</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            New joiner? Pick your role, your IDE, and your domain pack. Run one install command and ship a real PR by day five.
          </p>
          <div className="flex gap-4">
            <Button asChild size="lg"><Link href="/role">Get started →</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/packs/compare">See the packs</Link></Button>
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
    </>
  );
}
