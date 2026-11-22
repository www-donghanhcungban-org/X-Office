// Tài nguyên thiên nhiên & cảnh quan 3D PBR: cây tán rộng thân cong, cây thông, cây dừa nhiệt đới,
// chậu cây gốm nội thất, hồ bơi âm sàn lát gạch mosaic + mặt nước vật lý + phao/bóng nổi,
// sàn gỗ teak + dù + ghế tắm nắng, hàng rào hoa, tảng đá, ghế công viên, đèn đường, cây Noel & cây mai Tết.
import { shade } from "./iso.js";
import { createWaterMaterial, createCausticsMaterial } from "./water3d.js";

function rnd(i) {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

export function createNatureAssets(THREE) {
  // Biên dạng chậu cây gốm bo tròn miệng loe
  const potPts = [
    [0.0, 0.0], [0.16, 0.0], [0.21, 0.14], [0.25, 0.32], [0.27, 0.42],
    [0.295, 0.45], [0.295, 0.49], [0.245, 0.49], [0.235, 0.43], [0.0, 0.43],
  ].map(([r, y]) => new THREE.Vector2(r, y));

  // Đế đèn công viên giật cấp gang đúc
  const lampBasePts = [
    [0.0, 0.0], [0.2, 0.0], [0.19, 0.07], [0.14, 0.12], [0.13, 0.24], [0.08, 0.32], [0.06, 0.36],
  ].map(([r, y]) => new THREE.Vector2(r, y));

  // Thân cây tán rộng hơi uốn cong tự nhiên
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, 0),
    new THREE.Vector3(0.05, 0.55, 0.03),
    new THREE.Vector3(-0.04, 1.15, -0.02),
    new THREE.Vector3(0.02, 1.72, 0.02),
  ]);

  // Nhánh cây vươn chéo
  const branchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.24, 0.36, 0.08),
    new THREE.Vector3(0.55, 0.68, 0.12),
  ]);

  // Thân cây dừa cong duyên dáng
  const palmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.05, 0),
    new THREE.Vector3(0.08, 0.78, 0.04),
    new THREE.Vector3(0.22, 1.56, 0.09),
    new THREE.Vector3(0.34, 2.28, 0.12),
    new THREE.Vector3(0.4, 2.86, 0.14),
  ]);

  // Sống lá dừa cong vòm
  const frondCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.42, 0.26, 0),
    new THREE.Vector3(0.95, 0.14, 0),
    new THREE.Vector3(1.42, -0.28, 0),
  ]);

  // Lá cây bản rộng (monstera / trầu bà / lá cọ)
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.14, 0.14, 0.11, 0.34);
  leafShape.quadraticCurveTo(0.06, 0.48, 0, 0.55);
  leafShape.quadraticCurveTo(-0.06, 0.48, -0.11, 0.34);
  leafShape.quadraticCurveTo(-0.14, 0.14, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.012, bevelEnabled: false });

  // Tay vịn inox uốn vòm xuống hồ bơi
  const ladderCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.42, 0.04),
    new THREE.Vector3(0, 0.48, 0.04),
    new THREE.Vector3(0, 0.68, -0.14),
    new THREE.Vector3(0, 0.42, -0.32),
    new THREE.Vector3(0, 0.02, -0.32),
  ]);

  // Cành cổ ngỗng đèn công viên
  const gooseneckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.14, 0.28, 0),
    new THREE.Vector3(0.38, 0.32, 0),
    new THREE.Vector3(0.46, 0.16, 0),
  ]);

  // Thân mai Tết uốn lượn bonsai
  const tetCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.42, 0),
    new THREE.Vector3(-0.1, 0.92, 0.08),
    new THREE.Vector3(0.12, 1.46, -0.06),
    new THREE.Vector3(-0.02, 1.98, 0.05),
  ]);

  // Biên dạng hông xe điện hiện đại khí động học (ExtrudeGeometry)
  const carShape = new THREE.Shape();
  carShape.moveTo(-2.1, 0.28);
  carShape.lineTo(2.15, 0.28);
  carShape.quadraticCurveTo(2.26, 0.34, 2.22, 0.62);
  carShape.quadraticCurveTo(2.12, 0.82, 1.38, 0.88);
  carShape.quadraticCurveTo(0.82, 1.36, 0.22, 1.38);
  carShape.lineTo(-0.78, 1.36);
  carShape.quadraticCurveTo(-1.38, 1.24, -1.86, 0.88);
  carShape.quadraticCurveTo(-2.18, 0.82, -2.2, 0.52);
  carShape.quadraticCurveTo(-2.2, 0.3, -2.1, 0.28);
  const carBodyGeo = new THREE.ExtrudeGeometry(carShape, {
    depth: 1.62, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 2,
  });
  carBodyGeo.translate(0, 0, -0.81);

  // Bụi cỏ 3D mảnh tự nhiên (dùng với InstancedMesh — hoà quyện mượt với nền cỏ chụp thật)
  const grassGeo = new THREE.ConeGeometry(0.022, 0.13, 3);
  grassGeo.translate(0, 0.065, 0);

  const geos = {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    unitPlane: new THREE.PlaneGeometry(1, 1),
    waterPlane: new THREE.PlaneGeometry(1, 1, 24, 16),
    leafCard: new THREE.PlaneGeometry(1.05, 1.05),
    shadowDisc: new THREE.PlaneGeometry(1, 1),
    grassTuft: grassGeo,
    wildflower: new THREE.SphereGeometry(0.042, 6, 5),
    carBody: carBodyGeo,
    carWheel: new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16),
    carRim: new THREE.CylinderGeometry(0.19, 0.19, 0.24, 12),
    mulch: new THREE.CylinderGeometry(0.56, 0.64, 0.09, 16),
    rootFlare: new THREE.CylinderGeometry(0.15, 0.32, 0.42, 12),
    trunk: new THREE.TubeGeometry(trunkCurve, 14, 0.145, 10, false),
    branch: new THREE.TubeGeometry(branchCurve, 8, 0.062, 8, false),
    pineTrunk: new THREE.CylinderGeometry(0.08, 0.2, 1.55, 12),
    pineTier: new THREE.ConeGeometry(0.5, 1, 9),
    foliageBlob: new THREE.IcosahedronGeometry(0.5, 2),
    palmTrunk: new THREE.TubeGeometry(palmCurve, 18, 0.135, 10, false),
    palmRing: new THREE.TorusGeometry(0.145, 0.016, 6, 12),
    palmStem: new THREE.TubeGeometry(frondCurve, 12, 0.022, 6, false),
    palmBlade: new THREE.BoxGeometry(0.055, 0.01, 0.34),
    coconut: new THREE.SphereGeometry(0.095, 10, 8),
    pot: new THREE.LatheGeometry(potPts, 20),
    potSoil: new THREE.CylinderGeometry(0.24, 0.22, 0.04, 14),
    standLeg: new THREE.CylinderGeometry(0.02, 0.016, 0.24, 8),
    plantStem: new THREE.CylinderGeometry(0.018, 0.026, 0.56, 8),
    leaf: leafGeo,
    stone: new THREE.DodecahedronGeometry(0.5, 1),
    flowerCore: new THREE.SphereGeometry(0.042, 8, 6),
    flowerPetal: new THREE.SphereGeometry(0.056, 8, 6),
    ladderRail: new THREE.TubeGeometry(ladderCurve, 18, 0.024, 8, false),
    ladderStep: new THREE.BoxGeometry(0.46, 0.032, 0.085),
    beachBall: new THREE.SphereGeometry(0.22, 18, 14),
    swimRing: new THREE.TorusGeometry(0.32, 0.105, 12, 24),
    umbrellaBase: new THREE.CylinderGeometry(0.26, 0.34, 0.14, 16),
    umbrellaPole: new THREE.CylinderGeometry(0.036, 0.042, 2.32, 12),
    umbrellaCanopy: new THREE.ConeGeometry(1.18, 0.54, 8),
    umbrellaFinial: new THREE.SphereGeometry(0.07, 10, 8),
    pillow: new THREE.CapsuleGeometry(0.065, 0.34, 6, 10),
    lampBase: new THREE.LatheGeometry(lampBasePts, 16),
    lampPost: new THREE.CylinderGeometry(0.042, 0.058, 2.28, 12),
    lampArm: new THREE.TubeGeometry(gooseneckCurve, 12, 0.028, 8, false),
    lampCap: new THREE.ConeGeometry(0.23, 0.14, 14),
    lampGlobe: new THREE.SphereGeometry(0.185, 16, 12),
    bollardPost: new THREE.CylinderGeometry(0.068, 0.075, 0.42, 12),
    bollardGlow: new THREE.CylinderGeometry(0.062, 0.062, 0.13, 12),
    bollardCap: new THREE.CylinderGeometry(0.082, 0.082, 0.04, 12),
    bauble: new THREE.SphereGeometry(0.068, 10, 8),
    star: new THREE.OctahedronGeometry(0.19, 0),
    tetTrunk: new THREE.TubeGeometry(tetCurve, 14, 0.062, 8, false),
    blossom: new THREE.DodecahedronGeometry(0.092, 0),
  };

  return {
    geos,
    palmCurve,
    frondCurve,
    dispose() {
      for (const g of Object.values(geos)) g.dispose();
    },
  };
}

