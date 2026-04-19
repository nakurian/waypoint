import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('web workspace scaffold', () => {
  it('cn() merges Tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', { 'font-bold': true })).toBe('text-red-500 font-bold');
  });
});
