'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const supported = typeof navigator !== 'undefined' && !!navigator.clipboard;

  async function onClick() {
    if (!supported) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button onClick={onClick} variant="outline" size="sm" disabled={!supported} aria-label={copied ? 'copied' : 'copy'}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="ml-2">{copied ? 'Copied' : 'Copy'}</span>
    </Button>
  );
}
