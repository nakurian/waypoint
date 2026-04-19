import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const roles = [
  { id: 'developer', title: 'Developer', desc: 'Full `/ticket-to-pr` flow with review-before-merge gate.', available: true },
  { id: 'analyst',   title: 'Analyst',   desc: 'Requirements authoring, AC discipline, ticket drafting.', available: false },
  { id: 'manager',   title: 'Manager',   desc: 'Project tracking, release narrative, retrospective summaries.', available: false },
  { id: 'qa',        title: 'QA',        desc: 'Test planning, E2E authoring, reviewer-side checklists.', available: false },
];

export default function RolePage() {
  return (
    <section className="container py-12">
      <h1 className="text-3xl font-bold mb-2">Pick your role</h1>
      <p className="text-muted-foreground mb-8">Developer has full coverage today. Analyst, Manager, and QA install the Developer pack for now — role-specific content ships in Waypoint v1.5.</p>
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        {roles.map((r) => (
          <Link key={r.id} href={`/install?role=${r.id}`} className="block">
            <Card className="h-full hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{r.title}</span>
                  {!r.available && <Badge variant="secondary">v1.5 — installs Developer</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{r.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
