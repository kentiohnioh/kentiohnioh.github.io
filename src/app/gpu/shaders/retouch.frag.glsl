#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
// 12 Partition-of-Unity masks packed into 3 RGBA textures
uniform sampler2D u_maskTexA; // R:FACE_SKIN, G:NECK_BODY, B:IRIS, A:SCLERA
uniform sampler2D u_maskTexB; // R:TEETH, G:LIPS, B:EYEBROWS, A:EYELASHES
uniform sampler2D u_maskTexC; // R:FACIAL_HAIR, G:SCALP_HAIR, B:NOSTRILS, A:BACKGROUND

uniform vec2 u_imageSize;
uniform float u_splitPosition; // -1.0 to disable, 0.0..1.0 for before/after split
uniform int u_visualizeZone;   // -1=off, 0..11=specific zone, 99=composite false color

// 19 Sliders
uniform float u_skinSmoothing;
uniform float u_textureRetention;
uniform float u_skinRadiance;
uniform float u_redCastKiller;
uniform float u_autoBlemishHeal;
uniform float u_neckBodyToneSync;
uniform float u_irisClarity;
uniform float u_catchlightPop;
uniform float u_scleraRadiance;
uniform float u_darkCircleSoftener;
uniform float u_lashDefinition;
uniform float u_browDefinition;
uniform float u_lipHydration;
uniform float u_lipTint;
uniform float u_teethWhitening;
uniform float u_hairLuster;
uniform float u_subtleSculpt;
uniform float u_backgroundBlur;
uniform float u_backgroundDim;

// Triangular PDF dithering
float ditherTriangular(vec2 uv) {
  float r = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
  float g = fract(sin(dot(uv, vec2(93.9898, 67.345))) * 24634.6345);
  return (r + g - 1.0) / 255.0;
}

