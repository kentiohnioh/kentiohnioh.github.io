import { describe, it, expect } from 'vitest';
import {
  fuseMasksWithPartitionOfUnity,
  packWeightsToRgba8,
  ZONE_PRIORITY_ORDER,
  NUM_ZONES,
} from './mask-fusion';
import { AnatomicalZoneId } from '../models/retouch.model';

describe('Mask Fusion & Partition of Unity (Phase 4)', () => {
  it('strictly satisfies Partition of Unity property: sum(weights) == 1.000 +/- 0.004 at EVERY pixel', () => {
    const width = 100;
    const height = 100;
    const numPixels = width * height;

    const rawWeights: Record<AnatomicalZoneId, Float32Array> = {
      EYELASHES_AND_PERIOCULAR: new Float32Array(numPixels),
      IRIS_AND_SCLERA: new Float32Array(numPixels),
      TEETH_AND_INNER_MOUTH: new Float32Array(numPixels),
      LIPS: new Float32Array(numPixels),
      EYEBROWS: new Float32Array(numPixels),
      NOSTRILS_AND_NASAL_CREASE: new Float32Array(numPixels),
      FACIAL_HAIR: new Float32Array(numPixels),
      GLASSES_JEWELRY_CLOTHES: new Float32Array(numPixels),
      SCALP_HAIR_AND_BABY_HAIRS: new Float32Array(numPixels),
      FACE_SKIN: new Float32Array(numPixels),
      NECK_EARS_BODY_SKIN: new Float32Array(numPixels),
      BACKGROUND: new Float32Array(numPixels),
    };

    // Populate with arbitrary overlapping soft weights simulating realistic CNN/landmark output
    for (let p = 0; p < numPixels; p++) {
      rawWeights.FACE_SKIN[p] = Math.random() * 0.9;
      rawWeights.SCALP_HAIR_AND_BABY_HAIRS[p] = Math.random() * 0.5;
      rawWeights.EYELASHES_AND_PERIOCULAR[p] = (p % 10 === 0) ? 0.95 : 0.0;
      rawWeights.LIPS[p] = (p % 15 === 0) ? 0.85 : 0.0;
      rawWeights.BACKGROUND[p] = Math.random() * 0.3;
    }

    const result = fuseMasksWithPartitionOfUnity(rawWeights, width, height);

    // Verify Partition of Unity across ALL 10,000 pixels
    for (let p = 0; p < numPixels; p++) {
      let sum = 0;
      for (const zone of ZONE_PRIORITY_ORDER) {
        sum += result.zoneWeights[zone][p];
      }
      expect(sum).toBeGreaterThanOrEqual(0.996);
      expect(sum).toBeLessThanOrEqual(1.004);
    }
  });

  it('enforces priority occlusion: higher priority shields lower priority zones', () => {
    const width = 10;
    const height = 10;
    const numPixels = width * height;

    const rawWeights: Record<AnatomicalZoneId, Float32Array> = {
      EYELASHES_AND_PERIOCULAR: new Float32Array(numPixels).fill(1.0), // Priority 0 = 1.0 (Full shield)
      IRIS_AND_SCLERA: new Float32Array(numPixels).fill(0.0),
      TEETH_AND_INNER_MOUTH: new Float32Array(numPixels).fill(0.0),
      LIPS: new Float32Array(numPixels).fill(0.0),
      EYEBROWS: new Float32Array(numPixels).fill(0.0),
      NOSTRILS_AND_NASAL_CREASE: new Float32Array(numPixels).fill(0.0),
      FACIAL_HAIR: new Float32Array(numPixels).fill(0.0),
      GLASSES_JEWELRY_CLOTHES: new Float32Array(numPixels).fill(0.0),
      SCALP_HAIR_AND_BABY_HAIRS: new Float32Array(numPixels).fill(0.0),
      FACE_SKIN: new Float32Array(numPixels).fill(1.0), // Priority 9 = 1.0 (Simultaneous candidate)
      NECK_EARS_BODY_SKIN: new Float32Array(numPixels).fill(0.0),
      BACKGROUND: new Float32Array(numPixels).fill(0.5),
    };

    const result = fuseMasksWithPartitionOfUnity(rawWeights, width, height);

    // Because EYELASHES_AND_PERIOCULAR has Priority 0 and consumed 100% capacity,
    // FACE_SKIN must be occluded to 0.0!
    for (let p = 0; p < numPixels; p++) {
      expect(result.zoneWeights.EYELASHES_AND_PERIOCULAR[p]).toBeCloseTo(1.0, 4);
      expect(result.zoneWeights.FACE_SKIN[p]).toBeCloseTo(0.0, 4);
      expect(result.labelMap[p]).toBe(0); // Label 0 is EYELASHES_AND_PERIOCULAR
    }
  });

  it('packs 12 float channels into 3 RGBA8 buffers accurately', () => {
    const width = 4;
    const height = 4;
    const numPixels = width * height;

    const rawWeights: Record<AnatomicalZoneId, Float32Array> = {
      EYELASHES_AND_PERIOCULAR: new Float32Array(numPixels).fill(0.25),
      IRIS_AND_SCLERA: new Float32Array(numPixels).fill(0.25),
      TEETH_AND_INNER_MOUTH: new Float32Array(numPixels).fill(0.25),
      LIPS: new Float32Array(numPixels).fill(0.25),
      EYEBROWS: new Float32Array(numPixels).fill(0.0),
      NOSTRILS_AND_NASAL_CREASE: new Float32Array(numPixels).fill(0.0),
      FACIAL_HAIR: new Float32Array(numPixels).fill(0.0),
      GLASSES_JEWELRY_CLOTHES: new Float32Array(numPixels).fill(0.0),
      SCALP_HAIR_AND_BABY_HAIRS: new Float32Array(numPixels).fill(0.0),
      FACE_SKIN: new Float32Array(numPixels).fill(0.0),
      NECK_EARS_BODY_SKIN: new Float32Array(numPixels).fill(0.0),
      BACKGROUND: new Float32Array(numPixels).fill(0.0),
    };

    const result = fuseMasksWithPartitionOfUnity(rawWeights, width, height);
    const [tex0, tex1, tex2] = packWeightsToRgba8(result.zoneWeights, numPixels);

    expect(tex0.length).toBe(numPixels * 4);
    expect(tex1.length).toBe(numPixels * 4);
    expect(tex2.length).toBe(numPixels * 4);

    // tex0 packs Lashes (R), Iris (G), Teeth (B), Lips (A)
    expect(tex0[0]).toBeGreaterThan(0);
    expect(tex0[1]).toBeGreaterThan(0);
    expect(tex0[2]).toBeGreaterThan(0);
    expect(tex0[3]).toBeGreaterThan(0);
  });
});