function addShadow(THREE, group, assets, mats, sx, sz = sx, y = 0.01) {
  const m = new THREE.Mesh(assets.geos.shadowDisc, mats.shadow());
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.scale.set(sx, sz, 1);
  group.add(m);
}

// ---------------------------------------------------------------- Cây xanh ngoài trời (tán rộng / thông / dừa)
export function buildTree(THREE, assets, mats, opts, anim) {
  const { x, y, color, pine, palm } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x + 1.0, 0, y + 1.0);
  const seed = x * 3.7 + y * 5.3;
  const leafCol = color || "#2f855a";
  const isCustomColor = Boolean(color && color !== "#2f855a" && color !== "#3b8f4f" && color !== "#40916c");
  const isPine = Boolean(pine) || (!palm && !isCustomColor && rnd(x * 3 + y * 5) > 0.72);

  addShadow(THREE, root, assets, mats, palm ? 2.6 : 3.2, palm ? 2.6 : 3.2, 0.015);

  // Vòng đất mùn & đá cuội gốc cây
  const mulch = new THREE.Mesh(g.mulch, mats.standard("#4a3423", { roughness: 0.96 }));
  mulch.position.y = 0.045;
  mulch.receiveShadow = true;
  root.add(mulch);
  const stoneMat = mats.standard("#78716c", { roughness: 0.86, tex: "stone", normal: 0.75 });
  for (let s = 0; s < 5; s++) {
    const a = s * 1.28 + rnd(seed + s);
    const rk = new THREE.Mesh(g.stone, stoneMat);
    rk.position.set(Math.cos(a) * 0.56, 0.07, Math.sin(a) * 0.56);
    rk.scale.set(0.24, 0.14, 0.2);
    rk.rotation.y = a;
    root.add(rk);
  }

  const barkMat = mats.standard(palm ? "#8a6244" : "#623d24", { roughness: 0.92, tex: "bark", normal: 0.9 });
  const canopy = new THREE.Group();

  if (palm) {
    const trunk = new THREE.Mesh(g.palmTrunk, barkMat);
    trunk.castShadow = trunk.receiveShadow = true;
    root.add(trunk);
    // Vòng đốt thân dừa
    for (let r = 1; r <= 8; r++) {
      const pt = assets.palmCurve.getPoint(r / 9);
      const ring = new THREE.Mesh(g.palmRing, mats.standard("#5c3d28", { roughness: 0.94 }));
      ring.position.copy(pt);
      ring.rotation.x = Math.PI / 2;
      ring.scale.setScalar(1.04 - r * 0.03);
      root.add(ring);
    }
    const topPt = assets.palmCurve.getPoint(1);
    canopy.position.copy(topPt);
    root.add(canopy);
    // Chùm dừa quả
    const cocoMat = mats.standard("#4f331d", { roughness: 0.78 });
    for (let c = 0; c < 4; c++) {
      const a = (c * Math.PI) / 2 + 0.4;
      const co = new THREE.Mesh(g.coconut, cocoMat);
      co.position.set(Math.cos(a) * 0.14, -0.14, Math.sin(a) * 0.14);
      co.castShadow = true;
      canopy.add(co);
    }
    // 10 tàu lá dừa uốn cong kèm lá chét hai bên
    const stemMat = mats.standard(shade(leafCol, -0.12), { roughness: 0.72 });
    const leafA = mats.standard(leafCol, { roughness: 0.62, tex: "foliage", bump: 0.025 });
    const leafB = mats.standard(shade(leafCol, 0.14), { roughness: 0.58, tex: "foliage", bump: 0.025 });
    for (let k = 0; k < 10; k++) {
      const fg = new THREE.Group();
      fg.rotation.y = (k * Math.PI * 2) / 10 + (k % 2) * 0.18;
      fg.rotation.z = k % 2 ? 0.18 : -0.08;
      const stem = new THREE.Mesh(g.palmStem, stemMat);
      stem.castShadow = true;
      fg.add(stem);
      for (let b = 2; b <= 9; b++) {
        const u = b / 10;
        const p = assets.frondCurve.getPoint(u);
        const bladeLen = Math.sin(u * Math.PI) * 1.15 + 0.25;
        for (const side of [-1, 1]) {
          const bl = new THREE.Mesh(g.palmBlade, k % 2 ? leafB : leafA);
          bl.position.set(p.x, p.y - 0.02, side * (0.14 * bladeLen));
          bl.rotation.set(side * 0.35, side * -0.28, -0.25 * u);
          bl.scale.set(1, 1, bladeLen);
          bl.castShadow = true;
          fg.add(bl);
        }
      }
      canopy.add(fg);
    }
  } else if (isPine) {
    const trunk = new THREE.Mesh(g.pineTrunk, barkMat);
    trunk.position.y = 0.78;
    trunk.castShadow = trunk.receiveShadow = true;
    root.add(trunk);
    canopy.position.y = 1.05;
    root.add(canopy);
    const tiers = [
      [2.1, 0.92, 0.35, -0.14], [1.82, 0.86, 0.85, -0.06], [1.54, 0.8, 1.32, 0.02],
      [1.24, 0.74, 1.76, 0.09], [0.94, 0.68, 2.18, 0.16], [0.64, 0.62, 2.55, 0.24],
    ];
    tiers.forEach(([w, h, ty, sh], idx) => {
      const m = new THREE.Mesh(g.pineTier, mats.standard(shade(leafCol, sh), { roughness: 0.8, tex: "foliage", bump: 0.045 }));
      m.position.y = ty;
      m.rotation.y = idx * 0.7 + rnd(seed + idx);
      m.scale.set(w, h, w);
      m.castShadow = m.receiveShadow = true;
      canopy.add(m);
    });
  } else {
    // Cây tán rộng: gốc bạnh + thân cong + 4 cành lớn + 18 tán lá xếp lớp có chiều sâu ánh sáng
    const flare = new THREE.Mesh(g.rootFlare, barkMat);
    flare.position.y = 0.22;
    flare.castShadow = true;
    const trunk = new THREE.Mesh(g.trunk, barkMat);
    trunk.castShadow = trunk.receiveShadow = true;
    root.add(flare, trunk);

    for (let b = 0; b < 4; b++) {
      const br = new THREE.Mesh(g.branch, barkMat);
      br.position.set(0, 1.25 + (b % 2) * 0.18, 0);
      br.rotation.y = (b * Math.PI) / 2 + 0.35 + rnd(seed + b) * 0.4;
      br.castShadow = true;
      root.add(br);
    }

    canopy.position.set(0, 1.9, 0);
    root.add(canopy);
    // Lõi tán cây tạo độ đặc bóng râm bên trong (không bị rỗng ruột)
    const cores = [
      [-0.45, 0.05, 0.24, 0.95, -0.2], [0.46, 0.08, 0.22, 0.92, -0.18],
      [0.06, 0.06, -0.48, 0.96, -0.16], [0.0, 0.48, 0.02, 1.08, -0.06],
      [-0.3, 0.45, -0.18, 0.88, 0.02], [0.32, 0.48, -0.14, 0.86, 0.04],
      [0.02, 0.82, 0.02, 0.78, 0.14],
    ];
    cores.forEach(([px, py, pz, s, sh], idx) => {
      const m = new THREE.Mesh(g.foliageBlob, mats.standard(shade(leafCol, sh), { roughness: 0.82, tex: "foliage", normal: 0.65 }));
      m.position.set(px, py, pz);
      m.rotation.set(rnd(seed + idx) * 2, rnd(seed + idx * 3) * 2, 0);
      m.scale.set(s, s * 0.82, s * 0.95);
      m.castShadow = m.receiveShadow = true;
      canopy.add(m);
    });

    // 26 chùm lá tách nền (alpha cutout) tỏa quanh viền tán → viền lá răng cưa tự nhiên & nắng xuyên tán!
    const leafTones = [
      mats.standard(shade(leafCol, -0.14), { roughness: 0.7, tex: "leafCluster", alphaTest: 0.42, side: THREE.DoubleSide }),
      mats.standard(leafCol, { roughness: 0.66, tex: "leafCluster", alphaTest: 0.42, side: THREE.DoubleSide }),
      mats.standard(shade(leafCol, 0.14), { roughness: 0.62, tex: "leafCluster", alphaTest: 0.42, side: THREE.DoubleSide }),
      mats.standard(shade(leafCol, 0.26), { roughness: 0.58, tex: "leafCluster", alphaTest: 0.42, side: THREE.DoubleSide }),
    ];
    for (let k = 0; k < 26; k++) {
      const phi = Math.acos(1 - (2 * (k + 0.5)) / 26);
      const theta = Math.PI * (1 + Math.sqrt(5)) * k + rnd(seed + k);
      const r = 0.74 + rnd(seed + k * 7) * 0.34;
      const lx = Math.sin(phi) * Math.cos(theta) * r * 1.15;
      const ly = Math.cos(phi) * r * 0.82 + 0.45;
      const lz = Math.sin(phi) * Math.sin(theta) * r * 1.15;
      const toneIdx = Math.min(3, Math.max(0, Math.floor(((ly + 0.3) / 1.45) * 4)));
      const card = new THREE.Mesh(g.leafCard, leafTones[toneIdx]);
      card.position.set(lx, ly, lz);
      card.rotation.set(rnd(seed + k * 3) * 1.4 - 0.7, theta, rnd(seed + k * 5) * 1.2 - 0.6);
      card.scale.setScalar(0.86 + rnd(seed + k * 11) * 0.38);
      card.castShadow = card.receiveShadow = true;
      canopy.add(card);
    }
  }

  root.rotation.y = rnd(seed) * Math.PI * 2;
  if (opts.scale) root.scale.setScalar(opts.scale);
  if (anim) anim.trees.push({ group: canopy, phase: seed, amp: palm ? 0.045 : 0.024 });
  return root;
}

