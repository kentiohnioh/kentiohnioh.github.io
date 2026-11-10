export const PHOTO_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

uniform mat3 u_transform;

void main() {
  vec3 pos = u_transform * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export const PHOTO_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_opacity;
uniform float u_exposure;
uniform float u_watermarkOpacity;

float ditherTriangular(vec2 uv) {
  float r = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
  float g = fract(sin(dot(uv, vec2(93.9898, 67.345))) * 24634.6345);
  return (r + g - 1.0) / 255.0;
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);

  // Apply exposure multiplier
  color.rgb *= exp2(u_exposure);

  // Subtle corner watermark signature
  if (u_watermarkOpacity > 0.0) {
    vec2 cornerUv = 1.0 - v_texCoord;
    if (cornerUv.x < 0.05 && cornerUv.y < 0.03) {
      float mark = step(0.5, fract(cornerUv.x * 20.0)) * 0.5;
      color.rgb = mix(color.rgb, vec3(1.0), mark * u_watermarkOpacity);
    }
  }

  // Dithering
  float dither = ditherTriangular(gl_FragCoord.xy);
  color.rgb += dither;

  fragColor = vec4(color.rgb, color.a * u_opacity);
}
`;

export const RETOUCH_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export const RETOUCH_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform sampler2D u_maskTexA;
uniform sampler2D u_maskTexB;
uniform sampler2D u_maskTexC;

uniform vec2 u_imageSize;
uniform float u_splitPosition;
uniform int u_visualizeZone;

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

float ditherTriangular(vec2 uv) {
  float r = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
  float g = fract(sin(dot(uv, vec2(93.9898, 67.345))) * 24634.6345);
  return (r + g - 1.0) / 255.0;
}

float rgb2lum(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 uv = v_texCoord;

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

  if (u_visualizeZone >= 0) {
    float baseLum = rgb2lum(origColor.rgb) * 0.4;
    vec3 baseMono = vec3(baseLum);

    if (u_visualizeZone == 99) {
      vec3 overlay = vec3(0.0);
      overlay += vec3(0.2, 0.8, 0.5) * wFaceSkin;
      overlay += vec3(0.9, 0.6, 0.2) * wNeckBody;
      overlay += vec3(0.2, 0.6, 1.0) * wIris;
      overlay += vec3(1.0, 1.0, 1.0) * wSclera;
      overlay += vec3(0.2, 0.9, 0.9) * wTeeth;
      overlay += vec3(0.9, 0.2, 0.4) * wLips;
      overlay += vec3(0.7, 0.3, 0.8) * wBrow;
      overlay += vec3(1.0, 0.9, 0.2) * wLash;
      overlay += vec3(0.9, 0.4, 0.1) * wBeard;
      overlay += vec3(0.8, 0.2, 0.7) * wHair;
      overlay += vec3(0.1, 0.4, 0.4) * wNostril;
      overlay += vec3(0.3, 0.4, 0.6) * wBg;

      fragColor = vec4(baseMono * 0.4 + overlay * 0.7, 1.0);
      return;
    } else {
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

  vec3 outColor = origColor.rgb;
  vec2 texel = 1.0 / u_imageSize;

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

  vec3 highPass = origColor.rgb - lowPass;
  float hfLum = abs(rgb2lum(highPass));
  float edgeGate = exp(-0.5 * (hfLum / 0.08) * (hfLum / 0.08));

  if (u_skinSmoothing > 0.0 && wFaceSkin > 0.001) {
    float smoothFactor = (u_skinSmoothing / 100.0) * wFaceSkin * edgeGate;
    float retention = u_textureRetention / 100.0;
    vec3 smoothedSkin = lowPass + highPass * retention;
    outColor = mix(outColor, smoothedSkin, smoothFactor);
  }

  if (u_redCastKiller > 0.0 && (wFaceSkin + wNeckBody) > 0.01) {
    float skinZone = max(wFaceSkin, wNeckBody);
    float excessRed = max(0.0, outColor.r - (outColor.g + outColor.b) * 0.6);
    float dampFactor = (u_redCastKiller / 100.0) * 0.4 * skinZone;
    outColor.r -= excessRed * dampFactor;
  }

  if (u_skinRadiance > 0.0 && wFaceSkin > 0.01) {
    float lum = rgb2lum(outColor);
    if (lum > 0.55) {
      float bloom = (lum - 0.55) * (u_skinRadiance / 100.0) * 0.25 * wFaceSkin;
      outColor += vec3(bloom);
    }
  }

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
    float scleraLum = rgb2lum(outColor);
    outColor = mix(outColor, vec3(scleraLum + 0.05), factor);
  }

  if (wTeeth > 0.01 && u_teethWhitening > 0.0) {
    float factor = (u_teethWhitening / 100.0) * 0.3 * wTeeth;
    float rgAvg = (outColor.r + outColor.g) * 0.5;
    outColor.b = mix(outColor.b, rgAvg, factor * 0.7);
    outColor += vec3(0.04 * factor);
  }

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

  float detailWeight = max(wLash * (u_lashDefinition / 100.0), wBrow * (u_browDefinition / 100.0));
  if (detailWeight > 0.01) {
    outColor += highPass * detailWeight * 0.5;
  }

  if (wHair > 0.01 && u_hairLuster > 0.0) {
    float hairLum = rgb2lum(outColor);
    if (hairLum > 0.35) {
      float luster = (hairLum - 0.35) * (u_hairLuster / 100.0) * 0.3 * wHair;
      outColor += vec3(luster);
    }
  }

  if (wBg > 0.01) {
    if (u_backgroundDim < 0.0) {
      float dim = (u_backgroundDim / 100.0) * wBg;
      outColor = max(vec3(0.0), outColor + vec3(dim));
    }
  }

  float dither = ditherTriangular(gl_FragCoord.xy);
  outColor += dither;

  fragColor = vec4(clamp(outColor, 0.0, 1.0), origColor.a);
}
`;
