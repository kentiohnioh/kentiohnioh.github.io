import { describe, it, expect } from 'vitest';
import {
  formatShutterSpeed,
  normalizeCameraModel,
  normalizeExif,
} from './exif-normalizer';

describe('EXIF Normalizer', () => {
  it('formats various photography exposure times correctly', () => {
    expect(formatShutterSpeed(0.004)).toBe('1/250');
    expect(formatShutterSpeed(0.0005)).toBe('1/2000');
    expect(formatShutterSpeed(0.001)).toBe('1/1000');
    expect(formatShutterSpeed(0.016666)).toBe('1/60');
    expect(formatShutterSpeed(0.5)).toBe('1/2');
    expect(formatShutterSpeed(1)).toBe('1s');
    expect(formatShutterSpeed(2.5)).toBe('2.5s');
    expect(formatShutterSpeed(30)).toBe('30s');
    expect(formatShutterSpeed(undefined)).toBeUndefined();
  });

  it('cleans up manufacturer redundancies from camera model names', () => {
    expect(normalizeCameraModel('LEICA CAMERA AG', 'LEICA CAMERA AG LEICA SL2')).toBe('Leica SL2');
    expect(normalizeCameraModel('SONY', 'ILCE-7RM5')).toBe('Sony A7RM5');
    expect(normalizeCameraModel('NIKON CORPORATION', 'NIKON Z 8')).toBe('Nikon Z 8');
    expect(normalizeCameraModel('FUJIFILM', 'X-T5')).toBe('Fujifilm X-T5');
  });

  it('enforces GPS privacy rules by default (hidden precision purges lat/lng)', () => {
    const raw = {
      Make: 'Leica',
      Model: 'SL2',
      FocalLength: 50,
      FNumber: 1.4,
      ExposureTime: 0.002,
      ISO: 100,
      latitude: 1.29027,
      longitude: 103.851959,
    };

    const telemetryHidden = normalizeExif(raw, 'hidden');
    expect(telemetryHidden.gps).toBeUndefined();
    expect(telemetryHidden.camera).toBe('Leica SL2');
    expect(telemetryHidden.shutterDisplay).toBe('1/500');

    // Approx precision rounds coordinates to ~1km for privacy
    const telemetryApprox = normalizeExif(raw, 'approx');
    expect(telemetryApprox.gps).toBeDefined();
    expect(telemetryApprox.gps?.lat).toBe(1.29);
    expect(telemetryApprox.gps?.lng).toBe(103.85);
    expect(telemetryApprox.gps?.precision).toBe('approx');
  });
});
