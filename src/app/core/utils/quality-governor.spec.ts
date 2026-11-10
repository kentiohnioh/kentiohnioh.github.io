import { describe, it, expect } from 'vitest';
import { QualityGovernor } from './quality-governor';

describe('QualityGovernor', () => {
  it('starts at full quality by default', () => {
    const gov = new QualityGovernor();
    expect(gov.getLevel()).toBe('full');
  });

  it('degrades to reduced after threshold slow frames', () => {
    const gov = new QualityGovernor({
      maxFrameTimeMs: 20,
      degradeThresholdFrames: 5,
    });

    for (let i = 0; i < 4; i++) {
      const changed = gov.recordFrame(25);
      expect(changed).toBe(false);
      expect(gov.getLevel()).toBe('full');
    }

    const changed = gov.recordFrame(25);
    expect(changed).toBe(true);
    expect(gov.getLevel()).toBe('reduced');
  });

  it('degrades from reduced to minimal after further slow frames', () => {
    const gov = new QualityGovernor({
      maxFrameTimeMs: 20,
      degradeThresholdFrames: 3,
    });

    // 3 slow frames -> reduced
    for (let i = 0; i < 3; i++) gov.recordFrame(22);
    expect(gov.getLevel()).toBe('reduced');

    // 3 more slow frames -> minimal
    for (let i = 0; i < 3; i++) gov.recordFrame(23);
    expect(gov.getLevel()).toBe('minimal');

    // Cannot degrade further
    for (let i = 0; i < 3; i++) gov.recordFrame(24);
    expect(gov.getLevel()).toBe('minimal');
  });

  it('recovers after consecutive fast frames', () => {
    const gov = new QualityGovernor({
      maxFrameTimeMs: 20,
      degradeThresholdFrames: 2,
      recoveryThresholdFrames: 4,
      minFrameTimeMsForRecovery: 16.6,
    });

    gov.setLevel('reduced');
    for (let i = 0; i < 3; i++) {
      expect(gov.recordFrame(12)).toBe(false);
    }
    expect(gov.recordFrame(12)).toBe(true);
    expect(gov.getLevel()).toBe('full');
  });

  it('respects prefersReducedMotion setting unconditionally', () => {
    const gov = new QualityGovernor();
    gov.setReducedMotionPreference(true);
    expect(gov.getLevel()).toBe('minimal');

    // Recording fast frames does not recover
    for (let i = 0; i < 100; i++) {
      gov.recordFrame(10);
    }
    expect(gov.getLevel()).toBe('minimal');
  });
});
