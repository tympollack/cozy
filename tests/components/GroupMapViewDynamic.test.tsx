import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GroupMapView } from '@/components/GroupMapView';
import type { GroupRow } from '@/app/actions/groupActions';
import type { VillageMapTheme } from '@/config/villageMapThemes';

describe('GroupMapView Dynamic Plot Layouts', () => {
  const mockGroup: GroupRow = {
    id: 'grp_orbital',
    name: 'groupgroup1',
    type: 'space_station',
    min_members: 1,
    max_members: 9999,
    pooled_points: 0,
    theme_id: 'orbital_collective',
    invite_code: 'B80A12E6',
    created_at: new Date().toISOString(),
  };

  const mockMembers = [
    {
      user_id: 'user_1',
      role: 'admin' as const,
      joined_at: new Date().toISOString(),
      display_name: 'You',
      avatar_url: null,
      points: 100,
    },
    {
      user_id: 'user_2',
      role: 'member' as const,
      joined_at: new Date().toISOString(),
      display_name: 'Cozy',
      avatar_url: null,
      points: 50,
    },
  ];

  it('renders member plots and vacant plots at custom database anchor coordinates', () => {
    const customDbTheme: VillageMapTheme = {
      id: 'orbital_collective',
      name: 'Orbital Collective',
      backgroundImage: '/images/neighborhood-orbital.jpg',
      palette: 'futuristic',
      vignetteGradient: 'radial-gradient(...)',
      anchors: [
        { x: 49, y: 11 }, // Plot #1
        { x: 25, y: 32 }, // Plot #2
        { x: 10, y: 42 }, // Plot #3 (vacant open slot)
      ],
    };

    const { container } = render(
      <GroupMapView
        group={mockGroup}
        members={mockMembers}
        currentUserId="user_1"
        mapTheme={customDbTheme}
      />
    );

    // Verify member names appear
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Cozy')).toBeInTheDocument();

    // Check plot positions in container
    const plotContainers = screen.getAllByTestId('plot-anchor');
    expect(plotContainers.length).toBe(3);

    // Plot 1: (49%, 11%)
    expect((plotContainers[0] as HTMLElement).style.left).toBe('49%');
    expect((plotContainers[0] as HTMLElement).style.top).toBe('11%');

    // Plot 2: (25%, 32%)
    expect((plotContainers[1] as HTMLElement).style.left).toBe('25%');
    expect((plotContainers[1] as HTMLElement).style.top).toBe('32%');

    // Plot 3 (Vacant): (10%, 42%)
    expect((plotContainers[2] as HTMLElement).style.left).toBe('10%');
    expect((plotContainers[2] as HTMLElement).style.top).toBe('42%');
  });
});
