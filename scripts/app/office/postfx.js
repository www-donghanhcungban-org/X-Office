// Đường ống hậu kỳ điện ảnh WebGL2 HDR viết thuần GLSL (không phụ thuộc ngoài):
// 1) Render cảnh vào bộ đệm nổi HDR (HalfFloatType) + DepthTexture phần cứng.
// 2) SSAO 12 mẫu xoay đĩa Poisson + nhiễu Interleaved Gradient + lọc song phương giữ cạnh (hỗ trợ cả Perspective & Ortho).
// 3) HDR Multi-Mip Dual-Kawase Bloom (trích sáng mềm → 1/2 → 1/4 → 1/8 → 1/4 → 1/2) cho ánh sáng tự nhiên.
// 4) Tổng hợp cuối: FXAA khử răng cưa cạnh + nhân SSAO + cộng Bloom + làm sắc chi tiết + ACES Filmic + vignette + dither.

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SSAO_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uIsOrtho;
uniform float uRadius;
varying vec2 vUv;

float linearDepth(float d) {
  if (uIsOrtho > 0.5) return uNear + d * (uFar - uNear);
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / max(0.0001, (uFar + uNear - z * (uFar - uNear)));
}

float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
  float d0 = texture2D(tDepth, vUv).r;
  if (d0 >= 0.9999) {
    gl_FragColor = vec4(1.0);
    return;
  }
  float z0 = linearDepth(d0);
  float ang = ign(gl_FragCoord.xy) * 6.2831853;
  float ca = cos(ang), sa = sin(ang);
  mat2 rot = mat2(ca, -sa, sa, ca);

  // Bán kính lấy mẫu theo pixel: tự co giãn theo khoảng cách (Perspective) hoặc cố định mịn (Ortho)
  float pxRad = uIsOrtho > 0.5 ? 11.0 : clamp(220.0 / max(z0, 4.0), 5.0, 18.0);
  float occ = 0.0;
  float bias = max(0.035, uRadius * 0.06);

  vec2 offs[12];
  offs[0]  = vec2( 0.24,  0.12);
  offs[1]  = vec2(-0.28,  0.22);
  offs[2]  = vec2( 0.14, -0.34);
  offs[3]  = vec2(-0.42, -0.16);
  offs[4]  = vec2( 0.52,  0.28);
  offs[5]  = vec2(-0.18,  0.56);
  offs[6]  = vec2( 0.44, -0.48);
  offs[7]  = vec2(-0.66,  0.14);
  offs[8]  = vec2( 0.16,  0.76);
  offs[9]  = vec2(-0.54, -0.62);
  offs[10] = vec2( 0.84, -0.14);
  offs[11] = vec2(-0.12, -0.88);

  for (int i = 0; i < 12; i++) {
    vec2 uv = vUv + (rot * offs[i]) * pxRad * uTexel;
    float ds = texture2D(tDepth, uv).r;
    if (ds >= 0.9999) continue;
    float zs = linearDepth(ds);
    float diff = z0 - zs;
    if (diff > bias && diff < uRadius) {
      float falloff = 1.0 - diff / uRadius;
      occ += falloff * falloff;
    }
  }
  float ao = clamp(1.0 - (occ / 12.0) * 1.45, 0.34, 1.0);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}
`;

const SSAO_BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tAo;
uniform sampler2D tDepth;
uniform vec2 uTexel;
varying vec2 vUv;

void main() {
  float d0 = texture2D(tDepth, vUv).r;
  float sum = texture2D(tAo, vUv).r * 0.32;
  float wsum = 0.32;
  vec2 dirs[8];
  dirs[0] = vec2( 1.0,  0.0); dirs[1] = vec2(-1.0,  0.0);
  dirs[2] = vec2( 0.0,  1.0); dirs[3] = vec2( 0.0, -1.0);
  dirs[4] = vec2( 1.5,  1.5); dirs[5] = vec2(-1.5,  1.5);
  dirs[6] = vec2( 1.5, -1.5); dirs[7] = vec2(-1.5, -1.5);
  for (int i = 0; i < 8; i++) {
    vec2 uv = vUv + dirs[i] * uTexel * 1.5;
    float ds = texture2D(tDepth, uv).r;
    float w = exp(-abs(ds - d0) * 1800.0);
    sum += texture2D(tAo, uv).r * w;
    wsum += w;
  }
  float ao = sum / max(wsum, 0.0001);
  gl_FragColor = vec4(ao, ao, ao, 1.0);
}
`;

