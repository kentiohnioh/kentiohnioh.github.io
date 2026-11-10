import { RETOUCH_VERTEX_SHADER, RETOUCH_FRAGMENT_SHADER } from '../shaders/shaders';
import { RetouchSliders, AnatomicalZoneId } from '../../core/models/retouch.model';

export interface RetouchRenderOptions {
  sourceTexture: WebGLTexture;
  imageWidth: number;
  imageHeight: number;
  sliders: RetouchSliders;
  splitPosition: number;
  visualizeZone: number;
  maskTexA: WebGLTexture;
  maskTexB: WebGLTexture;
  maskTexC: WebGLTexture;
}

export class RetouchPipeline {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private uniformLocations = new Map<string, WebGLUniformLocation>();

  init(gl: WebGL2RenderingContext): boolean {
    this.gl = gl;
    const vert = this.compileShader(gl.VERTEX_SHADER, RETOUCH_VERTEX_SHADER);
    const frag = this.compileShader(gl.FRAGMENT_SHADER, RETOUCH_FRAGMENT_SHADER);

    if (!vert || !frag) return false;

    const prog = gl.createProgram();
    if (!prog) return false;

    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Failed to link retouch shader program:', gl.getProgramInfoLog(prog));
      return false;
    }

    this.program = prog;

    // Setup unit quad
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const quadVertices = new Float32Array([
      // Pos (x, y), Tex (u, v)
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
      -1,  1, 0, 0,
       1, -1, 1, 1,
       1,  1, 1, 0,
    ]);

    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // a_position
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

