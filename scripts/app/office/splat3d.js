// Bộ kết xuất 3D Gaussian Splatting (WebGL2 Instanced GLSL) cho định dạng nhị phân `.splat`:
// - Mỗi splat 32 byte: position(f32×3), scale(f32×3), rgba(u8×4), quaternion(u8×4).
// - Phép chiếu EWA 3D→2D trực tiếp trong Vertex Shader + giải trị riêng ellipsoid + phân loại độ sâu O(N).

const MAX_SPLATS = 350000;
const BUCKETS = 65536;

const SPLAT_VERT = /* glsl */ `
attribute vec3 aCenter;
attribute vec3 aCovA;
attribute vec3 aCovB;
attribute vec4 aColor;

uniform vec2 uViewport;
uniform float uScaleMult;

varying vec4 vColor;
varying vec2 vQuad;

void main() {
  vec4 viewPos = modelViewMatrix * vec4(aCenter, 1.0);
  if (viewPos.z > -0.15) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    vColor = vec4(0.0);
    vQuad = vec2(0.0);
    return;
  }

  float fx = projectionMatrix[0][0] * uViewport.x * 0.5;
  float fy = projectionMatrix[1][1] * uViewport.y * 0.5;
  mat3 J;
  if (projectionMatrix[3][3] > 0.5) {
    J = mat3(
      fx, 0.0, 0.0,
      0.0, fy, 0.0,
      0.0, 0.0, 0.0
    );
  } else {
    float invZ = 1.0 / viewPos.z;
    float invZ2 = invZ * invZ;
    J = mat3(
      fx * invZ, 0.0, 0.0,
      0.0, fy * invZ, 0.0,
      -(fx * viewPos.x) * invZ2, -(fy * viewPos.y) * invZ2, 0.0
    );
  }

  mat3 W = mat3(modelViewMatrix);
  mat3 T = J * W;
  mat3 Vrk = mat3(
    aCovA.x, aCovA.y, aCovA.z,
    aCovA.y, aCovB.x, aCovB.y,
    aCovA.z, aCovB.y, aCovB.z
  ) * uScaleMult;
  mat3 cov = T * Vrk * transpose(T);

  float c00 = cov[0][0] + 0.3;
  float c01 = cov[0][1];
  float c11 = cov[1][1] + 0.3;
  float mid = 0.5 * (c00 + c11);
  float det = c00 * c11 - c01 * c01;
  float disc = sqrt(max(0.01, mid * mid - det));
  float l1 = mid + disc;
  float l2 = max(0.1, mid - disc);

  vec2 eig = vec2(c01, l1 - c00);
  vec2 v1 = dot(eig, eig) > 1e-8 ? normalize(eig) : vec2(1.0, 0.0);
  vec2 v2 = vec2(-v1.y, v1.x);

  float r1 = min(sqrt(l1) * 2.8, 1024.0);
  float r2 = min(sqrt(l2) * 2.8, 1024.0);
  vec2 ndcScale = 2.0 / max(uViewport, vec2(2.0));
  vec4 clip = projectionMatrix * viewPos;
  vec2 ndc = clip.xy / clip.w + (position.x * v1 * r1 + position.y * v2 * r2) * ndcScale;

  gl_Position = vec4(ndc * clip.w, clip.z, clip.w);
  vColor = aColor;
  vQuad = position.xy * 2.8;
}
`;

const SPLAT_FRAG = /* glsl */ `
varying vec4 vColor;
varying vec2 vQuad;

void main() {
  float d = dot(vQuad, vQuad);
  if (d > 7.84) discard;
  float alpha = min(0.99, exp(-0.5 * d) * vColor.a);
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(vColor.rgb * alpha, alpha);
}
`;

