import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackCompareToggle } from '../../components/pack-compare-toggle';

// jest-dom matchers are not configured in this workspace (see Task 15/17/20).
// Use plain DOM checks: container.textContent / string .includes().

// Fixtures match the actual DomainBundle shape from @waypoint/transform-core
// (glossary: { term, definition }, services: { name, purpose, techStack? },
// patterns: { name, when, why }, entities: { name, description }). Tests only
// exercise glossary, so services/patterns/entities stay empty.
const CRUISE = {
  sources: ['ibs-core', 'cruise'],
  glossary: [{ term: 'Voyage', definition: 'A sailing.' }],
  services: [],
  patterns: [],
  entities: [],
};
const OTA = {
  sources: ['ibs-core', 'ota'],
  glossary: [{ term: 'PNR', definition: 'Passenger Name Record.' }],
  services: [],
  patterns: [],
  entities: [],
};

describe('<PackCompareToggle>', () => {
  afterEach(() => cleanup());

  it('shows cruise glossary by default', () => {
    const { container } = render(
      <PackCompareToggle cruise={CRUISE as any} ota={OTA as any} />,
    );
    const text = container.textContent ?? '';
    expect(text.includes('Voyage')).toBe(true);
    expect(text.includes('A sailing.')).toBe(true);
  });

  it('swaps to ota glossary when toggled', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PackCompareToggle cruise={CRUISE as any} ota={OTA as any} />,
    );
    // The vertical toggle renders as a native <button> (not Radix role="tab"),
    // so getByRole('button', { name: /^ota$/i }) disambiguates cleanly from
    // the Radix TabsTrigger buttons (Glossary/Services/Patterns/Entities).
    await user.click(screen.getByRole('button', { name: /^ota$/i }));
    const text = container.textContent ?? '';
    expect(text.includes('PNR')).toBe(true);
    expect(text.includes('Passenger Name Record.')).toBe(true);
    expect(text.includes('Voyage')).toBe(false);
  });
});
