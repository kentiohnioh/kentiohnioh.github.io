import { RetouchSliders, AnatomicalZoneId } from '../models/retouch.model';

export type RetouchCategory = 'Skin' | 'Eyes' | 'Mouth' | 'Details' | 'Lighting' | 'Atmosphere';

export interface SliderDefinition {
  key: keyof RetouchSliders;
  label: string;
  category: RetouchCategory;
  min: number;
  max: number;
  defaultVal: number;
  ethicalCap: number;
  unit: string;
  description: string;
  affectedZones: AnatomicalZoneId[];
}

export const RETOUCH_SLIDER_DEFINITIONS: SliderDefinition[] = [
  // Skin
  {
    key: 'skinSmoothing',
    label: 'Skin Smoothing',
    category: 'Skin',
    min: 0,
    max: 100,
    defaultVal: 25,
    ethicalCap: 60,
    unit: '%',
    description: 'Bilateral low-frequency smoothing while preserving pore micro-texture.',
    affectedZones: ['FACE_SKIN'],
  },
  {
    key: 'textureRetention',
    label: 'Texture Retention',
    category: 'Skin',
    min: 80,
    max: 100,
    defaultVal: 85,
    ethicalCap: 100,
    unit: '%',
    description: 'High-frequency pore and grain conservation ratio.',
    affectedZones: ['FACE_SKIN', 'NECK_EARS_BODY_SKIN'],
  },
  {
    key: 'skinRadiance',
    label: 'Skin Radiance',
    category: 'Skin',
    min: 0,
    max: 100,
    defaultVal: 25,
    ethicalCap: 60,
    unit: '%',
    description: 'Subtle specular glow on high planar surfaces.',
    affectedZones: ['FACE_SKIN'],
  },
  {
    key: 'redCastKiller',
    label: 'Red Cast Neutralizer',
    category: 'Skin',
    min: 0,
    max: 100,
    defaultVal: 20,
    ethicalCap: 70,
    unit: '%',
    description: 'Tones down transient skin flushing/erythema in OKLab without shifting melanin.',
    affectedZones: ['FACE_SKIN', 'NECK_EARS_BODY_SKIN'],
  },
  {
    key: 'autoBlemishHeal',
    label: 'Auto Blemish Heal',
    category: 'Skin',
    min: 0,
    max: 100,
    defaultVal: 40,
    ethicalCap: 100,
    unit: '%',
    description: 'Smooths micro-blemishes and temporary redness spots.',
    affectedZones: ['FACE_SKIN'],
  },
  {
    key: 'neckBodyToneSync',
    label: 'Neck & Body Tone Sync',
    category: 'Skin',
    min: 0,
    max: 100,
    defaultVal: 60,
    ethicalCap: 100,
    unit: '%',
    description: 'Aligns secondary skin regions with facial chromaticity.',
    affectedZones: ['NECK_EARS_BODY_SKIN'],
  },

  // Eyes
  {
    key: 'irisClarity',
    label: 'Iris Clarity',
    category: 'Eyes',
    min: 0,
    max: 100,
    defaultVal: 20,
    ethicalCap: 60,
    unit: '%',
    description: 'Micro-contrast along iris fiber structures.',
    affectedZones: ['IRIS_AND_SCLERA'],
  },
  {
    key: 'catchlightPop',
    label: 'Catchlight Pop',
    category: 'Eyes',
    min: 0,
    max: 100,
    defaultVal: 15,
    ethicalCap: 50,
    unit: '%',
    description: 'Gently amplifies specular corneal reflections.',
    affectedZones: ['IRIS_AND_SCLERA'],
  },
  {
    key: 'scleraRadiance',
    label: 'Sclera Radiance',
    category: 'Eyes',
    min: 0,
    max: 100,
    defaultVal: 20,
    ethicalCap: 50,
    unit: '%',
    description: 'Natural eye-white vein softening without artificial blue/white glow.',
    affectedZones: ['IRIS_AND_SCLERA'],
  },
  {
    key: 'darkCircleSoftener',
    label: 'Dark Circle Softener',
    category: 'Eyes',
    min: 0,
    max: 100,
    defaultVal: 25,
    ethicalCap: 60,
    unit: '%',
    description: 'Gently lifts under-eye hollow shadows while keeping natural eyelid fold.',
    affectedZones: ['EYELASHES_AND_PERIOCULAR'],
  },

  // Details
  {
    key: 'lashDefinition',
    label: 'Lash Definition',
    category: 'Details',
    min: 0,
    max: 100,
    defaultVal: 15,
    ethicalCap: 60,
    unit: '%',
    description: 'Acutance and edge contrast along eyelash boundaries.',
    affectedZones: ['EYELASHES_AND_PERIOCULAR'],
  },
  {
    key: 'browDefinition',
    label: 'Brow Definition',
    category: 'Details',
    min: 0,
    max: 100,
    defaultVal: 15,
    ethicalCap: 60,
    unit: '%',
    description: 'Micro-contrast and strand separation on eyebrows.',
    affectedZones: ['EYEBROWS'],
  },
  {
    key: 'hairLuster',
    label: 'Hair Luster',
    category: 'Details',
    min: 0,
    max: 100,
    defaultVal: 20,
    ethicalCap: 60,
    unit: '%',
    description: 'Highlights sheen and specular bands on hair locks.',
    affectedZones: ['SCALP_HAIR_AND_BABY_HAIRS'],
  },

  // Mouth
  {
    key: 'lipHydration',
    label: 'Lip Hydration',
    category: 'Mouth',
    min: 0,
    max: 100,
    defaultVal: 20,
    ethicalCap: 60,
    unit: '%',
    description: 'Adds soft sheen and softens deep vertical lip fissures.',
    affectedZones: ['LIPS'],
  },
  {
    key: 'lipTint',
    label: 'Lip Tint Enhancement',
    category: 'Mouth',
    min: 0,
    max: 100,
    defaultVal: 15,
    ethicalCap: 60,
    unit: '%',
    description: 'Gentle saturation lift honoring natural vermilion border.',
    affectedZones: ['LIPS'],
  },
  {
    key: 'teethWhitening',
    label: 'Teeth Natural Whitening',
    category: 'Mouth',
    min: 0,
    max: 100,
    defaultVal: 20,
    ethicalCap: 50,
    unit: '%',
    description: 'Desaturates yellow tint without chalky fluorescent artifacting.',
    affectedZones: ['TEETH_AND_INNER_MOUTH'],
  },

  // Lighting & Atmosphere
  {
    key: 'subtleSculpt',
    label: 'Subtle Sculpt',
    category: 'Lighting',
    min: 0,
    max: 100,
    defaultVal: 10,
    ethicalCap: 40,
    unit: '%',
    description: 'Gentle dodge/burn following natural bone structure.',
    affectedZones: ['FACE_SKIN'],
  },
  {
    key: 'backgroundBlur',
    label: 'Background Blur',
    category: 'Atmosphere',
    min: 0,
    max: 100,
    defaultVal: 0,
    ethicalCap: 80,
    unit: '%',
    description: 'Simulates shallow depth of field on the background zone.',
    affectedZones: ['BACKGROUND'],
  },
  {
    key: 'backgroundDim',
    label: 'Background Dim',
    category: 'Atmosphere',
    min: -100,
    max: 0,
    defaultVal: 0,
    ethicalCap: -50,
    unit: '%',
    description: 'Subtle vignette/dimming on the background to enhance subject separation.',
    affectedZones: ['BACKGROUND'],
  },
];

