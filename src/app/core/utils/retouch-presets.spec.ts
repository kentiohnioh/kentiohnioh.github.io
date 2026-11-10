import { describe, it, expect } from 'vitest';
import {
  RETOUCH_SLIDER_DEFINITIONS,
  RETOUCH_PRESETS,
  DEFAULT_RETOUCH_SLIDERS,
  isExtremeRetouch,
  clampSlidersToEthicalCaps,
} from './retouch-presets';
import { RetouchSliders } from '../models/retouch.model';

describe('Retouch Presets and Ethical Caps', () => {
  it('defines exactly 19 typed sliders with proper metadata and valid ranges', () => {
    expect(RETOUCH_SLIDER_DEFINITIONS.length).toBe(19);

    for (const def of RETOUCH_SLIDER_DEFINITIONS) {
      expect(def.key).toBeDefined();
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.ethicalCap).toBeDefined();
      expect(def.defaultVal).toBeGreaterThanOrEqual(def.min);
      expect(def.defaultVal).toBeLessThanOrEqual(def.max);

      if (def.key === 'backgroundDim') {
        expect(def.ethicalCap).toBeLessThanOrEqual(def.max);
        expect(def.ethicalCap).toBeGreaterThanOrEqual(def.min);
      } else {
        expect(def.ethicalCap).toBeLessThanOrEqual(def.max);
        expect(def.ethicalCap).toBeGreaterThanOrEqual(def.min);
      }
    }
  });

  it('verifies that all default presets are within ethical caps', () => {
    const presets: Array<keyof typeof RETOUCH_PRESETS> = ['Natural', 'Editorial', 'Subtle', 'Default', 'Reset'];

    for (const name of presets) {
      const preset = RETOUCH_PRESETS[name];
      expect(isExtremeRetouch(preset as RetouchSliders)).toBe(false);
    }
  });

  it('detects extreme retouch values when sliders exceed ethical caps', () => {
    const extremeSliders: RetouchSliders = {
      ...DEFAULT_RETOUCH_SLIDERS,
      skinSmoothing: 85, // ethicalCap is 60
    };

    expect(isExtremeRetouch(extremeSliders)).toBe(true);

    const clamped = clampSlidersToEthicalCaps(extremeSliders, false);
    expect(clamped.skinSmoothing).toBe(60);
    expect(isExtremeRetouch(clamped)).toBe(false);
  });

  it('respects allowExtreme flag when explicitly set', () => {
    const extremeSliders: RetouchSliders = {
      ...DEFAULT_RETOUCH_SLIDERS,
      teethWhitening: 80, // ethicalCap is 50
    };

    const allowed = clampSlidersToEthicalCaps(extremeSliders, true);
    expect(allowed.teethWhitening).toBe(80);

    const restricted = clampSlidersToEthicalCaps(extremeSliders, false);
    expect(restricted.teethWhitening).toBe(50);
  });

  it('clamps backgroundDim properly for negative ranges', () => {
    const dimSliders: RetouchSliders = {
      ...DEFAULT_RETOUCH_SLIDERS,
      backgroundDim: -90, // ethicalCap is -50
    };

    expect(isExtremeRetouch(dimSliders)).toBe(true);
    const clamped = clampSlidersToEthicalCaps(dimSliders, false);
    expect(clamped.backgroundDim).toBe(-50);
  });
});
