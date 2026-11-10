/**
 * Composition Geometry & Estimated Lighting Telemetry.
 * Pure mathematical algorithms for Rule of Thirds, Golden Ratio, Golden Spiral,
 * and gradient-based lighting direction estimation.
 */

export interface CompositionGrid {
  thirds: {
    xLines: number[]; // Normalized [0.3333, 0.6667]
    yLines: number[]; // Normalized [0.3333, 0.6667]
    powerPoints: Array<{ x: number; y: number }>;
  };
  goldenRatio: {
    xLines: number[]; // Normalized [0.382, 0.618]
    yLines: number[]; // Normalized [0.382, 0.618]
    powerPoints: Array<{ x: number; y: number }>;
  };
  goldenSpiralPath: string; // SVG path definition (normalized 0..1)
}

export interface EstimatedLighting {
  angleDegrees: number; // 0 to 360 degrees (0 = Right, 90 = Top/Above, 180 = Left, 270 = Below)
  vector: { x: number; y: number }; // Normalized direction vector pointing towards light source
  cardinalLabel: string; // e.g. "Upper Right", "Top Diffused", "Side Rim", etc.
  confidence: number; // 0 to 1 based on gradient magnitude
  isEstimated: true; // Strictly marked as estimated per constitution
}

const PHI = 1.6180339887;
const PHI_INV = 1 / PHI; // ~0.618034
const PHI_COMP = 1 - PHI_INV; // ~0.381966

/**
 * Computes composition guides normalized to [0, 1] relative to viewport.
 */
export function computeCompositionGuides(aspect = 1.5): CompositionGrid {
  const thirdsX = [1 / 3, 2 / 3];
  const thirdsY = [1 / 3, 2 / 3];

  const thirdsPowerPoints = [
    { x: thirdsX[0], y: thirdsY[0] },
    { x: thirdsX[1], y: thirdsY[0] },
    { x: thirdsX[0], y: thirdsY[1] },
    { x: thirdsX[1], y: thirdsY[1] },
  ];

  const goldenX = [PHI_COMP, PHI_INV];
  const goldenY = [PHI_COMP, PHI_INV];

  const goldenPowerPoints = [
    { x: goldenX[0], y: goldenY[0] },
    { x: goldenX[1], y: goldenY[0] },
    { x: goldenX[0], y: goldenY[1] },
    { x: goldenX[1], y: goldenY[1] },
  ];

  // Procedural Logarithmic Golden Spiral path in normalized 0..1 coordinates
  // Sampled across 32 points with exponential growth factor b = ln(phi) / (pi / 2)
  const b = Math.log(PHI) / (Math.PI / 2);
  const spiralPoints: Array<{ x: number; y: number }> = [];
  const originX = 0.618;
  const originY = 0.618;
  const totalTurns = 2.5 * Math.PI;

  for (let i = 0; i <= 36; i++) {
    const theta = (i / 36) * totalTurns;
    const r = 0.015 * Math.exp(b * theta);
    const x = Math.min(1, Math.max(0, originX + r * Math.cos(theta)));
    const y = Math.min(1, Math.max(0, originY - r * Math.sin(theta)));
    spiralPoints.push({ x, y });
  }

  // Construct SVG path string
  let path = `M ${(spiralPoints[0].x * 100).toFixed(2)} ${(spiralPoints[0].y * 100).toFixed(2)}`;
  for (let i = 1; i < spiralPoints.length; i++) {
    path += ` L ${(spiralPoints[i].x * 100).toFixed(2)} ${(spiralPoints[i].y * 100).toFixed(2)}`;
  }

  return {
    thirds: {
      xLines: thirdsX,
      yLines: thirdsY,
      powerPoints: thirdsPowerPoints,
    },
    goldenRatio: {
      xLines: goldenX,
      yLines: goldenY,
      powerPoints: goldenPowerPoints,
    },
    goldenSpiralPath: path,
  };
}

