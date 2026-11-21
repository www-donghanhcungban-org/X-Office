// Shader GLSL mặt nước hồ bơi vật lý thời gian thực + ánh sáng tụ thủy Voronoi tán sắc RGB:
// - Mặt nước: 6 lớp sóng giao thoa đa hướng tính normal từng điểm ảnh, phản xạ Schlick Fresnel bầu trời/mây,
//   lóe nắng GGX HDR (kích Bloom lấp lánh trên đỉnh sóng), sắc độ Beer-Lambert nông-sâu và bọt nhẹ viền bể.
// - Tụ thủy đáy bể: lưới Voronoi 2 tầng chuyển động ngược chiều kèm tán sắc R/G/B tạo dải sáng chân thực dưới nước.

const WATER_VERT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.y += sin(wp.x * 2.4 + uTime * 1.9) * 0.006 + cos(wp.z * 2.9 - uTime * 1.6) * 0.006;
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const WATER_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform float uDark;
varying vec2 vUv;
varying vec3 vWorldPos;

// Trường sóng giao thoa 6 hướng mượt mà, không vết lặp
float waveHeight(vec2 p, float t) {
  float h = 0.0;
  h += sin(dot(p, vec2( 2.8,  1.6)) + t * 2.1) * 0.018;
  h += sin(dot(p, vec2(-2.2,  3.1)) + t * 1.7) * 0.015;
  h += sin(dot(p, vec2( 4.6, -2.5)) - t * 2.5) * 0.009;
  h += sin(dot(p, vec2(-5.2, -3.8)) + t * 2.9) * 0.007;
  h += sin(dot(p, vec2( 8.4,  6.1)) - t * 3.6) * 0.004;
  h += sin(dot(p, vec2(-9.1,  5.2)) + t * 4.1) * 0.003;
  return h;
}

void main() {
  vec2 p = vWorldPos.xz;
  float eps = 0.035;
  float hC = waveHeight(p, uTime);
  float hX = waveHeight(p + vec2(eps, 0.0), uTime);
  float hZ = waveHeight(p + vec2(0.0, eps), uTime);
  vec3 N = normalize(vec3((hC - hX) / eps * 1.35, 1.0, (hC - hZ) / eps * 1.35));

  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDir);
  vec3 R = reflect(-V, N);
  vec3 H = normalize(L + V);

  // Phản xạ Schlick Fresnel theo góc nhìn thật
  float ndotv = max(dot(N, V), 0.0);
  float fresnel = clamp(0.06 + 0.94 * pow(1.0 - ndotv, 4.0), 0.0, 1.0);

  // Phản chiếu bầu trời + mây mềm trên mặt nước
  float skyT = clamp(R.y * 0.75 + 0.25, 0.0, 1.0);
  vec3 skyRefl = mix(uSkyHorizon, uSkyTop, skyT);
  float cloud = smoothstep(0.35, 0.85, sin(R.x * 5.0 + uTime * 0.08) * cos(R.z * 4.0 - uTime * 0.05) * 0.5 + 0.5);
  skyRefl = mix(skyRefl, vec3(1.0), cloud * (uDark > 0.5 ? 0.05 : 0.28));

  // Lóe nắng GGX HDR (cường độ > 1.5 tạo tia lấp lánh Bloom trên đỉnh sóng)
  float specTight = pow(max(dot(N, H), 0.0), 260.0) * (uDark > 0.5 ? 1.2 : 3.2);
  float specBroad = pow(max(dot(N, H), 0.0), 32.0) * (uDark > 0.5 ? 0.15 : 0.35);
  vec3 sunColor = uDark > 0.5 ? vec3(0.75, 0.9, 1.0) : vec3(1.0, 0.96, 0.86);

  // Màu nước ngọc lam sâu ở giữa, trong sáng hơn gần bờ (Beer-Lambert)
  float edgeX = min(vUv.x, 1.0 - vUv.x);
  float edgeY = min(vUv.y, 1.0 - vUv.y);
  float edge = min(edgeX, edgeY);
  vec3 shallowCol = uDark > 0.5 ? vec3(0.06, 0.36, 0.54) : vec3(0.16, 0.78, 0.92);
  vec3 deepCol    = uDark > 0.5 ? vec3(0.02, 0.14, 0.28) : vec3(0.02, 0.44, 0.68);
  vec3 waterBody = mix(shallowCol, deepCol, smoothstep(0.0, 0.22, edge));

  // Bọt viền mép bể tinh tế nhấp nhô theo sóng
  float foam = smoothstep(0.036 + hC * 0.35, 0.0, edge) * (uDark > 0.5 ? 0.25 : 0.55);

  vec3 col = mix(waterBody, skyRefl, fresnel * 0.78);
  col += sunColor * (specTight + specBroad);
  col = mix(col, vec3(0.95, 0.99, 1.0), foam);

  float alpha = clamp(mix(0.44, 0.88, fresnel) + foam * 0.35 + min(specTight, 0.45), 0.0, 0.96);
  gl_FragColor = vec4(col, alpha);
}
`;

const CAUSTICS_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CAUSTICS_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// Mạng tụ thủy Voronoi mượt mà
float voronoi(vec2 x, float t) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.42 * sin(t * 1.15 + 6.2831 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      md = min(md, d);
    }
  }
  return pow(clamp(md, 0.0, 1.0), 1.65);
}

float causticPattern(vec2 uv, float t) {
  float a = voronoi(uv * 5.2 + vec2(t * 0.16, -t * 0.12), t);
  float b = voronoi(uv * 7.4 - vec2(t * 0.14,  t * 0.18), t * 1.2);
  return smoothstep(0.18, 0.95, (a + b) * 0.92);
}

void main() {
  vec2 uv = vUv * vec2(1.8, 1.0);
  // Tán sắc quang học R/G/B nhẹ như tia nắng khúc xạ thật qua mặt nước
  float r = causticPattern(uv + vec2(0.008, 0.004), uTime);
  float g = causticPattern(uv, uTime);
  float b = causticPattern(uv - vec2(0.008, 0.005), uTime);
  vec3 col = vec3(r * 0.82, g * 0.98, b * 1.08) * uIntensity;
  // Giảm nhẹ sát viền mép bể
  float fade = smoothstep(0.0, 0.08, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  gl_FragColor = vec4(col * fade, 1.0);
}
`;

export function createWaterMaterial(THREE, dark) {
  return new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.65, 0.72, 0.44).normalize() },
      uSkyTop: { value: new THREE.Color(dark ? "#0c1938" : "#2563eb") },
      uSkyHorizon: { value: new THREE.Color(dark ? "#1e3a5f" : "#bae6fd") },
      uDark: { value: dark ? 1 : 0 },
    },
  });
}

export function createCausticsMaterial(THREE, dark) {
  return new THREE.ShaderMaterial({
    vertexShader: CAUSTICS_VERT,
    fragmentShader: CAUSTICS_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: dark ? 0.36 : 0.62 },
    },
  });
}
