export interface GroupTypeMeta {
  label: string;
  emoji: string;
  palette: 'cozy' | 'futuristic';
  capacity: number;
  minToUpgrade: number;
  themeId: string;
}

export const GROUP_TYPE_META: Record<string, GroupTypeMeta> = {
  household:    { label: 'Household',          emoji: '🏠', palette: 'cozy',       capacity: 10,   minToUpgrade: 3,   themeId: 'default_dollhouse' },
  building:     { label: 'Building',            emoji: '🏢', palette: 'cozy',       capacity: 30,   minToUpgrade: 10,  themeId: 'cozy_building'     },
  neighborhood: { label: 'Neighborhood',        emoji: '🏘️', palette: 'futuristic', capacity: 75,   minToUpgrade: 25,  themeId: 'neon_neighborhood' },
  village:      { label: 'Village',             emoji: '🌿', palette: 'cozy',       capacity: 150,  minToUpgrade: 50,  themeId: 'cozy_village'      },
  town:         { label: 'Town',                emoji: '🏙️', palette: 'futuristic', capacity: 500,  minToUpgrade: 150, themeId: 'cyber_town'        },
  city:         { label: 'City',                emoji: '🌆', palette: 'futuristic', capacity: 2000, minToUpgrade: 500, themeId: 'neon_city'         },
  island:       { label: 'Island',              emoji: '🏝️', palette: 'futuristic', capacity: 500,  minToUpgrade: 100, themeId: 'island_collective'  },
  space_station:{ label: 'Orbital Collective',  emoji: '🛸', palette: 'futuristic', capacity: 9999, minToUpgrade: 0,   themeId: 'orbital_collective' },
};
