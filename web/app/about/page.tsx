import Link from 'next/link';

export default function AboutPage() {
  return (
    <section className="container py-12 max-w-3xl prose prose-slate">
      <h1>About Waypoint</h1>
      <p>Waypoint is an opinionated, IBS-wide, AI-enabled SDLC. It exists to give any IBS engineer, on any client team, a pre-configured AI development environment that enforces a reviewed, comprehensible workflow from ticket to merged PR.</p>

      <h2>Scope</h2>
      <p>Waypoint covers twelve SDLC phases. Three are fully authored today (Getting Started, Planning & Requirements, Development); nine are scoped stubs targeting v1.5. Three roles are stubbed (Analyst, Manager, QA) and install the Developer surface for now.</p>

      <h2>Why now</h2>
      <p>IBS has no equivalent AI-enabled SDLC as of April 2026. AI coding tools are ubiquitous, but code-comprehension discipline is uneven. Waypoint operationalises comprehension as an enforced skill stage — not a policy document.</p>

      <h2 id="contributing">Contributing</h2>
      <ul>
        <li><strong>Content (filling stubs):</strong> browse a <Link href="/phase/01">stubbed phase</Link>, follow the real-phase templates (<Link href="/phase/07">07 — Development</Link> is the reference), open a PR.</li>
        <li><strong>Packs (new verticals):</strong> create <code>/packs/&lt;vertical&gt;/pack.yaml</code> with an owner. Minimum viable pack: 1 glossary term + 1 pattern + 1 entity + 1 service.</li>
        <li><strong>Skills:</strong> author <code>content/skills/&lt;name&gt;/SKILL.md</code> following the existing <code>ticket-to-pr</code> shape.</li>
      </ul>

      <h2>Repository</h2>
      <p>The project lives at <a href="https://github.com/nakurian/waypoint">github.com/nakurian/waypoint</a>.</p>
    </section>
  );
}
