import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinDropZone } from '@/components/PinDropZone';
import { ShoppableImage } from '@/components/ShoppableImage';
import type { ItemPin } from '@/store/useCozyStore';

const mockCreateItemPin = vi.fn();
vi.mock('@/app/actions/pinActions', () => ({
  createItemPin: (...args: unknown[]) => mockCreateItemPin(...args),
  deleteItemPin: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Shoppable Pins & Makerverse Linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides a button to link Makerverse shop item in PinDropZone', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    render(<PinDropZone postId="post_123" onCancel={onCancel} onSuccess={onSuccess} />);

    // Advance from drag reticle to form step
    const confirmLocBtn = screen.getByRole('button', { name: /Confirm pin location/i });
    await user.click(confirmLocBtn);

    // Verify Makerverse link buttons exist once step transition completes
    const makerverseButton = await screen.findByRole('button', { name: /Link Makerverse Shop Item/i });
    expect(makerverseButton).toBeInTheDocument();

    // Click Makerverse button
    await user.click(makerverseButton);

    const urlInput = (await screen.findByPlaceholderText(/makerverse\.com\/item/i)) as HTMLInputElement;
    expect(urlInput.value).toBe('https://makerverse.com/item/');
    expect(await screen.findByText(/✓ Makerverse Shop Item Linked/i)).toBeInTheDocument();
  });

  it('renders Makerverse badge in ShoppableImage for Makerverse shop links', async () => {
    const user = userEvent.setup();
    const pins: ItemPin[] = [
      {
        id: 'pin_1',
        user_id: 'user_maker',
        title: 'Handmade Cozy Ceramic Mug',
        url: 'https://makerverse.com/item/ceramic-mug-001',
        x_percent: 50,
        y_percent: 50,
      },
    ];

    render(
      <ShoppableImage itemPins={pins} currentUserId="user_maker">
        <div data-testid="image-child">Sample Photo</div>
      </ShoppableImage>
    );

    // Click pin dot to open popover
    const pinButton = screen.getByRole('button', { name: /details for Handmade Cozy Ceramic Mug/i });
    await user.click(pinButton);

    // Verify title, Makerverse badge, and CTA
    expect(screen.getByText('Handmade Cozy Ceramic Mug')).toBeInTheDocument();
    expect(screen.getByText('Makerverse Shop')).toBeInTheDocument();
    const shopLink = screen.getByRole('link', { name: /Makerverse/i });
    expect(shopLink).toHaveAttribute('href', 'https://makerverse.com/item/ceramic-mug-001');
  });
});