export function parseSplatBuffer(arrayBuffer) {
  const count = Math.min(MAX_SPLATS, Math.floor(arrayBuffer.byteLength / 32));
  if (count <= 0) throw new Error("Tệp .splat không chứa điểm Gaussian hợp lệ");

  const f32 = new Float32Array(arrayBuffer, 0, count * 8);
  const u8 = new Uint8Array(arrayBuffer, 0, count * 32);

  const positions = new Float32Array(count * 3);
  const covA = new Float32Array(count * 3);
  const covB = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const fBase = i * 8;
    const bBase = i * 32;
    positions[i * 3] = f32[fBase];
    positions[i * 3 + 1] = f32[fBase + 1];
    positions[i * 3 + 2] = f32[fBase + 2];

    const sx = Math.max(1e-4, f32[fBase + 3]);
    const sy = Math.max(1e-4, f32[fBase + 4]);
    const sz = Math.max(1e-4, f32[fBase + 5]);

    colors[i * 4] = u8[bBase + 24] / 255;
    colors[i * 4 + 1] = u8[bBase + 25] / 255;
    colors[i * 4 + 2] = u8[bBase + 26] / 255;
    colors[i * 4 + 3] = u8[bBase + 27] / 255;

    let qw = (u8[bBase + 28] - 128) / 128;
    let qx = (u8[bBase + 29] - 128) / 128;
    let qy = (u8[bBase + 30] - 128) / 128;
    let qz = (u8[bBase + 31] - 128) / 128;
    const qLen = Math.hypot(qw, qx, qy, qz) || 1;
    qw /= qLen;
    qx /= qLen;
    qy /= qLen;
    qz /= qLen;

    const r00 = (1 - 2 * (qy * qy + qz * qz)) * sx;
    const r01 = (2 * (qx * qy - qw * qz)) * sy;
    const r02 = (2 * (qx * qz + qw * qy)) * sz;
    const r10 = (2 * (qx * qy + qw * qz)) * sx;
    const r11 = (1 - 2 * (qx * qx + qz * qz)) * sy;
    const r12 = (2 * (qy * qz - qw * qx)) * sz;
    const r20 = (2 * (qx * qz - qw * qy)) * sx;
    const r21 = (2 * (qy * qz + qw * qx)) * sy;
    const r22 = (1 - 2 * (qx * qx + qy * qy)) * sz;

    covA[i * 3] = r00 * r00 + r01 * r01 + r02 * r02;
    covA[i * 3 + 1] = r00 * r10 + r01 * r11 + r02 * r12;
    covA[i * 3 + 2] = r00 * r20 + r01 * r21 + r02 * r22;
    covB[i * 3] = r10 * r10 + r11 * r11 + r12 * r12;
    covB[i * 3 + 1] = r10 * r20 + r11 * r21 + r12 * r22;
    covB[i * 3 + 2] = r20 * r20 + r21 * r21 + r22 * r22;
  }

  return { count, positions, covA, covB, colors };
}

function robustBounds(positions, count) {
  const step = Math.max(1, Math.floor(count / 4096));
  const xs = [], ys = [], zs = [];
  for (let i = 0; i < count; i += step) {
    xs.push(positions[i * 3]);
    ys.push(positions[i * 3 + 1]);
    zs.push(positions[i * 3 + 2]);
  }
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  zs.sort((a, b) => a - b);
  const lo = Math.floor(xs.length * 0.05);
  const hi = Math.min(xs.length - 1, Math.floor(xs.length * 0.95));
  return {
    minX: xs[lo], maxX: xs[hi],
    minY: ys[lo], maxY: ys[hi],
    minZ: zs[lo], maxZ: zs[hi],
  };
}

