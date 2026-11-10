import { Injectable, signal } from '@angular/core';
import { TextureCache } from './texture-cache';
import { PHOTO_VERTEX_SHADER, PHOTO_FRAGMENT_SHADER } from '../shaders/shaders';

export interface RenderPhotoOptions {
  canvas: HTMLCanvasElement;
  bitmap: ImageBitmap;
  cacheKey: string;
  opacity?: number;
  exposure?: number;
  watermarkOpacity?: number;
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

  // Uniform locations cache
  private uTransformLoc: WebGLUniformLocation | null = null;
  private uTextureLoc: WebGLUniformLocation | null = null;
  private uOpacityLoc: WebGLUniformLocation | null = null;
  private uExposureLoc: WebGLUniformLocation | null = null;
  private uWatermarkLoc: WebGLUniformLocation | null = null;

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
    this.uTransformLoc = gl.getUniformLocation(program, 'u_transform');
    this.uTextureLoc = gl.getUniformLocation(program, 'u_texture');
    this.uOpacityLoc = gl.getUniformLocation(program, 'u_opacity');
    this.uExposureLoc = gl.getUniformLocation(program, 'u_exposure');
    this.uWatermarkLoc = gl.getUniformLocation(program, 'u_watermarkOpacity');

    // Setup Standard Unit Quad [-1, -1] to [1, 1] with UVs [0, 0] to [1, 1]
    const quadVertices = new Float32Array([
      // X, Y, U, V
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
   * Renders a photograph into the specified canvas using the shared WebGL2 pipeline.
   * If WebGL2 is unavailable, seamlessly degrades to 2D Canvas context.
   */
  public render(options: RenderPhotoOptions): void {
    const { canvas, bitmap, cacheKey, opacity = 1.0, exposure = 0.0, watermarkOpacity = 0.0 } = options;

    if (!this.webGl2Supported() || !this.initialize(canvas)) {
      this.render2dFallback(canvas, bitmap);
      return;
    }

    const gl = this.gl;
    if (!gl || gl.isContextLost()) {
      this.render2dFallback(canvas, bitmap);
      return;
    }

    // Adjust canvas resolution to match display size x devicePixelRatio
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const displayWidth = Math.round(canvas.clientWidth * dpr);
    const displayHeight = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.03, 0.04, 0.06, 1.0); // Obsidian background
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Retrieve or upload texture
    let texture = this.textureCache.get(cacheKey);
    if (!texture) {
      texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Set bilinear texture filtering and mipmaps
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
      gl.generateMipmap(gl.TEXTURE_2D);

      this.textureCache.put(gl, cacheKey, texture, bitmap.width, bitmap.height);

      // Immediate bitmap disposal per Rule 1 to avoid memory bloat
      try {
        bitmap.close();
      } catch {
        // Bitmap already closed
      }
    }

    // Use Program & Draw
    gl.useProgram(this.program);
    gl.bindVertexArray(this.quadVao);

    // Identity 3x3 transform matrix
    const identityMatrix = new Float32Array([
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]);

    gl.uniformMatrix3fv(this.uTransformLoc, false, identityMatrix);
    gl.uniform1i(this.uTextureLoc, 0);
    gl.uniform1f(this.uOpacityLoc, opacity);
    gl.uniform1f(this.uExposureLoc, exposure);
    gl.uniform1f(this.uWatermarkLoc, watermarkOpacity);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * 2D Canvas Fallback when WebGL2 is unsupported or context is lost.
   */
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
  }

  private onContextRestored(): void {
    this.setupShadersAndBuffers();
    this.isRestoring.set(false);
  }

  public destroy(): void {
    if (this.gl) {
      this.textureCache.clear(this.gl);
      if (this.quadVbo) this.gl.deleteBuffer(this.quadVbo);
      if (this.quadVao) this.gl.deleteVertexArray(this.quadVao);
      if (this.program) this.gl.deleteProgram(this.program);
      this.gl = null;
    }
  }
}
