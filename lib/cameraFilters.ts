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
    css: 'sepia(0.22) saturate(1.28) brightness(1.04) contrast(1.02) hue-rotate(-6deg)',
    description: 'Warm late-afternoon sunlight',
  },
  {
    id: 'candlelight',
    name: 'Candlelight',
    emoji: '🕯️',
    css: 'sepia(0.35) saturate(1.35) brightness(0.96) contrast(1.08) hue-rotate(-12deg)',
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
