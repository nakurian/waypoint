import path from 'node:path';
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { loadAllPhases, loadPhaseById, type PhaseWithBody } from '@/lib/content-loaders/phases';
import { PhaseSidebar } from '@/components/phase-sidebar';
import { StubBanner } from '@/components/stub-banner';
import { useMDXComponents } from '@/mdx-components';

const PHASES_ROOT = path.resolve(process.cwd(), '../content/phases');

export const dynamicParams = false;

export async function generateStaticParams() {
  const phases = await loadAllPhases(PHASES_ROOT);
  return phases.map((p) => ({ id: p.phase }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { frontmatter } = await loadPhaseById(PHASES_ROOT, id);
    return { title: `Phase ${id} — ${frontmatter.name}` };
  } catch {
    return { title: 'Phase not found' };
  }
}

export default async function PhasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let phase: PhaseWithBody;
  try {
    phase = await loadPhaseById(PHASES_ROOT, id);
  } catch {
    notFound();
  }

  const components = useMDXComponents({});
  const { content } = await compileMDX({
    source: phase!.body,
    components,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]],
      },
    },
  });

  return (
    <>
      <PhaseSidebar currentPhase={id} />
      <article className="flex-1 prose prose-slate max-w-3xl">
        {phase!.frontmatter.status === 'coming-soon' && (
          <StubBanner
            target={phase!.frontmatter.target ?? 'v1.5'}
            lead={phase!.frontmatter.lead}
          />
        )}
        {content}
      </article>
    </>
  );
}
