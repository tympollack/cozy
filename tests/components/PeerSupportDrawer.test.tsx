import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PeerSupportDrawer } from '@/components/PeerSupportDrawer';
import { useCozyStore } from '@/store/useCozyStore';

const mockSendPeerSupport = vi.fn();
vi.mock('@/app/actions/vibeActions', () => ({
  sendPeerSupport: (...args: unknown[]) => mockSendPeerSupport(...args),
}));

describe('PeerSupportDrawer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCozyStore.setState({ points: 50 });
  });

  it('renders support drawer with recipient name and vibe badge', () => {
    render(
      <PeerSupportDrawer
        recipientId="user-robin"
        recipientName="Robin"
        vibeStatus="raincloud"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Support Robin/i)).toBeInTheDocument();
    expect(screen.getByText('🌧️ Raincloud')).toBeInTheDocument();
    expect(screen.getByText(/Send warmth & peer cheer to brighten their day/i)).toBeInTheDocument();
  });

  it('handles sending Warm Brew with optimistic points and feedback', async () => {
    const user = userEvent.setup();
    mockSendPeerSupport.mockResolvedValue({ success: true, senderPoints: 55 });

    render(
      <PeerSupportDrawer
        recipientId="user-robin"
        recipientName="Robin"
        vibeStatus="neutral"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const brewButton = screen.getByRole('button', { name: /Send Warm Brew \(\+5 Pts\)/i });
    await user.click(brewButton);

    expect(mockSendPeerSupport).toHaveBeenCalledWith('user-robin', 'brew');
    expect(useCozyStore.getState().points).toBe(55);
    expect(screen.getByText(/Sent Warm Brew to Robin!/i)).toBeInTheDocument();
  });

  it('handles Warm Brew failure gracefully', async () => {
    const user = userEvent.setup();
    mockSendPeerSupport.mockResolvedValue({ success: false, error: 'Could not send brew.' });

    render(
      <PeerSupportDrawer
        recipientId="user-robin"
        recipientName="Robin"
        vibeStatus="neutral"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const brewButton = screen.getByRole('button', { name: /Send Warm Brew \(\+5 Pts\)/i });
    await user.click(brewButton);

    expect(await screen.findByText(/Could not send brew/i)).toBeInTheDocument();
  });

  it('allows selecting Comfort Sticker and sending cheer', async () => {
    const user = userEvent.setup();
    mockSendPeerSupport.mockResolvedValue({ success: true });

    render(
      <PeerSupportDrawer
        recipientId="user-robin"
        recipientName="Robin"
        vibeStatus="sunshine"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const stickerTab = screen.getByRole('button', { name: /Comfort Sticker/i });
    await user.click(stickerTab);

    const bearSticker = screen.getByRole('button', { name: /Warm Bear/i });
    await user.click(bearSticker);

    const sendButton = screen.getByRole('button', { name: /Send Comfort Sticker/i });
    await user.click(sendButton);

    expect(mockSendPeerSupport).toHaveBeenCalledWith('user-robin', 'sticker', {
      stickerEmoji: '🧸',
    });
  });

  it('allows composing and delivering a supportive private note', async () => {
    const user = userEvent.setup();
    mockSendPeerSupport.mockResolvedValue({ success: true });

    render(
      <PeerSupportDrawer
        recipientId="user-robin"
        recipientName="Robin"
        vibeStatus="neutral"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const noteTab = screen.getByRole('button', { name: /Private Note/i });
    await user.click(noteTab);

    const textarea = screen.getByPlaceholderText(/e\.g\. Thinking of you today!/i);
    await user.type(textarea, 'Thinking of you today! Have a wonderful relaxing afternoon. 💛');

    const deliverButton = screen.getByRole('button', { name: /Deliver Private Note/i });
    await user.click(deliverButton);

    expect(mockSendPeerSupport).toHaveBeenCalledWith('user-robin', 'note', {
      noteText: 'Thinking of you today! Have a wonderful relaxing afternoon. 💛',
    });
    expect(await screen.findByText(/Supportive Note delivered directly to Robin's Mailbox/i)).toBeInTheDocument();
  });

  it('handles note delivery failure gracefully', async () => {
    const user = userEvent.setup();
    mockSendPeerSupport.mockResolvedValue({ success: false, error: 'Cozy notes must be warm only.' });

    render(
      <PeerSupportDrawer
        recipientId="user-robin"
        recipientName="Robin"
        vibeStatus="neutral"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const noteTab = screen.getByRole('button', { name: /Private Note/i });
    await user.click(noteTab);

    const textarea = screen.getByPlaceholderText(/e\.g\. Thinking of you today!/i);
    await user.type(textarea, 'Hello');

    const deliverButton = screen.getByRole('button', { name: /Deliver Private Note/i });
    await user.click(deliverButton);

    expect(await screen.findByText(/Cozy notes must be warm only/i)).toBeInTheDocument();
  });
});
