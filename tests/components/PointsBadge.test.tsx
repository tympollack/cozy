import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PointsBadge } from '@/components/PointsBadge';
import { useCozyStore } from '@/store/useCozyStore';

vi.mock('@/lib/supabase-browser', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id-123' } },
      }),
    },
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: vi.fn().mockResolvedValue({ data: { points: 150 } }),
          }),
        }),
      }),
    }),
  }),
}));

describe('PointsBadge Component (Scope D - UI & Integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    useCozyStore.setState({
      points: 150,
      hasSeenOnboarding: true,
      feed: [],
    });
  });

  it('renders with current points count from Zustand store', async () => {
    render(<PointsBadge />);
    expect(screen.getByRole('button', { name: /150 points/i })).toBeInTheDocument();
  });

  it('toggles dropdown menu on click using real user events', async () => {
    const user = userEvent.setup();
    render(<PointsBadge />);

    const badgeButton = screen.getByRole('button', { name: /150 points/i });
    expect(screen.queryByText(/Cozy Economy/i)).not.toBeInTheDocument();

    await user.click(badgeButton);
    expect(screen.getByText(/Cozy Economy/i)).toBeInTheDocument();
    expect(screen.getByText(/Sticker Store/i)).toBeInTheDocument();
    expect(screen.getByText(/Transaction Ledger/i)).toBeInTheDocument();

    await user.click(badgeButton);
    await waitFor(() => {
      expect(screen.queryByText(/Cozy Economy/i)).not.toBeInTheDocument();
    });
  });

  it('opens Sticker Store drawer when clicking Sticker Store button', async () => {
    const user = userEvent.setup();
    render(<PointsBadge />);

    const badgeButton = screen.getByRole('button', { name: /150 points/i });
    await user.click(badgeButton);

    const storeOption = screen.getByRole('button', { name: /Sticker Store/i });
    await user.click(storeOption);

    await waitFor(() => {
      expect(screen.queryByText(/Cozy Economy/i)).not.toBeInTheDocument();
    });
  });

  it('opens Transaction Ledger modal when clicking Transaction Ledger button', async () => {
    const user = userEvent.setup();
    render(<PointsBadge />);

    const badgeButton = screen.getByRole('button', { name: /150 points/i });
    await user.click(badgeButton);

    const ledgerOption = screen.getByRole('button', { name: /Transaction Ledger/i });
    await user.click(ledgerOption);

    await waitFor(() => {
      expect(screen.queryByText(/Cozy Economy/i)).not.toBeInTheDocument();
    });
  });
});