// ---------------------------------------------------------------- Chậu cây trang trí nội thất (chậu gốm + chân gỗ + lá thật)
export function buildPlant(THREE, assets, mats, opts, anim) {
  const { x, y, color } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x + 0.3, 0, y + 0.3);
  const leafCol = color || "#16a34a";

  addShadow(THREE, root, assets, mats, 0.88, 0.88, 0.008);

  const standMat = mats.standard("#8b5e3c", { roughness: 0.68, tex: "wood" });
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    const leg = new THREE.Mesh(g.standLeg, standMat);
    leg.position.set(Math.cos(a) * 0.19, 0.12, Math.sin(a) * 0.19);
    leg.rotation.set(Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14);
    leg.castShadow = true;
    root.add(leg);
  }

  const potMat = mats.physical("#f0ece4", { roughness: 0.22, clearcoat: 0.85, clearcoatRoughness: 0.12 });
  const pot = new THREE.Mesh(g.pot, potMat);
  pot.position.y = 0.14;
  pot.castShadow = pot.receiveShadow = true;
  const soil = new THREE.Mesh(g.potSoil, mats.standard("#3f2e21", { roughness: 0.95 }));
  soil.position.y = 0.56;
  root.add(pot, soil);

  const foliage = new THREE.Group();
  foliage.position.y = 0.56;
  root.add(foliage);

  const stemMat = mats.standard("#3f6212", { roughness: 0.72 });
  const leafMatA = mats.physical(leafCol, { roughness: 0.28, clearcoat: 0.45, clearcoatRoughness: 0.25, side: THREE.DoubleSide });
  const leafMatB = mats.physical(shade(leafCol, 0.14), { roughness: 0.26, clearcoat: 0.45, clearcoatRoughness: 0.25, side: THREE.DoubleSide });

  for (let k = 0; k < 9; k++) {
    const a = (k * Math.PI * 2) / 9 + (k % 2) * 0.22;
    const tilt = 0.22 + (k % 3) * 0.22;
    const hScale = 0.75 + (k % 3) * 0.24;
    const branch = new THREE.Group();
    branch.rotation.y = a;
    branch.rotation.z = tilt;

    const st = new THREE.Mesh(g.plantStem, stemMat);
    st.position.y = 0.28 * hScale;
    st.scale.y = hScale;
    branch.add(st);

    const lf = new THREE.Mesh(g.leaf, k % 2 ? leafMatB : leafMatA);
    lf.position.set(0, 0.52 * hScale, 0);
    lf.rotation.set(0.38, 0, 0);
    lf.scale.setScalar(0.75 + (k % 2) * 0.22);
    lf.castShadow = true;
    branch.add(lf);
    foliage.add(branch);
  }

  if (anim) anim.trees.push({ group: foliage, phase: x + y * 2, amp: 0.015 });
  return root;
}

