import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from '../../components/copy-button';

describe('<CopyButton>', () => {
  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  function installClipboard() {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    return writeText;
  }

  it('copies the provided text to clipboard on click', async () => {
    const user = userEvent.setup();
    const writeText = installClipboard();
    render(<CopyButton value="npx waypoint-claude init --role=developer" />);
    await user.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith('npx waypoint-claude init --role=developer');
  });

  it('shows "Copied" state briefly after click', async () => {
    const user = userEvent.setup();
    installClipboard();
    render(<CopyButton value="x" />);
    await user.click(screen.getByRole('button'));
    expect(await screen.findByText(/copied/i)).toBeTruthy();
  });

  it('falls back to disabled when clipboard API is unavailable', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    render(<CopyButton value="x" />);
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
