import { describe, it, expect } from 'vitest';
import {
  getSeason,
  getCircadianNotificationCopy,
  CIRCADIAN_COPY_MATRIX,
} from '@/lib/circadianCopy';

describe('circadianCopy matrix', () => {
  it('correctly maps month indices to seasons', () => {
    expect(getSeason(new Date('2026-03-15T12:00:00Z'))).toBe('spring');
    expect(getSeason(new Date('2026-04-01T12:00:00Z'))).toBe('spring');
    expect(getSeason(new Date('2026-05-31T12:00:00Z'))).toBe('spring');

    expect(getSeason(new Date('2026-06-01T12:00:00Z'))).toBe('summer');
    expect(getSeason(new Date('2026-07-15T12:00:00Z'))).toBe('summer');
    expect(getSeason(new Date('2026-08-31T12:00:00Z'))).toBe('summer');

    expect(getSeason(new Date('2026-09-01T12:00:00Z'))).toBe('autumn');
    expect(getSeason(new Date('2026-10-15T12:00:00Z'))).toBe('autumn');
    expect(getSeason(new Date('2026-11-30T12:00:00Z'))).toBe('autumn');

    expect(getSeason(new Date('2026-12-01T12:00:00Z'))).toBe('winter');
    expect(getSeason(new Date('2026-01-15T12:00:00Z'))).toBe('winter');
    expect(getSeason(new Date('2026-02-28T12:00:00Z'))).toBe('winter');
  });

  it('guarantees Light photo inclusion and compassionate phrasing for light phase', () => {
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
    for (const season of seasons) {
      const entries = CIRCADIAN_COPY_MATRIX.light[season];
      expect(entries.length).toBeGreaterThanOrEqual(2);
      for (const entry of entries) {
        expect(entry.message).toContain('Light photo');
        // Ensure non-punitive, gentle language
        expect(entry.message).not.toMatch(/streak|failed|missed|hurry|penalty/i);
      }
    }
  });

  it('guarantees Dark photo inclusion and soothing evening phrasing for dark phase', () => {
    const seasons = ['spring', 'summer', 'autumn', 'winter'] as const;
    for (const season of seasons) {
      const entries = CIRCADIAN_COPY_MATRIX.dark[season];
      expect(entries.length).toBeGreaterThanOrEqual(2);
      for (const entry of entries) {
        expect(entry.message).toContain('Dark photo');
        expect(entry.message).not.toMatch(/streak|failed|missed|hurry|penalty/i);
      }
    }
  });

  it('getCircadianNotificationCopy returns valid copy for dates across the year', () => {
    const springDate = new Date('2026-04-10T09:00:00Z');
    const springLight = getCircadianNotificationCopy('light', springDate);
    expect(springLight.title).toBeTruthy();
    expect(springLight.message).toContain('Light photo');

    const autumnDate = new Date('2026-10-25T20:00:00Z');
    const autumnDark = getCircadianNotificationCopy('dark', autumnDate);
    expect(autumnDark.title).toBeTruthy();
    expect(autumnDark.message).toContain('Dark photo');
  });
});