// ---------------------------------------------------------------- Hồ bơi âm sàn mosaic + tụ thủy Voronoi GLSL + sóng nước Fresnel HDR
export function buildPool(THREE, assets, mats, opts, anim) {
  const { x, y, w, d, dark, glowOn } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x, 0, y);
  const rimW = 0.44;
  const rimH = 0.18;

  // Đáy bể gạch mosaic xanh ngọc có normalMap
  const tileMat = mats.physical("#22b8cf", { roughness: 0.2, clearcoat: 0.7, tex: "poolTile", normal: 0.5 });
  const basinFloor = new THREE.Mesh(g.unitPlane, tileMat);
  basinFloor.rotation.x = -Math.PI / 2;
  basinFloor.position.set(w / 2, 0.014, d / 2);
  basinFloor.scale.set(w, d, 1);
  basinFloor.receiveShadow = true;
  root.add(basinFloor);

  // Thành bể trong màu xanh thẫm tạo chiều sâu âm bể thật
  const innerWallMat = mats.standard("#0369a1", { roughness: 0.25, tex: "poolTile", normal: 0.4 });
  const innerWalls = [
    [w / 2, 0.075, 0.03, w, 0.13, 0.06],
    [w / 2, 0.075, d - 0.03, w, 0.13, 0.06],
    [0.03, 0.075, d / 2, 0.06, 0.13, d],
    [w - 0.03, 0.075, d / 2, 0.06, 0.13, d],
  ];
  for (const [wx, wy, wz, ww, wh, wd] of innerWalls) {
    const im = new THREE.Mesh(g.unitBox, innerWallMat);
    im.position.set(wx, wy, wz);
    im.scale.set(ww, wh, wd);
    im.receiveShadow = true;
    root.add(im);
  }

  // Ánh sáng tụ thủy Voronoi GLSL tán sắc R/G/B lấp lánh trên đáy hồ mosaic
  const causticsMat = glowOn ? mats.own(createCausticsMaterial(THREE, Boolean(dark))) : mats.caustics();
  const caustics = new THREE.Mesh(g.unitPlane, causticsMat);
  caustics.rotation.x = -Math.PI / 2;
  caustics.position.set(w / 2, 0.022, d / 2);
  caustics.scale.set(w - 0.12, d - 0.12, 1);
  root.add(caustics);

  // Viền đá tự nhiên ốp mép bể (coping stone) có normalMap
  const stoneMat = mats.standard("#edeae5", { roughness: 0.72, tex: "stone", normal: 0.6 });
  const rims = [
    [w / 2, rimH / 2, -rimW / 2, w + rimW * 2, rimH, rimW],
    [w / 2, rimH / 2, d + rimW / 2, w + rimW * 2, rimH, rimW],
    [-rimW / 2, rimH / 2, d / 2, rimW, rimH, d],
    [w + rimW / 2, rimH / 2, d / 2, rimW, rimH, d],
  ];
  for (const [rx, ry, rz, rw, rh, rd] of rims) {
    const m = new THREE.Mesh(g.unitBox, stoneMat);
    m.position.set(rx, ry, rz);
    m.scale.set(rw, rh, rd);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  }

  // Đèn LED âm tường hồ bơi phát sáng xanh lam (kích HDR Bloom)
  const ledMat = mats.standard("#a5f3fc", { roughness: 0.1, emissive: "#38bdf8", emissiveIntensity: 1.4 });
  for (const lx of [1.6, w / 2, w - 1.6]) {
    const led = new THREE.Mesh(g.unitBox, ledMat);
    led.position.set(lx, 0.08, 0.07);
    led.scale.set(0.62, 0.055, 0.04);
    root.add(led);
  }

  // Mặt nước GLSL thời gian thực (sóng FBM 6 hướng + Fresnel bầu trời + lóe nắng HDR + bọt bờ)
  const waterMat = glowOn
    ? mats.own(createWaterMaterial(THREE, Boolean(dark)))
    : mats.physical("#22b8cf", { roughness: 0.06, clearcoat: 1, transparent: true, opacity: 0.64, tex: "water" });
  const water = new THREE.Mesh(glowOn ? g.waterPlane : g.unitPlane, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(w / 2, 0.135, d / 2);
  water.scale.set(w - 0.02, d - 0.02, 1);
  water.receiveShadow = true;
  root.add(water);

  if (anim && glowOn) {
    if (waterMat.uniforms) anim.waters.push(waterMat);
    if (causticsMat.uniforms) anim.waters.push(causticsMat);
  }

  // Thang inox lên xuống hồ bơi uốn cong
  const chromeMat = mats.standard("#f1f5f9", { roughness: 0.1, metalness: 0.96 });
  for (const rx of [0.65, 1.15]) {
    const rail = new THREE.Mesh(g.ladderRail, chromeMat);
    rail.position.set(rx, 0.16, 0.05);
    rail.castShadow = true;
    root.add(rail);
  }
  for (const sy of [0.06, 0.25]) {
    const step = new THREE.Mesh(g.ladderStep, chromeMat);
    step.position.set(0.9, sy, 0.09);
    root.add(step);
  }

  // Bóng bãi biển sọc màu & phao bơi hồng san hô nổi bồng bềnh
  const ball = new THREE.Mesh(g.beachBall, mats.physical("#ffffff", { roughness: 0.12, clearcoat: 1.0, tex: "beachball" }));
  ball.position.set(w * 0.3, 0.24, d * 0.48);
  ball.castShadow = true;
  root.add(ball);

  const ring = new THREE.Mesh(g.swimRing, mats.physical("#fb7185", { roughness: 0.16, clearcoat: 0.95 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(w * 0.7, 0.165, d * 0.6);
  ring.castShadow = true;
  root.add(ring);

  if (anim) {
    anim.floaters.push({ mesh: ball, baseY: 0.24, phase: 0.4, spin: true });
    anim.floaters.push({ mesh: ring, baseY: 0.165, phase: 2.1, spin: false });
  }
  return root;
}

// ---------------------------------------------------------------- Sàn gỗ teak + dù che nắng + 2 ghế tắm nắng resort + khăn tắm & nước mát
export function buildUmbrella(THREE, assets, mats, opts) {
  const { x, y } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x - 0.22, 0, y);

  // Sàn gỗ teak nâng cao có normalMap + roughnessMap
  const teakMat = mats.standard("#9a6128", { roughness: 0.65, tex: "wood", normal: 0.55, roughMap: true });
  const deck = new THREE.Mesh(g.unitBox, teakMat);
  deck.position.set(0.05, 0.045, 2.2);
  deck.scale.set(2.35, 0.09, 2.25);
  deck.castShadow = deck.receiveShadow = true;
  root.add(deck);

  // Đế đá granite + cột nhôm + tán dù vải xanh biển có chóp
  const base = new THREE.Mesh(g.umbrellaBase, mats.standard("#64748b", { roughness: 0.72, tex: "stone", normal: 0.5 }));
  base.position.set(0.45, 0.07, 0.55);
  base.castShadow = true;
  const pole = new THREE.Mesh(g.umbrellaPole, mats.standard("#e2e8f0", { roughness: 0.18, metalness: 0.9 }));
  pole.position.set(0.45, 1.24, 0.55);
  pole.castShadow = true;
  const canopy = new THREE.Mesh(g.umbrellaCanopy, mats.physical("#0284c7", { roughness: 0.78, sheen: 0.45, tex: "fabric", normal: 0.3, side: THREE.DoubleSide }));
  canopy.position.set(0.45, 2.38, 0.55);
  canopy.castShadow = canopy.receiveShadow = true;
  const finial = new THREE.Mesh(g.umbrellaFinial, mats.standard("#f8fafc", { roughness: 0.25 }));
  finial.position.set(0.45, 2.67, 0.55);
  root.add(base, pole, canopy, finial);

  // Bàn trà gỗ nhỏ giữa hai ghế + 2 ly nước mát nhiệt đới
  const frameMat = mats.standard("#784820", { roughness: 0.65, tex: "wood", normal: 0.4 });
  const tbl = new THREE.Mesh(g.unitBox, frameMat);
  tbl.position.set(0.02, 0.24, 2.15);
  tbl.scale.set(0.36, 0.28, 0.36);
  tbl.castShadow = tbl.receiveShadow = true;
  root.add(tbl);
  const drinkCols = ["#fb923c", "#34d399"];
  drinkCols.forEach((dc, idx) => {
    const gl = new THREE.Mesh(g.bollardGlow, mats.physical(dc, { roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.85 }));
    gl.position.set(-0.06 + idx * 0.16, 0.45, 2.15);
    gl.scale.set(0.62, 1.1, 0.62);
    root.add(gl);
  });

  // Hai ghế tắm nắng khung gỗ teak + đệm vải + gối tựa + khăn tắm sọc resort
  const loungers = [
    [-0.56, "#f8fafc", "#38bdf8", true],
    [0.62, "#fef3c7", "#ffffff", false],
  ];
  for (const [lx, padCol, pilCol, hasTowel] of loungers) {
    const lg = new THREE.Group();
    lg.position.set(lx, 0.09, 2.2);
    const frame = new THREE.Mesh(g.unitBox, frameMat);
    frame.position.set(0, 0.14, 0);
    frame.scale.set(0.68, 0.06, 1.68);
    frame.castShadow = true;
    const pad = new THREE.Mesh(g.unitBox, mats.physical(padCol, { roughness: 0.85, sheen: 0.45, tex: "fabric", normal: 0.28 }));
    pad.position.set(0, 0.21, 0.12);
    pad.scale.set(0.62, 0.09, 1.32);
    pad.castShadow = pad.receiveShadow = true;
    const back = new THREE.Mesh(g.unitBox, mats.physical(padCol, { roughness: 0.85, sheen: 0.45, tex: "fabric" }));
    back.position.set(0, 0.34, -0.62);
    back.rotation.x = 0.52;
    back.scale.set(0.62, 0.09, 0.56);
    back.castShadow = true;
    const pil = new THREE.Mesh(g.pillow, mats.physical(pilCol, { roughness: 0.85, sheen: 0.45, tex: "fabric" }));
    pil.position.set(0, 0.46, -0.68);
    pil.rotation.z = Math.PI / 2;
    lg.add(frame, pad, back, pil);
    if (hasTowel) {
      const towel = new THREE.Mesh(g.unitBox, mats.physical("#ffffff", { roughness: 0.88, sheen: 0.5, tex: "towel", normal: 0.3 }));
      towel.position.set(0, 0.262, 0.34);
      towel.scale.set(0.63, 0.025, 0.62);
      towel.castShadow = true;
      lg.add(towel);
    }
    for (const [fx, fz] of [[-0.28, -0.7], [0.28, -0.7], [-0.28, 0.7], [0.28, 0.7]]) {
      const f = new THREE.Mesh(g.unitBox, frameMat);
      f.position.set(fx, 0.06, fz);
      f.scale.set(0.05, 0.14, 0.05);
      lg.add(f);
    }
    root.add(lg);
  }
  return root;
}

// ---------------------------------------------------------------- Hàng rào cây & hoa ngoại cảnh
export function buildFence(THREE, assets, mats, opts) {
  const { axis, x, y, len } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  const stoneMat = mats.standard("#b5b0a8", { roughness: 0.85, tex: "stone", bump: 0.03 });
  const hedgeA = mats.standard("#356d32", { roughness: 0.82, tex: "foliage", bump: 0.04 });
  const hedgeB = mats.standard("#43843c", { roughness: 0.8, tex: "foliage", bump: 0.04 });
  const flCols = ["#f43f5e", "#facc15", "#ec4899", "#fb923c"];
  const step = 1.6;
  for (let u = 0, idx = 0; u < len; u += step, idx++) {
    const l = Math.min(step, len - u);
    const px = axis === "x" ? x + u + l / 2 : x + 0.35;
    const pz = axis === "x" ? y + 0.35 : y + u + l / 2;
    const w = axis === "x" ? l - 0.04 : 0.7;
    const d = axis === "x" ? 0.7 : l - 0.04;
    const base = new THREE.Mesh(g.unitBox, stoneMat);
    base.position.set(px, 0.12, pz);
    base.scale.set(w, 0.24, d);
    base.castShadow = base.receiveShadow = true;
    root.add(base);

    for (let k = -1; k <= 1; k += 2) {
      const bush = new THREE.Mesh(g.foliageBlob, (idx + (k > 0 ? 1 : 0)) % 2 ? hedgeA : hedgeB);
      const off = k * (Math.max(w, d) * 0.22);
      bush.position.set(px + (axis === "x" ? off : 0), 0.52, pz + (axis === "y" ? off : 0));
      bush.scale.set(0.76, 0.64, 0.76);
      bush.castShadow = bush.receiveShadow = true;
      root.add(bush);
    }
    if (idx % 2 === 1) {
      const fl = new THREE.Mesh(g.flowerPetal, mats.standard(flCols[idx % flCols.length], { roughness: 0.6 }));
      fl.position.set(px, 0.82, pz);
      fl.scale.setScalar(1.45);
      root.add(fl);
    }
  }
  return root;
}

// ---------------------------------------------------------------- Bồn hoa nhiều cánh 3D
export function buildFlowerbed(THREE, assets, mats, x, y, color) {
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x + 0.45, 0, y + 0.45);
  const rim = new THREE.Mesh(g.mulch, mats.standard("#8c867e", { roughness: 0.86, tex: "stone", bump: 0.03 }));
  rim.position.y = 0.08;
  rim.scale.set(0.84, 1.8, 0.84);
  rim.castShadow = rim.receiveShadow = true;
  root.add(rim);

  const bushMat = mats.standard("#356d32", { roughness: 0.82, tex: "foliage", bump: 0.035 });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + 0.3;
    const b = new THREE.Mesh(g.foliageBlob, bushMat);
    b.position.set(Math.cos(a) * 0.16, 0.28, Math.sin(a) * 0.16);
    b.scale.set(0.45, 0.36, 0.45);
    b.castShadow = true;
    root.add(b);
  }

  const petMat = mats.standard(color, { roughness: 0.55 });
  const coreMat = mats.standard("#fde047", { roughness: 0.5 });
  const blooms = [[-0.18, 0.45, -0.12], [0.18, 0.48, -0.06], [-0.04, 0.46, 0.18], [0.12, 0.5, 0.14]];
  for (const [fx, fy, fz] of blooms) {
    const core = new THREE.Mesh(g.flowerCore, coreMat);
    core.position.set(fx, fy + 0.02, fz);
    root.add(core);
    for (let p = 0; p < 5; p++) {
      const a = (p * Math.PI * 2) / 5;
      const pt = new THREE.Mesh(g.flowerPetal, petMat);
      pt.position.set(fx + Math.cos(a) * 0.055, fy, fz + Math.sin(a) * 0.055);
      pt.scale.set(1, 0.55, 1);
      root.add(pt);
    }
  }
  return root;
}

