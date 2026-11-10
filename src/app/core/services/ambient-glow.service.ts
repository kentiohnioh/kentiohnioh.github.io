import { Injectable, signal } from '@angular/core';
import { PaletteSwatch } from '../models/catalog.model';
import { oklabToRgb } from '../utils/palette';

export interface AmbientGlowRgb {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

@Injectable({
  providedIn: 'root',
})
export class AmbientGlowService {
  readonly currentColors = signal<[string, string, string]>([
    'rgba(52, 211, 153, 0.08)',
    'rgba(96, 165, 250, 0.06)',
    'rgba(251, 191, 36, 0.04)',
  ]);

  /**
   * Clamps OKLCH lightness and chroma so text contrast against white/neutral body text
   * always satisfies WCAG 2.2 AA (contrast ratio >= 4.5:1).
   */
  public clampSwatchForAmbientContrast(swatch: PaletteSwatch): { r: number; g: number; b: number } {
    let { l, c, h } = swatch.oklch;

    // Contrast clamp: Lightness bounded between 0.10 and 0.28 so darkroom base remains deep
    l = Math.max(0.10, Math.min(0.28, l));

    // Chroma clamp: Bounded <= 0.10 to prevent fluorescent glare
    c = Math.min(0.10, c);

    // Convert clamped OKLCH back to OKLab
    const rad = (h * Math.PI) / 180;
    const a = c * Math.cos(rad);
    const b = c * Math.sin(rad);

    const rgb = oklabToRgb({ l, a, b });
    return rgb;
  }

  /**
   * Updates ambient digital darkroom glow gradients on document.documentElement.
   */
  public updateGlowFromPalette(palette?: PaletteSwatch[]): void {
    if (!palette || palette.length === 0) return;

    // Pick top 3 swatches
    const s1 = palette[0];
    const s2 = palette[1] || palette[0];
    const s3 = palette[2] || palette[1] || palette[0];

    const rgb1 = this.clampSwatchForAmbientContrast(s1);
    const rgb2 = this.clampSwatchForAmbientContrast(s2);
    const rgb3 = this.clampSwatchForAmbientContrast(s3);

    const glow1 = `rgba(${rgb1.r}, ${rgb1.g}, ${rgb1.b}, 0.12)`;
    const glow2 = `rgba(${rgb2.r}, ${rgb2.g}, ${rgb2.b}, 0.08)`;
    const glow3 = `rgba(${rgb3.r}, ${rgb3.g}, ${rgb3.b}, 0.05)`;

    this.currentColors.set([glow1, glow2, glow3]);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--ambient-glow-1', glow1);
      root.style.setProperty('--ambient-glow-2', glow2);
      root.style.setProperty('--ambient-glow-3', glow3);
    }
  }
}
