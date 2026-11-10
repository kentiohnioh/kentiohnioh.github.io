import { Injectable, signal } from '@angular/core';
import { TextureCache } from './texture-cache';
import { PHOTO_VERTEX_SHADER, PHOTO_FRAGMENT_SHADER } from '../shaders/shaders';
import { ColorGradeRecipe } from '../../core/models/color-grade.model';
import { FILM_PROFILES, FilmStockId, generateFilmStockLut } from '../../core/utils/film-profiles';
import { convertLutToRgba8 } from '../../core/utils/cube-lut';

export interface RenderPhotoOptions {
  canvas: HTMLCanvasElement;
  bitmap: ImageBitmap;
  cacheKey: string;
  opacity?: number;
  exposure?: number;
  watermarkOpacity?: number;
  recipe?: ColorGradeRecipe | null;
  skinProtectionBitmap?: ImageBitmap | null;
}

@Injectable({
  providedIn: 'root',
})
export class GpuRendererService {
  readonly textureCache = new TextureCache();
  readonly isRestoring = signal(false);
  readonly webGl2Supported = signal(true);

  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private quadVao: WebGLVertexArrayObject | null = null;
  private quadVbo: WebGLBuffer | null = null;

  // 3D LUT and skin mask cache
  private lutCache = new Map<string, WebGLTexture>();
  private defaultLutTex: WebGLTexture | null = null;
  private skinMaskCache = new Map<string, WebGLTexture>();
  private defaultSkinMaskTex: WebGLTexture | null = null;

  // Uniform locations cache
  private uniforms = new Map<string, WebGLUniformLocation>();

  /**
   * Initializes or returns the single shared WebGL2 context.
   */
  public initialize(canvas: HTMLCanvasElement): boolean {
    if (this.gl && this.gl.canvas === canvas) {
      return true;
    }

    try {
      const gl = canvas.getContext('webgl2', {
        alpha: true,
        antialias: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      });

      if (!gl) {
        this.webGl2Supported.set(false);
        return false;
      }

      this.gl = gl;
      this.webGl2Supported.set(true);

      // Listen for context loss and restoration
      canvas.addEventListener('webglcontextlost', (e) => this.onContextLost(e));
      canvas.addEventListener('webglcontextrestored', () => this.onContextRestored());

      this.setupShadersAndBuffers();
      return true;
    } catch {
      this.webGl2Supported.set(false);
      return false;
    }
  }

