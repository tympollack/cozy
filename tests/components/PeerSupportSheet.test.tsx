import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeerSupportSheet } from '@/components/PeerSupportSheet';
import { useCozyStore } from '@/store/useCozyStore';

const mockSendPeerSupport = vi.fn();
vi.mock('@/app/actions/supportActions', () => ({
  sendPeerSupport: (...args: unknown[]) => mockSendPeerSupport(...args),
}));

describe('PeerSupportSheet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCozyStore.setState({ points: 20 });
  });

  it('renders quick action sheet for map-anchored peer support', () => {
    render(
      <PeerSupportSheet
        recipientId="peer-alex"
        recipientName="Alex"
        vibeStatus="neutral"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('☕ Cozy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Warm Brew/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sticker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Note/i })).toBeInTheDocument();
  });

  it('triggers quick Warm Brew action and fires onBrewSent callback', async () => {
    const user = userEvent.setup();
    const onBrewSent = vi.fn();
    mockSendPeerSupport.mockResolvedValue({ success: true, pointsAwarded: 5 });

    render(
      <PeerSupportSheet
        recipientId="peer-alex"
        recipientName="Alex"
        vibeStatus="neutral"
        isOpen={true}
        onClose={vi.fn()}
        onBrewSent={onBrewSent}
      />
    );

    const brewButton = screen.getByRole('button', { name: /Warm Brew/i });
    await user.click(brewButton);

    expect(onBrewSent).toHaveBeenCalledWith('peer-alex');
    expect(useCozyStore.getState().points).toBe(25);
  });

  it('allows picking a comfort sticker and sending immediately', async () => {
    const user = userEvent.setup();
    const onBrewSent = vi.fn();
    mockSendPeerSupport.mockResolvedValue({ success: true, pointsAwarded: 5 });

    render(
      <PeerSupportSheet
        recipientId="peer-alex"
        recipientName="Alex"
        vibeStatus="sunshine"
        isOpen={true}
        onClose={vi.fn()}
        onBrewSent={onBrewSent}
      />
    );

    const stickerTab = screen.getByRole('button', { name: /Sticker/i });
    await user.click(stickerTab);

    // Pick a sticker emoji
    const flameSticker = screen.getByTitle('Cozy Flame');
    await user.click(flameSticker);

    expect(mockSendPeerSupport).toHaveBeenCalledWith('peer-alex', 'sticker', '🕯️');
    expect(onBrewSent).toHaveBeenCalledWith('peer-alex');
  });

  it('allows typing a private note and delivering to porch', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockSendPeerSupport.mockResolvedValue({ success: true });

    render(
      <PeerSupportSheet
        recipientId="peer-alex"
        recipientName="Alex"
        vibeStatus="raincloud"
        isOpen={true}
        onClose={onClose}
      />
    );

    const noteTab = screen.getByRole('button', { name: /Note/i });
    await user.click(noteTab);

    const textarea = screen.getByPlaceholderText(/Leave a gentle note for Alex's porch/i);
    await user.type(textarea, 'Thinking of you today! 💛');

    const deliverButton = screen.getByRole('button', { name: /Deliver to Porch/i });
    await user.click(deliverButton);

    expect(mockSendPeerSupport).toHaveBeenCalledWith('peer-alex', 'note', 'Thinking of you today! 💛');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles cancel button in note composer and close button in sheet header', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <PeerSupportSheet
        recipientId="peer-alex"
        recipientName="Alex"
        vibeStatus="neutral"
        isOpen={true}
        onClose={onClose}
      />
    );

    const noteTab = screen.getByRole('button', { name: /Note/i });
    await user.click(noteTab);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    const closeButton = screen.getByRole('button', { name: /Close/i });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
