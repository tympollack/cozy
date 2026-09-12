import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraggableSticker } from '@/components/DraggableSticker';
import { useCozyStore } from '@/store/useCozyStore';
import * as soundscape from '@/lib/audio/soundscape';

const mockPlaceSticker = vi.fn();
vi.mock('@/app/actions/stickerActions', () => ({
  placeSticker: (...args: unknown[]) => mockPlaceSticker(...args),
}));

describe('DraggableSticker Component', () => {
  const mockSticker = {
    id: 'st-1',
    name: 'Artisan Teapot',
    imageUrl: '/stickers/teapot.png',
    cost: 15,
    decayRate: 0.05,
    description: 'A comforting handcrafted ceramic teapot',
  };

  const containerRef = {
    current: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400,
        right: 400,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    } as unknown as HTMLDivElement,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useCozyStore.setState({ points: 100 });
  });

  it('renders sticker image, rotate button, and action controls', () => {
    render(
      <DraggableSticker
        sticker={mockSticker}
        postId="post-123"
        containerRef={containerRef}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByAltText('Artisan Teapot')).toBeInTheDocument();
    expect(screen.getByTestId('rotate-sticker-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Place it!/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockCancel = vi.fn();

    render(
      <DraggableSticker
        sticker={mockSticker}
        postId="post-123"
        containerRef={containerRef}
        onConfirm={vi.fn()}
        onCancel={mockCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('confirms placement, invokes placeSticker action, plays soundscape, and updates points', async () => {
    const user = userEvent.setup();
    const mockConfirm = vi.fn();
    const chimeSpy = vi.spyOn(soundscape, 'playCozyChime');
    const clickSpy = vi.spyOn(soundscape, 'playWoodenClick');

    mockPlaceSticker.mockResolvedValue({
      success: true,
      newPoints: 85,
    });

    render(
      <DraggableSticker
        sticker={mockSticker}
        postId="post-123"
        containerRef={containerRef}
        onConfirm={mockConfirm}
        onCancel={vi.fn()}
      />
    );

    const placeButton = screen.getByRole('button', { name: /Place it!/i });
    await user.click(placeButton);

    await waitFor(() => {
      expect(mockPlaceSticker).toHaveBeenCalledWith(
        'post-123',
        mockSticker.imageUrl,
        mockSticker.cost,
        mockSticker.decayRate,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    expect(clickSpy).toHaveBeenCalled();
    expect(chimeSpy).toHaveBeenCalled();
    expect(useCozyStore.getState().points).toBe(85);
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        sticker_url: mockSticker.imageUrl,
        cost: 15,
        decay_rate_per_day: 0.05,
      })
    );
  });

  it('displays error message when placeSticker fails', async () => {
    const user = userEvent.setup();
    mockPlaceSticker.mockResolvedValue({
      success: false,
      error: 'Not enough cheer points to place this sticker.',
    });

    render(
      <DraggableSticker
        sticker={mockSticker}
        postId="post-123"
        containerRef={containerRef}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const placeButton = screen.getByRole('button', { name: /Place it!/i });
    await user.click(placeButton);

    expect(
      await screen.findByText('Not enough cheer points to place this sticker.')
    ).toBeInTheDocument();
  });
});
