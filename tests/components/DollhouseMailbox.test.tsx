import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DollhouseMailbox } from '@/components/DollhouseMailbox';

const mockAcceptCallingCard = vi.fn();
const mockDeclineCallingCard = vi.fn();
const mockSendCallingCard = vi.fn();
const mockGetPrivateNotes = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/profile/maya',
}));

vi.mock('@/app/actions/peerActions', () => ({
  sendCallingCard: (...args: unknown[]) => mockSendCallingCard(...args),
  acceptCallingCard: (...args: unknown[]) => mockAcceptCallingCard(...args),
  declineCallingCard: (...args: unknown[]) => mockDeclineCallingCard(...args),
}));

vi.mock('@/app/actions/vibeActions', () => ({
  getPrivateNotes: (...args: unknown[]) => mockGetPrivateNotes(...args),
}));

describe('DollhouseMailbox Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPrivateNotes.mockResolvedValue([
      {
        id: 'note-1',
        senderId: 'user-sender',
        senderName: 'Sam',
        recipientId: 'user-me',
        message: 'Hope you have a peaceful morning! ☕',
        sentAt: new Date().toISOString(),
      },
    ]);
  });

  it('renders mailbox button with pending cards count for owner', () => {
    const pendingCards = [
      {
        peerId: 'peer-1',
        requesterId: 'req-1',
        requesterName: 'Robin',
        sentAt: new Date().toISOString(),
      },
    ];

    render(
      <DollhouseMailbox
        isOwner={true}
        peerStatus="none"
        pendingCards={pendingCards}
        recipientId="user-me"
        currentUserId="user-me"
      />
    );

    expect(screen.getByText(/1 card/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Mailbox/i })).toBeInTheDocument();
  });

  it('opens Mailbox modal and allows accepting or declining calling cards', async () => {
    const user = userEvent.setup();
    mockAcceptCallingCard.mockResolvedValue({ success: true, newPoints: 105 });
    mockDeclineCallingCard.mockResolvedValue({ success: true });

    const pendingCards = [
      {
        peerId: 'peer-card-42',
        requesterId: 'req-1',
        requesterName: 'Robin',
        sentAt: new Date().toISOString(),
      },
    ];

    render(
      <DollhouseMailbox
        isOwner={true}
        peerStatus="none"
        pendingCards={pendingCards}
        recipientId="user-me"
        currentUserId="user-me"
      />
    );

    const mailboxButton = screen.getByRole('button', { name: /Open Mailbox/i });
    await user.click(mailboxButton);

    expect(screen.getByText('Your Dollhouse Mailbox')).toBeInTheDocument();
    expect(screen.getByText('Robin')).toBeInTheDocument();

    // Decline card
    const declineButton = screen.getByTitle('Decline');
    await user.click(declineButton);
    expect(mockDeclineCallingCard).toHaveBeenCalledWith('peer-card-42', '/profile/maya');
  });

  it('switches to Private Notes tab in mailbox modal and renders empty notes message when empty', async () => {
    const user = userEvent.setup();
    mockGetPrivateNotes.mockResolvedValueOnce([]);

    render(
      <DollhouseMailbox
        isOwner={true}
        peerStatus="none"
        pendingCards={[]}
        recipientId="user-me"
        currentUserId="user-me"
      />
    );

    const mailboxButton = screen.getByRole('button', { name: /Open Mailbox/i });
    await user.click(mailboxButton);

    const notesTab = screen.getByRole('button', { name: /Private Notes/i });
    await user.click(notesTab);

    expect(await screen.findByText(/No private notes yet/i)).toBeInTheDocument();
  });

  it('allows visitors to leave a Calling Card and handles send errors', async () => {
    const user = userEvent.setup();
    mockSendCallingCard.mockResolvedValue({ success: false, error: 'Insufficient points to leave a card.' });

    render(
      <DollhouseMailbox
        isOwner={false}
        peerStatus="none"
        pendingCards={[]}
        recipientId="user-host"
        currentUserId="user-visitor"
      />
    );

    const visitorButton = screen.getByRole('button', { name: /Leave Calling Card/i });
    await user.click(visitorButton);

    expect(mockSendCallingCard).toHaveBeenCalledWith('user-host', '/profile/maya');
    expect(await screen.findByText(/Insufficient points/i)).toBeInTheDocument();
  });
});
