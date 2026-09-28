import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StickerStoreDrawer } from '@/components/StickerStoreDrawer';
import { useCozyStore } from '@/store/useCozyStore';
import * as soundscape from '@/lib/audio/soundscape';
import type { StoreSticker } from '@/app/actions/storeActions';

const mockGetStickerCatalog = vi.fn();
const mockPurchaseSticker = vi.fn();

vi.mock('@/app/actions/storeActions', () => ({
  getStickerCatalog: (...args: unknown[]) => mockGetStickerCatalog(...args),
  purchaseSticker: (...args: unknown[]) => mockPurchaseSticker(...args),
}));

describe('StickerStoreDrawer Component (Village Gift Shop & Positivity Economy)', () => {
  const mockCatalog: StoreSticker[] = [
    {
      id: 'stk-1',
      name: 'Lavender Sprig',
      image_url: '/stickers/lavender.png',
      cost: 20,
      tier: 1,
      decay_rate_per_day: 0.05,
      is_active: true,
    },
    {
      id: 'stk-2',
      name: 'Golden Lantern',
      image_url: '/stickers/lantern.png',
      cost: 50,
      tier: 2,
      decay_rate_per_day: 0.02,
      is_active: true,
    },
    {
      id: 'stk-3',
      name: 'Crown of Acorns',
      image_url: '/stickers/crown.png',
      cost: 150,
      tier: 3,
      decay_rate_per_day: 0.01,
      is_active: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useCozyStore.setState({ points: 100 });
    mockGetStickerCatalog.mockResolvedValue(mockCatalog);
  });

  it('renders Village Gift Shop header and loaded catalog items', async () => {
    render(<StickerStoreDrawer isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Village Gift Shop/i)).toBeInTheDocument();
    expect(screen.getByText(/Artisan Corner 🎁/i)).toBeInTheDocument();

    expect(await screen.findByText('Lavender Sprig')).toBeInTheDocument();
    expect(screen.getByText('Golden Lantern')).toBeInTheDocument();
    expect(screen.getByText('Crown of Acorns')).toBeInTheDocument();
  });

  it('filters catalog items by tier tabs', async () => {
    const user = userEvent.setup();
    render(<StickerStoreDrawer isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Lavender Sprig')).toBeInTheDocument();

    // Click "Enchanted" tier tab
    const enchantedTab = screen.getByRole('button', { name: /Enchanted/i });
    await user.click(enchantedTab);

    expect(screen.getByText('Golden Lantern')).toBeInTheDocument();
    expect(screen.queryByText('Lavender Sprig')).not.toBeInTheDocument();
    expect(screen.queryByText('Crown of Acorns')).not.toBeInTheDocument();
  });

  it('opens Wrap Warmth Gift confirmation modal when gift button clicked', async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(soundscape, 'playWoodenClick');

    render(<StickerStoreDrawer isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Lavender Sprig')).toBeInTheDocument();
    const giftButtons = screen.getAllByRole('button', { name: /Gift or Decorate ✨/i });
    await user.click(giftButtons[0]);

    expect(clickSpy).toHaveBeenCalled();
    expect(screen.getByText('Wrap Warmth Gift 🎁')).toBeInTheDocument();
    expect(screen.getByText(/Warmth Gift Exchange:/i)).toBeInTheDocument();
    expect(screen.getByText(/Remaining Balance:/i)).toBeInTheDocument();
  });

  it('completes gift exchange, plays cozy chime, updates balance, and presents success feedback', async () => {
    const user = userEvent.setup();
    const mockOnPurchased = vi.fn();
    const chimeSpy = vi.spyOn(soundscape, 'playCozyChime');

    mockPurchaseSticker.mockResolvedValue({
      success: true,
      newPoints: 80,
    });

    render(
      <StickerStoreDrawer
        isOpen={true}
        onClose={vi.fn()}
        onPurchased={mockOnPurchased}
      />
    );

    expect(await screen.findByText('Lavender Sprig')).toBeInTheDocument();
    const giftButtons = screen.getAllByRole('button', { name: /Gift or Decorate ✨/i });
    await user.click(giftButtons[0]);

    const acquireBtn = screen.getByRole('button', { name: /Acquire & Wrap Gift 🎁/i });
    await user.click(acquireBtn);

    await waitFor(() => {
      expect(mockPurchaseSticker).toHaveBeenCalledWith('stk-1');
    });

    expect(chimeSpy).toHaveBeenCalled();
    expect(useCozyStore.getState().points).toBe(80);
    expect(mockOnPurchased).toHaveBeenCalledWith(mockCatalog[0], 80);
    expect(
      await screen.findByText(/Acquired "Lavender Sprig"! Ready to gift to neighbors/i)
    ).toBeInTheDocument();
  });

  it('disables acquire button and shows warning when balance is insufficient', async () => {
    const user = userEvent.setup();
    useCozyStore.setState({ points: 10 }); // Not enough for Crown of Acorns (150)

    render(<StickerStoreDrawer isOpen={true} onClose={vi.fn()} />);

    expect(await screen.findByText('Crown of Acorns')).toBeInTheDocument();
    const crownGiftBtn = screen.getAllByRole('button', { name: /Gift or Decorate ✨/i })[2];
    await user.click(crownGiftBtn);

    expect(screen.getByText('Wrap Warmth Gift 🎁')).toBeInTheDocument();
    expect(
      screen.getByText(/Need 140 more cheer points to exchange this gift/i)
    ).toBeInTheDocument();

    const acquireBtn = screen.getByRole('button', { name: /Acquire & Wrap Gift 🎁/i });
    expect(acquireBtn).toBeDisabled();
  });
});