// ---------------------------------------------------------------- Cụm đá tảng tự nhiên
export function buildRock(THREE, assets, mats, x, y, s) {
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x + s * 0.5, 0, y + s * 0.45);
  addShadow(THREE, root, assets, mats, s * 1.4, s * 1.2, 0.01);
  const mA = mats.standard("#94a3b8", { roughness: 0.88, tex: "stone", bump: 0.05 });
  const mB = mats.standard("#64748b", { roughness: 0.9, tex: "stone", bump: 0.05 });
  const r1 = new THREE.Mesh(g.stone, mA);
  r1.position.y = s * 0.28;
  r1.scale.set(s, s * 0.65, s * 0.85);
  r1.rotation.set(0.2, 0.7, 0.1);
  r1.castShadow = r1.receiveShadow = true;
  const r2 = new THREE.Mesh(g.stone, mB);
  r2.position.set(s * 0.45, s * 0.18, s * 0.2);
  r2.scale.set(s * 0.62, s * 0.46, s * 0.56);
  r2.rotation.set(-0.2, 1.4, 0.2);
  r2.castShadow = r2.receiveShadow = true;
  root.add(r1, r2);
  return root;
}

// ---------------------------------------------------------------- Ghế công viên nan gỗ & khung gang
export function buildBench(THREE, assets, mats, opts) {
  const { x, y } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x + 1.0, 0, y + 0.3);
  addShadow(THREE, root, assets, mats, 2.15, 0.85, 0.008);
  const woodMat = mats.standard("#a46424", { roughness: 0.68, tex: "wood", bump: 0.02 });
  const ironMat = mats.standard("#1f2937", { roughness: 0.42, metalness: 0.72 });

  for (const sx of [-0.78, 0.78]) {
    const leg = new THREE.Mesh(g.unitBox, ironMat);
    leg.position.set(sx, 0.21, 0);
    leg.scale.set(0.08, 0.42, 0.48);
    leg.castShadow = true;
    const arm = new THREE.Mesh(g.unitBox, ironMat);
    arm.position.set(sx, 0.52, 0.02);
    arm.scale.set(0.06, 0.05, 0.52);
    const post = new THREE.Mesh(g.unitBox, ironMat);
    post.position.set(sx, 0.66, -0.22);
    post.rotation.x = -0.14;
    post.scale.set(0.06, 0.52, 0.05);
    root.add(leg, arm, post);
  }
  for (let s = 0; s < 3; s++) {
    const slat = new THREE.Mesh(g.unitBox, woodMat);
    slat.position.set(0, 0.43, -0.14 + s * 0.14);
    slat.scale.set(1.98, 0.04, 0.11);
    slat.castShadow = slat.receiveShadow = true;
    root.add(slat);
  }
  for (let s = 0; s < 3; s++) {
    const back = new THREE.Mesh(g.unitBox, woodMat);
    back.position.set(0, 0.58 + s * 0.14, -0.23 - s * 0.02);
    back.rotation.x = -0.14;
    back.scale.set(1.98, 0.1, 0.04);
    back.castShadow = true;
    root.add(back);
  }
  return root;
}

