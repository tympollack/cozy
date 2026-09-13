import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VibeCheckModal } from '@/components/VibeCheckModal';
import { useCozyStore } from '@/store/useCozyStore';

const mockUpdateVibeStatus = vi.fn();
vi.mock('@/app/actions/vibeActions', () => ({
  updateVibeStatus: (...args: unknown[]) => mockUpdateVibeStatus(...args),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } } }),
    },
    channel: () => ({
      subscribe: vi.fn((cb: (status: string) => void) => cb('SUBSCRIBED')),
      send: vi.fn().mockResolvedValue({}),
    }),
    removeChannel: vi.fn(),
  }),
}));

describe('VibeCheckModal Contrast & Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCozyStore.setState({
      vibeStatus: 'neutral',
      lastVibeCheckDate: null,
    });
    mockUpdateVibeStatus.mockResolvedValue({ success: true });
  });

  it('renders modal header, subheader, and accessible dismiss button', () => {
    render(<VibeCheckModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Daily Vibe Check')).toBeInTheDocument();
    
    // Subheader text with accessible classes
    const subheader = screen.getByText('Atmospheric Layer · How is your space today?');
    expect(subheader).toBeInTheDocument();
    expect(subheader.className).toContain('text-stone-600');

    // 44x44px touch target dismiss button
    const closeBtn = screen.getByRole('button', { name: /Close Vibe Check modal/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toContain('w-11');
    expect(closeBtn.className).toContain('h-11');
  });

  it('renders warm ambient explainer banner with harmonious palette and high-contrast typography', () => {
    render(<VibeCheckModal isOpen={true} onClose={vi.fn()} />);

    // Explainer headline
    const headline = screen.getByText(/"How's the weather in your space today\?"/i);
    expect(headline).toBeInTheDocument();
    expect(headline.className).toContain('text-stone-900');
    expect(headline.className).toContain('font-semibold');

    // Explainer subtext
    const subtext = screen.getByText(/Your status floating aura lets peers visually support you on the Village map/i);
    expect(subtext).toBeInTheDocument();
    expect(subtext.className).toContain('text-stone-600');

    // Explainer container surface
    const banner = headline.closest('div');
    expect(banner).not.toBeNull();
    expect(banner?.className).toContain('bg-amber-500/10');
    expect(banner?.className).toContain('border-amber-300/40');
  });

  it('renders accessible category divider headers with opacity icons', () => {
    render(<VibeCheckModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('FEELING GOOD')).toBeInTheDocument();
    expect(screen.getByText('STEADY COZY')).toBeInTheDocument();
    expect(screen.getByText('NEED SOME WARMTH')).toBeInTheDocument();

    const goodHeader = screen.getByText('FEELING GOOD').closest('div');
    expect(goodHeader?.className).toContain('text-stone-600');
    expect(goodHeader?.className).toContain('tracking-wider');
    expect(goodHeader?.className).toContain('uppercase');
  });

  it('allows selecting an option and updating status', async () => {
    const user = userEvent.setup();
    render(<VibeCheckModal isOpen={true} onClose={vi.fn()} />);

    const sunshineCard = screen.getByRole('button', { name: /Sunshine/i });
    await user.click(sunshineCard);

    expect(mockUpdateVibeStatus).toHaveBeenCalled();
  });
});
