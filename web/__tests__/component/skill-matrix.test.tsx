import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SkillMatrix } from '../../components/skill-matrix';
import type { SkillMeta } from '../../lib/content-loaders/skills';

// jest-dom matchers are not configured in this workspace (see Task 15/17).
// Use plain DOM checks: getAttribute / textContent / truthiness.

const skills: SkillMeta[] = [
  {
    name: 'ticket-to-pr',
    description: 'Ticket to PR',
    roles: ['developer'],
    ides: ['claude'],
    status: 'real',
    slug: 'ticket-to-pr',
  },
  {
    name: 'create-ticket',
    description: 'Draft a ticket',
    roles: ['developer', 'analyst'],
    ides: ['claude', 'copilot'],
    status: 'coming-soon',
    slug: 'create-ticket',
  },
];

describe('<SkillMatrix>', () => {
  afterEach(() => cleanup());

  it('renders a card per skill with name, description, roles, and IDEs', () => {
    const { container } = render(<SkillMatrix skills={skills} />);
    const text = container.textContent ?? '';
    expect(text.includes('/ticket-to-pr')).toBe(true);
    expect(text.includes('/create-ticket')).toBe(true);
    expect(text.includes('Ticket to PR')).toBe(true);
    expect(text.includes('Draft a ticket')).toBe(true);
    // role and IDE badges render
    expect(screen.getAllByText('developer').length).toBeGreaterThan(0);
    expect(screen.getByText('analyst')).toBeTruthy();
    expect(screen.getAllByText('claude').length).toBeGreaterThan(0);
    expect(screen.getByText('copilot')).toBeTruthy();
  });

  it('shows the "coming-soon — Plan 3" badge only for coming-soon skills', () => {
    render(<SkillMatrix skills={skills} />);
    const badges = screen.getAllByText(/coming-soon\s+—\s+Plan 3/i);
    expect(badges.length).toBe(1);
  });
});