// ---------------------------------------------------------------- Đèn đường cổ ngỗng + cầu kính phát sáng ấm
export function buildStreetlamp(THREE, assets, mats, opts) {
  const { x, y } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x + 0.06, 0, y + 0.06);
  const ironMat = mats.standard("#1e293b", { roughness: 0.36, metalness: 0.78 });

  const base = new THREE.Mesh(g.lampBase, ironMat);
  base.castShadow = true;
  const post = new THREE.Mesh(g.lampPost, ironMat);
  post.position.y = 1.48;
  post.castShadow = true;
  const arm = new THREE.Mesh(g.lampArm, ironMat);
  arm.position.y = 2.58;
  arm.castShadow = true;
  const cap = new THREE.Mesh(g.lampCap, ironMat);
  cap.position.set(0.46, 2.75, 0);
  const globe = new THREE.Mesh(g.lampGlobe, mats.physical("#fef3c7", {
    roughness: 0.12, clearcoat: 0.8, emissive: "#fde68a", emissiveIntensity: 0.85,
  }));
  globe.position.set(0.46, 2.58, 0);
  root.add(base, post, arm, cap, globe);
  return root;
}

// ---------------------------------------------------------------- Đèn trụ sân vườn (bollard) dọc lối đi
export function buildBollard(THREE, assets, mats, x, y) {
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x, 0, y);
  const metal = mats.standard("#334155", { roughness: 0.38, metalness: 0.75 });
  const post = new THREE.Mesh(g.bollardPost, metal);
  post.position.y = 0.21;
  post.castShadow = true;
  const glow = new THREE.Mesh(g.bollardGlow, mats.standard("#fef3c7", { roughness: 0.15, emissive: "#fde68a", emissiveIntensity: 0.9 }));
  glow.position.y = 0.47;
  const cap = new THREE.Mesh(g.bollardCap, metal);
  cap.position.y = 0.55;
  root.add(post, glow, cap);
  return root;
}

