import { AnatomicalZoneId } from '../models/retouch.model';

/**
 * Strict Documented Priority Order for the 12 Anatomical Retouch Zones.
 * Higher-priority zones strictly occlude lower-priority zones during fusion.
 */
export const ZONE_PRIORITY_ORDER: readonly AnatomicalZoneId[] = [
  'EYELASHES_AND_PERIOCULAR', // Priority 0 (Highest shield: skin blur never touches lash line)
  'IRIS_AND_SCLERA', // Priority 1
  'TEETH_AND_INNER_MOUTH', // Priority 2
  'LIPS', // Priority 3
  'EYEBROWS', // Priority 4
  'NOSTRILS_AND_NASAL_CREASE', // Priority 5
  'FACIAL_HAIR', // Priority 6
  'GLASSES_JEWELRY_CLOTHES', // Priority 7
  'SCALP_HAIR_AND_BABY_HAIRS', // Priority 8
  'FACE_SKIN', // Priority 9
  'NECK_EARS_BODY_SKIN', // Priority 10
  'BACKGROUND', // Priority 11 (Lowest priority base)
] as const;

export const NUM_ZONES = ZONE_PRIORITY_ORDER.length; // 12

export interface FusedMaskBuffers {
  width: number;
  height: number;
  // 12 channels stored as Float32Array per zone (each length = width * height)
  zoneWeights: Record<AnatomicalZoneId, Float32Array>;
  // 1-channel integer label map (0-11) for overlay visualisation
  labelMap: Uint8Array;
}

/**
 * Resolves overlapping soft anatomical candidate masks using strict priority ordering
 * and normalises them so weights at every pixel sum to exactly 1.0 (Partition of Unity).
 */
export function fuseMasksWithPartitionOfUnity(
  rawZoneWeights: Record<AnatomicalZoneId, Float32Array>,
  width: number,
  height: number
): FusedMaskBuffers {
  const numPixels = width * height;
  const fused: Record<AnatomicalZoneId, Float32Array> = {
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

  const labelMap = new Uint8Array(numPixels);

  for (let p = 0; p < numPixels; p++) {
    let remainingCapacity = 1.0;
    let sumWeights = 0;
    let maxZoneWeight = -1;
    let dominantZoneIdx = 11; // Default: BACKGROUND

    // 1. Traverse in strict priority order (higher priority takes precedence)
    for (let zIdx = 0; zIdx < NUM_ZONES; zIdx++) {
      const zone = ZONE_PRIORITY_ORDER[zIdx];
      const raw = Math.max(0, Math.min(1, rawZoneWeights[zone][p]));

      // Allocated weight proportional to remaining unoccluded capacity
      const allocated = raw * remainingCapacity;
      fused[zone][p] = allocated;
      remainingCapacity = Math.max(0, remainingCapacity - allocated);
      sumWeights += allocated;

      if (allocated > maxZoneWeight) {
        maxZoneWeight = allocated;
        dominantZoneIdx = zIdx;
      }
    }

    // 2. Normalisation to ensure exact Partition of Unity: sum(w_i) == 1.000 +/- 0.004
    if (sumWeights > 0.0001) {
      const invSum = 1.0 / sumWeights;
      for (let zIdx = 0; zIdx < NUM_ZONES; zIdx++) {
        const zone = ZONE_PRIORITY_ORDER[zIdx];
        fused[zone][p] *= invSum;
      }
    } else {
      // If all candidate weights were zero, assign 100% to BACKGROUND
      fused.BACKGROUND[p] = 1.0;
      dominantZoneIdx = 11;
    }

    labelMap[p] = dominantZoneIdx;
  }

  return {
    width,
    height,
    zoneWeights: fused,
    labelMap,
  };
}

/**
 * Packs 12 float weight channels into three RGBA8 texture buffers (4 channels per texture)
 * for high-speed WebGL2 fragment shader sampling.
 */
export function packWeightsToRgba8(
  fused: Record<AnatomicalZoneId, Float32Array>,
  numPixels: number
): [Uint8Array, Uint8Array, Uint8Array] {
  // Texture 0: R=Lashes, G=Iris, B=Teeth, A=Lips
  const tex0 = new Uint8Array(numPixels * 4);
  // Texture 1: R=Brows, G=Nostrils, B=FacialHair, A=Glasses/Clothes
  const tex1 = new Uint8Array(numPixels * 4);
  // Texture 2: R=Hair, G=FaceSkin, B=BodySkin, A=Background
  const tex2 = new Uint8Array(numPixels * 4);

  const lashes = fused.EYELASHES_AND_PERIOCULAR;
  const iris = fused.IRIS_AND_SCLERA;
  const teeth = fused.TEETH_AND_INNER_MOUTH;
  const lips = fused.LIPS;

  const brows = fused.EYEBROWS;
  const nostrils = fused.NOSTRILS_AND_NASAL_CREASE;
  const facialHair = fused.FACIAL_HAIR;
  const clothes = fused.GLASSES_JEWELRY_CLOTHES;

  const hair = fused.SCALP_HAIR_AND_BABY_HAIRS;
  const faceSkin = fused.FACE_SKIN;
  const bodySkin = fused.NECK_EARS_BODY_SKIN;
  const bg = fused.BACKGROUND;

  for (let p = 0; p < numPixels; p++) {
    const idx = p * 4;

    tex0[idx] = Math.round(lashes[p] * 255);
    tex0[idx + 1] = Math.round(iris[p] * 255);
    tex0[idx + 2] = Math.round(teeth[p] * 255);
    tex0[idx + 3] = Math.round(lips[p] * 255);

    tex1[idx] = Math.round(brows[p] * 255);
    tex1[idx + 1] = Math.round(nostrils[p] * 255);
    tex1[idx + 2] = Math.round(facialHair[p] * 255);
    tex1[idx + 3] = Math.round(clothes[p] * 255);

    tex2[idx] = Math.round(hair[p] * 255);
    tex2[idx + 1] = Math.round(faceSkin[p] * 255);
    tex2[idx + 2] = Math.round(bodySkin[p] * 255);
    tex2[idx + 3] = Math.round(bg[p] * 255);
  }

  return [tex0, tex1, tex2];
}