export function createSplatCloud(THREE, data, opts = {}) {
  const { count, positions, covA, covB, colors } = data;
  const targetSize = opts.targetSize || 14;
  const b = robustBounds(positions, count);
  const span = Math.max(0.2, b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ);
  const sc = targetSize / span;

  // Bản quad đơn vị dùng chung qua InstancedBufferGeometry
  const baseQuad = new THREE.PlaneGeometry(2, 2);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = baseQuad.index;
  geo.attributes.position = baseQuad.attributes.position;
  geo.instanceCount = count;

  const sCenter = new Float32Array(count * 3);
  const sCovA = new Float32Array(count * 3);
  const sCovB = new Float32Array(count * 3);
  const sColor = new Float32Array(count * 4);

  const cAttr = new THREE.InstancedBufferAttribute(sCenter, 3);
  const caAttr = new THREE.InstancedBufferAttribute(sCovA, 3);
  const cbAttr = new THREE.InstancedBufferAttribute(sCovB, 3);
  const colAttr = new THREE.InstancedBufferAttribute(sColor, 4);
  cAttr.setUsage(THREE.DynamicDrawUsage);
  caAttr.setUsage(THREE.DynamicDrawUsage);
  cbAttr.setUsage(THREE.DynamicDrawUsage);
  colAttr.setUsage(THREE.DynamicDrawUsage);

  geo.setAttribute("aCenter", cAttr);
  geo.setAttribute("aCovA", caAttr);
  geo.setAttribute("aCovB", cbAttr);
  geo.setAttribute("aColor", colAttr);

  const mat = new THREE.ShaderMaterial({
    vertexShader: SPLAT_VERT,
    fragmentShader: SPLAT_FRAG,
    uniforms: {
      uViewport: { value: new THREE.Vector2(800, 540) },
      uScaleMult: { value: 1.0 },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;

  // Chuẩn hoá tâm, xoay Y-down của COLMAP thành Y-up của Three.js và đặt sát mặt đất
  const root = new THREE.Group();
  mesh.rotation.x = opts.flipY !== false ? Math.PI : 0;
  mesh.scale.setScalar(sc);
  const cx = (b.minX + b.maxX) * 0.5 * sc;
  const cy = (b.minY + b.maxY) * 0.5 * sc;
  const cz = (b.minZ + b.maxZ) * 0.5 * sc;
  const halfH = Math.max(0.5, (b.maxY - b.minY) * 0.5 * sc);
  mesh.position.set(-cx, opts.flipY !== false ? halfH + cy : halfH - cy, opts.flipY !== false ? cz : -cz);
  root.add(mesh);

  const counts = new Int32Array(BUCKETS);
  const starts = new Int32Array(BUCKETS);
  const depths = new Float32Array(count);
  const order = new Int32Array(count);
  let lastFwd = new THREE.Vector3();
  let sortedOnce = false;

  function sortSplats(camera) {
    mesh.updateMatrixWorld(true);
    const mv = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld).elements;
    const vx = mv[2], vy = mv[6], vz = mv[10], vw = mv[14];
    let minD = Infinity, maxD = -Infinity;
    for (let i = 0; i < count; i++) {
      const d = vx * positions[i * 3] + vy * positions[i * 3 + 1] + vz * positions[i * 3 + 2] + vw;
      depths[i] = d;
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    }
    const invRange = (BUCKETS - 1) / Math.max(1e-4, maxD - minD);
    counts.fill(0);
    for (let i = 0; i < count; i++) {
      // Back-to-front: giá trị d âm nhất (xa nhất) xếp vào bucket đầu (0)
      const bk = Math.max(0, Math.min(BUCKETS - 1, ((depths[i] - minD) * invRange) | 0));
      counts[bk]++;
    }
    let acc = 0;
    for (let bIdx = 0; bIdx < BUCKETS; bIdx++) {
      starts[bIdx] = acc;
      acc += counts[bIdx];
    }
    for (let i = 0; i < count; i++) {
      const bk = Math.max(0, Math.min(BUCKETS - 1, ((depths[i] - minD) * invRange) | 0));
      order[starts[bk]++] = i;
    }
    for (let dst = 0; dst < count; dst++) {
      const src = order[dst];
      sCenter[dst * 3] = positions[src * 3];
      sCenter[dst * 3 + 1] = positions[src * 3 + 1];
      sCenter[dst * 3 + 2] = positions[src * 3 + 2];
      sCovA[dst * 3] = covA[src * 3];
      sCovA[dst * 3 + 1] = covA[src * 3 + 1];
      sCovA[dst * 3 + 2] = covA[src * 3 + 2];
      sCovB[dst * 3] = covB[src * 3];
      sCovB[dst * 3 + 1] = covB[src * 3 + 1];
      sCovB[dst * 3 + 2] = covB[src * 3 + 2];
      sColor[dst * 4] = colors[src * 4];
      sColor[dst * 4 + 1] = colors[src * 4 + 1];
      sColor[dst * 4 + 2] = colors[src * 4 + 2];
      sColor[dst * 4 + 3] = colors[src * 4 + 3];
    }
    cAttr.needsUpdate = true;
    caAttr.needsUpdate = true;
    cbAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sortedOnce = true;
  }

  const fwd = new THREE.Vector3();
  return {
    root,
    count,
    update(camera, vw, vh) {
      mat.uniforms.uViewport.value.set(vw, vh);
      camera.getWorldDirection(fwd);
      if (!sortedOnce || fwd.distanceToSquared(lastFwd) > 0.004) {
        lastFwd.copy(fwd);
        sortSplats(camera);
      }
    },
    dispose() {
      baseQuad.dispose();
      geo.dispose();
      mat.dispose();
    },
  };
}
