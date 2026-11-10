#version 300 es
precision highp float;
precision highp sampler3D;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform sampler3D u_lut3d;
uniform sampler2D u_skinMask;

uniform int u_hasLut;
uniform float u_lutStrength;
uniform float u_lutSize;

uniform int u_hasSkinMask;
uniform float u_skinProtectStrength;

uniform float u_opacity;
uniform float u_exposure;
uniform float u_watermarkOpacity;

// Tone controls
uniform float u_temperature;
uniform float u_tint;
uniform float u_contrast;
uniform float u_highlights;
uniform float u_shadows;
uniform float u_whites;
uniform float u_blacks;
uniform float u_vibrance;
uniform float u_saturation;

// Split toning
uniform vec3 u_splitShadow;
uniform float u_splitShadowSat;
uniform vec3 u_splitHighlight;
uniform float u_splitHighlightSat;
uniform float u_splitBalance;

// Vignette
uniform float u_vignetteAmount;
uniform float u_vignetteMidpoint;
uniform float u_vignetteRoundness;
uniform float u_vignetteFeather;

// Grain
uniform float u_grainAmount;
uniform float u_grainSize;
uniform float u_grainSeed;

// Triangular PDF dithering to prevent 8-bit quantization banding
float ditherTriangular(vec2 uv) {
  float r = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
  float g = fract(sin(dot(uv, vec2(93.9898, 67.345))) * 24634.6345);
  return (r + g - 1.0) / 255.0;
}

float rgb2lum(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 origColor = texture(u_texture, v_texCoord);
  vec3 color = origColor.rgb;

  // 1. Exposure compensation: 2^(EV)
  color *= exp2(u_exposure);

  // 2. White balance (Temperature & Tint)
  if (u_temperature != 0.0 || u_tint != 0.0) {
    float tempFactor = u_temperature * 0.0025;
    float tintFactor = u_tint * 0.0015;
    color.r *= (1.0 + tempFactor + tintFactor * 0.5);
    color.g *= (1.0 - tintFactor);
    color.b *= (1.0 - tempFactor + tintFactor * 0.5);
  }

  // 3. Contrast, Highlights & Shadows
  float lum = rgb2lum(color);
  if (u_contrast != 0.0) {
    float cFactor = (100.0 + u_contrast) * 0.01;
    color = 0.18 + (color - 0.18) * cFactor;
  }

  if (u_highlights != 0.0 && lum > 0.5) {
    float hWeight = (lum - 0.5) * 2.0;
    color += vec3(u_highlights * 0.0025 * hWeight);
  }
  if (u_shadows != 0.0 && lum < 0.5) {
    float sWeight = (0.5 - lum) * 2.0;
    color += vec3(u_shadows * 0.0025 * sWeight);
  }

  // 4. Vibrance & Saturation
  if (u_vibrance != 0.0 || u_saturation != 0.0) {
    float curLum = rgb2lum(color);
    float maxC = max(color.r, max(color.g, color.b));
    float minC = min(color.r, min(color.g, color.b));
    float curSat = maxC > 0.001 ? (maxC - minC) / maxC : 0.0;
    float vibFactor = (u_vibrance * 0.01) * (1.0 - curSat * 0.75);
    float satFactor = 1.0 + u_saturation * 0.01 + vibFactor;
    color = curLum + (color - curLum) * satFactor;
  }

  // 5. Split Toning
  if (u_splitShadowSat > 0.0 || u_splitHighlightSat > 0.0) {
    float splitLum = rgb2lum(color);
    float midpoint = 0.5 + u_splitBalance * 0.003;
    if (splitLum < midpoint && u_splitShadowSat > 0.0) {
      float w = pow((midpoint - splitLum) / midpoint, 1.5) * (u_splitShadowSat * 0.003);
      color = mix(color, u_splitShadow * splitLum * 2.0, w);
    } else if (splitLum > midpoint && u_splitHighlightSat > 0.0) {
      float w = pow((splitLum - midpoint) / (1.0 - midpoint), 1.5) * (u_splitHighlightSat * 0.003);
      color = mix(color, u_splitHighlight, w);
    }
  }

  // 6. 3D LUT Color Grade (Film Stock Profile)
  if (u_hasLut == 1 && u_lutStrength > 0.0) {
    vec3 lutCoord = (clamp(color, 0.0, 1.0) * (u_lutSize - 1.0) + 0.5) / u_lutSize;
    vec3 gradedLut = texture(u_lut3d, lutCoord).rgb;
    color = mix(color, gradedLut, u_lutStrength);
  }

  // 7. Skin Protection Mask Blending
  if (u_hasSkinMask == 1 && u_skinProtectStrength > 0.0) {
    float skinWeight = texture(u_skinMask, v_texCoord).r;
    float protectFactor = clamp(skinWeight * u_skinProtectStrength, 0.0, 1.0);
    color = mix(color, origColor.rgb, protectFactor);
  }

  // 8. Film Grain Synthesis
  if (u_grainAmount > 0.0) {
    float grainLum = rgb2lum(color);
    float grainWeight = sin(3.14159265 * clamp(grainLum, 0.0, 1.0));
    float grainNoise = (hash12(gl_FragCoord.xy * (u_grainSize * 0.5) + u_grainSeed) - 0.5) * 2.0;
    color += grainNoise * grainWeight * (u_grainAmount * 0.0025);
  }

  // 9. Vignette
  if (u_vignetteAmount != 0.0) {
    vec2 d = (v_texCoord - 0.5) * 2.0;
    float roundnessFactor = 1.0 + (u_vignetteRoundness * 0.01) * 0.5;
    float dist = sqrt(d.x * d.x * roundnessFactor + d.y * d.y / roundnessFactor);
    float mid = u_vignetteMidpoint * 0.01;
    float feather = max(0.01, u_vignetteFeather * 0.01);
    if (dist > mid) {
      float t = clamp((dist - mid) / feather, 0.0, 1.0);
      float smoothVig = t * t * (3.0 - 2.0 * t);
      color *= max(0.0, 1.0 + (u_vignetteAmount * 0.01) * 0.75 * smoothVig);
    }
  }

  // 10. Subtle corner watermark signature (bottom-right 32px zone)
  if (u_watermarkOpacity > 0.0) {
    vec2 cornerUv = 1.0 - v_texCoord;
    if (cornerUv.x < 0.05 && cornerUv.y < 0.03) {
      float mark = step(0.5, fract(cornerUv.x * 20.0)) * 0.5;
      color = mix(color, vec3(1.0), mark * u_watermarkOpacity);
    }
  }

  // 11. Dithering
  float dither = ditherTriangular(gl_FragCoord.xy);
  color += dither;

  fragColor = vec4(clamp(color, 0.0, 1.0), origColor.a * u_opacity);
}
