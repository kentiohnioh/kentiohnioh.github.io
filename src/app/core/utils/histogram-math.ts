/**
 * Histogram Mathematics & Pixel Telemetry.
 * Computes 256-bin RGB and perceptual Luminance histograms with clipping detection.
 */

export interface HistogramData {
  r: Uint32Array; // 256 bins
  g: Uint32Array; // 256 bins
  b: Uint32Array; // 256 bins
  luma: Uint32Array; // 256 bins
  shadowClipPercent: number; // Percentage of pixels with luma <= 4
  highlightClipPercent: number; // Percentage of pixels with luma >= 251
  maxBinCount: number; // Maximum count in non-clipping range (for normalized rendering)
}

/**
 * Computes 256-bin RGB and BT.709 Luminance histograms from RGBA pixel data.
 * @param pixels RGBA pixel array (stride = 4)
 * @param width Image width in pixels
 * @param height Image height in pixels
 */
export function computeHistogram(
  pixels: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): HistogramData {
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const luma = new Uint32Array(256);

  const totalPixels = width * height;
  if (totalPixels === 0 || pixels.length < totalPixels * 4) {
    return {
      r,
      g,
      b,
      luma,
      shadowClipPercent: 0,
      highlightClipPercent: 0,
      maxBinCount: 1,
    };
  }

  let shadowClipCount = 0;
  let highlightClipCount = 0;

  // Stride through pixels (step by 4 for R, G, B, A)
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];

    r[red]++;
    g[green]++;
    b[blue]++;

    // ITU-R BT.709 perceptual luma formula: Y = 0.2126*R + 0.7152*G + 0.0722*B
    const y = Math.min(255, Math.max(0, Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue)));
    luma[y]++;

    if (y <= 4) shadowClipCount++;
    if (y >= 251) highlightClipCount++;
  }

  // Find max bin in intermediate range [1..254] to prevent clipped spikes from dominating plot scale
  let maxBin = 1;
  for (let i = 1; i < 255; i++) {
    if (r[i] > maxBin) maxBin = r[i];
    if (g[i] > maxBin) maxBin = g[i];
    if (b[i] > maxBin) maxBin = b[i];
    if (luma[i] > maxBin) maxBin = luma[i];
  }

  return {
    r,
    g,
    b,
    luma,
    shadowClipPercent: Math.round((shadowClipCount / totalPixels) * 1000) / 10,
    highlightClipPercent: Math.round((highlightClipCount / totalPixels) * 1000) / 10,
    maxBinCount: Math.max(1, maxBin),
  };
}

