import { describe, it, expect } from 'vitest';
import { getDefaultTimeMode } from '@/lib/photoTimeUtils';

describe('getDefaultTimeMode', () => {
  const dualPost = {
    light_img_url: 'https://cdn.cozy.space/light.jpg',
    dark_img_url: 'https://cdn.cozy.space/dark.jpg',
  };

  const lightOnlyPost = {
    light_img_url: 'https://cdn.cozy.space/light.jpg',
    dark_img_url: null,
  };

  const darkOnlyPost = {
    light_img_url: null,
    dark_img_url: 'https://cdn.cozy.space/dark.jpg',
  };

  it('defaults to light mode during daytime hours (06:00 to 18:00) when dual captures exist', () => {
    expect(getDefaultTimeMode(dualPost, 6)).toBe('light'); // 06:00 boundary
    expect(getDefaultTimeMode(dualPost, 12)).toBe('light'); // Midday
    expect(getDefaultTimeMode(dualPost, 17)).toBe('light'); // 17:00
  });

  it('defaults to dark mode during evening and nighttime hours (< 06:00 or >= 18:00) when dual captures exist', () => {
    expect(getDefaultTimeMode(dualPost, 18)).toBe('dark'); // 18:00 boundary
    expect(getDefaultTimeMode(dualPost, 22)).toBe('dark'); // Late night
    expect(getDefaultTimeMode(dualPost, 0)).toBe('dark'); // Midnight
    expect(getDefaultTimeMode(dualPost, 5)).toBe('dark'); // Early morning
  });

  it('falls back to whichever photo exists if designated mode image is null', () => {
    // In daytime (12:00), but only dark photo exists -> returns dark
    expect(getDefaultTimeMode(darkOnlyPost, 12)).toBe('dark');

    // In nighttime (22:00), but only light photo exists -> returns light
    expect(getDefaultTimeMode(lightOnlyPost, 22)).toBe('light');
  });

  it('returns light when no post or empty post is provided', () => {
    expect(getDefaultTimeMode(null)).toBe('light');
    expect(getDefaultTimeMode({})).toBe('light');
  });
});
