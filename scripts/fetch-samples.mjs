import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CATALOG_DIR = path.resolve('public', 'catalog');
const SHARDS_DIR = path.join(CATALOG_DIR, 'shards');
const EMBEDDINGS_DIR = path.join(CATALOG_DIR, 'embeddings');

// Ensure directory layout
fs.mkdirSync(SHARDS_DIR, { recursive: true });
fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });

function stableSort(val) {
  if (Array.isArray(val)) {
    return val.map(stableSort);
  }
  if (val !== null && typeof val === 'object') {
    const sorted = {};
    for (const key of Object.keys(val).sort()) {
      sorted[key] = stableSort(val[key]);
    }
    return sorted;
  }
  return val;
}

function stableJson(val) {
  return JSON.stringify(stableSort(val), null, 2) + '\n';
}

function generateSvgPlaceholder(title, accentHex, subtitle) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 853" width="1280" height="853">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stop-color="#141c26"/>
        <stop offset="100%" stop-color="#080b10"/>
      </radialGradient>
      <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${accentHex}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#080b10" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#acc)"/>
    <circle cx="640" cy="400" r="160" fill="none" stroke="${accentHex}" stroke-width="2" stroke-opacity="0.35"/>
    <circle cx="640" cy="400" r="150" fill="none" stroke="${accentHex}" stroke-width="1" stroke-dasharray="6,6" stroke-opacity="0.5"/>
    <text x="640" y="405" font-family="serif" font-size="28" fill="#e8ecf2" text-anchor="middle" letter-spacing="1">${title}</text>
    <text x="640" y="440" font-family="monospace" font-size="14" fill="#9aa4b2" text-anchor="middle" letter-spacing="2">THENG NIOH · SAMPLE ARTWORK</text>
    <text x="640" y="600" font-family="monospace" font-size="12" fill="#525d6d" text-anchor="middle">${subtitle}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// 10 Openly licensed photographic masterworks with attribution and fixture properties