// Convert RGB to Luminance
float rgb2lum(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 uv = v_texCoord;

  // Split-screen Before/After inspection:
  // If uv.x < u_splitPosition, render original image unprocessed with a 1px white divider line
  if (u_splitPosition >= 0.0) {
    float dist = abs(uv.x - u_splitPosition) * u_imageSize.x;
    if (dist < 1.0) {
      fragColor = vec4(1.0, 1.0, 1.0, 1.0);
      return;
    }
    if (uv.x < u_splitPosition) {
      fragColor = texture(u_image, uv);
      return;
    }
  }

  vec4 origColor = texture(u_image, uv);
  vec4 maskA = texture(u_maskTexA, uv);
  vec4 maskB = texture(u_maskTexB, uv);
  vec4 maskC = texture(u_maskTexC, uv);

  float wFaceSkin = maskA.r;
  float wNeckBody = maskA.g;
  float wIris     = maskA.b;
  float wSclera   = maskA.a;

  float wTeeth    = maskB.r;
  float wLips     = maskB.g;
  float wBrow     = maskB.b;
  float wLash     = maskB.a;

  float wBeard    = maskC.r;
  float wHair     = maskC.g;
  float wNostril  = maskC.b;
  float wBg       = maskC.a;

  // Mask Visualizer Mode (Hotkey M or Dev inspection)
  if (u_visualizeZone >= 0) {
    float baseLum = rgb2lum(origColor.rgb) * 0.4;
    vec3 baseMono = vec3(baseLum);

    if (u_visualizeZone == 99) {
      // Composite false-color overlay
      vec3 overlay = vec3(0.0);
      overlay += vec3(0.2, 0.8, 0.5) * wFaceSkin; // Emerald
      overlay += vec3(0.9, 0.6, 0.2) * wNeckBody; // Amber
      overlay += vec3(0.2, 0.6, 1.0) * wIris;     // Ice blue
      overlay += vec3(1.0, 1.0, 1.0) * wSclera;   // White
      overlay += vec3(0.2, 0.9, 0.9) * wTeeth;    // Cyan
      overlay += vec3(0.9, 0.2, 0.4) * wLips;     // Safelight red
      overlay += vec3(0.7, 0.3, 0.8) * wBrow;     // Violet
      overlay += vec3(1.0, 0.9, 0.2) * wLash;     // Yellow
      overlay += vec3(0.9, 0.4, 0.1) * wBeard;    // Orange
      overlay += vec3(0.8, 0.2, 0.7) * wHair;     // Magenta
      overlay += vec3(0.1, 0.4, 0.4) * wNostril;  // Dark teal
      overlay += vec3(0.3, 0.4, 0.6) * wBg;       // Slate blue

      fragColor = vec4(baseMono * 0.4 + overlay * 0.7, 1.0);
      return;
    } else {
      // Individual zone false color
      float targetWeight = 0.0;
      vec3 zoneColor = vec3(0.2, 0.8, 0.5);

      if (u_visualizeZone == 0) { targetWeight = wFaceSkin; zoneColor = vec3(0.2, 0.8, 0.5); }
      else if (u_visualizeZone == 1) { targetWeight = wNeckBody; zoneColor = vec3(0.9, 0.6, 0.2); }
      else if (u_visualizeZone == 2) { targetWeight = wIris;     zoneColor = vec3(0.2, 0.6, 1.0); }
      else if (u_visualizeZone == 3) { targetWeight = wSclera;   zoneColor = vec3(1.0, 1.0, 1.0); }
      else if (u_visualizeZone == 4) { targetWeight = wTeeth;    zoneColor = vec3(0.2, 0.9, 0.9); }
      else if (u_visualizeZone == 5) { targetWeight = wLips;     zoneColor = vec3(0.9, 0.2, 0.4); }
      else if (u_visualizeZone == 6) { targetWeight = wBrow;     zoneColor = vec3(0.7, 0.3, 0.8); }
      else if (u_visualizeZone == 7) { targetWeight = wLash;     zoneColor = vec3(1.0, 0.9, 0.2); }
      else if (u_visualizeZone == 8) { targetWeight = wBeard;    zoneColor = vec3(0.9, 0.4, 0.1); }
      else if (u_visualizeZone == 9) { targetWeight = wHair;     zoneColor = vec3(0.8, 0.2, 0.7); }
      else if (u_visualizeZone == 10){ targetWeight = wNostril;  zoneColor = vec3(0.1, 0.4, 0.4); }
      else if (u_visualizeZone == 11){ targetWeight = wBg;       zoneColor = vec3(0.3, 0.4, 0.6); }

      fragColor = vec4(mix(baseMono, zoneColor, targetWeight * 0.85), 1.0);
      return;
    }
  }

  // --- Processing Pipeline ---
  vec3 outColor = origColor.rgb;
  vec2 texel = 1.0 / u_imageSize;

  // 1. Bilateral Low-Frequency approximation for skin smoothing
  vec3 lowPass = vec3(0.0);
  float totalWeight = 0.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 offset = vec2(float(x), float(y)) * texel * 1.5;
      vec3 sampleCol = texture(u_image, uv + offset).rgb;
      float spatialDist = float(x * x + y * y);
      float colorDist = length(sampleCol - origColor.rgb);
      float w = exp(-spatialDist * 0.15 - colorDist * 12.0);
      lowPass += sampleCol * w;
      totalWeight += w;
    }
  }
  lowPass /= max(0.001, totalWeight);

  // High-frequency texture separation:
  vec3 highPass = origColor.rgb - lowPass;
  float hfLum = abs(rgb2lum(highPass));

  // Micro-edge gate: preserves fine structural edges (moles, lashes, natural crease)
  float edgeGate = exp(-0.5 * (hfLum / 0.08) * (hfLum / 0.08));

  // 2. Skin Smoothing pass
  if (u_skinSmoothing > 0.0 && wFaceSkin > 0.001) {
    float smoothFactor = (u_skinSmoothing / 100.0) * wFaceSkin * edgeGate;
    float retention = u_textureRetention / 100.0;
    vec3 smoothedSkin = lowPass + highPass * retention;
    outColor = mix(outColor, smoothedSkin, smoothFactor);
  }

  // 3. Red Cast Neutralizer (calms erythema/redness in skin zone)
  if (u_redCastKiller > 0.0 && (wFaceSkin + wNeckBody) > 0.01) {
    float skinZone = max(wFaceSkin, wNeckBody);
    float excessRed = max(0.0, outColor.r - (outColor.g + outColor.b) * 0.6);
    float dampFactor = (u_redCastKiller / 100.0) * 0.4 * skinZone;
    outColor.r -= excessRed * dampFactor;
  }

  // 4. Skin Radiance (subtle highlight bloom on high facial planes)
  if (u_skinRadiance > 0.0 && wFaceSkin > 0.01) {
    float lum = rgb2lum(outColor);
    if (lum > 0.55) {
      float bloom = (lum - 0.55) * (u_skinRadiance / 100.0) * 0.25 * wFaceSkin;
      outColor += vec3(bloom);
    }
  }

  // 5. Eye Suite (Iris clarity, catchlight pop, sclera brightening)
  if (wIris > 0.01) {
    if (u_irisClarity > 0.0) {
      vec3 irisContrast = (outColor - 0.4) * (1.0 + (u_irisClarity / 100.0) * 0.4) + 0.4;
      outColor = mix(outColor, irisContrast, wIris);
    }
    if (u_catchlightPop > 0.0) {
      float lum = rgb2lum(outColor);
      if (lum > 0.7) {
        float pop = (lum - 0.7) * (u_catchlightPop / 100.0) * 0.5 * wIris;
        outColor += vec3(pop);
      }
    }
  }

  if (wSclera > 0.01 && u_scleraRadiance > 0.0) {
    float factor = (u_scleraRadiance / 100.0) * 0.2 * wSclera;
    // Lift luminance slightly and desaturate red veins
    float scleraLum = rgb2lum(outColor);
    outColor = mix(outColor, vec3(scleraLum + 0.05), factor);
  }

  // 6. Teeth Natural Whitening
  if (wTeeth > 0.01 && u_teethWhitening > 0.0) {
    float factor = (u_teethWhitening / 100.0) * 0.3 * wTeeth;
    // Desaturate yellow cast: reduce distance between blue and (r+g)/2
    float rgAvg = (outColor.r + outColor.g) * 0.5;
    outColor.b = mix(outColor.b, rgAvg, factor * 0.7);
    outColor += vec3(0.04 * factor); // Modest, non-chalky lift
  }

  // 7. Lips Hydration & Tint
  if (wLips > 0.01) {
    if (u_lipTint > 0.0) {
      float tintFactor = (u_lipTint / 100.0) * 0.2 * wLips;
      outColor.r += 0.05 * tintFactor;
    }
    if (u_lipHydration > 0.0) {
      float lum = rgb2lum(outColor);
      if (lum > 0.4) {
        float sheen = (lum - 0.4) * (u_lipHydration / 100.0) * 0.2 * wLips;
        outColor += vec3(sheen);
      }
    }
  }

  // 8. Lash & Brow Definition (micro-contrast acutance)
  float detailWeight = max(wLash * (u_lashDefinition / 100.0), wBrow * (u_browDefinition / 100.0));
  if (detailWeight > 0.01) {
    outColor += highPass * detailWeight * 0.5;
  }

  // 9. Hair Luster (specular reflection boost along hair zone)
  if (wHair > 0.01 && u_hairLuster > 0.0) {
    float hairLum = rgb2lum(outColor);
    if (hairLum > 0.35) {
      float luster = (hairLum - 0.35) * (u_hairLuster / 100.0) * 0.3 * wHair;
      outColor += vec3(luster);
    }
  }

  // 10. Background Blur & Dim
  if (wBg > 0.01) {
    if (u_backgroundDim < 0.0) {
      float dim = (u_backgroundDim / 100.0) * wBg; // e.g. -0.2 * wBg
      outColor = max(vec3(0.0), outColor + vec3(dim));
    }
  }

  // Final Dithering to eliminate banding
  float dither = ditherTriangular(gl_FragCoord.xy);
  outColor += dither;

  fragColor = vec4(clamp(outColor, 0.0, 1.0), origColor.a);
}

