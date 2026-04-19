import path from 'node:path';
import { Suspense } from 'react';
import { InstallSelector } from '@/components/install-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listAvailablePacks } from '@/lib/content-loaders/packs';

export default async function InstallPage() {
  const packs = await listAvailablePacks(path.resolve(process.cwd(), '../packs'));
  return (
    <section className="container py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Install Waypoint</h1>
      <p className="text-muted-foreground mb-8">
        Pick your role, your IDE, and the domain packs for your team. Copy the command and run it in any workspace directory.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Before you install</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Waypoint&apos;s installer needs these in place first. Skip any that don&apos;t apply, but the{' '}
            <code className="font-mono text-xs">/ticket-to-pr</code> skill will exit cleanly when a required MCP isn&apos;t
            configured.
          </p>

          <div>
            <p className="font-semibold mb-2">Required</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Node.js ≥ 20</strong> — the installer is an{' '}
                <code className="font-mono text-xs">npx</code> command. Verify with{' '}
                <code className="font-mono text-xs">node --version</code>.
              </li>
              <li>
                <strong className="text-foreground">Claude Code CLI</strong> (for the Claude Code install) —{' '}
                <a
                  href="https://docs.claude.com/claude-code"
                  target="_blank"
                  rel="noreferrer"
                  className="text-waypoint-cyan underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-sm"
                >
                  https://docs.claude.com/claude-code
                </a>
                . The installer writes to <code className="font-mono text-xs">~/.claude/skills/</code>,{' '}
                <code className="font-mono text-xs">~/.claude/waypoint-domain/</code>, and your workspace&apos;s{' '}
                <code className="font-mono text-xs">.claude/settings.json</code>.
              </li>
              <li>
                <strong className="text-foreground">A workspace repo</strong> — the installer writes{' '}
                <code className="font-mono text-xs">CLAUDE.md</code> and{' '}
                <code className="font-mono text-xs">.claude/settings.json</code> into your current working directory. Run
                it from your project&apos;s root.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">
              Tracker MCP <span className="text-muted-foreground font-normal">(one of these — needed for /ticket-to-pr stage 1 to fetch tickets)</span>
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Atlassian MCP</strong> — if your team uses Jira. Configure with{' '}
                <code className="font-mono text-xs">/mcp</code> in Claude Code.
              </li>
              <li>
                <strong className="text-foreground">GitHub MCP</strong> — if your team uses GitHub Issues. Configure with{' '}
                <code className="font-mono text-xs">/mcp</code> in Claude Code.
              </li>
              <li>
                <em>None configured?</em> — /ticket-to-pr stage 1 will exit with setup guidance instead of failing
                silently; everything else still works.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">Recommended</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">GitHub MCP</strong> — even on Jira-tracker teams, repo operations (PR
                open, CODEOWNERS lookup) in /ticket-to-pr stage 7 go through this. Configure with{' '}
                <code className="font-mono text-xs">/mcp</code>.
              </li>
              <li>
                <strong className="text-foreground">Context7 MCP</strong> — for library documentation lookups during
                stage 2 planning. Configure with <code className="font-mono text-xs">/mcp</code>.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold mb-2">For the clone method (available today)</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">git</strong> — to clone the repo. Verify with{' '}
                <code className="font-mono text-xs">git --version</code>.
              </li>
              <li>
                <strong className="text-foreground">pnpm</strong> — used once to build the installer on first run.
                Install from{' '}
                <a
                  href="https://pnpm.io/installation"
                  target="_blank"
                  rel="noreferrer"
                  className="text-waypoint-cyan underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-sm"
                >
                  pnpm.io/installation
                </a>
                .
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

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
          <p className="font-semibold mt-2 mb-1">From clone (available today)</p>
          <ul className="font-mono space-y-1">
            <li>git clone https://github.com/nakurian/waypoint.git &amp;&amp; cd waypoint &amp;&amp; ./install.sh --role=developer --pack=cruise</li>
            <li>git clone https://github.com/nakurian/waypoint.git &amp;&amp; cd waypoint &amp;&amp; ./install.sh --role=developer --pack=ota</li>
            <li>git clone https://github.com/nakurian/waypoint.git &amp;&amp; cd waypoint &amp;&amp; ./install.sh --role=developer --pack=cruise --pack=ota</li>
          </ul>
          <p className="font-semibold mt-3 mb-1">From npm (after Waypoint v1.0 publishes)</p>
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
