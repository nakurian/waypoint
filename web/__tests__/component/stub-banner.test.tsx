import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { StubBanner } from '../../components/stub-banner';

describe('<StubBanner>', () => {
  afterEach(() => cleanup());

  it('renders target and lead', () => {
    const { container } = render(<StubBanner target="v1.5" lead="TBD" />);
    const text = container.textContent ?? '';
    expect(/coming in waypoint v1\.5/i.test(text)).toBe(true);
    expect(text.includes('TBD')).toBe(true);
  });

  it('renders without lead gracefully', () => {
    const { container } = render(<StubBanner target="v1.5" />);
    const text = container.textContent ?? '';
    expect(/coming in waypoint v1\.5/i.test(text)).toBe(true);
    // No "Owner:" label when lead is absent
    expect(text.includes('Owner:')).toBe(false);
  });
});
