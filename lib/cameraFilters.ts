export type CameraFilter = 'natural' | 'golden_hour' | 'candlelight' | 'soft_honey';

export interface FilterOption {
  id: CameraFilter;
  name: string;
  emoji: string;
  css: string;
  description: string;
}

export const CAMERA_WARMTH_FILTERS: FilterOption[] = [
  {
    id: 'natural',
    name: 'Natural',
    emoji: '🌿',
    css: 'none',
    description: 'Crisp original lighting',
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    emoji: '🌅',
    css: 'sepia(0.25) saturate(1.2) contrast(1.05)',
    description: 'Warm late-afternoon sunlight',
  },
  {
    id: 'candlelight',
    name: 'Candlelight',
    emoji: '🕯️',
    css: 'sepia(0.4) saturate(1.3) brightness(0.95)',
    description: 'Cozy hearth & firelight amber glow',
  },
  {
    id: 'soft_honey',
    name: 'Soft Honey',
    emoji: '🍯',
    css: 'sepia(0.15) saturate(1.18) brightness(1.02) contrast(1.0)',
    description: 'Gentle honeyed morning warmth',
  },
];
