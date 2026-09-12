import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';
import { useCozyStore } from '@/store/useCozyStore';
import * as soundscape from '@/lib/audio/soundscape';
import type { PointTransaction } from '@/app/actions/ledgerActions';

const mockGetTransactionHistory = vi.fn();

vi.mock('@/app/actions/ledgerActions', () => ({
  getTransactionHistory: (...args: unknown[]) => mockGetTransactionHistory(...args),
}));

describe('TransactionHistoryModal Component (Cozy Chronicle & Cheer Ledger)', () => {
  const mockTransactions: PointTransaction[] = [
    {
      id: 'tx-1',
      user_id: 'user-me',
      amount: 15,
      transaction_type: 'cheer_reward',
      description: 'Received cheer from Maya',
      created_at: new Date('2026-09-12T10:00:00Z').toISOString(),
    },
    {
      id: 'tx-2',
      user_id: 'user-me',
      amount: -25,
      transaction_type: 'sticker_purchase',
      description: 'Acquired Artisan Teapot',
      created_at: new Date('2026-09-12T10:30:00Z').toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useCozyStore.setState({ points: 90 });
    mockGetTransactionHistory.mockResolvedValue({
      success: true,
      currentPoints: 90,
      transactions: mockTransactions,
      hasMore: false,
    });
  });

  it('renders Cozy Chronicle header, plays paper rustle on mount, and displays balance card', async () => {
    const rustleSpy = vi.spyOn(soundscape, 'playPaperRustle');

    render(<TransactionHistoryModal isOpen={true} onClose={vi.fn()} />);

    expect(rustleSpy).toHaveBeenCalled();
    expect(screen.getByText(/Cozy Chronicle & Cheer Ledger/i)).toBeInTheDocument();
    expect(
      screen.getByText(/A living chronicle of kindness shared/i)
    ).toBeInTheDocument();

    expect(await screen.findByText('+15 cheer received')).toBeInTheDocument();
    expect(screen.getByText('-25 warmth gifted')).toBeInTheDocument();
  });

  it('renders itemized transaction entries with appropriate badges and positive/negative styling', async () => {
    render(<TransactionHistoryModal isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Received cheer from Maya')).toBeInTheDocument();
    expect(screen.getByText('Acquired Artisan Teapot')).toBeInTheDocument();
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('-25')).toBeInTheDocument();
    expect(screen.getByText('Artisan Gift & Decor')).toBeInTheDocument();
  });

  it('filters transactions when switching between Earned and Spent tabs', async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(soundscape, 'playWoodenClick');

    render(<TransactionHistoryModal isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Received cheer from Maya')).toBeInTheDocument();
    expect(screen.getByText('Acquired Artisan Teapot')).toBeInTheDocument();

    // Click "Cheer Received 💛 (+)" tab
    const earnedTab = screen.getByRole('button', { name: /Cheer Received/i });
    await user.click(earnedTab);

    expect(clickSpy).toHaveBeenCalled();
    expect(screen.getByText('Received cheer from Maya')).toBeInTheDocument();
    expect(screen.queryByText('Acquired Artisan Teapot')).not.toBeInTheDocument();

    // Click "Warmth Gifted 🎁 (-)" tab
    const spentTab = screen.getByRole('button', { name: /Warmth Gifted/i });
    await user.click(spentTab);

    expect(screen.getByText('Acquired Artisan Teapot')).toBeInTheDocument();
    expect(screen.queryByText('Received cheer from Maya')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockClose = vi.fn();

    render(<TransactionHistoryModal isOpen={true} onClose={mockClose} />);

    const closeBtn = screen.getByRole('button', { name: /Close transaction ledger/i });
    await user.click(closeBtn);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