const samplePhotos = [
  {
    id: 'f1a9c3d4e5b60001',
    slug: 'solitude-in-ochre-portrait',
    title: 'Solitude in Ochre',
    alt: 'Fine art portrait of a dark-skinned woman in warm ochre light looking gently into the distance.',
    caption: 'Natural window lighting in an afternoon studio, emphasizing rich skin undertones.',
    takenAt: '2026-10-14T15:42:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%232b1d14"/%3E%3C/svg%3E',
    palette: [
      { hex: '#8a4b28', oklch: { l: 0.45, c: 0.12, h: 48 }, weight: 0.35 },
      { hex: '#2b1d14', oklch: { l: 0.22, c: 0.04, h: 42 }, weight: 0.25 },
      { hex: '#c88c5d', oklch: { l: 0.65, c: 0.11, h: 58 }, weight: 0.20 },
      { hex: '#111317', oklch: { l: 0.12, c: 0.01, h: 260 }, weight: 0.12 },
      { hex: '#f0d2b8', oklch: { l: 0.85, c: 0.05, h: 65 }, weight: 0.08 }
    ],
    exif: {
      camera: 'Leica SL2',
      lens: 'Summilux-SL 50mm f/1.4 ASPH.',
      focalLengthMm: 50,
      aperture: 1.4,
      shutterSeconds: 0.002,
      shutterDisplay: '1/500',
      iso: 100
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 28400,
          sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
          urls: [generateSvgPlaceholder('Solitude in Ochre', '#8a4b28', '50mm · f/1.4 · ISO 100')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 84200,
          sha256: '8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9a',
          urls: [generateSvgPlaceholder('Solitude in Ochre', '#8a4b28', '50mm · f/1.4 · ISO 100')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 168000,
          sha256: '7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9a8b',
          urls: [generateSvgPlaceholder('Solitude in Ochre', '#8a4b28', '50mm · f/1.4 · ISO 100')]
        }
      ]
    },
    grade: null,
    retouch: {
      retouched: true,
      recipeHash: 'a1b2c3d4e5f6',
      summary: {
        facesCount: 1,
        zonesAdjusted: ['FACE_SKIN', 'IRIS_AND_SCLERA', 'LIPS'],
        hasExtreme: false
      }
    },
    collectionIds: ['portraits', 'human-presence'],
    tags: ['portrait', 'studio', 'ochre', 'warm', 'fine-art'],
    mood: ['warm', 'intimate', 'low-key'],
    flags: {
      hasPeople: true,
      retouched: true,
      showBeforeAfter: true
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'Unsplash License (Attribution / Portfolio)',
      credit: 'Theng Nioh / Unsplash CC',
      sourceUrl: 'https://unsplash.com/photos/fine-art-portrait'
    }
  },
  {
    id: 'f1a9c3d4e5b60002',
    slug: 'geometry-of-silence-architecture',
    title: 'Geometry of Silence',
    alt: 'High-contrast black and white architectural study of modern cantilevered concrete stairwells.',
    caption: 'Brutalist concrete angles crossing morning shadows.',
    takenAt: '2026-09-28T08:15:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%231a1a1a"/%3E%3C/svg%3E',
    palette: [
      { hex: '#111111', oklch: { l: 0.1, c: 0, h: 0 }, weight: 0.40 },
      { hex: '#777777', oklch: { l: 0.52, c: 0, h: 0 }, weight: 0.28 },
      { hex: '#d0d0d0', oklch: { l: 0.83, c: 0, h: 0 }, weight: 0.20 },
      { hex: '#3a3a3a', oklch: { l: 0.28, c: 0, h: 0 }, weight: 0.12 }
    ],
    exif: {
      camera: 'Fujifilm GFX 100S',
      lens: 'GF 30mm f/3.5 R WR',
      focalLengthMm: 30,
      aperture: 8.0,
      shutterSeconds: 0.008,
      shutterDisplay: '1/125',
      iso: 160
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 26000,
          sha256: '3a2b1c0d9e8f7a6b5c4d3e2f1a0b9a8b7c6d5e4f',
          urls: [generateSvgPlaceholder('Geometry of Silence', '#777777', '30mm · f/8 · ISO 160')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 78000,
          sha256: '2b1c0d9e8f7a6b5c4d3e2f1a0b9a8b7c6d5e4f3a',
          urls: [generateSvgPlaceholder('Geometry of Silence', '#777777', '30mm · f/8 · ISO 160')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 154000,
          sha256: '1c0d9e8f7a6b5c4d3e2f1a0b9a8b7c6d5e4f3a2b',
          urls: [generateSvgPlaceholder('Geometry of Silence', '#777777', '30mm · f/8 · ISO 160')]
        }
      ]
    },
    grade: null,
    retouch: null,
    collectionIds: ['architecture', 'monochrome'],
    tags: ['architecture', 'minimalism', 'monochrome', 'concrete', 'lines'],
    mood: ['monochrome', 'muted', 'geometric'],
    flags: {
      hasPeople: false,
      retouched: false,
      showBeforeAfter: false
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'CC0 Public Domain',
      credit: 'Theng Nioh / Public Domain Archive',
      sourceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/'
    }
  },
  {
    id: 'f1a9c3d4e5b60003',
    slug: 'the-optician-portrait-with-glasses',
    title: 'The Watchmaker’s Gaze',
    alt: 'Portrait of an East Asian craftsman wearing thin wire-rimmed glasses, illuminated by directional desk lamp.',
    caption: 'Capturing focus and detail: wire frame glasses, delicate brow line, natural skin highlights.',
    takenAt: '2026-10-02T19:10:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%231a1815"/%3E%3C/svg%3E',
    palette: [
      { hex: '#d4a373', oklch: { l: 0.72, c: 0.08, h: 62 }, weight: 0.32 },
      { hex: '#2b231d', oklch: { l: 0.24, c: 0.03, h: 50 }, weight: 0.28 },
      { hex: '#fefae0', oklch: { l: 0.95, c: 0.03, h: 90 }, weight: 0.20 },
      { hex: '#11100e', oklch: { l: 0.12, c: 0.01, h: 40 }, weight: 0.20 }
    ],
    exif: {
      camera: 'Sony A7R V',
      lens: 'FE 85mm f/1.4 GM II',
      focalLengthMm: 85,
      aperture: 2.0,
      shutterSeconds: 0.005,
      shutterDisplay: '1/200',
      iso: 400
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 31000,
          sha256: '4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9a8b7c6d5e',
          urls: [generateSvgPlaceholder('The Watchmaker’s Gaze', '#d4a373', '85mm · f/2.0 · ISO 400 · Wire Glasses')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 88000,
          sha256: '5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9a8b7c6d',
          urls: [generateSvgPlaceholder('The Watchmaker’s Gaze', '#d4a373', '85mm · f/2.0 · ISO 400 · Wire Glasses')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 172000,
          sha256: '6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9a8b7c',
          urls: [generateSvgPlaceholder('The Watchmaker’s Gaze', '#d4a373', '85mm · f/2.0 · ISO 400 · Wire Glasses')]
        }
      ]
    },
    grade: null,
    retouch: {
      retouched: true,
      recipeHash: 'b2c3d4e5f6g7',
      summary: {
        facesCount: 1,
        zonesAdjusted: ['FACE_SKIN', 'GLASSES_JEWELRY_CLOTHES', 'EYEBROWS'],
        hasExtreme: false
      }
    },
    collectionIds: ['portraits'],
    tags: ['portrait', 'craftsman', 'glasses', 'warm', 'editorial'],
    mood: ['warm', 'intimate'],
    flags: {
      hasPeople: true,
      retouched: true,
      showBeforeAfter: true
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'Unsplash License',
      credit: 'Theng Nioh',
      sourceUrl: 'https://unsplash.com'
    }
  },
  {
    id: 'f1a9c3d4e5b60004',
    slug: 'bearded-sea-captain-portrait',
    title: 'The North Sea Ferryman',
    alt: 'Weathered portrait of a man with a thick grey beard and wool cap in overcast coastal light.',
    caption: 'Textural study in deep maritime overcast. Facial hair and skin pores preserved with zero smoothing bleed.',
    takenAt: '2026-10-18T11:20:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%23192026"/%3E%3C/svg%3E',
    palette: [
      { hex: '#4a5568', oklch: { l: 0.42, c: 0.03, h: 240 }, weight: 0.35 },
      { hex: '#c5a880', oklch: { l: 0.70, c: 0.07, h: 65 }, weight: 0.28 },
      { hex: '#1a202c', oklch: { l: 0.20, c: 0.02, h: 250 }, weight: 0.22 },
      { hex: '#cbd5e0', oklch: { l: 0.85, c: 0.02, h: 230 }, weight: 0.15 }
    ],
    exif: {
      camera: 'Nikon Z8',
      lens: 'NIKKOR Z 85mm f/1.2 S',
      focalLengthMm: 85,
      aperture: 1.8,
      shutterSeconds: 0.001,
      shutterDisplay: '1/1000',
      iso: 64
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 33000,
          sha256: '7a6b5c4d3e2f1a0b9a8b7c6d5e4f3a2b1c0d9e8f',
          urls: [generateSvgPlaceholder('The North Sea Ferryman', '#4a5568', '85mm · f/1.8 · Bearded Portrait')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 89000,
          sha256: '8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9a',
          urls: [generateSvgPlaceholder('The North Sea Ferryman', '#4a5568', '85mm · f/1.8 · Bearded Portrait')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 176000,
          sha256: '9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d',
          urls: [generateSvgPlaceholder('The North Sea Ferryman', '#4a5568', '85mm · f/1.8 · Bearded Portrait')]
        }
      ]
    },
    grade: null,
    retouch: {
      retouched: true,
      recipeHash: 'c3d4e5f6g7h8',
      summary: {
        facesCount: 1,
        zonesAdjusted: ['FACIAL_HAIR', 'EYELASHES_AND_PERIOCULAR', 'FACE_SKIN'],
        hasExtreme: false
      }
    },
    collectionIds: ['portraits'],
    tags: ['portrait', 'maritime', 'beard', 'character', 'natural-light'],
    mood: ['cool', 'muted', 'low-key'],
    flags: {
      hasPeople: true,
      retouched: true,
      showBeforeAfter: true
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'Unsplash License',
      credit: 'Theng Nioh',
      sourceUrl: 'https://unsplash.com'
    }
  },
  {
    id: 'f1a9c3d4e5b60005',
    slug: 'midnight-rain-in-shinjuku-street',
    title: 'Midnight Rain in Shinjuku',
    alt: 'Neon reflection on glistening asphalt during a torrential night storm in Tokyo street.',
    caption: 'Ambient amber and cyan neon glow cutting through raindrops and steam.',
    takenAt: '2026-09-12T23:45:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%230b0e14"/%3E%3C/svg%3E',
    palette: [
      { hex: '#00e5ff', oklch: { l: 0.82, c: 0.18, h: 200 }, weight: 0.28 },
      { hex: '#ff3366', oklch: { l: 0.62, c: 0.24, h: 10 }, weight: 0.24 },
      { hex: '#0b0e14', oklch: { l: 0.12, c: 0.02, h: 250 }, weight: 0.36 },
      { hex: '#f4b41a', oklch: { l: 0.78, c: 0.16, h: 75 }, weight: 0.12 }
    ],
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH.',
      focalLengthMm: 28,
      aperture: 1.7,
      shutterSeconds: 0.0166,
      shutterDisplay: '1/60',
      iso: 3200
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 34000,
          sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e',
          urls: [generateSvgPlaceholder('Midnight Rain in Shinjuku', '#00e5ff', '28mm · f/1.7 · ISO 3200 · Tokyo Street')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 90000,
          sha256: 'b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f',
          urls: [generateSvgPlaceholder('Midnight Rain in Shinjuku', '#00e5ff', '28mm · f/1.7 · ISO 3200 · Tokyo Street')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 178000,
          sha256: 'c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a',
          urls: [generateSvgPlaceholder('Midnight Rain in Shinjuku', '#00e5ff', '28mm · f/1.7 · ISO 3200 · Tokyo Street')]
        }
      ]
    },
    grade: null,
    retouch: null,
    collectionIds: ['street'],
    tags: ['street', 'night', 'rain', 'neon', 'tokyo', 'cinematic'],
    mood: ['vivid', 'cool', 'low-key'],
    flags: {
      hasPeople: false,
      retouched: false,
      showBeforeAfter: false
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'Unsplash License',
      credit: 'Theng Nioh',
      sourceUrl: 'https://unsplash.com'
    }
  },
  {
    id: 'f1a9c3d4e5b60006',
    slug: 'dew-on-fern-macro-nature',
    title: 'Crystalline Morning',
    alt: 'Extreme macro photograph of water droplets suspended on the curved frond of a forest fern.',
    caption: 'Morning dew drops reflecting forest canopy highlights.',
    takenAt: '2026-10-05T06:40:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%230e1f14"/%3E%3C/svg%3E',
    palette: [
      { hex: '#2d6a4f', oklch: { l: 0.44, c: 0.12, h: 155 }, weight: 0.45 },
      { hex: '#95d5b2', oklch: { l: 0.81, c: 0.10, h: 150 }, weight: 0.25 },
      { hex: '#081c15', oklch: { l: 0.14, c: 0.05, h: 160 }, weight: 0.20 },
      { hex: '#d8f3dc', oklch: { l: 0.93, c: 0.04, h: 145 }, weight: 0.10 }
    ],
    exif: {
      camera: 'Canon EOS R5',
      lens: 'RF 100mm f/2.8L Macro IS USM',
      focalLengthMm: 100,
      aperture: 4.0,
      shutterSeconds: 0.004,
      shutterDisplay: '1/250',
      iso: 200
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 27000,
          sha256: 'd4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b',
          urls: [generateSvgPlaceholder('Crystalline Morning', '#2d6a4f', '100mm Macro · f/4 · Nature')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 81000,
          sha256: 'e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c',
          urls: [generateSvgPlaceholder('Crystalline Morning', '#2d6a4f', '100mm Macro · f/4 · Nature')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 159000,
          sha256: 'f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
          urls: [generateSvgPlaceholder('Crystalline Morning', '#2d6a4f', '100mm Macro · f/4 · Nature')]
        }
      ]
    },
    grade: null,
    retouch: null,
    collectionIds: ['nature'],
    tags: ['macro', 'nature', 'droplets', 'green', 'tranquil'],
    mood: ['muted', 'cool', 'high-key'],
    flags: {
      hasPeople: false,
      retouched: false,
      showBeforeAfter: false
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'CC0 Public Domain',
      credit: 'Theng Nioh',
      sourceUrl: 'https://creativecommons.org'
    }
  },
  {
    id: 'f1a9c3d4e5b60007',
    slug: 'golden-hour-rooftop-silhouette',
    title: 'The Edge of Sunset',
    alt: 'Warm amber sunset silhouetting a contemplative figure on an industrial fire escape.',
    caption: 'Backlit rim light illuminating flyaway hairs and fabric textures.',
    takenAt: '2026-10-10T18:05:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%232e1806"/%3E%3C/svg%3E',
    palette: [
      { hex: '#f77f00', oklch: { l: 0.69, c: 0.18, h: 55 }, weight: 0.40 },
      { hex: '#fcbf49', oklch: { l: 0.82, c: 0.15, h: 80 }, weight: 0.30 },
      { hex: '#1e0f03', oklch: { l: 0.14, c: 0.04, h: 45 }, weight: 0.20 },
      { hex: '#d62828', oklch: { l: 0.52, c: 0.22, h: 30 }, weight: 0.10 }
    ],
    exif: {
      camera: 'Fujifilm X-T5',
      lens: 'XF 33mm f/1.4 R LM WR',
      focalLengthMm: 33,
      aperture: 1.4,
      shutterSeconds: 0.0005,
      shutterDisplay: '1/2000',
      iso: 125
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 29000,
          sha256: '0718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
          urls: [generateSvgPlaceholder('The Edge of Sunset', '#f77f00', '33mm · f/1.4 · Golden Hour Silhouette')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 84000,
          sha256: '18293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
          urls: [generateSvgPlaceholder('The Edge of Sunset', '#f77f00', '33mm · f/1.4 · Golden Hour Silhouette')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 167000,
          sha256: '293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
          urls: [generateSvgPlaceholder('The Edge of Sunset', '#f77f00', '33mm · f/1.4 · Golden Hour Silhouette')]
        }
      ]
    },
    grade: null,
    retouch: null,
    collectionIds: ['street', 'human-presence'],
    tags: ['sunset', 'golden-hour', 'silhouette', 'warm', 'rooftop'],
    mood: ['warm', 'vivid'],
    flags: {
      hasPeople: true,
      retouched: false,
      showBeforeAfter: false
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'Unsplash License',
      credit: 'Theng Nioh',
      sourceUrl: 'https://unsplash.com'
    }
  },
  {
    id: 'f1a9c3d4e5b60008',
    slug: 'the-ceramicist-studio-portrait',
    title: 'Hands in Clay',
    alt: 'Close-up portrait of a Mediterranean female ceramicist working at a potter’s wheel with clay-dusted forearms.',
    caption: 'Soft diffused skylight over earthenware clay and skin.',
    takenAt: '2026-09-18T14:30:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%23241b16"/%3E%3C/svg%3E',
    palette: [
      { hex: '#a67c52', oklch: { l: 0.58, c: 0.08, h: 58 }, weight: 0.38 },
      { hex: '#dfd3c3', oklch: { l: 0.86, c: 0.03, h: 70 }, weight: 0.32 },
      { hex: '#3d2b1f', oklch: { l: 0.28, c: 0.04, h: 50 }, weight: 0.20 },
      { hex: '#7a5a40', oklch: { l: 0.45, c: 0.06, h: 55 }, weight: 0.10 }
    ],
    exif: {
      camera: 'Hasselblad X2D 100C',
      lens: 'XCD 55mm f/2.5 V',
      focalLengthMm: 55,
      aperture: 2.8,
      shutterSeconds: 0.003125,
      shutterDisplay: '1/320',
      iso: 100
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 30000,
          sha256: '394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6',
          urls: [generateSvgPlaceholder('Hands in Clay', '#a67c52', '55mm · f/2.8 · Studio Craft Portrait')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 86000,
          sha256: '4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7',
          urls: [generateSvgPlaceholder('Hands in Clay', '#a67c52', '55mm · f/2.8 · Studio Craft Portrait')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 171000,
          sha256: '5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8',
          urls: [generateSvgPlaceholder('Hands in Clay', '#a67c52', '55mm · f/2.8 · Studio Craft Portrait')]
        }
      ]
    },
    grade: null,
    retouch: {
      retouched: true,
      recipeHash: 'd4e5f6g7h8i9',
      summary: {
        facesCount: 1,
        zonesAdjusted: ['FACE_SKIN', 'NECK_EARS_BODY_SKIN'],
        hasExtreme: false
      }
    },
    collectionIds: ['portraits', 'human-presence'],
    tags: ['portrait', 'ceramicist', 'studio', 'clay', 'natural-tones'],
    mood: ['warm', 'muted'],
    flags: {
      hasPeople: true,
      retouched: true,
      showBeforeAfter: true
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'Unsplash License',
      credit: 'Theng Nioh',
      sourceUrl: 'https://unsplash.com'
    }
  },
  {
    id: 'f1a9c3d4e5b60009',
    slug: 'fog-over-coastal-headland',
    title: 'The Quiet Boundary',
    alt: 'Coastal headland vanishing into dense morning sea mist with gentle surf breaking against dark basalt rocks.',
    caption: 'Minimalist marine exposure capturing the gradient of sea fog.',
    takenAt: '2026-09-02T07:15:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%231a1e24"/%3E%3C/svg%3E',
    palette: [
      { hex: '#778899', oklch: { l: 0.60, c: 0.03, h: 235 }, weight: 0.45 },
      { hex: '#2f4f4f', oklch: { l: 0.38, c: 0.05, h: 195 }, weight: 0.30 },
      { hex: '#e0e6ed', oklch: { l: 0.91, c: 0.02, h: 240 }, weight: 0.15 },
      { hex: '#1a1f26', oklch: { l: 0.18, c: 0.02, h: 245 }, weight: 0.10 }
    ],
    exif: {
      camera: 'Sony A1',
      lens: 'FE 24-70mm f/2.8 GM II',
      focalLengthMm: 45,
      aperture: 11.0,
      shutterSeconds: 2.0,
      shutterDisplay: '2s',
      iso: 100
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 25000,
          sha256: '6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9',
          urls: [generateSvgPlaceholder('The Quiet Boundary', '#778899', '45mm · f/11 · 2s Long Exposure')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 75000,
          sha256: '7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0',
          urls: [generateSvgPlaceholder('The Quiet Boundary', '#778899', '45mm · f/11 · 2s Long Exposure')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 151000,
          sha256: '8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1',
          urls: [generateSvgPlaceholder('The Quiet Boundary', '#778899', '45mm · f/11 · 2s Long Exposure')]
        }
      ]
    },
    grade: null,
    retouch: null,
    collectionIds: ['nature', 'monochrome'],
    tags: ['coastal', 'fog', 'sea', 'rocks', 'long-exposure'],
    mood: ['cool', 'muted', 'low-key'],
    flags: {
      hasPeople: false,
      retouched: false,
      showBeforeAfter: false
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'CC0 Public Domain',
      credit: 'Theng Nioh',
      sourceUrl: 'https://creativecommons.org'
    }
  },
  {
    id: 'f1a9c3d4e5b60010',
    slug: 'geometry-of-red-subway-passage',
    title: 'The Crimson Concourse',
    alt: 'One-point perspective down an empty underground subway corridor bathed in ruby safelight illumination.',
    caption: 'Cinematic study of linear perspective and monochromatic red lighting.',
    takenAt: '2026-09-01T01:10:00Z',
    width: 2048,
    height: 1365,
    aspect: 1.5,
    placeholder: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 7"%3E%3Crect width="10" height="7" fill="%232b0a0d"/%3E%3C/svg%3E',
    palette: [
      { hex: '#f43f5e', oklch: { l: 0.58, c: 0.22, h: 15 }, weight: 0.42 },
      { hex: '#881337', oklch: { l: 0.32, c: 0.16, h: 10 }, weight: 0.32 },
      { hex: '#1f060a', oklch: { l: 0.12, c: 0.05, h: 12 }, weight: 0.20 },
      { hex: '#fecdd3', oklch: { l: 0.88, c: 0.07, h: 20 }, weight: 0.06 }
    ],
    exif: {
      camera: 'Leica M11',
      lens: 'Noctilux-M 50mm f/0.95 ASPH.',
      focalLengthMm: 50,
      aperture: 0.95,
      shutterSeconds: 0.002,
      shutterDisplay: '1/500',
      iso: 800
    },
    sources: {
      variants: [
        {
          width: 640,
          height: 427,
          format: 'webp',
          bytes: 31000,
          sha256: '9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2',
          urls: [generateSvgPlaceholder('The Crimson Concourse', '#f43f5e', '50mm · f/0.95 · Ruby Monochromatic')]
        },
        {
          width: 1280,
          height: 853,
          format: 'webp',
          bytes: 88000,
          sha256: '0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3',
          urls: [generateSvgPlaceholder('The Crimson Concourse', '#f43f5e', '50mm · f/0.95 · Ruby Monochromatic')]
        },
        {
          width: 2048,
          height: 1365,
          format: 'webp',
          bytes: 173000,
          sha256: '1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4',
          urls: [generateSvgPlaceholder('The Crimson Concourse', '#f43f5e', '50mm · f/0.95 · Ruby Monochromatic')]
        }
      ]
    },
    grade: null,
    retouch: null,
    collectionIds: ['architecture', 'street'],
    tags: ['subway', 'crimson', 'red', 'perspective', 'cinema'],
    mood: ['vivid', 'low-key'],
    flags: {
      hasPeople: false,
      retouched: false,
      showBeforeAfter: false
    },
    rights: {
      copyright: '© Theng Nioh',
      license: 'Unsplash License',
      credit: 'Theng Nioh',
      sourceUrl: 'https://unsplash.com'
    }
  }
];

