import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallSelector } from '../../components/install-selector';

// jest-dom matchers are not configured in this workspace (see Task 15/17).
// Use plain DOM checks: getAttribute / textContent / truthiness.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('role=developer&ide=claude&pack=cruise'),
}));

const AVAILABLE_PACKS = [
  { name: 'cruise', description: 'Cruise vertical', vertical: 'cruise' },
  { name: 'ota',    description: 'OTA vertical',    vertical: 'ota'    },
];

describe('<InstallSelector>', () => {
  afterEach(() => cleanup());

  it('hydrates from URL query', () => {
    render(<InstallSelector availablePacks={AVAILABLE_PACKS} />);
    expect(screen.getByText(/npx waypoint-claude init --role=developer --pack=cruise/i)).toBeTruthy();
  });

  it('disables Copilot and Cursor IDE options with a coming-soon marker', () => {
    render(<InstallSelector availablePacks={AVAILABLE_PACKS} />);
    const copilot = screen.getByRole('option', { name: /copilot/i }) as HTMLOptionElement;
    const cursor  = screen.getByRole('option', { name: /cursor/i })  as HTMLOptionElement;
    expect(copilot.getAttribute('aria-disabled')).toBe('true');
    expect(cursor.getAttribute('aria-disabled')).toBe('true');
    // "Plan 3" label rendered in option text for non-available IDEs
    expect(copilot.textContent).toMatch(/plan 3/i);
    expect(cursor.textContent).toMatch(/plan 3/i);
  });

  it('updates command when pack selection changes', async () => {
    const user = userEvent.setup();
    render(<InstallSelector availablePacks={AVAILABLE_PACKS} />);
    // Click pack multi-select to add ota
    await user.click(screen.getByRole('checkbox', { name: /ota/i }));
    expect(screen.getByText(/--pack=cruise --pack=ota/i)).toBeTruthy();
  });
});
