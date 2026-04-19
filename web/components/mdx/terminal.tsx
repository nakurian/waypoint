import { CopyButton } from '@/components/copy-button';
import { Children, isValidElement } from 'react';

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) return extractText((node.props as any).children);
  return '';
}

export function Terminal({ children }: { children: React.ReactNode }) {
  const text = extractText(children).trim();
  return (
    <div className="my-4 rounded-md border bg-muted/50 relative">
      <pre className="p-4 font-mono text-sm overflow-x-auto">{children}</pre>
      <div className="absolute top-2 right-2"><CopyButton value={text} /></div>
    </div>
  );
}