// 1. Write the monthly shard: public/catalog/shards/2026-11.json
const shardPayload = {
  schemaVersion: 1,
  shardId: '2026-11',
  generatedAt: new Date().toISOString(),
  photos: samplePhotos.map((p) => ({ ...p, schemaVersion: 1 }))
};

const shardFilePath = path.join(SHARDS_DIR, '2026-11.json');
const shardContent = stableJson(shardPayload);
fs.writeFileSync(shardFilePath, shardContent, 'utf-8');

// Compute shard SHA-256
const shardHash = crypto.createHash('sha256').update(shardContent).digest('hex');

// 2. Build and write public/catalog/index.json
const catalogIndexPayload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  totalPhotos: samplePhotos.length,
  shards: [
    {
      id: '2026-11',
      url: 'catalog/shards/2026-11.json',
      count: samplePhotos.length,
      sha256: shardHash
    }
  ],
  collections: [
    {
      id: 'portraits',
      slug: 'portraits',
      title: 'Portraits & Human Nuance',
      description: 'Human stillness, natural skin tones, and honest character studies.',
      coverPhotoId: 'f1a9c3d4e5b60001',
      count: 4
    },
    {
      id: 'architecture',
      slug: 'architecture',
      title: 'Architectural Silence',
      description: 'Structural geometries, cantilevered concrete, and shadow lines.',
      coverPhotoId: 'f1a9c3d4e5b60002',
      count: 3
    },
    {
      id: 'street',
      slug: 'street',
      title: 'Urban Cadence',
      description: 'Fleeting moments, rain-slicked asphalt, and neon reflections.',
      coverPhotoId: 'f1a9c3d4e5b60005',
      count: 3
    },
    {
      id: 'nature',
      slug: 'nature',
      title: 'Organic Forms',
      description: 'Microscopic crystalline water drops and maritime fog.',
      coverPhotoId: 'f1a9c3d4e5b60006',
      count: 2
    }
  ],
  facets: {
    focalBuckets: {
      '28mm': 1,
      '30mm': 1,
      '33mm': 1,
      '45mm': 1,
      '50mm': 2,
      '55mm': 1,
      '85mm': 2,
      '100mm': 1
    },
    apertureBuckets: {
      'f/0.95-f/1.4': 3,
      'f/1.7-f/2.0': 3,
      'f/2.8-f/4.0': 2,
      'f/8.0-f/11.0': 2
    },
    isoBuckets: {
      '64-160': 5,
      '200-400': 3,
      '800': 1,
      '3200': 1
    },
    moods: {
      warm: 4,
      cool: 3,
      monochrome: 2,
      muted: 3,
      vivid: 2,
      'low-key': 5
    },
    hueFamilies: {
      warm: 4,
      cool: 3,
      mono: 2,
      crimson: 1
    }
  }
};

const indexFilePath = path.join(CATALOG_DIR, 'index.json');
fs.writeFileSync(indexFilePath, stableJson(catalogIndexPayload), 'utf-8');

console.log(`Successfully generated verified sample catalog:`);
console.log(`- Shard: ${shardFilePath} (${samplePhotos.length} photos, SHA-256: ${shardHash.slice(0, 12)}...)`);
console.log(`- Index: ${indexFilePath}`);
