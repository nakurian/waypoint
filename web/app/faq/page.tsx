import Link from 'next/link';

export default function FaqPage() {
  return (
    <section className="container py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
      <p className="text-muted-foreground mb-8">
        Short answers to what people usually want to know before installing.
      </p>

      <div className="prose prose-slate max-w-none">
        <h2>The basics</h2>

        <h3>What is Waypoint?</h3>
        <p>
          An IBS-wide, opinionated, AI-enabled SDLC platform. It ships as (a) a single content repo
          covering 12 SDLC phases, (b) reusable skills, agents, and instructions for AI IDEs, and (c)
          thin per-IDE installers that write the right files into your workspace. Today, Claude Code
          is fully supported; Copilot and Cursor ship in v1.0. You install once per project, then
          your AI assistant knows your team&apos;s SDLC vocabulary and the rules of the road.
        </p>

        <h3>Why does this exist?</h3>
        <p>
          AI coding tools are everywhere, but the quality of AI-assisted work varies wildly because
          every engineer wires things up differently. Waypoint standardises that wiring — the same
          review-before-merge gate, the same ticket-to-PR flow, the same domain vocabulary — across
          any IBS team and any client engagement. It&apos;s the missing layer between raw AI IDE and
          &ldquo;how we actually ship code at IBS.&rdquo;
        </p>

        <h3>How is this different from just using Claude Code / Copilot / Cursor directly?</h3>
        <p>
          The IDEs ship with generic behaviour; Waypoint ships with opinion. The{' '}
          <code>/ticket-to-pr</code> skill enforces a 7-stage flow with an approval gate and a
          review-before-merge check. Always-on instructions make AI suggestions respect your coding
          standards, commit traceability, and MCP routing. Domain packs teach your IDE the
          vocabulary of your business line (cruise, OTA, and more to come) so plans and code
          don&apos;t talk in generic web-app nouns when your domain is travel.
        </p>

        <h3>Why IBS-wide and not client-specific?</h3>
        <p>
          Every IBS engagement has the same shape — AI IDEs, SDLC phases, code review, domain
          vocabulary. Waypoint&apos;s architecture separates the shape (always-loaded{' '}
          <code>ibs-core</code>) from the client domain (optional vertical packs like{' '}
          <code>cruise</code> or <code>ota</code>). Client-specific terminology never appears in the
          platform itself; it lives in pluggable packs that extend, never override, the core.
        </p>

        <h2>Roles</h2>

        <h3>What are the roles and why do they matter?</h3>
        <p>
          Waypoint ships for four roles: Developer, Analyst, Manager, and QA. Picking a role
          determines which skills, agents, and instructions get installed into your IDE — a
          Developer gets <code>/ticket-to-pr</code> and code-review skills; an Analyst (in v1.5) will
          get requirements-analysis and user-story-drafting skills; a Manager (v1.5) gets release and
          retrospective skills; QA (v1.5) gets test-planning and e2e-generation skills. Same
          platform, different tool surface per role.
        </p>

        <h3>What&apos;s actually different between role installs?</h3>
        <p>
          Every role inherits the always-on instructions (coding standards, MCP routing,
          review-before-merge, traceability). What differs is the skill catalogue: a role gets only
          the skills that are meaningful for its work. This keeps the IDE&apos;s skill menu focused
          and stops, say, a Manager from seeing a dozen developer-only commands.
        </p>

        <h3>Can I install multiple roles at once?</h3>
        <p>
          Yes — the installer accepts <code>--role</code> repeatedly. For engineers who genuinely
          wear two hats (developer + QA, analyst + manager), run{' '}
          <code>./install.sh --role=developer --role=qa --pack=ota</code>. Skills are deduplicated,
          so you don&apos;t get two copies of anything shared.
        </p>

        <h3>When will Analyst, Manager, QA roles get full coverage?</h3>
        <p>
          Waypoint v1.5. Today (v1.0 / Plan 2 build), non-Developer roles install the Developer pack
          as a practical default with a &ldquo;v1.5 coming&rdquo; notice. Your lead can still install
          Analyst for an analyst on your team; they&apos;ll just get the Developer surface until
          v1.5 lands.
        </p>

        <h2>Packs and domains</h2>

        <h3>What&apos;s a domain pack?</h3>
        <p>
          A pack is a small, schema-validated bundle of domain vocabulary for a specific business
          line: glossary terms, named services, recurring architectural patterns, and key domain
          entities. Today, <code>ibs-core</code> (always loaded) ships IBS-wide generics like{' '}
          <code>BFF</code>, <code>ADR</code>, <code>AC</code>. <code>cruise</code> adds{' '}
          <code>Sailing</code>, <code>Embarkation</code>, <code>Itinerary</code>. <code>ota</code> adds{' '}
          <code>PNR</code>, <code>Reservation</code>, <code>GDS</code>. When you install Waypoint
          with a pack selected, the <code>/ticket-to-pr</code> skill&apos;s stage-2 plan will
          reference your pack&apos;s vocabulary instead of generic web-app nouns.
        </p>

        <h3>Why &ldquo;extends, never overrides&rdquo;?</h3>
        <p>
          Packs can add new entries to the shared vocabulary, but they can&apos;t contradict
          something <code>ibs-core</code> already defined. This one rule eliminates an entire class
          of merge-conflict resolution logic. If a vertical pack genuinely needs to contradict core,
          the fix is to move the disputed item out of core — not to let packs fight each other. CI
          enforces this automatically.
        </p>

        <h3>Can I add my own pack for my vertical?</h3>
        <p>
          Yes — that&apos;s the primary scale mechanism. Open a PR adding{' '}
          <code>packs/&lt;vertical&gt;/</code> with the required four JSON files (glossary, services,
          patterns, entities) plus a <code>pack.yaml</code>. Minimum viable pack is 1 term + 1
          pattern + 1 entity + 1 service; most verticals ship with 3-10 of each. Once your pack has
          10+ glossary terms and one real-world usage, it&apos;s promoted from{' '}
          <code>status: experimental</code> to <code>status: active</code>.
        </p>

        <h3>What&apos;s the difference between cruise and ota?</h3>
        <p>
          They&apos;re different business domains with different vocabulary. Cruise is long-tail
          sailing operations — think passenger-facing software for ships, onboard services,
          itinerary management. OTA (Online Travel Agency) is high-volume retail booking —
          reservations, GDS
          integrations, payment flows. The same <code>/ticket-to-pr</code> skill produces different
          plans and code depending on which pack is active, because the active pack feeds different
          glossary and patterns into stage 2&apos;s plan composition.
        </p>

        <h2>Contributing</h2>

        <h3>I have a skill or hook that&apos;s working well for my team — how do I contribute it?</h3>
        <p>
          Open a PR against <code>content/skills/&lt;your-skill-name&gt;/SKILL.md</code>. The
          existing <code>content/skills/ticket-to-pr/SKILL.md</code> is the reference shape:
          frontmatter (name, description, roles, ides, status) plus the skill body. Keep skills
          role-scoped — if it&apos;s a test-planning skill, mark it{' '}
          <code>roles: [qa, developer]</code>, not all roles. Your name goes in the frontmatter{' '}
          <code>authors:</code> array. Waypoint maintainers review; a skill lands in the next
          release.
        </p>

        <h3>My team has a new domain (hotel/airline/retail) — how do I add a pack?</h3>
        <p>
          Create <code>packs/&lt;your-vertical&gt;/</code> with the four JSON files +{' '}
          <code>pack.yaml</code> (see <code>packs/cruise/</code> or <code>packs/ota/</code> as
          templates). Start with a minimal pack — 1 glossary term, 1 pattern, 1 entity, 1 service —
          and iterate. Each PR must keep the pack schema-valid (CI validates). Once 10+ terms and 1+
          real-world usage, it gets promoted to <code>active</code>.
        </p>

        <h3>Are there any requirements for contributions?</h3>
        <p>
          Three hard rules: (1) no client-specific details — the platform is IBS-wide;
          client-specific terminology lives only in vertical packs; (2){' '}
          <code>extends, never overrides</code> — pack additions can&apos;t contradict core; (3)
          skills have a clear role + IDE scope. Beyond that, follow the existing Waypoint code style
          and write tests for any code changes.
        </p>

        <h3>Who reviews PRs?</h3>
        <p>
          Today: Waypoint maintainers. As packs and skills accumulate owners, PRs touching a
          specific pack or skill automatically route to that owner via CODEOWNERS. Engineering
          Excellence review may be added for v1.5+ once the platform has broader adoption.
        </p>

        <h2>Tooling and IDE</h2>

        <h3>Does Waypoint work with Copilot? Cursor?</h3>
        <p>
          Copilot and Cursor installers ship in Waypoint v1.0 (Plan 3). Today (v1.0 build / Plan 2),
          only Claude Code is supported. The content layer — skills, agents, instructions, packs —
          is IDE-agnostic; the installers are thin emitters that translate to each IDE&apos;s file
          format. Adding Copilot and Cursor is a matter of finishing those two emitters, not
          rewriting any content.
        </p>

        <h3>What MCP servers do I need?</h3>
        <p>
          For the <code>/ticket-to-pr</code> skill to work fully, you need one tracker MCP
          (Atlassian for Jira, GitHub for GitHub Issues) and optionally Context7 for library-doc
          lookups during planning. GitHub MCP is recommended regardless of tracker for repo
          operations. Configure MCPs with <code>/mcp</code> in Claude Code — Waypoint doesn&apos;t
          ship its own MCP servers.
        </p>

        <h3>What happens if I&apos;m offline / don&apos;t have MCP configured?</h3>
        <p>
          The <code>/ticket-to-pr</code> skill&apos;s stage 1 (fetch ticket) exits cleanly with
          setup guidance instead of failing silently. Stages 2-7 still run if you feed the ticket
          content manually. The review-before-merge gate runs entirely locally — no MCP dependency.
          So partial setup still delivers partial value.
        </p>

        <h3>How does the review-before-merge gate actually work?</h3>
        <p>
          After tests pass and before the PR is opened, the skill shows you the full diff and
          prompts you: &ldquo;Explain this change in your own words — 3-5 sentences.&rdquo; You
          type. The skill enforces a minimum (at least 30 words across 2 sentences) and rejects
          empty or one-word submissions with a re-prompt. The AI then compares your explanation
          against the diff and adds advisory flags for anything you didn&apos;t mention — a new
          index, a migration, a behavioural change. Your explanation plus those flags are written
          to <code>pr-explanations/&lt;ticket-id&gt;.md</code> and committed as part of the PR.
          This is operationalised vibe-coding prevention: every PR carries comprehension evidence,
          auditable and countable.
        </p>

        <h2>Install and troubleshooting</h2>

        <h3>How do I uninstall?</h3>
        <p>
          <code>./install.sh uninstall --workspace=/path/to/project</code> reverses the install —
          removes <code>CLAUDE.md</code>, <code>.claude/settings.json</code> entries, and the global{' '}
          <code>~/.claude/skills/ticket-to-pr/</code> + <code>~/.claude/waypoint-domain/</code>.
          Files you edited after install are preserved (sentinel-protected).
        </p>

        <h3>What if <code>./install.sh</code> fails?</h3>
        <p>
          First-run failures are usually missing prerequisites — check Node ≥ 20, <code>pnpm</code>{' '}
          installed, and a fresh <code>git clone</code> (not a stale one with pre-built artefacts).
          If the build step fails, delete <code>installers/waypoint-claude/dist/</code> and re-run —
          the script will rebuild. Real runtime failures (like pack schema validation errors) are
          caught by CI before release, so if you hit one, please open an issue with the exact
          command and stderr output.
        </p>

        <h3>Can I use this in a private workspace?</h3>
        <p>
          Yes — the installer writes to your local workspace and <code>~/.claude/</code>. Nothing is
          sent externally. The <code>/ticket-to-pr</code> skill hits MCP servers you configure
          (your Jira, your GitHub) using your credentials, same way Claude Code already does.
        </p>

        <h3>Does this work on Windows?</h3>
        <p>
          The installer does, yes — the Node.js script (<code>scripts/install.mjs</code>) is
          cross-platform. The <code>install.sh</code> bash wrapper doesn&apos;t work on native
          Windows, so use <code>node scripts/install.mjs ...</code> instead. Everything downstream
          is path-safe across OS.
        </p>

        <h2>Still have questions?</h2>

        <h3>Where do I go for help?</h3>
        <ul>
          <li>
            This FAQ and the <Link href="/phase/00">12-phase docs</Link> cover most questions.
          </li>
          <li>
            For install issues, check the <Link href="/install">install page</Link> prerequisites
            section first.
          </li>
          <li>
            For pack / skill contributions, the <Link href="/about#contributing">About page</Link>{' '}
            has the contribution guide intro.
          </li>
          <li>Otherwise, open an issue on the Waypoint repo.</li>
        </ul>

        <hr />

        <p>
          Ready to install? Head to the <Link href="/install">install page</Link> to pick your role,
          IDE, and packs, or dive into <Link href="/phase/07">Phase 07 — Development</Link> to see
          the reference phase docs in full.
        </p>
      </div>
    </section>
  );
}