const BLOOM_EXTRACT_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor;
uniform float uThreshold;
varying vec2 vUv;

void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float knee = 0.42;
  float soft = clamp(luma - uThreshold + knee, 0.0, 2.0 * knee);
  soft = (soft * soft) / max(4.0 * knee, 0.0001);
  float contrib = max(soft, luma - uThreshold) / max(luma, 0.0001);
  gl_FragColor = vec4(c * max(contrib, 0.0), 1.0);
}
`;

const KAWASE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uSpread;
varying vec2 vUv;

void main() {
  vec2 o = uTexel * uSpread;
  vec3 s = texture2D(tSrc, vUv).rgb * 0.25;
  s += texture2D(tSrc, vUv + vec2( o.x,  o.y)).rgb * 0.125;
  s += texture2D(tSrc, vUv + vec2(-o.x,  o.y)).rgb * 0.125;
  s += texture2D(tSrc, vUv + vec2( o.x, -o.y)).rgb * 0.125;
  s += texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb * 0.125;
  s += texture2D(tSrc, vUv + vec2( o.x * 1.6, 0.0)).rgb * 0.0625;
  s += texture2D(tSrc, vUv + vec2(-o.x * 1.6, 0.0)).rgb * 0.0625;
  s += texture2D(tSrc, vUv + vec2(0.0,  o.y * 1.6)).rgb * 0.0625;
  s += texture2D(tSrc, vUv + vec2(0.0, -o.y * 1.6)).rgb * 0.0625;
  gl_FragColor = vec4(s, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tScene;
uniform sampler2D tAo;
uniform sampler2D tBloom;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uIsOrtho;
uniform float uFocusDist;
uniform float uDofStrength;
uniform float uExposure;
uniform float uAoStrength;
uniform float uBloomStrength;
uniform float uDark;
uniform float uSunset;
uniform vec2 uSunUv;
uniform float uSunVis;
uniform float uWalkMode;
varying vec2 vUv;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

float linDepth(float d) {
  if (uIsOrtho > 0.5) return uNear + d * (uFar - uNear);
  float z = d * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / max(0.0001, (uFar + uNear - z * (uFar - uNear)));
}

// ACES Filmic chuẩn điện ảnh (Narkowicz)
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) * 1.055 - 0.055, step(vec3(0.0031308), c));
}

void main() {
  // FXAA nhẹ khử răng cưa trực tiếp trên bộ đệm HDR
  vec3 cM = texture2D(tScene, vUv).rgb;
  vec3 cNW = texture2D(tScene, vUv + vec2(-1.0, -1.0) * uTexel).rgb;
  vec3 cNE = texture2D(tScene, vUv + vec2( 1.0, -1.0) * uTexel).rgb;
  vec3 cSW = texture2D(tScene, vUv + vec2(-1.0,  1.0) * uTexel).rgb;
  vec3 cSE = texture2D(tScene, vUv + vec2( 1.0,  1.0) * uTexel).rgb;

  float lM = luma(cM), lNW = luma(cNW), lNE = luma(cNE), lSW = luma(cSW), lSE = luma(cSE);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
  float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  float range = lMax - lMin;

  vec3 col = cM;
  if (range > max(0.04, lMax * 0.1)) {
    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
    float dirRed = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
    float rcpDir = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirRed);
    dir = clamp(dir * rcpDir, vec2(-4.0), vec2(4.0)) * uTexel;
    vec3 rgbA = 0.5 * (texture2D(tScene, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tScene, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
    vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tScene, vUv + dir * -0.5).rgb + texture2D(tScene, vUv + dir * 0.5).rgb);
    float lB = luma(rgbB);
    col = (lB < lMin || lB > lMax) ? rgbA : rgbB;
  }

  // Xoá phông quang học Bokeh (Depth of Field) tinh tế khi phóng cận cảnh ở chế độ Phối cảnh 3D
  float coc = 0.0;
  if (uDofStrength > 0.01 && uIsOrtho < 0.5) {
    float d0 = texture2D(tDepth, vUv).r;
    if (d0 < 0.9999) {
      float z0 = linDepth(d0);
      coc = clamp((abs(z0 - uFocusDist) - 2.6) / max(uFocusDist * 0.5, 5.5), 0.0, 1.0) * uDofStrength;
      if (coc > 0.02) {
        float rad = coc * 4.2;
        vec3 acc = col;
        vec2 taps[8];
        taps[0] = vec2( 1.0,  0.0); taps[1] = vec2(-1.0,  0.0);
        taps[2] = vec2( 0.0,  1.0); taps[3] = vec2( 0.0, -1.0);
        taps[4] = vec2( 0.71,  0.71); taps[5] = vec2(-0.71,  0.71);
        taps[6] = vec2( 0.71, -0.71); taps[7] = vec2(-0.71, -0.71);
        for (int i = 0; i < 8; i++) {
          acc += texture2D(tScene, vUv + taps[i] * rad * uTexel).rgb;
        }
        col = mix(col, acc / 9.0, clamp(coc * 1.15, 0.0, 0.85));
      }
    }
  }

  // Làm sắc vi chi tiết (chỉ áp cho vùng lấy nét rõ, không làm gắt vùng bokeh)
  vec3 blurAvg = (cNW + cNE + cSW + cSE) * 0.25;
  col = max(vec3(0.0), col + (col - blurAvg) * (0.21 * (1.0 - coc)));

  // Nhân SSAO bóng tiếp xúc sâu
  float ao = texture2D(tAo, vUv).r;
  col *= mix(1.0, ao, uAoStrength);

  // Cộng quầng sáng quang học HDR Bloom
  vec3 bloom = texture2D(tBloom, vUv).rgb;
  col += bloom * uBloomStrength;

  // Sương mờ khí quyển theo chiều sâu & Tia nắng ngược khối (Volumetric Sun Shafts) khi đứng Dạo phố / Hoàng hôn
  float linD = linDepth(texture2D(tDepth, vUv).r);
  if (uWalkMode > 0.5) {
    float haze = smoothstep(28.0, 145.0, linD) * (uDark > 0.5 ? 0.35 : (uSunset > 0.5 ? 0.42 : 0.25));
    vec3 hazeCol = uDark > 0.5 ? vec3(0.06, 0.09, 0.18) : (uSunset > 0.5 ? vec3(0.95, 0.68, 0.48) : vec3(0.76, 0.86, 0.97));
    col = mix(col, hazeCol, haze);
  }
  if (uSunVis > 0.01 && uDark < 0.5) {
    vec2 deltaUv = (vUv - uSunUv) * (1.0 / 14.0) * 0.85;
    vec2 sUv = vUv;
    float illum = 1.0;
    float shafts = 0.0;
    for (int i = 0; i < 14; i++) {
      sUv -= deltaUv;
      if (sUv.x >= 0.0 && sUv.x <= 1.0 && sUv.y >= 0.0 && sUv.y <= 1.0) {
        float sd = texture2D(tDepth, sUv).r;
        float skyMask = smoothstep(0.9965, 0.9995, sd);
        shafts += skyMask * illum;
      }
      illum *= 0.9;
    }
    vec3 shaftCol = uSunset > 0.5 ? vec3(1.0, 0.62, 0.26) : vec3(1.0, 0.92, 0.72);
    col += shaftCol * (shafts / 14.0) * uSunVis * (uSunset > 0.5 ? 0.46 : 0.2);
  }

  // Cân bằng màu kiến trúc theo thời điểm trong ngày (Nắng sáng / Hoàng hôn vàng / Đêm neon)
  vec3 tint = uSunset > 0.5 ? vec3(1.06, 0.99, 0.9) : (uDark > 0.5 ? vec3(0.98, 1.0, 1.05) : vec3(1.015, 1.005, 0.99));
  col *= tint;
  col = aces(col * uExposure);
  vec3 splitTint = mix(vec3(0.95, 0.98, 1.04), vec3(1.03, 1.0, 0.96), smoothstep(0.15, 0.75, luma(col)));
  col = clamp(col * splitTint, 0.0, 1.0);
  col = mix(col, col * col * (3.0 - 2.0 * col), 0.12);
  col = toSRGB(col);

  // Viền ống kính điện ảnh cực nhẹ + dither chống dải màu bầu trời
  vec2 centered = vUv - 0.5;
  float vig = 1.0 - dot(centered, centered) * (uDark > 0.5 ? 0.26 : 0.15);
  col *= clamp(vig, 0.84, 1.0);
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col += dither / 255.0;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export function createPostFX(THREE, renderer) {
  const gl = renderer.getContext();
  const isWebGL2 = Boolean(renderer.capabilities && renderer.capabilities.isWebGL2);
  if (!gl || !isWebGL2) return null;

  const canHalfFloat = Boolean(gl.getExtension("EXT_color_buffer_half_float") || gl.getExtension("EXT_color_buffer_float"));
  const hdrType = canHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;

  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quadMesh = new THREE.Mesh(quadGeo, null);
  quadMesh.frustumCulled = false;
  quadScene.add(quadMesh);

  const mkMat = (fragmentShader, uniforms) => new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });

  const ssaoMat = mkMat(SSAO_FRAG, {
    tDepth: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 800, 1 / 540) },
    uNear: { value: 0.1 },
    uFar: { value: 200 },
    uIsOrtho: { value: 0 },
    uRadius: { value: 1.15 },
  });
  const blurMat = mkMat(SSAO_BLUR_FRAG, {
    tAo: { value: null },
    tDepth: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 800, 1 / 540) },
  });
  const extractMat = mkMat(BLOOM_EXTRACT_FRAG, {
    tColor: { value: null },
    uThreshold: { value: 0.9 },
  });
  const kawaseMat = mkMat(KAWASE_FRAG, {
    tSrc: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 400, 1 / 270) },
    uSpread: { value: 1.5 },
  });
  const compMat = mkMat(COMPOSITE_FRAG, {
    tScene: { value: null },
    tAo: { value: null },
    tBloom: { value: null },
    tDepth: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 800, 1 / 540) },
    uNear: { value: 0.2 },
    uFar: { value: 240 },
    uIsOrtho: { value: 0 },
    uFocusDist: { value: 18 },
    uDofStrength: { value: 0 },
    uExposure: { value: 1.06 },
    uAoStrength: { value: 0.62 },
    uBloomStrength: { value: 0.28 },
    uDark: { value: 0 },
    uSunset: { value: 0 },
    uSunUv: { value: new THREE.Vector2(0.25, 0.65) },
    uSunVis: { value: 0 },
    uWalkMode: { value: 0 },
  });

  const mkRT = (w, h, type, withDepth = false) => {
    const rt = new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type,
      depthBuffer: withDepth,
      stencilBuffer: false,
    });
    if (withDepth) {
      rt.depthTexture = new THREE.DepthTexture(Math.max(2, w), Math.max(2, h));
      rt.depthTexture.type = THREE.UnsignedIntType;
    }
    return rt;
  };

  let curW = 0, curH = 0, curUltra = false;
  let sceneRT = null, aoRT = null, aoBlurRT = null;
  let bHalfA = null, bQuarter = null, bEighth = null, bHalfB = null;
  let failed = false;
  const bufSize = new THREE.Vector2();

  function allocate(pw, ph, ultra = false) {
    if (pw === curW && ph === curH && ultra === curUltra && sceneRT) return;
    disposeTargets();
    curW = Math.max(2, Math.round(pw));
    curH = Math.max(2, Math.round(ph));
    curUltra = Boolean(ultra);
    const hw = Math.max(2, curW >> 1), hh = Math.max(2, curH >> 1);
    const qw = Math.max(2, curW >> 2), qh = Math.max(2, curH >> 2);
    const ew = Math.max(2, curW >> 3), eh = Math.max(2, curH >> 3);
    const aoW = curUltra ? curW : hw, aoH = curUltra ? curH : hh;
    sceneRT = mkRT(curW, curH, hdrType, true);
    aoRT = mkRT(aoW, aoH, THREE.UnsignedByteType, false);
    aoBlurRT = mkRT(aoW, aoH, THREE.UnsignedByteType, false);
    bHalfA = mkRT(hw, hh, hdrType, false);
    bQuarter = mkRT(qw, qh, hdrType, false);
    bEighth = mkRT(ew, eh, hdrType, false);
    bHalfB = mkRT(hw, hh, hdrType, false);
  }

  function disposeTargets() {
    for (const rt of [sceneRT, aoRT, aoBlurRT, bHalfA, bQuarter, bEighth, bHalfB]) {
      if (rt) {
        if (rt.depthTexture) rt.depthTexture.dispose();
        rt.dispose();
      }
    }
    sceneRT = aoRT = aoBlurRT = bHalfA = bQuarter = bEighth = bHalfB = null;
  }

  function pass(mat, target) {
    quadMesh.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }

  return {
    render(scene, camera, opts) {
      if (failed) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        return;
      }
      try {
        renderer.getDrawingBufferSize(bufSize);
        allocate(bufSize.x, bufSize.y, Boolean(opts.ultra));

        // 1. Render cảnh 3D ở không gian tuyến tính HDR (giữ giá trị > 1 cho Bloom)
        const prevTM = renderer.toneMapping;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.setRenderTarget(sceneRT);
        renderer.clear();
        renderer.render(scene, camera);

        // 2. SSAO + lọc song phương giữ cạnh kiến trúc
        ssaoMat.uniforms.tDepth.value = sceneRT.depthTexture;
        ssaoMat.uniforms.uTexel.value.set(1 / aoRT.width, 1 / aoRT.height);
        ssaoMat.uniforms.uNear.value = camera.near;
        ssaoMat.uniforms.uFar.value = camera.far;
        ssaoMat.uniforms.uIsOrtho.value = camera.isOrthographicCamera ? 1 : 0;
        ssaoMat.uniforms.uRadius.value = opts.aoRadius || 1.15;
        pass(ssaoMat, aoRT);

        blurMat.uniforms.tAo.value = aoRT.texture;
        blurMat.uniforms.tDepth.value = sceneRT.depthTexture;
        blurMat.uniforms.uTexel.value.set(1 / aoRT.width, 1 / aoRT.height);
        pass(blurMat, aoBlurRT);

        // 3. Multi-Mip Dual-Kawase HDR Bloom (1/2 → 1/4 → 1/8 → 1/4 → 1/2)
        extractMat.uniforms.tColor.value = sceneRT.texture;
        extractMat.uniforms.uThreshold.value = opts.dark ? 0.72 : 0.96;
        pass(extractMat, bHalfA);

        kawaseMat.uniforms.tSrc.value = bHalfA.texture;
        kawaseMat.uniforms.uTexel.value.set(1 / bHalfA.width, 1 / bHalfA.height);
        kawaseMat.uniforms.uSpread.value = 1.4;
        pass(kawaseMat, bQuarter);

        kawaseMat.uniforms.tSrc.value = bQuarter.texture;
        kawaseMat.uniforms.uTexel.value.set(1 / bQuarter.width, 1 / bQuarter.height);
        kawaseMat.uniforms.uSpread.value = 2.0;
        pass(kawaseMat, bEighth);

        kawaseMat.uniforms.tSrc.value = bEighth.texture;
        kawaseMat.uniforms.uTexel.value.set(1 / bEighth.width, 1 / bEighth.height);
        kawaseMat.uniforms.uSpread.value = 1.8;
        pass(kawaseMat, bQuarter);

        kawaseMat.uniforms.tSrc.value = bQuarter.texture;
        kawaseMat.uniforms.uTexel.value.set(1 / bQuarter.width, 1 / bQuarter.height);
        kawaseMat.uniforms.uSpread.value = 1.5;
        pass(kawaseMat, bHalfB);

        // 4. Tổng hợp điện ảnh cuối cùng (FXAA + DoF Bokeh + SSAO + Bloom + ACES Filmic) ra màn hình
        compMat.uniforms.tScene.value = sceneRT.texture;
        compMat.uniforms.tAo.value = aoBlurRT.texture;
        compMat.uniforms.tBloom.value = bHalfB.texture;
        compMat.uniforms.tDepth.value = sceneRT.depthTexture;
        compMat.uniforms.uTexel.value.set(1 / curW, 1 / curH);
        compMat.uniforms.uNear.value = camera.near;
        compMat.uniforms.uFar.value = camera.far;
        compMat.uniforms.uIsOrtho.value = camera.isOrthographicCamera ? 1 : 0;
        compMat.uniforms.uFocusDist.value = opts.focusDist || 18;
        compMat.uniforms.uDofStrength.value = opts.dofStrength || 0;
        compMat.uniforms.uExposure.value = opts.exposure || 1.06;
        compMat.uniforms.uAoStrength.value = opts.aoStrength !== undefined ? opts.aoStrength : 0.58;
        compMat.uniforms.uBloomStrength.value = opts.dark ? 0.42 : (opts.sunset ? 0.3 : 0.24);
        compMat.uniforms.uDark.value = opts.dark ? 1 : 0;
        compMat.uniforms.uSunset.value = opts.sunset ? 1 : 0;
        compMat.uniforms.uWalkMode.value = opts.walkMode ? 1 : 0;
        compMat.uniforms.uSunVis.value = opts.sunVis || 0;
        if (opts.sunUv) compMat.uniforms.uSunUv.value.copy(opts.sunUv);
        pass(compMat, null);
        renderer.toneMapping = prevTM;
      } catch {
        failed = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }
    },
    dispose() {
      disposeTargets();
      quadGeo.dispose();
      for (const m of [ssaoMat, blurMat, extractMat, kawaseMat, compMat]) m.dispose();
    },
  };
}