export const DEFAULT_RETOUCH_SLIDERS: Readonly<RetouchSliders> = {
  skinSmoothing: 25,
  textureRetention: 85,
  skinRadiance: 25,
  redCastKiller: 20,
  autoBlemishHeal: 40,
  neckBodyToneSync: 60,
  irisClarity: 20,
  catchlightPop: 15,
  scleraRadiance: 20,
  darkCircleSoftener: 25,
  lashDefinition: 15,
  browDefinition: 15,
  lipHydration: 20,
  lipTint: 15,
  teethWhitening: 20,
  hairLuster: 20,
  subtleSculpt: 10,
  backgroundBlur: 0,
  backgroundDim: 0,
};

export const NATURAL_PRESET: Readonly<RetouchSliders> = {
  skinSmoothing: 20,
  textureRetention: 92,
  skinRadiance: 15,
  redCastKiller: 15,
  autoBlemishHeal: 30,
  neckBodyToneSync: 40,
  irisClarity: 15,
  catchlightPop: 10,
  scleraRadiance: 10,
  darkCircleSoftener: 15,
  lashDefinition: 10,
  browDefinition: 10,
  lipHydration: 15,
  lipTint: 10,
  teethWhitening: 15,
  hairLuster: 15,
  subtleSculpt: 5,
  backgroundBlur: 0,
  backgroundDim: 0,
};

