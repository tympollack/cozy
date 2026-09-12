/**
 * Compassionate, non-punitive notification copywriting matrix for Cozy.
 * Adapts to seasons and circadian day/night rhythms with zero guilt or pressure.
 */

export type CircadianPhase = 'light' | 'dark';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface CircadianCopyEntry {
  title: string;
  message: string;
}

export const CIRCADIAN_COPY_MATRIX: Record<
  CircadianPhase,
  Record<Season, CircadianCopyEntry[]>
> = {
  light: {
    spring: [
      {
        title: '🌸 Morning Sunlit Bloom',
        message: "Find a sunlit corner: A gentle moment to snap a cozy, sun-drenched surface with your Light photo (+25 pts).",
      },
      {
        title: '☀️ Morning Space Check-in',
        message: "Capture today's Light photo to brighten your space and start your daily reset (+25 pts)!",
      },
      {
        title: '🌱 Fresh Morning Daylight',
        message: "Notice one small corner that brings you calm today and capture your Light photo (+25 pts).",
      },
    ],
    summer: [
      {
        title: '☀️ Morning Sunlit Corner',
        message: "Capture today's Light photo to brighten your space and start your daily reset (+25 pts)!",
      },
      {
        title: '🌿 Golden Morning Sunbeam',
        message: "Soft morning rays: Share a glimpse of your room with today's Light photo whenever you feel up to it (+25 pts).",
      },
      {
        title: '☀️ Morning Space Check-in',
        message: "No rush, no pressure: Snap a quiet Light photo of your sanctuary to begin the day (+25 pts).",
      },
    ],
    autumn: [
      {
        title: '🍂 Gentle Morning Daylight',
        message: "Morning reset: Notice one small space that brings you calm today and capture your Light photo (+25 pts).",
      },
      {
        title: '☀️ Morning Space Check-in',
        message: "Capture today's Light photo to brighten your space and start your daily reset (+25 pts)!",
      },
      {
        title: '🍁 Soft Amber Morning',
        message: "Find a quiet nook: Capture today's Light photo at your own pace (+25 pts).",
      },
    ],
    winter: [
      {
        title: '❄️ Cozy Winter Sunbeam',
        message: "Capture today's Light photo to brighten your space and start your daily reset (+25 pts)!",
      },
      {
        title: '☀️ Morning Space Check-in',
        message: "Find a sunlit corner: A gentle moment to snap a cozy, sun-drenched surface with your Light photo (+25 pts).",
      },
      {
        title: '🕯️ Quiet Daylight Reset',
        message: "Take your time: Capture a calm Light photo of your space today (+25 pts).",
      },
    ],
  },
  dark: {
    spring: [
      {
        title: '🌙 Twilight Garden Glow',
        message: "Evening wind-down: Snap your cozy night lighting with a Dark photo and let the day rest (+50 pts).",
      },
      {
        title: '🌙 Evening Space Check-in',
        message: "Capture tonight's Dark photo to complete your Light & Dark dual mode and claim full bonus points (+50 pts)!",
      },
      {
        title: '✨ Soft Spring Evening',
        message: "Gentle twilight: Winding down tonight? Share your ambient cozy space with a Dark photo (+50 pts).",
      },
    ],
    summer: [
      {
        title: '🌙 Evening Warm Breeze',
        message: "Capture tonight's Dark photo to complete your Light & Dark dual mode and claim full bonus points (+50 pts)!",
      },
      {
        title: '🌙 Evening Space Check-in',
        message: "Lamps & shadows: Capture the warm ambient glow of your evening sanctuary with a Dark photo (+50 pts).",
      },
      {
        title: '🌌 Starlit Wind-Down',
        message: "Putting the room to sleep with a cozy Dark photo (+50 pts).",
      },
    ],
    autumn: [
      {
        title: '🍁 Amber Hearthside Twilight',
        message: "Evening wind-down: Snap your cozy night lighting with a Dark photo and let the day rest (+50 pts).",
      },
      {
        title: '🌙 Evening Space Check-in',
        message: "Capture tonight's Dark photo to complete your Light & Dark dual mode and claim full bonus points (+50 pts)!",
      },
      {
        title: '🕯️ Warm Lantern Glow',
        message: "Gentle twilight: Winding down tonight? Share your ambient cozy space with a Dark photo (+50 pts).",
      },
    ],
    winter: [
      {
        title: '✨ Cozy Candlelit Night',
        message: "Capture tonight's Dark photo to complete your Light & Dark dual mode and claim full bonus points (+50 pts)!",
      },
      {
        title: '🌙 Evening Space Check-in',
        message: "Bedtime comfort: Putting the room to sleep with a cozy Dark photo (+50 pts).",
      },
      {
        title: '❄️ Peaceful Winter Twilight',
        message: "Lamps & shadows: Capture the warm ambient glow of your evening sanctuary with a Dark photo (+50 pts).",
      },
    ],
  },
};

/**
 * Computes season from a month index (0-11).
 */
export function getSeason(date: Date = new Date()): Season {
  const month = date.getUTCMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Retrieves compassionate notification copy for the given phase and date.
 * Guarantees inclusion of "Light photo" or "Dark photo" for backwards compatibility.
 */
export function getCircadianNotificationCopy(
  phase: CircadianPhase,
  date: Date = new Date()
): CircadianCopyEntry {
  const season = getSeason(date);
  const options = CIRCADIAN_COPY_MATRIX[phase][season];
  // Deterministic daily rotation based on day of month to avoid random jitter
  const dayIndex = date.getUTCDate();
  const entry = options[dayIndex % options.length];
  return entry;
}
