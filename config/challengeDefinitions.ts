export interface GroupChallenge {
  id: string;
  groupId: string;
  title: string;
  description: string;
  multiplier: number; // e.g. 1.25, 1.5, 2.0
  createdBy: string;
  createdAt: string;
  completedUserIds: string[];
}

export interface ChallengeActionResult {
  success: boolean;
  newPersonalPoints?: number;
  newGroupPoints?: number;
  error?: string;
}

/**
 * Default preset positive weekly challenges if none created yet for a group.
 */
export const DEFAULT_CHALLENGES: Omit<GroupChallenge, 'groupId' | 'createdBy'>[] = [
  {
    id: 'c1',
    title: 'Desk & Workspace Refresh 🧹',
    description: 'Tidy up your main desk surface, wipe down your screen, and take a 5-minute breather.',
    multiplier: 1.5,
    createdAt: new Date().toISOString(),
    completedUserIds: [],
  },
  {
    id: 'c2',
    title: 'Hydrate & Hydrate Plant 🌿',
    description: 'Drink a full glass of water and give your houseplants or outdoor greenery a quick watering.',
    multiplier: 1.25,
    createdAt: new Date().toISOString(),
    completedUserIds: [],
  },
  {
    id: 'c3',
    title: 'Digital Sunshine Break ☀️',
    description: 'Step outside for 10 minutes of natural sunlight without looking at any notifications.',
    multiplier: 2.0,
    createdAt: new Date().toISOString(),
    completedUserIds: [],
  },
];
