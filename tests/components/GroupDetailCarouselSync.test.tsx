import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupDetailClient } from '@/components/GroupDetailClient';
import type { GroupRow, GroupMemberRow, MyGroupEntry } from '@/app/actions/groupActions';

const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockPrefetch = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    prefetch: mockPrefetch,
  }),
}));

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/supabase-browser', () => ({
  createBrowserClient: () => ({
    channel: () => mockChannel,
    removeChannel: vi.fn(),
  }),
}));

const mockGetGroupPageBundle = vi.fn();
vi.mock('@/app/actions/groupActions', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getGroupPageBundle: (id: string) => mockGetGroupPageBundle(id),
  };
});

describe('GroupDetailClient Carousel Member Query Invalidation', () => {
  const groupA: GroupRow = {
    id: 'grp-a',
    name: 'Sanctuary A',
    type: 'household',
    min_members: 1,
    max_members: 10,
    pooled_points: 100,
    theme_id: 'default_dollhouse',
    invite_code: 'INVITEA',
    created_at: new Date().toISOString(),
  };

  const groupB: GroupRow = {
    id: 'grp-b',
    name: 'Sanctuary B',
    type: 'household',
    min_members: 1,
    max_members: 10,
    pooled_points: 200,
    theme_id: 'default_dollhouse',
    invite_code: 'INVITEB',
    created_at: new Date().toISOString(),
  };

  const membersA: GroupMemberRow[] = [
    {
      user_id: 'user-alex',
      role: 'admin',
      joined_at: new Date().toISOString(),
      display_name: 'Alex From Group A',
      avatar_url: null,
      points: 80,
    },
  ];

  const membersB: GroupMemberRow[] = [
    {
      user_id: 'user-maya',
      role: 'member',
      joined_at: new Date().toISOString(),
      display_name: 'Maya From Group B',
      avatar_url: null,
      points: 120,
    },
  ];

  const myGroups: MyGroupEntry[] = [
    { group: groupA, role: 'admin', memberCount: 1 },
    { group: groupB, role: 'member', memberCount: 1 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGroupPageBundle.mockImplementation(async (id: string) => {
      if (id === 'grp-b') {
        return {
          groupWithMembers: {
            group: groupB,
            members: membersB,
            currentUserRole: 'member',
            memberCount: 1,
          },
          activeChallenge: null,
        };
      }
      return {
        groupWithMembers: {
          group: groupA,
          members: membersA,
          currentUserRole: 'admin',
          memberCount: 1,
        },
        activeChallenge: null,
      };
    });
  });

  it('renders initial group A members', () => {
    render(
      <GroupDetailClient
        group={groupA}
        members={membersA}
        currentUserRole="admin"
        memberCount={1}
        currentUserId="user-viewer"
        myGroups={myGroups}
      />
    );

    expect(screen.getByText('Sanctuary A')).toBeInTheDocument();
    expect(screen.getByText('Alex From Group A')).toBeInTheDocument();
    expect(screen.queryByText('Maya From Group B')).not.toBeInTheDocument();
  });

  it('rotates to group B, invalidates member cache, reconciles URL, and avoids ghost members', async () => {
    const user = userEvent.setup();

    render(
      <GroupDetailClient
        group={groupA}
        members={membersA}
        currentUserRole="admin"
        memberCount={1}
        currentUserId="user-viewer"
        myGroups={myGroups}
      />
    );

    // Initial group A verification
    expect(screen.getByText('Sanctuary A')).toBeInTheDocument();
    expect(screen.getByText('Alex From Group A')).toBeInTheDocument();

    // Click next group chevron
    const nextBtn = screen.getByRole('link', { name: /Next group/i });
    await user.click(nextBtn);

    // URL router reconciliation
    expect(mockReplace).toHaveBeenCalledWith('/groups/grp-b', { scroll: false });

    // Roster should immediately clear group A's members and hydrate group B's members
    await waitFor(() => {
      expect(screen.getByText('Sanctuary B')).toBeInTheDocument();
      expect(screen.getByText('Maya From Group B')).toBeInTheDocument();
    });

    // Zero cross-contamination: Alex from group A must NOT appear in group B
    expect(screen.queryByText('Alex From Group A')).not.toBeInTheDocument();
  });
});
