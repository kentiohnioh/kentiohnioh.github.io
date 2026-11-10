/**
 * Vector Search, Int8 Quantization & Hybrid Ranking Engine.
 * Supports on-device CLIP semantic embeddings combined with instant lexical search.
 */

import { PhotoItem } from '../models/catalog.model';

export interface SearchMatchResult {
  photo: PhotoItem;
  score: number; // 0 to 1
  semanticScore?: number;
  lexicalScore: number;
  matchReasons: string[]; // e.g. ["title", "tag: street", "mood: cinematic"]
}

/**
 * Quantize a normalized Float32Array vector into Int8Array.
 * Since normalized vector values lie in [-1, 1], scaling by 127 fits cleanly in signed 8-bit [-128..127].
 */
export function quantizeVectorInt8(vec: Float32Array): Int8Array {
  const q = new Int8Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    const val = Math.round(vec[i] * 127);
    q[i] = Math.max(-128, Math.min(127, val));
  }
  return q;
}

/**
 * Dequantize an Int8Array back into a normalized Float32Array.
 */
export function dequantizeVectorInt8(qvec: Int8Array): Float32Array {
  const vec = new Float32Array(qvec.length);
  for (let i = 0; i < qvec.length; i++) {
    vec[i] = qvec[i] / 127;
  }
  return vec;
}

/**
 * Compute cosine similarity / dot product between normalized float32 query and int8 quantized target.
 * Returns similarity scaled to [0, 1].
 */
export function dotProductFloatAndInt8(queryVec: Float32Array, targetInt8: Int8Array): number {
  if (queryVec.length !== targetInt8.length || queryVec.length === 0) return 0;

  let dot = 0;
  for (let i = 0; i < queryVec.length; i++) {
    dot += queryVec[i] * targetInt8[i];
  }

  // Dequantize the dot product sum
  const rawSimilarity = dot / 127; // in approx [-1, 1]
  // Normalize to [0, 1]
  return Math.max(0, Math.min(1, (rawSimilarity + 1) / 2));
}

/**
 * Compute fast lexical match score and reasoning chips without network downloads.
 */
export function scoreLexicalMatch(
  photo: PhotoItem,
  query: string
): { score: number; reasons: string[] } {
  const clean = query.trim().toLowerCase();
  if (!clean) return { score: 0, reasons: [] };

  const tokens = clean.split(/\s+/).filter(Boolean);
  const reasons: string[] = [];
  let matchPoints = 0;
  const maxPossiblePoints = tokens.length * 4;

  for (const token of tokens) {
    let tokenMatched = false;

    // Title match (high weight = 4)
    if (photo.title.toLowerCase().includes(token)) {
      matchPoints += 4;
      reasons.push(`title: "${photo.title}"`);
      tokenMatched = true;
    }

    // Mood match (weight = 3)
    const matchingMood = photo.mood?.find((m) => m.toLowerCase().includes(token));
    if (matchingMood) {
      matchPoints += 3;
      reasons.push(`mood: ${matchingMood}`);
      tokenMatched = true;
    }

    // Tag match (weight = 3)
    const matchingTag = photo.tags?.find((t) => t.toLowerCase().includes(token));
    if (matchingTag) {
      matchPoints += 3;
      reasons.push(`tag: ${matchingTag}`);
      tokenMatched = true;
    }

    // Collection match (weight = 2)
    const matchingColl = photo.collectionIds?.find((c) => c.toLowerCase().includes(token));
    if (matchingColl) {
      matchPoints += 2;
      reasons.push(`collection: ${matchingColl}`);
      tokenMatched = true;
    }

    // Camera / Lens EXIF match (weight = 2)
    if (photo.exif?.camera?.toLowerCase().includes(token)) {
      matchPoints += 2;
      reasons.push(`camera: ${photo.exif.camera}`);
      tokenMatched = true;
    } else if (photo.exif?.lens?.toLowerCase().includes(token)) {
      matchPoints += 2;
      reasons.push(`lens: ${photo.exif.lens}`);
      tokenMatched = true;
    }

    // Alt text match (weight = 1)
    if (!tokenMatched && photo.alt.toLowerCase().includes(token)) {
      matchPoints += 1;
      reasons.push('description match');
    }
  }

  const score = Math.min(1.0, matchPoints / Math.max(1, maxPossiblePoints));
  return {
    score,
    // Deduplicate reasons
    reasons: Array.from(new Set(reasons)),
  };
}

/**
 * Compute combined hybrid score: 0.7 * semantic + 0.3 * lexical.
 * Falls back to 1.0 * lexical when semantic embeddings are not loaded.
 */
export function computeHybridScore(
  semanticScore: number | undefined,
  lexicalScore: number
): number {
  if (semanticScore === undefined || isNaN(semanticScore)) {
    return lexicalScore;
  }
  return 0.7 * semanticScore + 0.3 * lexicalScore;
}

/**
 * Execute fast search and rank photos by hybrid score.
 */
export function rankPhotos(
  photos: PhotoItem[],
  query: string,
  embeddingsMap?: Map<string, Int8Array>,
  queryEmbedding?: Float32Array
): SearchMatchResult[] {
  const results: SearchMatchResult[] = [];

  for (const photo of photos) {
    const { score: lexicalScore, reasons } = scoreLexicalMatch(photo, query);

    let semanticScore: number | undefined;
    if (queryEmbedding && embeddingsMap?.has(photo.id)) {
      const targetInt8 = embeddingsMap.get(photo.id)!;
      semanticScore = dotProductFloatAndInt8(queryEmbedding, targetInt8);
      if (semanticScore > 0.65) {
        reasons.push('AI vibe match');
      }
    }

    const totalScore = computeHybridScore(semanticScore, lexicalScore);

    // Keep if either lexical or semantic had a match
    if (totalScore > 0.05 || lexicalScore > 0 || (semanticScore && semanticScore > 0.6)) {
      results.push({
        photo,
        score: totalScore,
        semanticScore,
        lexicalScore,
        matchReasons: reasons,
      });
    }
  }

  // Sort descending by score
  return results.sort((a, b) => b.score - a.score);
}