export const EDITORIAL_PRESET: Readonly<RetouchSliders> = {
  skinSmoothing: 45,
  textureRetention: 85,
  skinRadiance: 35,
  redCastKiller: 30,
  autoBlemishHeal: 60,
  neckBodyToneSync: 75,
  irisClarity: 35,
  catchlightPop: 25,
  scleraRadiance: 25,
  darkCircleSoftener: 35,
  lashDefinition: 25,
  browDefinition: 25,
  lipHydration: 30,
  lipTint: 25,
  teethWhitening: 30,
  hairLuster: 30,
  subtleSculpt: 20,
  backgroundBlur: 20,
  backgroundDim: -15,
};

export const SUBTLE_PRESET: Readonly<RetouchSliders> = {
  skinSmoothing: 12,
  textureRetention: 95,
  skinRadiance: 10,
  redCastKiller: 10,
  autoBlemishHeal: 20,
  neckBodyToneSync: 25,
  irisClarity: 10,
  catchlightPop: 8,
  scleraRadiance: 8,
  darkCircleSoftener: 10,
  lashDefinition: 8,
  browDefinition: 8,
  lipHydration: 10,
  lipTint: 5,
  teethWhitening: 10,
  hairLuster: 10,
  subtleSculpt: 0,
  backgroundBlur: 0,
  backgroundDim: 0,
};

export const RESET_PRESET: Readonly<RetouchSliders> = {
  skinSmoothing: 0,
  textureRetention: 100,
  skinRadiance: 0,
  redCastKiller: 0,
  autoBlemishHeal: 0,
  neckBodyToneSync: 0,
  irisClarity: 0,
  catchlightPop: 0,
  scleraRadiance: 0,
  darkCircleSoftener: 0,
  lashDefinition: 0,
  browDefinition: 0,
  lipHydration: 0,
  lipTint: 0,
  teethWhitening: 0,
  hairLuster: 0,
  subtleSculpt: 0,
  backgroundBlur: 0,
  backgroundDim: 0,
};

export type RetouchPresetName = 'Natural' | 'Editorial' | 'Subtle' | 'Default' | 'Reset';

export const RETOUCH_PRESETS: Record<RetouchPresetName, Readonly<RetouchSliders>> = {
  Natural: NATURAL_PRESET,
  Editorial: EDITORIAL_PRESET,
  Subtle: SUBTLE_PRESET,
  Default: DEFAULT_RETOUCH_SLIDERS,
  Reset: RESET_PRESET,
};

/**
 * Checks whether any slider in the given settings exceeds its natural ethical cap.
 */
export function isExtremeRetouch(sliders: RetouchSliders): boolean {
  for (const def of RETOUCH_SLIDER_DEFINITIONS) {
    const val = sliders[def.key];
    if (def.key === 'backgroundDim') {
      // backgroundDim is negative: ethicalCap is e.g. -50, so val < -50 is extreme
      if (val < def.ethicalCap) return true;
    } else {
      if (val > def.ethicalCap) return true;
    }
  }
  return false;
}

/**
 * Clamps slider values strictly to their natural ethical caps unless allowExtreme is explicitly true.
 */
export function clampSlidersToEthicalCaps(
  sliders: RetouchSliders,
  allowExtreme = false
): RetouchSliders {
  const result = { ...sliders };

  for (const def of RETOUCH_SLIDER_DEFINITIONS) {
    let val = result[def.key];

    // Clamp within min and max
    val = Math.max(def.min, Math.min(def.max, val));

    if (!allowExtreme) {
      if (def.key === 'backgroundDim') {
        val = Math.max(def.ethicalCap, val);
      } else {
        val = Math.min(def.ethicalCap, val);
      }
    }

    result[def.key] = Math.round(val * 10) / 10;
  }

  return result;
}
