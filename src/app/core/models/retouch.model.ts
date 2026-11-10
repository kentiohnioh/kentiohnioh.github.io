/**
 * Retouching and 12-Zone Anatomical Mask Models.
 */

export type AnatomicalZoneId =
  | 'FACE_SKIN'
  | 'NECK_EARS_BODY_SKIN'
  | 'IRIS_AND_SCLERA'
  | 'EYELASHES_AND_PERIOCULAR'
  | 'EYEBROWS'
  | 'LIPS'
  | 'TEETH_AND_INNER_MOUTH'
  | 'NOSTRILS_AND_NASAL_CREASE'
  | 'SCALP_HAIR_AND_BABY_HAIRS'
  | 'FACIAL_HAIR'
  | 'GLASSES_JEWELRY_CLOTHES'
  | 'BACKGROUND';

export interface MaskStroke {
  id: string;
  zone: AnatomicalZoneId;
  mode: 'add' | 'erase';
  radius: number; // In normalised image coordinates
  softness: number; // 0 to 1
  points: Array<{ x: number; y: number; pressure?: number }>;
}

export interface SpotHealPoint {
  id: string;
  target: { x: number; y: number };
  donor: { x: number; y: number };
  radius: number;
  feather: number;
}

export interface RetouchSliders {
  skinSmoothing: number; // 0-100 (default 25, cap 60)
  textureRetention: number; // 80-100 (default 85)
  skinRadiance: number; // 0-100 (25 / 60)
  redCastKiller: number; // 0-100 (20 / 70)
  autoBlemishHeal: number; // 0-100 (40 / 100)
  neckBodyToneSync: number; // 0-100 (60 / 100)
  irisClarity: number; // 0-100 (20 / 60)
  catchlightPop: number; // 0-100 (15 / 50)
  scleraRadiance: number; // 0-100 (20 / 50)
  darkCircleSoftener: number; // 0-100 (25 / 60)
  lashDefinition: number; // 0-100 (15 / 60)
  browDefinition: number; // 0-100 (15 / 60)
  lipHydration: number; // 0-100 (20 / 60)
  lipTint: number; // 0-100 (15 / 60)
  teethWhitening: number; // 0-100 (20 / 50)
  hairLuster: number; // 0-100 (20 / 60)
  subtleSculpt: number; // 0-100 (10 / 40)
  backgroundBlur: number; // 0-100 (0 / 80)
  backgroundDim: number; // -100..0 (0 / -50)
}

export interface FaceRetouchSettings {
  faceIndex: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  sliders: RetouchSliders;
  extreme: boolean;
}

export interface RetouchRecipe {
  schemaVersion: number;
  modelVersion: string;
  algorithmVersion: string;
  extreme: boolean;
  faces: FaceRetouchSettings[];
  strokes: MaskStroke[];
  heals: SpotHealPoint[];
}

export interface RetouchRecord {
  retouched: boolean;
  recipeHash: string;
  summary: {
    facesCount: number;
    zonesAdjusted: AnatomicalZoneId[];
    hasExtreme: boolean;
  };
}
