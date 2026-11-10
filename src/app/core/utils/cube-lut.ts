/**
 * Adobe .CUBE 3D/1D LUT parser and serializer.
 * Reference: Adobe Cube LUT Specification v1.0
 */

export interface ParsedCubeLut {
  title: string;
  size: number;
  is3D: boolean;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  data: Float32Array; // RGB triplets flattened: length = size^3 * 3 (or size * 3 for 1D)
}

/**
 * Parses a .CUBE LUT file string into a structured Float32Array representation.
 */
export function parseCubeLut(cubeText: string): ParsedCubeLut {
  const lines = cubeText.split(/\r?\n/);
  let title = 'Untitled';
  let size = 0;
  let is3D = true;
  let domainMin: [number, number, number] = [0.0, 0.0, 0.0];
  let domainMax: [number, number, number] = [1.0, 1.0, 1.0];

  const values: number[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const tokens = line.split(/\s+/);
    const keyword = tokens[0].toUpperCase();

    if (keyword === 'TITLE') {
      const match = line.match(/^TITLE\s+"?([^"]+)"?/i);
      if (match) title = match[1];
    } else if (keyword === 'LUT_3D_SIZE') {
      size = parseInt(tokens[1], 10);
      is3D = true;
    } else if (keyword === 'LUT_1D_SIZE') {
      size = parseInt(tokens[1], 10);
      is3D = false;
    } else if (keyword === 'DOMAIN_MIN') {
      domainMin = [parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])];
    } else if (keyword === 'DOMAIN_MAX') {
      domainMax = [parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])];
    } else if (!isNaN(parseFloat(tokens[0])) && tokens.length >= 3) {
      // Data line (R G B)
      values.push(parseFloat(tokens[0]));
      values.push(parseFloat(tokens[1]));
      values.push(parseFloat(tokens[2]));
    }
  }

  if (size <= 0) {
    throw new Error('Invalid .CUBE file: Missing or invalid LUT_3D_SIZE or LUT_1D_SIZE.');
  }

  const expectedValues = is3D ? size * size * size * 3 : size * 3;
  if (values.length !== expectedValues) {
    throw new Error(
      `Invalid .CUBE file: Expected ${expectedValues} floats for size ${size}, but found ${values.length}.`
    );
  }

  return {
    title,
    size,
    is3D,
    domainMin,
    domainMax,
    data: new Float32Array(values),
  };
}

/**
 * Serializes a 3D LUT Float32Array into an Adobe .CUBE formatted string.
 */
export function serializeCubeLut(
  title: string,
  size: number,
  data: Float32Array,
  domainMin: [number, number, number] = [0.0, 0.0, 0.0],
  domainMax: [number, number, number] = [1.0, 1.0, 1.0]
): string {
  const lines: string[] = [
    `# Created by Theng Nioh Photography System`,
    `TITLE "${title}"`,
    `LUT_3D_SIZE ${size}`,
    `DOMAIN_MIN ${domainMin[0].toFixed(6)} ${domainMin[1].toFixed(6)} ${domainMin[2].toFixed(6)}`,
    `DOMAIN_MAX ${domainMax[0].toFixed(6)} ${domainMax[1].toFixed(6)} ${domainMax[2].toFixed(6)}`,
  ];

  const totalEntries = size * size * size;
  for (let i = 0; i < totalEntries; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    lines.push(`${r.toFixed(6)} ${g.toFixed(6)} ${b.toFixed(6)}`);
  }

  return lines.join('\n');
}

/**
 * Generates an identity 3D LUT where input RGB maps 1:1 to output RGB.
 */
export function generateIdentityLut(size: number): Float32Array {
  const totalEntries = size * size * size;
  const data = new Float32Array(totalEntries * 3);
  let idx = 0;

  // In .CUBE format, R changes fastest, then G, then B
  for (let b = 0; b < size; b++) {
    const bv = b / (size - 1);
    for (let g = 0; g < size; g++) {
      const gv = g / (size - 1);
      for (let r = 0; r < size; r++) {
        const rv = r / (size - 1);
        data[idx++] = rv;
        data[idx++] = gv;
        data[idx++] = bv;
      }
    }
  }

  return data;
}

/**
 * Samples a 3D LUT using software trilinear interpolation.
 * Useful for CPU test verification and non-WebGL environments.
 */
export function sample3dLut(
  data: Float32Array,
  size: number,
  r: number,
  g: number,
  b: number
): [number, number, number] {
  // Clamp input coordinates to [0, 1]
  const cr = Math.max(0, Math.min(1, r));
  const cg = Math.max(0, Math.min(1, g));
  const cb = Math.max(0, Math.min(1, b));

  const maxCoord = size - 1;
  const fx = cr * maxCoord;
  const fy = cg * maxCoord;
  const fz = cb * maxCoord;

  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const z0 = Math.floor(fz);

  const x1 = Math.min(maxCoord, x0 + 1);
  const y1 = Math.min(maxCoord, y0 + 1);
  const z1 = Math.min(maxCoord, z0 + 1);

  const dx = fx - x0;
  const dy = fy - y0;
  const dz = fz - z0;

  const getEntry = (x: number, y: number, z: number): [number, number, number] => {
    // Index: (z * size * size + y * size + x) * 3
    const base = (z * size * size + y * size + x) * 3;
    return [data[base], data[base + 1], data[base + 2]];
  };

  const c000 = getEntry(x0, y0, z0);
  const c100 = getEntry(x1, y0, z0);
  const c010 = getEntry(x0, y1, z0);
  const c110 = getEntry(x1, y1, z0);
  const c001 = getEntry(x0, y0, z1);
  const c101 = getEntry(x1, y0, z1);
  const c011 = getEntry(x0, y1, z1);
  const c111 = getEntry(x1, y1, z1);

  const out: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    // Trilinear interpolation:
    const c00 = c000[c] * (1 - dx) + c100[c] * dx;
    const c01 = c001[c] * (1 - dx) + c101[c] * dx;
    const c10 = c010[c] * (1 - dx) + c110[c] * dx;
    const c11 = c011[c] * (1 - dx) + c111[c] * dx;

    const c0 = c00 * (1 - dy) + c10 * dy;
    const c1 = c01 * (1 - dy) + c11 * dy;

    out[c] = c0 * (1 - dz) + c1 * dz;
  }

  return out;
}

/**
 * Converts a Float32Array 3D LUT (RGB floats [0, 1]) into an RGBA8 Uint8Array for WebGL texture upload.
 */
export function convertLutToRgba8(data: Float32Array, size: number): Uint8Array {
  const totalVoxels = size * size * size;
  const rgba = new Uint8Array(totalVoxels * 4);

  for (let i = 0; i < totalVoxels; i++) {
    rgba[i * 4] = Math.round(Math.max(0, Math.min(1, data[i * 3])) * 255);
    rgba[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, data[i * 3 + 1])) * 255);
    rgba[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, data[i * 3 + 2])) * 255);
    rgba[i * 4 + 3] = 255;
  }

  return rgba;
}
