// Bầu trời khí quyển tán xạ Rayleigh & Mie (GLSL) kèm mây hoàng hôn có ánh viền nắng & đĩa mặt trời HDR.

const SKY_VERT = /* glsl */ `
varying vec3 vWorldDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldDir = position;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform float uTime;
uniform float uDark;
uniform float uSunset;
uniform float uOvercast;

varying vec3 vWorldDir;

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x),
    mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbmClouds(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise2(p);
    p = p * 2.05 + vec2(13.1, 7.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 d = normalize(vWorldDir);
  float elev = clamp(d.y, -0.15, 1.0);
  float h = clamp(elev, 0.0, 1.0);
  float sunCos = max(dot(d, normalize(uSunDir)), 0.0);

  // Gradients tán xạ khí quyển Rayleigh (đỉnh → chân trời)
  vec3 zenithDay = vec3(0.18, 0.44, 0.85);
  vec3 horizDay = vec3(0.74, 0.87, 0.99);
  vec3 zenithSun = vec3(0.24, 0.31, 0.52);
  vec3 horizSun = vec3(0.99, 0.69, 0.45);
  vec3 zenithNight = vec3(0.02, 0.04, 0.11);
  vec3 horizNight = vec3(0.08, 0.14, 0.28);

  vec3 zenith = mix(zenithDay, zenithSun, uSunset);
  vec3 horiz = mix(horizDay, horizSun, uSunset);
  zenith = mix(zenith, zenithNight, uDark);
  horiz = mix(horiz, horizNight, uDark);

  vec3 sky = mix(horiz, zenith, pow(h, 0.52));

  // Dải ráng hồng tím nhẹ lúc hoàng hôn phía cao
  if (uSunset > 0.2) {
    float duskBand = smoothstep(0.06, 0.36, h) * (1.0 - smoothstep(0.36, 0.78, h));
    sky = mix(sky, vec3(0.72, 0.48, 0.58), duskBand * 0.32 * uSunset);
  }

  // Tán xạ Mie (quầng nắng vàng óng tỏa quanh mặt trời lúc ngược sáng)
  float mieWide = pow(sunCos, uSunset > 0.5 ? 5.5 : 10.0);
  float mieCore = pow(sunCos, 95.0);
  float sunDisk = smoothstep(0.9988, 0.9996, sunCos);
  vec3 sunGlowCol = uDark > 0.5 ? vec3(0.55, 0.7, 1.0) : (uSunset > 0.5 ? vec3(1.0, 0.58, 0.22) : vec3(1.0, 0.95, 0.82));
  vec3 sunDiskCol = uDark > 0.5 ? vec3(0.85, 0.92, 1.0) : (uSunset > 0.5 ? vec3(2.8, 1.65, 0.75) : vec3(2.6, 2.4, 2.0));
  sky += sunGlowCol * mieWide * (uDark > 0.5 ? 0.16 : uSunset > 0.5 ? 0.72 : 0.28);
  sky += sunDiskCol * (mieCore * (uDark > 0.5 ? 0.25 : 0.85) + sunDisk * 2.2);

  // Mây tầng cao có rìa phát sáng vàng hoàng hôn
  if (elev > 0.015) {
    vec2 uvC = d.xz / (elev + 0.16) * 1.45 + vec2(uTime * 0.0045, uTime * 0.002);
    float cl = fbmClouds(uvC);
    float mask = smoothstep(0.46, 0.78, cl) * smoothstep(0.015, 0.16, elev);
    vec3 clBase = uDark > 0.5 ? vec3(0.11, 0.16, 0.26) : (uSunset > 0.5 ? vec3(0.54, 0.45, 0.48) : vec3(0.92, 0.95, 0.99));
    vec3 clRim = uDark > 0.5 ? vec3(0.24, 0.34, 0.52) : (uSunset > 0.5 ? vec3(1.22, 0.78, 0.48) : vec3(1.05, 1.03, 0.98));
    vec3 cloudCol = mix(clBase, clRim, clamp(pow(sunCos, 2.2) * 0.9 + 0.2, 0.0, 1.0));
    sky = mix(sky, cloudCol, mask * (uDark > 0.5 ? 0.45 : 0.72));
  }

  // Làm dịu phần chân trời dưới mặt đất
  if (elev < 0.0) sky = mix(sky, horiz * 0.65, clamp(-elev * 6.0, 0.0, 1.0));

  gl_FragColor = vec4(sky, 1.0);
}
`;

export function buildAtmosphericSky(THREE) {
  const geo = new THREE.SphereGeometry(210, 40, 24);
  const mat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(-0.75, 0.22, -0.55).normalize() },
      uTime: { value: 0 },
      uDark: { value: 0 },
      uSunset: { value: 0 },
      uOvercast: { value: 0 },
    },
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;

  return {
    mesh,
    update(cameraPos, mood, sunDir, t, motion) {
      mesh.position.copy(cameraPos);
      mat.uniforms.uSunDir.value.copy(sunDir).normalize();
      mat.uniforms.uDark.value = mood === "night" ? 1.0 : 0.0;
      mat.uniforms.uSunset.value = mood === "sunset" ? 1.0 : 0.0;
      mat.uniforms.uTime.value = motion ? t : 12.0;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
