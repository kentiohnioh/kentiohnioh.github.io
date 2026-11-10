#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_opacity;
uniform float u_exposure;
uniform float u_watermarkOpacity; // 0 to 0.15 subtle mark

// Triangular PDF dithering to prevent 8-bit quantization banding
float ditherTriangular(vec2 uv) {
  float r = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
  float g = fract(sin(dot(uv, vec2(93.9898, 67.345))) * 24634.6345);
  return (r + g - 1.0) / 255.0;
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);

  // Apply exposure multiplier: 2^(EV)
  color.rgb *= exp2(u_exposure);

  // Subtle corner watermark signature (bottom-right 32px zone)
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