// ---------------------------------------------------------------- Cây mùa lễ hội: Thông Noel & Mai vàng Tết
export function buildSeasonTree(THREE, assets, mats, season, [x, y], anim) {
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x + 0.75, 0, y + 0.75);
  addShadow(THREE, root, assets, mats, 1.9, 1.9, 0.01);

  if (season === "noel") {
    const trunk = new THREE.Mesh(g.pineTrunk, mats.standard("#6b3f1d", { roughness: 0.9, tex: "bark" }));
    trunk.position.y = 0.35;
    trunk.scale.set(0.95, 0.45, 0.95);
    root.add(trunk);
    const tiers = [[1.75, 0.78, 0.72, "#15803d"], [1.44, 0.72, 1.24, "#16a34a"], [1.1, 0.66, 1.72, "#15803d"], [0.76, 0.58, 2.16, "#22c55e"]];
    tiers.forEach(([w, h, ty, col], idx) => {
      const m = new THREE.Mesh(g.pineTier, mats.standard(col, { roughness: 0.78, tex: "foliage", bump: 0.035 }));
      m.position.y = ty;
      m.rotation.y = idx * 0.6;
      m.scale.set(w, h, w);
      m.castShadow = m.receiveShadow = true;
      root.add(m);
    });
    const star = new THREE.Mesh(g.star, mats.standard("#facc15", { roughness: 0.22, metalness: 0.6, emissive: "#facc15", emissiveIntensity: 0.85 }));
    star.position.y = 2.66;
    root.add(star);

    const bCols = ["#f43f5e", "#facc15", "#38bdf8", "#fb7185"];
    for (let k = 0; k < 12; k++) {
      const tier = k % 3;
      const rad = [0.68, 0.52, 0.36][tier];
      const by = [0.78, 1.28, 1.78][tier];
      const a = k * 2.1;
      const col = bCols[k % bCols.length];
      const mat = mats.freshStandard(col, { roughness: 0.2, metalness: 0.5, emissive: col, emissiveIntensity: 0.7 });
      const b = new THREE.Mesh(g.bauble, mat);
      b.position.set(Math.cos(a) * rad, by, Math.sin(a) * rad);
      root.add(b);
      if (anim) anim.blinkers.push({ mat, phase: k * 0.9, high: 0.95, low: 0.15 });
    }

    const gifts = [[-0.68, 0.55, "#dc2626"], [-0.15, 0.78, "#2563eb"], [0.45, 0.72, "#f59e0b"], [0.75, 0.35, "#db2777"]];
    const ribMat = mats.standard("#fde047", { roughness: 0.35, metalness: 0.35 });
    for (const [gx, gz, col] of gifts) {
      const box = new THREE.Mesh(g.unitBox, mats.standard(col, { roughness: 0.55 }));
      box.position.set(gx, 0.2, gz);
      box.scale.set(0.42, 0.4, 0.42);
      box.castShadow = true;
      const r1 = new THREE.Mesh(g.unitBox, ribMat);
      r1.position.set(gx, 0.205, gz);
      r1.scale.set(0.44, 0.41, 0.06);
      const r2 = new THREE.Mesh(g.unitBox, ribMat);
      r2.position.set(gx, 0.205, gz);
      r2.scale.set(0.06, 0.41, 0.44);
      root.add(box, r1, r2);
    }
  } else if (season === "tet") {
    const pot = new THREE.Mesh(g.pot, mats.physical("#b91c1c", { roughness: 0.26, clearcoat: 0.75 }));
    pot.scale.set(1.65, 1.25, 1.65);
    pot.castShadow = pot.receiveShadow = true;
    const soil = new THREE.Mesh(g.potSoil, mats.standard("#3f2e21", { roughness: 0.95 }));
    soil.position.y = 0.56;
    soil.scale.setScalar(1.55);
    root.add(pot, soil);

    const barkMat = mats.standard("#5b3a1e", { roughness: 0.9, tex: "bark", bump: 0.04 });
    const trunk = new THREE.Mesh(g.tetTrunk, barkMat);
    trunk.castShadow = true;
    root.add(trunk);
    for (let b = 0; b < 4; b++) {
      const br = new THREE.Mesh(g.branch, barkMat);
      br.position.set(0, 1.05 + b * 0.2, 0);
      br.rotation.y = (b * Math.PI) / 2 + 0.5;
      br.scale.setScalar(0.85);
      br.castShadow = true;
      root.add(br);
    }
    const goldA = mats.standard("#facc15", { roughness: 0.45, emissive: "#eab308", emissiveIntensity: 0.18 });
    const goldB = mats.standard("#fde047", { roughness: 0.42, emissive: "#facc15", emissiveIntensity: 0.22 });
    const bud = mats.standard("#fb923c", { roughness: 0.5 });
    for (let k = 0; k < 26; k++) {
      const a = k * 2.399;
      const rad = 0.22 + rnd(k * 7) * 0.62;
      const by = 1.28 + rnd(k * 13) * 0.95;
      const m = new THREE.Mesh(g.blossom, k % 5 === 0 ? bud : k % 2 ? goldA : goldB);
      m.position.set(Math.cos(a) * rad, by, Math.sin(a) * rad);
      m.scale.setScalar(0.85 + rnd(k * 5) * 0.45);
      m.castShadow = true;
      root.add(m);
    }
  }
  return root;
}

