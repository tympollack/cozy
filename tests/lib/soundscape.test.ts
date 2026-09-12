import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAudioMuted,
  playCozyChime,
  playWoodenClick,
  playPaperRustle,
  playTeaPour,
  playCameraShutter,
  playSound,
} from '@/lib/audio/soundscape';
import { useCozyStore } from '@/store/useCozyStore';

describe('Soundscape Acoustic Audio Engine', () => {
  let mockOscillator: any;
  let mockGain: any;
  let mockFilter: any;
  let mockBufferSource: any;
  let mockAudioContext: any;
  let originalAudioContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    useCozyStore.setState({ soundMuted: false });

    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockFilter = {
      type: 'lowpass',
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      Q: {
        setValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockBufferSource = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
    };

    mockAudioContext = {
      currentTime: 0.1,
      sampleRate: 44100,
      state: 'running',
      destination: {},
      createOscillator: vi.fn(() => ({ ...mockOscillator })),
      createGain: vi.fn(() => ({ ...mockGain })),
      createBiquadFilter: vi.fn(() => ({ ...mockFilter })),
      createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
      createBuffer: vi.fn(() => ({
        getChannelData: vi.fn(() => new Float32Array(1000)),
      })),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    originalAudioContext = window.AudioContext;
    (window as any).AudioContext = vi.fn(function () {
      return mockAudioContext;
    });
  });

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
  });

  describe('isAudioMuted', () => {
    it('returns false when soundMuted is false in useCozyStore', () => {
      useCozyStore.setState({ soundMuted: false });
      expect(isAudioMuted()).toBe(false);
    });

    it('returns true when soundMuted is true in useCozyStore', () => {
      useCozyStore.setState({ soundMuted: true });
      expect(isAudioMuted()).toBe(true);
    });
  });

  describe('playCozyChime', () => {
    it('synthesizes a 3-note pentatonic sequence when unmuted', () => {
      playCozyChime();
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(3);
    });

    it('does not create any audio nodes when sound is muted', () => {
      useCozyStore.setState({ soundMuted: true });
      playCozyChime();
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('resumes suspended audio context safely', () => {
      mockAudioContext.state = 'suspended';
      playCozyChime();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });

  describe('playWoodenClick', () => {
    it('creates resonant lowpass-filtered pitch drop click', () => {
      playWoodenClick();
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(1);
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalledTimes(1);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(1);
    });

    it('suppresses playback when muted', () => {
      useCozyStore.setState({ soundMuted: true });
      playWoodenClick();
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('playPaperRustle', () => {
    it('creates a bandpass noise burst simulating unfolding parchment', () => {
      playPaperRustle();
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalledTimes(1);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(1);
    });

    it('suppresses playback when muted', () => {
      useCozyStore.setState({ soundMuted: true });
      playPaperRustle();
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
    });
  });

  describe('playTeaPour', () => {
    it('synthesizes dual modulated water trickle tones', () => {
      playTeaPour();
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(2);
    });

    it('suppresses playback when muted', () => {
      useCozyStore.setState({ soundMuted: true });
      playTeaPour();
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('playCameraShutter', () => {
    it('synthesizes two rapid mechanical double clicks', () => {
      playCameraShutter();
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(2);
    });

    it('suppresses playback when muted', () => {
      useCozyStore.setState({ soundMuted: true });
      playCameraShutter();
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('playSound dispatcher', () => {
    it('dispatches to all supported sound effects without errors', () => {
      playSound('cozy_chime');
      playSound('wooden_click');
      playSound('paper_rustle');
      playSound('tea_pour');
      playSound('camera_shutter');

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });
  });

  describe('error resilience', () => {
    it('handles AudioContext throwing an error gracefully without crashing', () => {
      (window as any).AudioContext = vi.fn(function () {
        throw new Error('NotAllowedError: AudioContext was not allowed to start');
      });

      expect(() => playCozyChime()).not.toThrow();
      expect(() => playWoodenClick()).not.toThrow();
      expect(() => playPaperRustle()).not.toThrow();
      expect(() => playTeaPour()).not.toThrow();
      expect(() => playCameraShutter()).not.toThrow();
    });
  });
});