  private setupShadersAndBuffers(): void {
    if (!this.gl) return;
    const gl = this.gl;

    // Compile Program
    const vert = this.compileShader(gl.VERTEX_SHADER, PHOTO_VERTEX_SHADER);
    const frag = this.compileShader(gl.FRAGMENT_SHADER, PHOTO_FRAGMENT_SHADER);
    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`WebGL2 Program link failed: ${info}`);
    }

    this.program = program;

    // Cache Uniform Locations
    this.uniforms.clear();
    const names = [
      'u_transform', 'u_texture', 'u_lut3d', 'u_skinMask',
      'u_hasLut', 'u_lutStrength', 'u_lutSize',
      'u_hasSkinMask', 'u_skinProtectStrength',
      'u_opacity', 'u_exposure', 'u_watermarkOpacity',
      'u_temperature', 'u_tint', 'u_contrast', 'u_highlights', 'u_shadows', 'u_whites', 'u_blacks',
      'u_vibrance', 'u_saturation',
      'u_splitShadow', 'u_splitShadowSat', 'u_splitHighlight', 'u_splitHighlightSat', 'u_splitBalance',
      'u_vignetteAmount', 'u_vignetteMidpoint', 'u_vignetteRoundness', 'u_vignetteFeather',
      'u_grainAmount', 'u_grainSize', 'u_grainSeed',
    ];

    for (const name of names) {
      const loc = gl.getUniformLocation(program, name);
      if (loc) this.uniforms.set(name, loc);
    }

    // Setup Standard Unit Quad
    const quadVertices = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
      -1,  1, 0, 0,
       1, -1, 1, 1,
       1,  1, 1, 0,
    ]);

    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);

    this.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(program, 'a_position');
    const aTexLoc = gl.getAttribLocation(program, 'a_texCoord');

    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTexLoc);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);

    // Create 1x1 default dummy textures
    this.createDummyTextures(gl);
  }

  private createDummyTextures(gl: WebGL2RenderingContext): void {
    // 1x1x1 3D LUT dummy
    this.defaultLutTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, this.defaultLutTex);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    gl.bindTexture(gl.TEXTURE_3D, null);

    // 1x1 2D Skin mask dummy
    this.defaultSkinMaskTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.defaultSkinMaskTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  /**
   * Retrieves or uploads a 3D LUT texture for a specific film stock.
   */
  public getOrCreate3dLut(stockId: FilmStockId, size = 33): WebGLTexture | null {
    if (!this.gl) return null;
    const gl = this.gl;

    if (this.lutCache.has(stockId)) {
      return this.lutCache.get(stockId)!;
    }

    try {
      const lutFloat = generateFilmStockLut(stockId, size);
      const rgba8 = convertLutToRgba8(lutFloat, size);

      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_3D, tex);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba8);
      gl.bindTexture(gl.TEXTURE_3D, null);

      this.lutCache.set(stockId, tex);
      return tex;
    } catch (e) {
      console.warn('Failed to generate 3D LUT texture:', e);
      return null;
    }
  }

  /**
   * Renders a photograph into the specified canvas using the shared WebGL2 pipeline.
   * If WebGL2 is unavailable, seamlessly degrades to 2D Canvas context.
   */
  public render(options: RenderPhotoOptions): void {
    const {
      canvas,
      bitmap,
      cacheKey,
      opacity = 1.0,
      exposure = 0.0,
      watermarkOpacity = 0.0,
      recipe,
      skinProtectionBitmap,
    } = options;

    if (!this.webGl2Supported() || !this.initialize(canvas)) {
      this.render2dFallback(canvas, bitmap);
      return;
    }

    const gl = this.gl;
    if (!gl || gl.isContextLost()) {
      this.render2dFallback(canvas, bitmap);
      return;
    }

    // Adjust canvas resolution
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const displayWidth = Math.round(canvas.clientWidth * dpr);
    const displayHeight = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.03, 0.04, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Retrieve or upload base photo texture
    let texture = this.textureCache.get(cacheKey);
    if (!texture) {
      texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      gl.generateMipmap(gl.TEXTURE_2D);

      this.textureCache.put(gl, cacheKey, texture, bitmap.width, bitmap.height);

      try {
        bitmap.close();
      } catch {
        // Bitmap already closed
      }
    }

    // Manage 3D LUT Texture
    let lutTex: WebGLTexture | null = null;
    let hasLut = 0;
    let lutStrength = 0.0;
    const lutSize = 33.0;

    if (recipe?.lut?.id && recipe.lut.id in FILM_PROFILES) {
      lutTex = this.getOrCreate3dLut(recipe.lut.id as FilmStockId, 33);
      if (lutTex) {
        hasLut = 1;
        lutStrength = recipe.lut.strength;
      }
    }

    // Manage Skin Mask Texture
    let skinMaskTex: WebGLTexture | null = null;
    let hasSkinMask = 0;
    let skinProtectStrength = 0.0;

    if (recipe?.skinProtect?.enabled && skinProtectionBitmap) {
      const maskKey = cacheKey + '_skin_mask';
      skinMaskTex = this.skinMaskCache.get(maskKey) || null;
      if (!skinMaskTex) {
        skinMaskTex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, skinMaskTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, skinProtectionBitmap);
        this.skinMaskCache.set(maskKey, skinMaskTex);
      }
      hasSkinMask = 1;
      skinProtectStrength = recipe.skinProtect.strength;
    }

    // Draw with Program
    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVao);

    // Bind Base Texture Unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    this.setUniform1i('u_texture', 0);

    // Bind 3D LUT Texture Unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, lutTex || this.defaultLutTex);
    this.setUniform1i('u_lut3d', 1);

    // Bind Skin Mask Texture Unit 2
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, skinMaskTex || this.defaultSkinMaskTex);
    this.setUniform1i('u_skinMask', 2);

    // Set Grading & Camera Uniforms
    const identityMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const uTransformLoc = this.uniforms.get('u_transform');
    if (uTransformLoc) gl.uniformMatrix3fv(uTransformLoc, false, identityMatrix);

    const totalExposure = exposure + (recipe?.exposureEV ?? 0.0);
    this.setUniform1f('u_opacity', opacity);
    this.setUniform1f('u_exposure', totalExposure);
    this.setUniform1f('u_watermarkOpacity', watermarkOpacity);

    this.setUniform1i('u_hasLut', hasLut);
    this.setUniform1f('u_lutStrength', lutStrength);
    this.setUniform1f('u_lutSize', lutSize);

    this.setUniform1i('u_hasSkinMask', hasSkinMask);
    this.setUniform1f('u_skinProtectStrength', skinProtectStrength);

    // Tone controls
    this.setUniform1f('u_temperature', recipe?.temperature ?? 0);
    this.setUniform1f('u_tint', recipe?.tint ?? 0);
    this.setUniform1f('u_contrast', recipe?.contrast ?? 0);
    this.setUniform1f('u_highlights', recipe?.highlights ?? 0);
    this.setUniform1f('u_shadows', recipe?.shadows ?? 0);
    this.setUniform1f('u_whites', recipe?.whites ?? 0);
    this.setUniform1f('u_blacks', recipe?.blacks ?? 0);
    this.setUniform1f('u_vibrance', recipe?.vibrance ?? 0);
    this.setUniform1f('u_saturation', recipe?.saturation ?? 0);

    // Split toning
    const sShadow = this.hueToRgb(recipe?.splitTone?.shadowHue ?? 0);
    const sHighlight = this.hueToRgb(recipe?.splitTone?.highlightHue ?? 0);
    this.setUniform3f('u_splitShadow', sShadow[0], sShadow[1], sShadow[2]);
    this.setUniform1f('u_splitShadowSat', recipe?.splitTone?.shadowSat ?? 0);
    this.setUniform3f('u_splitHighlight', sHighlight[0], sHighlight[1], sHighlight[2]);
    this.setUniform1f('u_splitHighlightSat', recipe?.splitTone?.highlightSat ?? 0);
    this.setUniform1f('u_splitBalance', recipe?.splitTone?.balance ?? 0);

    // Vignette
    this.setUniform1f('u_vignetteAmount', recipe?.vignette?.amount ?? 0);
    this.setUniform1f('u_vignetteMidpoint', recipe?.vignette?.midpoint ?? 50);
    this.setUniform1f('u_vignetteRoundness', recipe?.vignette?.roundness ?? 0);
    this.setUniform1f('u_vignetteFeather', recipe?.vignette?.feather ?? 50);

    // Grain
    this.setUniform1f('u_grainAmount', recipe?.grain?.amount ?? 0);
    this.setUniform1f('u_grainSize', recipe?.grain?.size ?? 1.0);
    this.setUniform1f('u_grainSeed', recipe?.grain?.seed ?? 42);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindTexture(gl.TEXTURE_3D, null);
  }

  private setUniform1i(name: string, val: number): void {
    const loc = this.uniforms.get(name);
    if (loc && this.gl) this.gl.uniform1i(loc, val);
  }

  private setUniform1f(name: string, val: number): void {
    const loc = this.uniforms.get(name);
    if (loc && this.gl) this.gl.uniform1f(loc, val);
  }

  private setUniform3f(name: string, x: number, y: number, z: number): void {
    const loc = this.uniforms.get(name);
    if (loc && this.gl) this.gl.uniform3f(loc, x, y, z);
  }

  private hueToRgb(hue: number): [number, number, number] {
    const h = ((hue % 360) + 360) % 360 / 60;
    const c = 1.0;
    const x = c * (1 - Math.abs((h % 2) - 1));
    if (h < 1) return [c, x, 0];
    if (h < 2) return [x, c, 0];
    if (h < 3) return [0, c, x];
    if (h < 4) return [0, x, c];
    if (h < 5) return [x, 0, c];
    return [c, 0, x];
  }

  public render2dFallback(canvas: HTMLCanvasElement, bitmap: ImageBitmap): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    try {
      bitmap.close();
    } catch {
      // Ignore
    }
  }

  private onContextLost(event: Event): void {
    event.preventDefault();
    this.isRestoring.set(true);
    this.textureCache.clear();
    this.lutCache.clear();
    this.skinMaskCache.clear();
  }

  private onContextRestored(): void {
    this.setupShadersAndBuffers();
    this.isRestoring.set(false);
  }

  public destroy(): void {
    if (this.gl) {
      this.textureCache.clear(this.gl);
      for (const tex of this.lutCache.values()) this.gl.deleteTexture(tex);
      for (const tex of this.skinMaskCache.values()) this.gl.deleteTexture(tex);
      this.lutCache.clear();
      this.skinMaskCache.clear();
      if (this.defaultLutTex) this.gl.deleteTexture(this.defaultLutTex);
      if (this.defaultSkinMaskTex) this.gl.deleteTexture(this.defaultSkinMaskTex);
      if (this.quadVbo) this.gl.deleteBuffer(this.quadVbo);
      if (this.quadVao) this.gl.deleteVertexArray(this.quadVao);
      if (this.program) this.gl.deleteProgram(this.program);
      this.gl = null;
    }
  }
}