// ---------------------------------------------------------------- Thảm cỏ 3D & hoa dại thật (InstancedMesh — 2 draw call)
export function buildInstancedLawn(THREE, assets, mats, bounds, excludeBoxes = []) {
  const g = assets.geos;
  const group = new THREE.Group();
  const { x0, x1, y0, y1, count = 420, flowers = 55 } = bounds;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  const inside = (x, z) => excludeBoxes.some(([bx0, bz0, bx1, bz1]) => x >= bx0 && x <= bx1 && z >= bz0 && z <= bz1);

  const grassMat = mats.standard("#ffffff", { roughness: 0.88, metalness: 0.0 });
  const pts = [];
  for (let i = 0; i < count * 2 && pts.length < count; i++) {
    const gx = x0 + rnd(i * 17 + x0 * 3) * (x1 - x0);
    const gz = y0 + rnd(i * 29 + y0 * 5) * (y1 - y0);
    if (!inside(gx, gz)) pts.push([gx, gz, i]);
  }
  if (pts.length) {
    const inst = new THREE.InstancedMesh(g.grassTuft, grassMat, pts.length);
    inst.receiveShadow = true;
    const greens = ["#385e27", "#446e30", "#4d7a36", "#2f5221", "#57843e"];
    pts.forEach(([gx, gz, seed], idx) => {
      dummy.position.set(gx, 0.008, gz);
      dummy.rotation.set((rnd(seed + 1) - 0.5) * 0.45, rnd(seed + 2) * Math.PI * 2, (rnd(seed + 3) - 0.5) * 0.45);
      const sc = 0.7 + rnd(seed + 4) * 0.65;
      dummy.scale.set(sc, sc * (0.75 + rnd(seed + 5) * 0.5), sc);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
      col.set(greens[seed % greens.length]);
      inst.setColorAt(idx, col);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    group.add(inst);
  }

  const fPts = [];
  for (let i = 0; i < flowers * 3 && fPts.length < flowers; i++) {
    const fx = x0 + rnd(i * 37 + 9 + x0) * (x1 - x0);
    const fz = y0 + rnd(i * 43 + 5 + y0) * (y1 - y0);
    if (!inside(fx, fz)) fPts.push([fx, fz, i]);
  }
  if (fPts.length) {
    const fMat = mats.standard("#ffffff", { roughness: 0.55 });
    const fInst = new THREE.InstancedMesh(g.wildflower, fMat, fPts.length);
    const fCols = ["#fef08a", "#ffffff", "#fda4af", "#c4b5fd", "#fde047"];
    fPts.forEach(([fx, fz, seed], idx) => {
      dummy.position.set(fx, 0.1 + rnd(seed) * 0.08, fz);
      dummy.rotation.set(0, rnd(seed + 7) * Math.PI, 0);
      dummy.scale.set(1.1, 0.65, 1.1);
      dummy.updateMatrix();
      fInst.setMatrixAt(idx, dummy.matrix);
      col.set(fCols[seed % fCols.length]);
      fInst.setColorAt(idx, col);
    });
    fInst.instanceMatrix.needsUpdate = true;
    if (fInst.instanceColor) fInst.instanceColor.needsUpdate = true;
    group.add(fInst);
  }
  return group;
}

// ---------------------------------------------------------------- Xe ô tô điện sơn bóng clearcoat đỗ dọc đại lộ trước văn phòng
export function buildCar(THREE, assets, mats, opts) {
  const { x, y, color = "#e2e8f0", rotY = 0 } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x, 0, y);
  root.rotation.y = rotY;

  addShadow(THREE, root, assets, mats, 5.1, 2.5, 0.018);

  const paintMat = mats.physical(color, { roughness: 0.16, metalness: 0.72, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const glassMat = mats.physical("#0f172a", { roughness: 0.06, metalness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.04 });
  const tireMat = mats.standard("#18181b", { roughness: 0.85, metalness: 0.05 });
  const rimMat = mats.standard("#e2e8f0", { roughness: 0.15, metalness: 0.94 });

  const body = new THREE.Mesh(g.carBody, paintMat);
  body.castShadow = body.receiveShadow = true;
  root.add(body);

  // Kính cabin toàn cảnh ôm thân xe
  const cabin = new THREE.Mesh(g.unitBox, glassMat);
  cabin.position.set(-0.22, 1.1, 0);
  cabin.scale.set(2.05, 0.44, 1.66);
  root.add(cabin);

  // Đèn pha LED trắng (HDR Bloom) & dải đèn hậu đỏ ruby
  const headMat = mats.standard("#ffffff", { roughness: 0.1, emissive: "#fef9c3", emissiveIntensity: 1.65 });
  const tailMat = mats.standard("#ef4444", { roughness: 0.15, emissive: "#ef4444", emissiveIntensity: 1.45 });
  for (const sz of [-0.56, 0.56]) {
    const hl = new THREE.Mesh(g.unitBox, headMat);
    hl.position.set(2.22, 0.62, sz);
    hl.scale.set(0.08, 0.12, 0.32);
    root.add(hl);
  }
  const tl = new THREE.Mesh(g.unitBox, tailMat);
  tl.position.set(-2.22, 0.68, 0);
  tl.scale.set(0.06, 0.09, 1.48);
  root.add(tl);

  // 4 bánh xe lốp cao su + mâm hợp kim phay
  for (const [wx, wz] of [[1.32, 0.84], [1.32, -0.84], [-1.32, 0.84], [-1.32, -0.84]]) {
    const tire = new THREE.Mesh(g.carWheel, tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(wx, 0.32, wz);
    tire.castShadow = true;
    const rim = new THREE.Mesh(g.carRim, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(wx, 0.32, wz);
    root.add(tire, rim);
  }
  return root;
}
