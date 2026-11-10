/**
 * Color Grade Recipe Specification for WebGL2 Live Pipeline.
 * Stored as a small (<2 KB) JSON recipe per photo.
 */

export interface ColorGradeRecipe {
  schemaVersion: number;
  presetId: string | null;
  exposureEV: number; // -3.0 to +3.0 EV
  contrast: number; // -100 to +100
  highlights: number; // -100 to +100
  shadows: number; // -100 to +100
  whites: number; // -100 to +100
  blacks: number; // -100 to +100
  temperature: number; // -100 (cool) to +100 (warm)
  tint: number; // -100 (green) to +100 (magenta)
  vibrance: number; // -100 to +100
  saturation: number; // -100 to +100
  toneCurve?: Array<[number, number]>; // Array of control points [x, y] in [0, 1]
  hsl?: Array<{
    hue: number; // 0 to 360
    hueShift: number; // -180 to +180
    sat: number; // -100 to +100
    lum: number; // -100 to +100
  }>;
  splitTone: {
    shadowHue: number; // 0 to 360
    shadowSat: number; // 0 to 100
    highlightHue: number; // 0 to 360
    highlightSat: number; // 0 to 100
    balance: number; // -100 to +100
  };
  lut?: {
    id: string;
    strength: number; // 0 to 1
  };
  halation: {
    threshold: number; // 0 to 1
    radius: number; // 0 to 50
    strength: number; // 0 to 1
    tint: number; // Hue shift in degrees
  };
  vignette: {
    amount: number; // -100 to +100
    midpoint: number; // 0 to 100
    roundness: number; // -100 to +100
    feather: number; // 0 to 100
  };
  grain: {
    amount: number; // 0 to 100
    size: number; // 0.5 to 3.0
    roughness: number; // 0 to 100
    seed: number; // Deterministic seed
  };
  skinProtect: {
    enabled: boolean;
    strength: number; // 0 to 1
    mode?: 'mask' | 'heuristic';
  };
}

