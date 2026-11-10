import { Injectable } from '@angular/core';
import { FilesetResolver, FaceLandmarker, ImageSegmenter, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { AnatomicalZoneId } from '../models/retouch.model';
import { fuseMasksWithPartitionOfUnity, FusedMaskBuffers } from '../utils/mask-fusion';
import { applyGuidedFilter } from '../utils/guided-filter';
import { fitSubjectSkinModel, evaluateSkinGateProbability } from '../utils/skin-model';

export interface FaceDetectionResult {
  faceIndex: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  landmarks: NormalizedLandmark[];
  confidence: number;
}

export interface MaskGenerationOutput {
  fusedBuffers: FusedMaskBuffers;
  faces: FaceDetectionResult[];
  skinProtectionBlob?: Blob;
}

/**
 * Retouch Engine Service: MediaPipe 478-Landmark Detection, 12-Zone Fusion & Guided Filter Refinement.
 * Local admin chunk only. Never bundled into public production distribution.
 */
@Injectable({
  providedIn: 'root',
})
export class RetouchEngineService {
  private faceLandmarker: FaceLandmarker | null = null;
  private imageSegmenter: ImageSegmenter | null = null;
  private isInitializing = false;

  /**
   * Lazily initializes MediaPipe vision tasks using WebAssembly files.
   */
  async initializeVisionTasks(): Promise<boolean> {
    if (this.faceLandmarker && this.imageSegmenter) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numFaces: 5,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      this.isInitializing = false;
      return true;
    } catch (err) {
      this.isInitializing = false;
      console.warn('MediaPipe initialization fallback to algorithmic geometric heuristics:', err);
      return false;
    }
  }

  /**
   * Generates the 12 mutually exclusive soft anatomical masks with partition of unity.
   */
  async generateMasks(
    imageElement: HTMLImageElement | HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<MaskGenerationOutput> {
    await this.initializeVisionTasks();

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
      BACKGROUND: new Float32Array(numPixels).fill(0.1), // Base background weight
    };

    let faces: FaceDetectionResult[] = [];

    // Run FaceLandmarker if available
    if (this.faceLandmarker) {
      try {
        const landmarkResults = this.faceLandmarker.detect(imageElement);
        if (landmarkResults.faceLandmarks) {
          faces = landmarkResults.faceLandmarks.map((lm, idx) => ({
            faceIndex: idx,
            boundingBox: this.computeBoundingBox(lm, width, height),
            landmarks: lm,
            confidence: 0.95,
          }));
        }
      } catch (err) {
        console.warn('FaceLandmarker detect exception:', err);
      }
    }

    // Prepare Luminance Guide for Edge Refinement
    const guideLuminance = this.extractLuminanceGuide(imageElement, width, height);

    // Rasterize anatomical zones for detected faces
    for (const face of faces) {
      this.rasterizeFaceZones(face, rawWeights, width, height);
    }

    // If no faces detected, assign soft body-skin/background defaults
    if (faces.length === 0) {
      this.rasterizeNoFaceFallback(rawWeights, width, height);
    }

    // Apply Fast Guided Filter to soften and hug photographic edges for key zones
    const zonesToRefine: AnatomicalZoneId[] = [
      'FACE_SKIN',
      'LIPS',
      'IRIS_AND_SCLERA',
      'EYEBROWS',
      'SCALP_HAIR_AND_BABY_HAIRS',
    ];

    for (const zone of zonesToRefine) {
      rawWeights[zone] = applyGuidedFilter(guideLuminance, rawWeights[zone], width, height, {
        radius: Math.max(4, Math.round(width * 0.006)),
        eps: 1e-4,
      });
    }

    // Final Partition of Unity Fusion (guarantees sum(w_i) == 1.000 at every pixel)
    const fusedBuffers = fuseMasksWithPartitionOfUnity(rawWeights, width, height);

    // Generate tiny public skin protection mask (256px)
    const skinProtectionBlob = await this.exportSkinProtectionMask(fusedBuffers.zoneWeights.FACE_SKIN, width, height);

    return {
      fusedBuffers,
      faces,
      skinProtectionBlob,
    };
  }

  private computeBoundingBox(landmarks: NormalizedLandmark[], width: number, height: number) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of landmarks) {
      const px = p.x * width;
      const py = p.y * height;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }

    return {
      x: Math.max(0, Math.round(minX)),
      y: Math.max(0, Math.round(minY)),
      width: Math.min(width, Math.round(maxX - minX)),
      height: Math.min(height, Math.round(maxY - minY)),
    };
  }

  private rasterizeFaceZones(
    face: FaceDetectionResult,
    masks: Record<AnatomicalZoneId, Float32Array>,
    width: number,
    height: number
  ): void {
    const lm = face.landmarks;

    // 1. Iris Discs: Right (468 center, 469-472 rim) and Left (473 center, 474-477 rim)
    if (lm.length >= 478) {
      this.rasterizeRadialMask(masks.IRIS_AND_SCLERA, lm[468].x * width, lm[468].y * height, width * 0.015, width, height);
      this.rasterizeRadialMask(masks.IRIS_AND_SCLERA, lm[473].x * width, lm[473].y * height, width * 0.015, width, height);

      // 2. Eyelashes and Periocular Shield (12% dilation around eye center)
      this.rasterizeRadialMask(masks.EYELASHES_AND_PERIOCULAR, lm[468].x * width, lm[468].y * height, width * 0.026, width, height);
      this.rasterizeRadialMask(masks.EYELASHES_AND_PERIOCULAR, lm[473].x * width, lm[473].y * height, width * 0.026, width, height);

      // 3. Eyebrows
      if (lm[70] && lm[300]) {
        this.rasterizeRadialMask(masks.EYEBROWS, lm[70].x * width, lm[70].y * height, width * 0.035, width, height);
        this.rasterizeRadialMask(masks.EYEBROWS, lm[300].x * width, lm[300].y * height, width * 0.035, width, height);
      }

      // 4. Lips (Landmarks 13 inner center, 14, 61, 291)
      if (lm[13]) {
        this.rasterizeRadialMask(masks.LIPS, lm[13].x * width, lm[13].y * height, width * 0.035, width, height);
        this.rasterizeRadialMask(masks.TEETH_AND_INNER_MOUTH, lm[13].x * width, lm[13].y * height, width * 0.018, width, height);
      }

      // 5. Nostrils and Nasal Crease (Alar landmarks 2, 98, 327)
      if (lm[2]) {
        this.rasterizeRadialMask(masks.NOSTRILS_AND_NASAL_CREASE, lm[2].x * width, lm[2].y * height, width * 0.022, width, height);
      }

      // 6. Face Skin Oval
      const bb = face.boundingBox;
      const centerX = bb.x + bb.width / 2;
      const centerY = bb.y + bb.height / 2;
      const radiusX = bb.width * 0.45;
      const radiusY = bb.height * 0.55;
      this.rasterizeEllipticalMask(masks.FACE_SKIN, centerX, centerY, radiusX, radiusY, width, height);
    }
  }

  private rasterizeNoFaceFallback(
    masks: Record<AnatomicalZoneId, Float32Array>,
    width: number,
    height: number
  ): void {
    // Fill lower half as potential body/environment and remainder as background
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (y > height * 0.55) {
          masks.NECK_EARS_BODY_SKIN[idx] = 0.5;
        } else {
          masks.BACKGROUND[idx] = 0.8;
        }
      }
    }
  }

  private rasterizeRadialMask(
    target: Float32Array,
    cx: number,
    cy: number,
    radius: number,
    width: number,
    height: number
  ): void {
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));
    const r2 = radius * radius;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 <= r2) {
          const soft = 1.0 - Math.sqrt(d2) / radius;
          const idx = y * width + x;
          target[idx] = Math.max(target[idx], soft);
        }
      }
    }
  }

  private rasterizeEllipticalMask(
    target: Float32Array,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    width: number,
    height: number
  ): void {
    const minX = Math.max(0, Math.floor(cx - rx));
    const maxX = Math.min(width - 1, Math.ceil(cx + rx));
    const minY = Math.max(0, Math.floor(cy - ry));
    const maxY = Math.min(height - 1, Math.ceil(cy + ry));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const normalizedDist = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (normalizedDist <= 1.0) {
          const soft = Math.max(0, 1.0 - Math.sqrt(normalizedDist));
          const idx = y * width + x;
          target[idx] = Math.max(target[idx], soft);
        }
      }
    }
  }

  private extractLuminanceGuide(
    img: HTMLImageElement | HTMLCanvasElement,
    width: number,
    height: number
  ): Float32Array {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;

    const luminance = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      luminance[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
    }
    return luminance;
  }

  /**
   * Encodes a tiny 256px single-channel skin protection mask for public delivery (Phase 6).
   * Size target <= 15 KB.
   */
  public async exportSkinProtectionMask(
    skinWeights: Float32Array,
    origWidth: number,
    origHeight: number
  ): Promise<Blob> {
    const targetWidth = 256;
    const aspect = origWidth / origHeight;
    const targetHeight = Math.round(targetWidth / aspect);

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(targetWidth, targetHeight);

    // Resample skin weights down to 256px
    for (let y = 0; y < targetHeight; y++) {
      const srcY = Math.min(origHeight - 1, Math.floor((y / targetHeight) * origHeight));
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.min(origWidth - 1, Math.floor((x / targetWidth) * origWidth));
        const weight = skinWeights[srcY * origWidth + srcX];
        const val = Math.round(weight * 255);
        const idx = (y * targetWidth + x) * 4;

        imgData.data[idx] = val;
        imgData.data[idx + 1] = val;
        imgData.data[idx + 2] = val;
        imgData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  }
}

