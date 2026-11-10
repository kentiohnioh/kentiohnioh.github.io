/**
 * Automatic Quality Governor.
 * Dynamically monitors frame render time and throttles visual effects
 * (3D tilts, gyro sway, blur filters) if frame durations exceed budget (20ms target).
 */

export type QualityLevel = 'full' | 'reduced' | 'minimal';

export interface QualityGovernorConfig {
  maxFrameTimeMs: number; // e.g. 20ms (50 FPS target threshold)
  degradeThresholdFrames: number; // Consecutive slow frames to degrade (default 30)
  recoveryThresholdFrames: number; // Consecutive fast frames to upgrade (default 60)
  minFrameTimeMsForRecovery: number; // e.g. 16.6ms (60 FPS)
}

export class QualityGovernor {
  private level: QualityLevel = 'full';
  private consecutiveSlowFrames = 0;
  private consecutiveFastFrames = 0;
  private readonly config: QualityGovernorConfig;
  private prefersReducedMotion = false;

  constructor(config: Partial<QualityGovernorConfig> = {}) {
    this.config = {
      maxFrameTimeMs: config.maxFrameTimeMs ?? 20,
      degradeThresholdFrames: config.degradeThresholdFrames ?? 30,
      recoveryThresholdFrames: config.recoveryThresholdFrames ?? 60,
      minFrameTimeMsForRecovery: config.minFrameTimeMsForRecovery ?? 16.6,
    };
  }

  setReducedMotionPreference(prefersReduced: boolean): void {
    this.prefersReducedMotion = prefersReduced;
    if (prefersReduced) {
      this.level = 'minimal';
    }
  }

  getLevel(): QualityLevel {
    if (this.prefersReducedMotion) {
      return 'minimal';
    }
    return this.level;
  }

  setLevel(level: QualityLevel): void {
    this.level = level;
    this.consecutiveSlowFrames = 0;
    this.consecutiveFastFrames = 0;
  }

  /**
   * Record a frame execution duration in milliseconds.
   * Returns true if the quality level changed.
   */
  recordFrame(durationMs: number): boolean {
    if (this.prefersReducedMotion) return false;

    if (durationMs > this.config.maxFrameTimeMs) {
      this.consecutiveSlowFrames++;
      this.consecutiveFastFrames = 0;

      if (this.consecutiveSlowFrames >= this.config.degradeThresholdFrames) {
        this.consecutiveSlowFrames = 0;
        return this.degrade();
      }
    } else if (durationMs <= this.config.minFrameTimeMsForRecovery) {
      this.consecutiveFastFrames++;
      this.consecutiveSlowFrames = 0;

      if (this.consecutiveFastFrames >= this.config.recoveryThresholdFrames) {
        this.consecutiveFastFrames = 0;
        return this.recover();
      }
    } else {
      // Neutral frame
      this.consecutiveSlowFrames = 0;
      this.consecutiveFastFrames = 0;
    }

    return false;
  }

  private degrade(): boolean {
    if (this.level === 'full') {
      this.level = 'reduced';
      return true;
    }
    if (this.level === 'reduced') {
      this.level = 'minimal';
      return true;
    }
    return false;
  }

  private recover(): boolean {
    if (this.level === 'minimal') {
      this.level = 'reduced';
      return true;
    }
    if (this.level === 'reduced') {
      this.level = 'full';
      return true;
    }
    return false;
  }

  reset(): void {
    this.level = this.prefersReducedMotion ? 'minimal' : 'full';
    this.consecutiveSlowFrames = 0;
    this.consecutiveFastFrames = 0;
  }
}