    // a_texCoord
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);

    // Cache uniforms
    this.cacheUniforms();
    return true;
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const s = this.gl.createShader(type);
    if (!s) return null;
    this.gl.shaderSource(s, source);
    this.gl.compileShader(s);

    if (!this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(s));
      this.gl.deleteShader(s);
      return null;
    }
    return s;
  }

  private cacheUniforms(): void {
    if (!this.gl || !this.program) return;
    const uniformNames = [
      'u_image', 'u_maskTexA', 'u_maskTexB', 'u_maskTexC',
      'u_imageSize', 'u_splitPosition', 'u_visualizeZone',
      'u_skinSmoothing', 'u_textureRetention', 'u_skinRadiance',
      'u_redCastKiller', 'u_autoBlemishHeal', 'u_neckBodyToneSync',
      'u_irisClarity', 'u_catchlightPop', 'u_scleraRadiance',
      'u_darkCircleSoftener', 'u_lashDefinition', 'u_browDefinition',
      'u_lipHydration', 'u_lipTint', 'u_teethWhitening',
      'u_hairLuster', 'u_subtleSculpt', 'u_backgroundBlur', 'u_backgroundDim',
    ];

    for (const name of uniformNames) {
      const loc = this.gl.getUniformLocation(this.program, name);
      if (loc) {
        this.uniformLocations.set(name, loc);
      }
    }
  }

  /**
   * Packs 12 zone mask arrays (Float32Array [0, 1]) into 3 RGBA WebGL textures.
   */
  createMaskTextures(
    masks: Record<AnatomicalZoneId, Float32Array> | Map<AnatomicalZoneId, Float32Array>,
    width: number,
    height: number
  ): { texA: WebGLTexture; texB: WebGLTexture; texC: WebGLTexture } | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const count = width * height;

    const getZone = (zone: AnatomicalZoneId): Float32Array | undefined => {
      if (masks instanceof Map) return masks.get(zone);
      return masks[zone];
    };

    // Buffer A: R:FACE_SKIN, G:NECK_BODY, B:IRIS, A:SCLERA
    const bufA = new Uint8Array(count * 4);
    const mFaceSkin = getZone('FACE_SKIN');
    const mNeckBody = getZone('NECK_EARS_BODY_SKIN');
    const mIris = getZone('IRIS_AND_SCLERA');
    // Note: Sclera is sub-separated or fallback
    for (let i = 0; i < count; i++) {
      bufA[i * 4] = mFaceSkin ? Math.round(mFaceSkin[i] * 255) : 0;
      bufA[i * 4 + 1] = mNeckBody ? Math.round(mNeckBody[i] * 255) : 0;
      bufA[i * 4 + 2] = mIris ? Math.round(mIris[i] * 255) : 0;
      bufA[i * 4 + 3] = mIris ? Math.round(mIris[i] * 255) : 0;
    }

    // Buffer B: R:TEETH, G:LIPS, B:EYEBROWS, A:EYELASHES
    const bufB = new Uint8Array(count * 4);
    const mTeeth = getZone('TEETH_AND_INNER_MOUTH');
    const mLips = getZone('LIPS');
    const mBrow = getZone('EYEBROWS');
    const mLash = getZone('EYELASHES_AND_PERIOCULAR');
    for (let i = 0; i < count; i++) {
      bufB[i * 4] = mTeeth ? Math.round(mTeeth[i] * 255) : 0;
      bufB[i * 4 + 1] = mLips ? Math.round(mLips[i] * 255) : 0;
      bufB[i * 4 + 2] = mBrow ? Math.round(mBrow[i] * 255) : 0;
      bufB[i * 4 + 3] = mLash ? Math.round(mLash[i] * 255) : 0;
    }

    // Buffer C: R:FACIAL_HAIR, G:SCALP_HAIR, B:NOSTRILS, A:BACKGROUND
    const bufC = new Uint8Array(count * 4);
    const mBeard = getZone('FACIAL_HAIR');
    const mHair = getZone('SCALP_HAIR_AND_BABY_HAIRS');
    const mNostril = getZone('NOSTRILS_AND_NASAL_CREASE');
    const mBg = getZone('BACKGROUND');
    for (let i = 0; i < count; i++) {
      bufC[i * 4] = mBeard ? Math.round(mBeard[i] * 255) : 0;
      bufC[i * 4 + 1] = mHair ? Math.round(mHair[i] * 255) : 0;
      bufC[i * 4 + 2] = mNostril ? Math.round(mNostril[i] * 255) : 0;
      bufC[i * 4 + 3] = mBg ? Math.round(mBg[i] * 255) : 0;
    }

    const texA = this.uploadTexture(bufA, width, height);
    const texB = this.uploadTexture(bufB, width, height);
    const texC = this.uploadTexture(bufC, width, height);

    if (!texA || !texB || !texC) return null;
    return { texA, texB, texC };
  }

  private uploadTexture(data: Uint8Array, width: number, height: number): WebGLTexture | null {
    if (!this.gl) return null;
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) return null;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return tex;
  }

  render(targetCanvas: HTMLCanvasElement, options: RetouchRenderOptions): void {
    if (!this.gl || !this.program || !this.vao) return;
    const gl = this.gl;

    gl.viewport(0, 0, targetCanvas.width, targetCanvas.height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, options.sourceTexture);
    this.setUniform1i('u_image', 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, options.maskTexA);
    this.setUniform1i('u_maskTexA', 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, options.maskTexB);
    this.setUniform1i('u_maskTexB', 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, options.maskTexC);
    this.setUniform1i('u_maskTexC', 3);

    // Bind uniforms
    this.setUniform2f('u_imageSize', options.imageWidth, options.imageHeight);
    this.setUniform1f('u_splitPosition', options.splitPosition);
    this.setUniform1i('u_visualizeZone', options.visualizeZone);

    const s = options.sliders;
    this.setUniform1f('u_skinSmoothing', s.skinSmoothing);
    this.setUniform1f('u_textureRetention', s.textureRetention);
    this.setUniform1f('u_skinRadiance', s.skinRadiance);
    this.setUniform1f('u_redCastKiller', s.redCastKiller);
    this.setUniform1f('u_autoBlemishHeal', s.autoBlemishHeal);
    this.setUniform1f('u_neckBodyToneSync', s.neckBodyToneSync);
    this.setUniform1f('u_irisClarity', s.irisClarity);
    this.setUniform1f('u_catchlightPop', s.catchlightPop);
    this.setUniform1f('u_scleraRadiance', s.scleraRadiance);
    this.setUniform1f('u_darkCircleSoftener', s.darkCircleSoftener);
    this.setUniform1f('u_lashDefinition', s.lashDefinition);
    this.setUniform1f('u_browDefinition', s.browDefinition);
    this.setUniform1f('u_lipHydration', s.lipHydration);
    this.setUniform1f('u_lipTint', s.lipTint);
    this.setUniform1f('u_teethWhitening', s.teethWhitening);
    this.setUniform1f('u_hairLuster', s.hairLuster);
    this.setUniform1f('u_subtleSculpt', s.subtleSculpt);
    this.setUniform1f('u_backgroundBlur', s.backgroundBlur);
    this.setUniform1f('u_backgroundDim', s.backgroundDim);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  private setUniform1i(name: string, val: number): void {
    const loc = this.uniformLocations.get(name);
    if (loc && this.gl) this.gl.uniform1i(loc, val);
  }

  private setUniform1f(name: string, val: number): void {
    const loc = this.uniformLocations.get(name);
    if (loc && this.gl) this.gl.uniform1f(loc, val);
  }

  private setUniform2f(name: string, x: number, y: number): void {
    const loc = this.uniformLocations.get(name);
    if (loc && this.gl) this.gl.uniform2f(loc, x, y);
  }

  destroy(): void {
    if (!this.gl) return;
    if (this.vbo) this.gl.deleteBuffer(this.vbo);
    if (this.vao) this.gl.deleteVertexArray(this.vao);
    if (this.program) this.gl.deleteProgram(this.program);
    this.program = null;
    this.vao = null;
    this.vbo = null;
    this.gl = null;
  }
}