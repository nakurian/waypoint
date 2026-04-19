import type { MDXComponents } from 'mdx/types';
import { Callout } from '@/components/mdx/callout';
import { Terminal } from '@/components/mdx/terminal';
import { Figure } from '@/components/mdx/figure';
import { PhaseBadge } from '@/components/mdx/phase-badge';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Callout,
    Terminal,
    Figure,
    PhaseBadge,
  };
}
