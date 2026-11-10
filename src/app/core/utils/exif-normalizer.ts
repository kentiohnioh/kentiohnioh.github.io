import { ExifTelemetry } from '../models/catalog.model';

export interface RawExifData {
  Make?: string;
  Model?: string;
  LensModel?: string;
  FocalLength?: number;
  FNumber?: number;
  ExposureTime?: number;
  ISO?: number;
  DateTimeOriginal?: Date | string;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

/**
 * Formats fractional or decimal shutter exposure seconds to photography standard display.
 * e.g. 0.004 -> "1/250", 0.0005 -> "1/2000", 2 -> "2s", 0.5 -> "1/2".
 */
export function formatShutterSpeed(seconds?: number): string | undefined {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) {
    return undefined;
  }

  if (seconds >= 1) {
    return Number.isInteger(seconds) ? `${seconds}s` : `${Math.round(seconds * 10) / 10}s`;
  }

  const reciprocal = Math.round(1 / seconds);
  return `1/${reciprocal}`;
}

/**
 * Cleans up camera body and manufacturer redundancies.
 * e.g. "LEICA CAMERA AG LEICA SL2" -> "Leica SL2", Make: "Leica", Model: "SL2" -> "Leica SL2".
 */
export function normalizeCameraModel(make?: string, model?: string): string | undefined {
  const m = (model || '').trim();
  const k = (make || '').trim();

  let combined = m;
  if (!combined) {
    combined = k;
  } else if (k && !combined.toLowerCase().includes(k.toLowerCase())) {
    combined = `${k} ${combined}`;
  }

  const cleaned = combined
    .replace(/^LEICA CAMERA AG\s+/i, '')
    .replace(/^LEICA\s+/i, 'Leica ')
    .replace(/^SONY\s+ILCE-/i, 'Sony A')
    .replace(/^NIKON CORPORATION\s+/i, '')
    .replace(/^NIKON\s+/i, 'Nikon ')
    .replace(/^FUJIFILM\s+/i, 'Fujifilm ')
    .replace(/^Canon\s+/i, 'Canon ');

  return cleaned.trim() || undefined;
}

/**
 * Normalizes raw EXIF metadata extracted from exifr into clean ExifTelemetry.
 * Enforces GPS privacy rules (purges lat/lng when precision === 'hidden').
 */
export function normalizeExif(raw: RawExifData, gpsPrecision: 'exact' | 'approx' | 'hidden' = 'hidden'): ExifTelemetry {
  const telemetry: ExifTelemetry = {};

  const camera = normalizeCameraModel(raw.Make, raw.Model);
  if (camera) telemetry.camera = camera;

  if (raw.LensModel && typeof raw.LensModel === 'string' && raw.LensModel.trim()) {
    telemetry.lens = raw.LensModel.trim();
  }

  if (typeof raw.FocalLength === 'number' && raw.FocalLength > 0) {
    telemetry.focalLengthMm = Math.round(raw.FocalLength);
  }

  if (typeof raw.FNumber === 'number' && raw.FNumber > 0) {
    telemetry.aperture = Math.round(raw.FNumber * 10) / 10;
  }

  if (typeof raw.ExposureTime === 'number' && raw.ExposureTime > 0) {
    telemetry.shutterSeconds = raw.ExposureTime;
    telemetry.shutterDisplay = formatShutterSpeed(raw.ExposureTime);
  }

  if (typeof raw.ISO === 'number' && raw.ISO > 0) {
    telemetry.iso = Math.round(raw.ISO);
  }

  // Privacy Rule: GPS handling
  if (raw.latitude !== undefined && raw.longitude !== undefined && gpsPrecision !== 'hidden') {
    let lat = raw.latitude;
    let lng = raw.longitude;

    if (gpsPrecision === 'approx') {
      lat = Math.round(lat * 100) / 100;
      lng = Math.round(lng * 100) / 100;
    }

    telemetry.gps = {
      lat,
      lng,
      precision: gpsPrecision,
    };
  } else {
    delete telemetry.gps;
  }

  return telemetry;
}
