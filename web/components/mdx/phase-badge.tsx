import { Badge } from '@/components/ui/badge';

export function PhaseBadge({ status }: { status: 'real' | 'coming-soon' }) {
  return <Badge variant={status === 'real' ? 'default' : 'secondary'}>{status === 'real' ? 'Real' : 'Coming soon'}</Badge>;
}
