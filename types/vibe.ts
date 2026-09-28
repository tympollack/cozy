import type { SelectableTileVariant } from '@digitalcanopy/ui';
import type { VibeStatus } from '@/store/useCozyStore';

export type { VibeStatus };

export type VibeTier = 'positive' | 'neutral' | 'distress';

export interface VibeItem {
  id: VibeStatus;
  title: string;
  description: string;
  emoji: string;
  variant: SelectableTileVariant;
  tier: VibeTier;
}

export interface VibeGroup {
  id: VibeTier;
  label: string;
  icon: string;
  items: VibeItem[];
}

export const VIBE_GROUPS: VibeGroup[] = [
  {
    id: 'positive',
    label: 'FEELING GOOD',
    icon: '✦',
    items: [
      {
        id: 'sunshine',
        title: 'Sunshine',
        description: 'Energized, clean, thriving space',
        emoji: '☀️',
        variant: 'amber',
        tier: 'positive',
      },
      {
        id: 'breezy',
        title: 'Breezy',
        description: 'Light, refreshed, moving through the day',
        emoji: '🌬️',
        variant: 'sky',
        tier: 'positive',
      },
      {
        id: 'starlight',
        title: 'Starlight',
        description: 'Calm, reflective night energy',
        emoji: '✨',
        variant: 'purple',
        tier: 'positive',
      },
    ],
  },
  {
    id: 'neutral',
    label: 'STEADY COZY',
    icon: '☕',
    items: [
      {
        id: 'neutral',
        title: 'Cozy / Neutral',
        description: 'Steady, peaceful & relaxing day',
        emoji: '☕',
        variant: 'stone',
        tier: 'neutral',
      },
    ],
  },
  {
    id: 'distress',
    label: 'NEED SOME WARMTH',
    icon: '🌧',
    items: [
      {
        id: 'foggy',
        title: 'Foggy',
        description: 'A little unclear, low energy today',
        emoji: '🌫️',
        variant: 'slate',
        tier: 'distress',
      },
      {
        id: 'raincloud',
        title: 'Raincloud',
        description: 'Overwhelmed, messy, or needing a lift',
        emoji: '🌧️',
        variant: 'indigo',
        tier: 'distress',
      },
    ],
  },
];

export const ALL_VIBE_ITEMS: VibeItem[] = VIBE_GROUPS.flatMap((g) => g.items);
