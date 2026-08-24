export interface TestCitizen {
  email: string;
  name: string;
  role: string;
  description: string;
}

export const TEST_CITIZENS: TestCitizen[] = [
  { email: 'chloe@cozy.test', name: 'Chloe', role: 'Citizen', description: 'Tier 2 Dollhouse • 90 Tokens' },
  { email: 'willow@cozy.test', name: 'Willow', role: 'Citizen', description: 'Cozy spaces shared' },
  { email: 'leo@cozy.test', name: 'Leo', role: 'Citizen', description: 'Active home designer' },
  { email: 'sam@cozy.test', name: 'Sam', role: 'Citizen', description: 'Clean minimal space' },
  { email: 'maya@cozy.test', name: 'Maya', role: 'Citizen', description: 'Boho plant lover' },
  { email: 'oliver@cozy.test', name: 'Oliver', role: 'Citizen', description: 'Night owl workspace' },
];