/**
 * Estimates dominant scene lighting direction from downsampled luminance values.
 * Uses 2D spatial luminance gradient analysis.
 * Strictly labeled "Estimated" per Rule 6 and Prompt 8.
 */
export function estimateLightingDirection(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): EstimatedLighting {
  if (width < 2 || height < 2 || pixels.length < width * height * 4) {
    return {
      angleDegrees: 90,
      vector: { x: 0, y: 1 },
      cardinalLabel: 'Diffused Overhead',
      confidence: 0,
      isEstimated: true,
    };
  }

  // Compute average luminance across 4 quadrants
  let sumTL = 0, countTL = 0;
  let sumTR = 0, countTR = 0;
  let sumBL = 0, countBL = 0;
  let sumBR = 0, countBR = 0;

  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const luma = 0.2126 * pixels[idx] + 0.7152 * pixels[idx + 1] + 0.0722 * pixels[idx + 2];

      if (x < midX && y < midY) {
        sumTL += luma; countTL++;
      } else if (x >= midX && y < midY) {
        sumTR += luma; countTR++;
      } else if (x < midX && y >= midY) {
        sumBL += luma; countBL++;
      } else {
        sumBR += luma; countBR++;
      }
    }
  }

  const avgTL = countTL > 0 ? sumTL / countTL : 0;
  const avgTR = countTR > 0 ? sumTR / countTR : 0;
  const avgBL = countBL > 0 ? sumBL / countBL : 0;
  const avgBR = countBR > 0 ? sumBR / countBR : 0;

  // Horizontal gradient: right minus left
  const gradX = (avgTR + avgBR) / 2 - (avgTL + avgBL) / 2;
  // Vertical gradient: top minus bottom (in image space y goes down, so inverted for cartesian top)
  const gradY = (avgTL + avgTR) / 2 - (avgBL + avgBR) / 2;

  const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);
  const confidence = Math.min(1.0, magnitude / 128);

  if (magnitude < 2.0) {
    return {
      angleDegrees: 90,
      vector: { x: 0, y: 1 },
      cardinalLabel: 'Soft Diffused / Ambient',
      confidence: Math.round(confidence * 100) / 100,
      isEstimated: true,
    };
  }

  const nx = gradX / magnitude;
  const ny = gradY / magnitude;

  // Calculate angle in degrees: 0 = East, 90 = North (top), 180 = West, 270 = South
  let rad = Math.atan2(ny, nx);
  if (rad < 0) rad += 2 * Math.PI;
  const angleDegrees = Math.round((rad * 180) / Math.PI);

  let cardinalLabel = 'Overhead';
  if (angleDegrees >= 25 && angleDegrees < 65) {
    cardinalLabel = 'Upper Right (Key Light)';
  } else if (angleDegrees >= 65 && angleDegrees < 115) {
    cardinalLabel = 'Direct Overhead / Noon';
  } else if (angleDegrees >= 115 && angleDegrees < 155) {
    cardinalLabel = 'Upper Left (Key Light)';
  } else if (angleDegrees >= 155 && angleDegrees < 205) {
    cardinalLabel = 'Direct Left Rim';
  } else if (angleDegrees >= 205 && angleDegrees < 245) {
    cardinalLabel = 'Lower Left Ground Bounce';
  } else if (angleDegrees >= 245 && angleDegrees < 295) {
    cardinalLabel = 'Underlight / Upward Reflection';
  } else if (angleDegrees >= 295 && angleDegrees < 335) {
    cardinalLabel = 'Lower Right Ground Bounce';
  } else {
    cardinalLabel = 'Direct Right Rim';
  }

  return {
    angleDegrees,
    vector: { x: Math.round(nx * 100) / 100, y: Math.round(ny * 100) / 100 },
    cardinalLabel,
    confidence: Math.round(confidence * 100) / 100,
    isEstimated: true,
  };
}
