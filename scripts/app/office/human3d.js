// Nhân vật 3D điêu khắc + nhân vật xương Ready Player Me HD chuyển động thật + ghế công thái học (Three.js PBR).
// Hệ toạ độ cục bộ: gốc (0, 0, 0) là mặt sàn, nhân vật luôn quay mặt về hướng -z.
import { instantiateGLB, bindAnimationClip } from "./glb.js";

const SKIN = ["#eab68e", "#dca072", "#c88656", "#e4ae84", "#b57449", "#e0a97b", "#9c623d"];
const HAIR = ["#1f1510", "#4e2e1c", "#111827", "#8d5524", "#3b3f46", "#6b2d18", "#2c1d13"];
const IRIS = ["#2b1a10", "#3d2817", "#1f3a52", "#3b4d2b", "#18181b"];
const OUTFIT = [
  { top: "#2563eb", inner: "#e2e8f0", pants: "#1e293b", blazer: true },
  { top: "#15803d", inner: "#e2e8f0", pants: "#334155", blazer: false },
  { top: "#6d28d9", inner: "#e2e8f0", pants: "#1e293b", blazer: true },
  { top: "#be123c", inner: "#e2e8f0", pants: "#1f2937", blazer: false },
  { top: "#0f766e", inner: "#e2e8f0", pants: "#334155", blazer: true },
  { top: "#c2410c", inner: "#e2e8f0", pants: "#1e293b", blazer: false },
  { top: "#3730a3", inner: "#e2e8f0", pants: "#111827", blazer: true },
  { top: "#0369a1", inner: "#e2e8f0", pants: "#27272a", blazer: false },
  { top: "#9d174d", inner: "#e2e8f0", pants: "#1f2937", blazer: true },
];

// Tạo lưới đầu giải phẫu điêu khắc (hốc mắt, cung mày, gò má, sống mũi liền khối, xương hàm & cằm thon)
function buildSculptedHeadGeo(THREE) {
  const geo = new THREE.SphereGeometry(0.155, 32, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    x *= 0.94;
    y *= 1.15;
    z *= 1.02;
    // Thon gọn dần về xương hàm và cằm
    if (y < -0.02) {
      const t = Math.min(1, (-y - 0.02) / 0.16);
      x *= 1 - t * 0.28;
      if (z < 0) z *= 1 + t * 0.05;
    }
    if (z < -0.05) {
      const front = Math.min(1, (-z - 0.05) / 0.09);
      const ax = Math.abs(x);
      // Cung mày nổi nhẹ
      const brow = Math.exp(-Math.pow((y - 0.048) / 0.03, 2) - Math.pow(ax / 0.095, 2));
      z -= brow * 0.011 * front;
      // Hốc mắt lõm tự nhiên để nhãn cầu nằm sâu dưới cung mày
      const sock = Math.exp(-Math.pow((ax - 0.054) / 0.027, 2) - Math.pow((y - 0.01) / 0.024, 2));
      z += sock * 0.014 * front;
      // Gò má đầy ấm áp
      const cheek = Math.exp(-Math.pow((ax - 0.075) / 0.038, 2) - Math.pow((y + 0.026) / 0.032, 2));
      z -= cheek * 0.009 * front;
      x += Math.sign(x) * cheek * 0.005 * front;
      // Sống mũi & đầu mũi liền khối tự nhiên
      const bridge = Math.exp(-Math.pow(ax / 0.021, 2) - Math.pow((y + 0.014) / 0.04, 2));
      const tip = Math.exp(-Math.pow(ax / 0.018, 2) - Math.pow((y + 0.034) / 0.018, 2));
      z -= (bridge * 0.016 + tip * 0.022) * front;
    }
    pos.setXYZ(i, x, y + 0.188, z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createHumanAssets(THREE) {
  // Biên dạng thân người (LatheGeometry): eo → ngực → vai rộng → cổ áo.
  const torsoPts = [
    [0.0, 0.0], [0.155, 0.015], [0.168, 0.11], [0.182, 0.24], [0.205, 0.38],
    [0.215, 0.47], [0.175, 0.525], [0.085, 0.555], [0.0, 0.56],
  ].map(([r, y]) => new THREE.Vector2(r, y));

  // Lọn tóc uốn cong điêu khắc (dùng xếp lớp mái & đỉnh đầu tự nhiên)
  const lockCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.075, 0.03, 0.02),
    new THREE.Vector3(-0.01, 0.045, -0.02),
    new THREE.Vector3(0.065, 0.005, -0.032),
    new THREE.Vector3(0.11, -0.04, -0.01),
  ]);

  // Đệm ghế bo góc (ExtrudeGeometry)
  const seatShape = new THREE.Shape();
  const sw = 0.28, sd = 0.25, sr = 0.07;
  seatShape.moveTo(-sw + sr, -sd);
  seatShape.lineTo(sw - sr, -sd);
  seatShape.quadraticCurveTo(sw, -sd, sw, -sd + sr);
  seatShape.lineTo(sw, sd - sr);
  seatShape.quadraticCurveTo(sw, sd, sw - sr, sd);
  seatShape.lineTo(-sw + sr, sd);
  seatShape.quadraticCurveTo(-sw, sd, -sw, sd - sr);
  seatShape.lineTo(-sw, -sd + sr);
  seatShape.quadraticCurveTo(-sw, -sd, -sw + sr, -sd);
  const seatGeo = new THREE.ExtrudeGeometry(seatShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
  seatGeo.rotateX(Math.PI / 2);

  // Vòng chụp tai nghe cong tự nhiên
  const bandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.165, 0.21, 0.0),
    new THREE.Vector3(-0.15, 0.35, 0.0),
    new THREE.Vector3(0, 0.415, 0.01),
    new THREE.Vector3(0.15, 0.35, 0.0),
    new THREE.Vector3(0.165, 0.21, 0.0),
  ]);
  const micCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.165, 0.18, -0.02),
    new THREE.Vector3(0.145, 0.13, -0.11),
    new THREE.Vector3(0.065, 0.115, -0.175),
  ]);

  const geos = {
    head: buildSculptedHeadGeo(THREE),
    torso: new THREE.LatheGeometry(torsoPts, 22),
    neck: new THREE.CylinderGeometry(0.062, 0.074, 0.14, 16),
    hip: new THREE.SphereGeometry(0.19, 16, 12),
    upperArm: new THREE.CapsuleGeometry(0.058, 0.22, 6, 12),
    shoulderCap: new THREE.SphereGeometry(0.072, 12, 10),
    forearm: new THREE.CapsuleGeometry(0.047, 0.21, 6, 12),
    thigh: new THREE.CapsuleGeometry(0.078, 0.28, 6, 12),
    shin: new THREE.CapsuleGeometry(0.062, 0.29, 6, 12),
    shoe: new THREE.CapsuleGeometry(0.056, 0.12, 6, 12),
    sole: new THREE.BoxGeometry(0.115, 0.026, 0.245),
    hand: new THREE.SphereGeometry(0.042, 12, 10),
    finger: new THREE.CapsuleGeometry(0.0085, 0.036, 4, 6),
    ear: new THREE.SphereGeometry(0.036, 12, 10),
    eye: new THREE.SphereGeometry(0.022, 14, 12),
    iris: new THREE.CircleGeometry(0.015, 16),
    lid: new THREE.SphereGeometry(0.0245, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
    brow: new THREE.CapsuleGeometry(0.0075, 0.044, 4, 8),
    lip: new THREE.CapsuleGeometry(0.0095, 0.042, 4, 8),
    glassRim: new THREE.TorusGeometry(0.038, 0.0042, 8, 20),
    glassLens: new THREE.CircleGeometry(0.036, 16),
    glassBridge: new THREE.CylinderGeometry(0.0038, 0.0038, 0.03, 6),
    glassTemple: new THREE.CylinderGeometry(0.0035, 0.0035, 0.15, 6),
    hairCrown: new THREE.SphereGeometry(0.165, 22, 16),
    hairLock: new THREE.TubeGeometry(lockCurve, 12, 0.026, 8, false),
    hairFringe: new THREE.CapsuleGeometry(0.036, 0.145, 6, 12),
    hairSide: new THREE.CapsuleGeometry(0.028, 0.095, 4, 10),
    hairBack: new THREE.CapsuleGeometry(0.148, 0.16, 6, 14),
    hairBun: new THREE.SphereGeometry(0.07, 12, 10),
    hairQuiff: new THREE.IcosahedronGeometry(0.118, 1),
    collar: new THREE.TorusGeometry(0.092, 0.022, 8, 18),
    lapel: new THREE.BoxGeometry(0.042, 0.22, 0.014),
    tie: new THREE.BoxGeometry(0.032, 0.2, 0.012),
    belt: new THREE.CylinderGeometry(0.172, 0.172, 0.045, 18),
    buckle: new THREE.BoxGeometry(0.065, 0.048, 0.022),
    badge: new THREE.BoxGeometry(0.064, 0.088, 0.01),
    watch: new THREE.TorusGeometry(0.047, 0.009, 6, 14),
    headband: new THREE.TubeGeometry(bandCurve, 18, 0.013, 8, false),
    earcup: new THREE.CylinderGeometry(0.056, 0.056, 0.036, 14),
    earpad: new THREE.TorusGeometry(0.048, 0.014, 8, 14),
    micBoom: new THREE.TubeGeometry(micCurve, 12, 0.005, 6, false),
    micTip: new THREE.SphereGeometry(0.011, 8, 8),
    noelCuff: new THREE.TorusGeometry(0.145, 0.032, 8, 18),
    noelCone: new THREE.ConeGeometry(0.145, 0.34, 16),
    noelPom: new THREE.SphereGeometry(0.042, 10, 8),
    tetCap: new THREE.CylinderGeometry(0.148, 0.155, 0.07, 18),
    // Ghế công thái học
    seat: seatGeo,
    chairBack: new THREE.BoxGeometry(0.52, 0.62, 0.07),
    headrest: new THREE.CapsuleGeometry(0.065, 0.24, 6, 12),
    chairStem: new THREE.CylinderGeometry(0.036, 0.042, 0.36, 12),
    starArm: new THREE.CylinderGeometry(0.018, 0.024, 0.32, 8),
    wheel: new THREE.CylinderGeometry(0.028, 0.028, 0.024, 10),
    armPost: new THREE.CylinderGeometry(0.018, 0.022, 0.21, 8),
    armPad: new THREE.CapsuleGeometry(0.03, 0.22, 4, 10),
    shadowDisc: new THREE.PlaneGeometry(1.15, 1.15),
  };

  return {
    geos,
    dispose() {
      for (const g of Object.values(geos)) g.dispose();
    },
  };
}

function tagPick(root, pick) {
  if (!pick) return;
  root.traverse((o) => { if (o.isMesh) o.userData.pick = pick; });
}

function buildErgonomicChair(THREE, g, mats, theme, noChair) {
  const root = new THREE.Group();
  const sh = new THREE.Mesh(g.shadowDisc, mats.shadow());
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.016;
  root.add(sh);

  const chairGroup = new THREE.Group();
  root.add(chairGroup);
  const swivel = new THREE.Group();
  chairGroup.add(swivel);
  if (!noChair) {
    const chairMat = mats.physical(theme.chair, { roughness: 0.82, metalness: 0.04, sheen: 0.48, sheenRoughness: 0.75, tex: "fabric", normal: 0.35, roughMap: true });
    const chairDark = mats.standard("#1e293b", { roughness: 0.38, metalness: 0.42 });
    const chromeMat = mats.standard("#e2e8f0", { roughness: 0.14, metalness: 0.94 });
    const stem = new THREE.Mesh(g.chairStem, chromeMat);
    stem.position.y = 0.25;
    stem.castShadow = true;
    chairGroup.add(stem);
    for (let k = 0; k < 5; k++) {
      const a = (k * Math.PI * 2) / 5;
      const arm = new THREE.Mesh(g.starArm, chromeMat);
      arm.position.set(Math.sin(a) * 0.15, 0.065, Math.cos(a) * 0.15);
      arm.rotation.set(Math.cos(a) * 1.42, 0, -Math.sin(a) * 1.42);
      chairGroup.add(arm);
      const wheel = new THREE.Mesh(g.wheel, chairDark);
      wheel.position.set(Math.sin(a) * 0.29, 0.028, Math.cos(a) * 0.29);
      wheel.rotation.z = Math.PI / 2;
      chairGroup.add(wheel);
    }

    const seatMesh = new THREE.Mesh(g.seat, chairMat);
    seatMesh.position.set(0, 0.49, 0.02);
    seatMesh.castShadow = seatMesh.receiveShadow = true;
    swivel.add(seatMesh);

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(g.armPost, chairDark);
      post.position.set(side * 0.31, 0.57, 0.03);
      const pad = new THREE.Mesh(g.armPad, chairDark);
      pad.position.set(side * 0.31, 0.68, -0.02);
      pad.rotation.x = Math.PI / 2;
      swivel.add(post, pad);
    }
    const back = new THREE.Mesh(g.chairBack, chairMat);
    back.position.set(0, 0.84, 0.28);
    back.rotation.x = -0.1;
    back.castShadow = back.receiveShadow = true;
    swivel.add(back);
    const hrest = new THREE.Mesh(g.headrest, chairMat);
    hrest.position.set(0, 1.24, 0.31);
    hrest.rotation.z = Math.PI / 2;
    hrest.castShadow = true;
    swivel.add(hrest);
  }
  return { root, chairGroup, swivel };
}

function attachHeadAccessories(THREE, g, mats, theme, isAgent, season, parent, darkMat, innerMat) {
  let micLed = null;
  if (isAgent) {
    const hsMat = mats.standard("#1f2937", { roughness: 0.35, metalness: 0.45 });
    const band = new THREE.Mesh(g.headband, hsMat);
    band.position.y = 0.065;
    parent.add(band);
    for (const side of [-1, 1]) {
      const cup = new THREE.Mesh(g.earcup, hsMat);
      cup.position.set(side * 0.165, 0.25, 0.005);
      cup.rotation.z = Math.PI / 2;
      const pad = new THREE.Mesh(g.earpad, darkMat);
      pad.position.set(side * 0.15, 0.25, 0.005);
      pad.rotation.y = Math.PI / 2;
      parent.add(cup, pad);
    }
    const boom = new THREE.Mesh(g.micBoom, hsMat);
    boom.position.y = 0.065;
    micLed = new THREE.Mesh(g.micTip, mats.standard(theme.glow, { roughness: 0.2, emissive: theme.glow, emissiveIntensity: 0.65 }));
    micLed.position.set(0.065, 0.18, -0.175);
    parent.add(boom, micLed);
  }
  if (season === "noel") {
    const cuff = new THREE.Mesh(g.noelCuff, innerMat);
    cuff.position.set(0, 0.405, 0.01);
    cuff.rotation.x = Math.PI / 2;
    const cone = new THREE.Mesh(g.noelCone, mats.standard("#dc2626", { roughness: 0.78, tex: "fabric" }));
    cone.position.set(0, 0.56, 0.04);
    cone.rotation.x = 0.18;
    const pom = new THREE.Mesh(g.noelPom, innerMat);
    pom.position.set(0, 0.72, 0.075);
    parent.add(cuff, cone, pom);
  } else if (season === "tet") {
    const cap = new THREE.Mesh(g.tetCap, mats.standard("#dc2626", { roughness: 0.72, tex: "fabric" }));
    cap.position.set(0, 0.415, 0.01);
    const gold = new THREE.Mesh(g.noelPom, mats.standard("#facc15", { roughness: 0.28, metalness: 0.7 }));
    gold.position.set(0, 0.425, -0.145);
    gold.scale.setScalar(0.65);
    parent.add(cap, gold);
  }
  return micLed;
}

export function buildHumanRig(THREE, assets, mats, opts) {
  const { index: i, theme, seat, season, pick } = opts;
  const g = assets.geos;
  const { root, swivel } = buildErgonomicChair(THREE, g, mats, theme, opts.noChair);
  const skinCol = SKIN[i % SKIN.length];
  const hairCol = HAIR[(i * 3) % HAIR.length];
  const irisCol = IRIS[(i * 2) % IRIS.length];
  const outfit = OUTFIT[i % OUTFIT.length];
  const isAgent = Boolean(seat && seat.label);

  const skinMat = mats.physical(skinCol, { roughness: 0.62, metalness: 0.0, sheen: 0.14, sheenRoughness: 0.8, sheenColor: "#d99272" });
  const hairMat = mats.physical(hairCol, { roughness: 0.52, metalness: 0.05, clearcoat: 0.1, sheen: 0.12, tex: "hair", normal: 0.45 });
  const topMat = mats.physical(outfit.top, { roughness: 0.86, metalness: 0.02, sheen: 0.12, sheenRoughness: 0.85 });
  const innerMat = mats.physical(outfit.inner, { roughness: 0.84, metalness: 0.01, sheen: 0.08 });
  const pantsMat = mats.physical(outfit.pants, { roughness: 0.86, metalness: 0.02, sheen: 0.12, sheenRoughness: 0.85 });
  const chromeMat = mats.standard("#e2e8f0", { roughness: 0.14, metalness: 0.94 });
  const shoeMat = mats.physical(i % 2 ? "#1e293b" : "#442c1e", { roughness: 0.34, metalness: 0.06, clearcoat: 0.48 });
  const soleMat = mats.standard("#cbd5e1", { roughness: 0.68, metalness: 0.02 });
  const whiteMat = mats.physical("#ffffff", { roughness: 0.06, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.04 });
  const darkMat = mats.standard("#0f172a", { roughness: 0.2, metalness: 0.15 });
  const lipMat = mats.physical("#bd6960", { roughness: 0.38, clearcoat: 0.3 });

  // ---------------- 2. Cơ thể người ngồi
  const body = new THREE.Group();
  swivel.add(body);

  const hip = new THREE.Mesh(g.hip, pantsMat);
  hip.position.set(0, 0.56, 0.02);
  hip.scale.set(1.12, 0.62, 0.88);
  hip.castShadow = true;
  body.add(hip);

  // Đùi, cẳng chân, giày đế trắng
  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(g.thigh, pantsMat);
    thigh.position.set(side * 0.125, 0.555, -0.22);
    thigh.rotation.x = Math.PI / 2 - 0.05;
    thigh.castShadow = true;
    const shin = new THREE.Mesh(g.shin, pantsMat);
    shin.position.set(side * 0.13, 0.31, -0.44);
    shin.rotation.x = 0.08;
    shin.castShadow = true;
    const shoe = new THREE.Mesh(g.shoe, shoeMat);
    shoe.position.set(side * 0.13, 0.068, -0.52);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.0, 1.0, 0.82);
    shoe.castShadow = true;
    const sole = new THREE.Mesh(g.sole, soleMat);
    sole.position.set(side * 0.13, 0.015, -0.52);
    body.add(thigh, shin, shoe, sole);
  }

  // Thân trên (hô hấp & nghiêng người)
  const chest = new THREE.Group();
  chest.position.set(0, 0.58, 0.03);
  body.add(chest);

  const belt = new THREE.Mesh(g.belt, darkMat);
  belt.position.set(0, 0.025, 0);
  belt.scale.set(1.12, 1, 0.74);
  const buckle = new THREE.Mesh(g.buckle, chromeMat);
  buckle.position.set(0, 0.025, -0.128);
  chest.add(belt, buckle);

  const torso = new THREE.Mesh(g.torso, topMat);
  torso.scale.set(1.12, 1.0, 0.72);
  torso.castShadow = torso.receiveShadow = true;
  chest.add(torso);

  // Cổ áo sơ mi trắng + ve áo vest / cà vạt + thẻ nhân viên (bám sát mặt cong ngực, không cắt xuyên thân)
  const collar = new THREE.Mesh(g.collar, innerMat);
  collar.position.set(0, 0.532, -0.008);
  collar.rotation.x = Math.PI / 2 + 0.12;
  chest.add(collar);
  if (outfit.blazer) {
    const lapelMat = mats.physical(outfit.top, { roughness: 0.78, sheen: 0.45, tex: "fabric" });
    const tieMat = mats.physical(i % 2 ? "#1e3a8a" : "#991b1b", { roughness: 0.35, clearcoat: 0.25 });
    const shirtFront = new THREE.Mesh(g.badge, innerMat);
    shirtFront.position.set(0, 0.42, -0.146);
    shirtFront.rotation.x = -0.12;
    shirtFront.scale.set(1.18, 2.2, 0.8);
    chest.add(shirtFront);
    const tie = new THREE.Mesh(g.tie, tieMat);
    tie.position.set(0, 0.39, -0.155);
    tie.rotation.x = -0.1;
    chest.add(tie);
    for (const side of [-1, 1]) {
      const lp = new THREE.Mesh(g.lapel, lapelMat);
      lp.position.set(side * 0.052, 0.41, -0.15);
      lp.rotation.set(-0.1, side * 0.16, side * -0.2);
      chest.add(lp);
    }
  }
  if (isAgent) {
    const badge = new THREE.Mesh(g.badge, mats.standard(theme.trim, { roughness: 0.32, metalness: 0.25 }));
    badge.position.set(0.098, 0.35, -0.154);
    badge.rotation.set(-0.08, -0.28, 0);
    chest.add(badge);
  }

  // ---------------- 3. Cổ + Đầu điêu khắc + Khuôn mặt biểu cảm + Tóc + Tai nghe
  const head = new THREE.Group();
  head.position.set(0, 0.555, -0.01);
  chest.add(head);

  const neck = new THREE.Mesh(g.neck, skinMat);
  neck.position.set(0, 0.055, 0);
  head.add(neck);

  // Đầu điêu khắc phủ vân da mặt 512px (ửng hồng má, bóng hốc mắt, sống mũi, vi kết cấu da)
  const faceMat = mats.physical("#ffffff", {
    roughness: 0.62, metalness: 0.0, sheen: 0.14, sheenRoughness: 0.8, sheenColor: "#d99272", tex: "face:" + skinCol,
  });
  const skull = new THREE.Mesh(g.head, faceMat);
  skull.position.set(0, 0.085, 0);
  skull.castShadow = skull.receiveShadow = true;
  head.add(skull);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(g.ear, skinMat);
    ear.position.set(side * 0.145, 0.255, 0.008);
    ear.scale.set(0.62, 1.24, 0.85);
    head.add(ear);
  }

  // Mắt có vân mống mắt tỏa tia chi tiết + giác mạc bóng clearcoat + mí mắt chớp + lông mày + môi
  const irisMat = mats.physical("#ffffff", { roughness: 0.06, clearcoat: 1.0, clearcoatRoughness: 0.03, tex: "iris:" + irisCol });
  const eyelids = [];
  const eyeballs = [];
  for (const side of [-1, 1]) {
    const ex = side * 0.052, ey = 0.278, ez = -0.132;
    const eyePivot = new THREE.Group();
    eyePivot.position.set(ex, ey, ez);
    const eye = new THREE.Mesh(g.eye, whiteMat);
    const iris = new THREE.Mesh(g.iris, irisMat);
    iris.position.set(0, 0, -0.0222);
    iris.rotation.y = Math.PI;
    eyePivot.add(eye, iris);
    eyeballs.push(eyePivot);

    const lid = new THREE.Mesh(g.lid, skinMat);
    lid.position.set(ex, ey, ez);
    lid.rotation.x = 0.56;
    eyelids.push(lid);

    const brow = new THREE.Mesh(g.brow, hairMat);
    brow.position.set(ex, ey + 0.04, ez - 0.01);
    brow.rotation.set(0, 0, Math.PI / 2 + side * 0.08);
    head.add(eyePivot, lid, brow);
  }

  const lip = new THREE.Mesh(g.lip, lipMat);
  lip.position.set(0, 0.178, -0.145);
  lip.rotation.z = Math.PI / 2;
  head.add(lip);

  // Kính mắt gọng kim loại thanh mảnh + tròng kính phản chiếu (cho ~1/3 nhân viên)
  if (i % 3 === 0) {
    const frameMat = mats.standard(i % 2 ? "#1e293b" : "#475569", { roughness: 0.22, metalness: 0.85 });
    const lensMat = mats.physical("#e0f2fe", { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.18, depthWrite: false });
    for (const side of [-1, 1]) {
      const rim = new THREE.Mesh(g.glassRim, frameMat);
      rim.position.set(side * 0.054, 0.278, -0.165);
      const lens = new THREE.Mesh(g.glassLens, lensMat);
      lens.position.set(side * 0.054, 0.278, -0.165);
      lens.rotation.y = Math.PI;
      const temple = new THREE.Mesh(g.glassTemple, frameMat);
      temple.position.set(side * 0.118, 0.278, -0.09);
      temple.rotation.set(Math.PI / 2, 0, side * 0.15);
      head.add(rim, lens, temple);
    }
    const bridge = new THREE.Mesh(g.glassBridge, frameMat);
    bridge.position.set(0, 0.282, -0.166);
    bridge.rotation.z = Math.PI / 2;
    head.add(bridge);
  }

  // 6 kiểu tóc tự nhiên ôm trán + tóc mai + nhiều lớp có vân sợi tóc
  const hStyle = i % 6;
  const crown = new THREE.Mesh(g.hairCrown, hairMat);
  crown.position.set(0, 0.33, -0.002);
  crown.scale.set(1.01, 0.92, 1.06);
  crown.castShadow = true;
  head.add(crown);

  // Tóc mái uốn lượn điêu khắc từng lọn + tóc mai hai bên thái dương
  const fringe = new THREE.Mesh(g.hairFringe, hairMat);
  fringe.position.set(hStyle % 2 ? -0.02 : 0.02, 0.375, -0.106);
  fringe.rotation.set(0.18, hStyle % 2 ? 0.15 : -0.15, Math.PI / 2 + (hStyle % 2 ? 0.14 : -0.14));
  fringe.scale.set(1.0, 1.05, 0.85);
  fringe.castShadow = true;
  head.add(fringe);

  for (let l = 0; l < 3; l++) {
    const lock = new THREE.Mesh(g.hairLock, hairMat);
    lock.position.set((l - 1) * 0.045, 0.378 + (l === 1 ? 0.015 : 0), -0.088);
    lock.rotation.set(0.1, (hStyle % 2 ? 1 : -1) * 0.25 + (l - 1) * 0.22, (l - 1) * 0.12);
    lock.castShadow = true;
    head.add(lock);
  }

  for (const side of [-1, 1]) {
    const sb = new THREE.Mesh(g.hairSide, hairMat);
    sb.position.set(side * 0.132, 0.305, -0.042);
    sb.rotation.set(0.15, 0, side * -0.12);
    head.add(sb);
  }

  if (hStyle === 0 || hStyle === 1 || hStyle === 4) {
    const quiff = new THREE.Mesh(g.hairQuiff, hairMat);
    quiff.position.set(hStyle === 1 ? -0.03 : 0.03, 0.415, -0.055);
    quiff.scale.set(1.12, 0.56, 0.96);
    quiff.castShadow = true;
    head.add(quiff);
  }
  if (hStyle === 2 || hStyle === 4) {
    const drape = new THREE.Mesh(g.hairBack, hairMat);
    drape.position.set(0, 0.205, 0.085);
    drape.scale.set(1.04, 1.02, 0.68);
    drape.castShadow = true;
    head.add(drape);
  } else if (hStyle === 3) {
    const bun = new THREE.Mesh(g.hairBun, hairMat);
    bun.position.set(0, 0.34, 0.175);
    head.add(bun);
  } else if (hStyle === 5) {
    for (let c = 0; c < 4; c++) {
      const puff = new THREE.Mesh(g.hairBun, hairMat);
      puff.position.set((c - 1.5) * 0.065, 0.42 + (c % 2) * 0.015, -0.03 + (c % 2) * 0.04);
      head.add(puff);
    }
  }

  const micLed = attachHeadAccessories(THREE, g, mats, theme, isAgent, season, head, darkMat, innerMat);

  // ---------------- 4. Hai cánh tay khớp khuỷu (bờ vai tròn mượt → cánh tay trên → khuỷu → cẳng tay → bàn tay)
  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.225, 0.475, -0.01);
    chest.add(shoulder);

    const cap = new THREE.Mesh(g.shoulderCap, topMat);
    cap.scale.set(1.05, 0.96, 1.02);
    cap.castShadow = true;
    shoulder.add(cap);

    const upper = new THREE.Mesh(g.upperArm, topMat);
    upper.position.set(side * 0.015, -0.14, -0.06);
    upper.rotation.x = 0.42;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.25, -0.13);
    shoulder.add(elbow);

    const fore = new THREE.Mesh(g.forearm, outfit.blazer ? topMat : skinMat);
    fore.position.set(0, -0.04, -0.16);
    fore.rotation.x = Math.PI / 2 - 0.22;
    fore.castShadow = true;
    elbow.add(fore);

    if (outfit.blazer) {
      const cuff = new THREE.Mesh(g.watch, innerMat);
      cuff.position.set(0, -0.068, -0.275);
      cuff.scale.set(1.05, 1.05, 1.6);
      elbow.add(cuff);
    } else if (side < 0) {
      const watch = new THREE.Mesh(g.watch, chromeMat);
      watch.position.set(0, -0.065, -0.26);
      elbow.add(watch);
    }

    // Bàn tay có lòng bàn tay + 4 ngón tay hơi khum & ngón cái đặt tự nhiên lên bàn phím
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.072, -0.305);
    const palm = new THREE.Mesh(g.hand, skinMat);
    palm.scale.set(0.96, 0.56, 1.12);
    palm.castShadow = true;
    handGroup.add(palm);
    for (let f = 0; f < 4; f++) {
      const fin = new THREE.Mesh(g.finger, skinMat);
      fin.position.set((f - 1.5) * 0.018, -0.01, -0.048);
      fin.rotation.x = Math.PI / 2 + 0.32;
      handGroup.add(fin);
    }
    const thumb = new THREE.Mesh(g.finger, skinMat);
    thumb.position.set(-side * 0.036, -0.008, -0.018);
    thumb.rotation.set(Math.PI / 2 + 0.1, 0, side * 0.55);
    handGroup.add(thumb);
    elbow.add(handGroup);

    return { shoulder, elbow };
  }

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  tagPick(root, pick);
  return { root, swivel, body, chest, head, eyelids, eyeballs, leftArm, rightArm, micLed, index: i, state: seat ? seat.state : "idle" };
}

export function animateHumanRig(rig, t, motion, state) {
  const i = rig.index;
  const st = state || rig.state;
  const busy = st === "work" || st === "npc";
  if (!motion) {
    rig.chest.scale.y = 1;
    rig.chest.rotation.set(0.05, 0, 0);
    rig.body.position.set(0, 0, 0);
    rig.head.rotation.set(0.06, 0, 0);
    rig.swivel.rotation.y = 0;
    for (const lid of rig.eyelids) lid.rotation.x = 0.56;
    rig.leftArm.shoulder.rotation.set(0.18, 0, 0.08);
    rig.leftArm.elbow.rotation.set(0.05, 0.12, 0);
    if (st === "wait") {
      rig.rightArm.shoulder.rotation.set(2.35, 0, -0.26);
      rig.rightArm.elbow.rotation.set(-0.32, 0, 0);
    } else if (st === "done") {
      rig.leftArm.shoulder.rotation.set(2.25, 0, 0.32);
      rig.rightArm.shoulder.rotation.set(2.25, 0, -0.32);
    } else {
      rig.rightArm.shoulder.rotation.set(0.18, 0, -0.08);
      rig.rightArm.elbow.rotation.set(0.05, -0.12, 0);
    }
    return;
  }

  // Nhịp thở nhẹ tự nhiên
  rig.chest.scale.y = 1 + Math.sin(t * 2.1 + i * 1.3) * 0.018;

  // Chớp mắt tự nhiên (mỗi ~4 giây chớp một nhịp 0.14s) + ánh mắt liếc nhẹ qua lại giữa 2 màn hình
  const blinkPhase = (t + i * 1.37) % 4.1;
  const blink = blinkPhase < 0.14 ? Math.sin((blinkPhase / 0.14) * Math.PI) : 0;
  for (const lid of rig.eyelids) lid.rotation.x = 0.56 - blink * 0.84;
  if (rig.eyeballs) {
    const gaze = Math.sin(t * 1.3 + i * 2.1) * 0.18;
    for (const eb of rig.eyeballs) eb.rotation.y = gaze;
  }

  // Tư thế & chuyển động theo trạng thái
  if (st === "wait") {
    rig.body.position.set(0, 0, 0);
    rig.swivel.rotation.y = Math.sin(t * 1.2 + i) * 0.06;
    rig.chest.rotation.set(0, 0, 0);
    rig.head.rotation.set(-0.04, Math.sin(t * 1.6) * 0.18, Math.sin(t * 2.0) * 0.06);
    rig.leftArm.shoulder.rotation.set(0.16, 0, 0.1);
    rig.leftArm.elbow.rotation.set(0.06, 0.12, 0);
    rig.rightArm.shoulder.rotation.set(2.35, 0, -0.22 + Math.sin(t * 5.2) * 0.16);
    rig.rightArm.elbow.rotation.set(-0.28 + Math.sin(t * 5.2 + 0.6) * 0.18, 0, 0);
  } else if (st === "done") {
    rig.body.position.set(0, Math.abs(Math.sin(t * 4.2)) * 0.09, 0);
    rig.swivel.rotation.y = Math.sin(t * 2.2) * 0.1;
    rig.chest.rotation.set(-0.06, 0, 0);
    rig.head.rotation.set(-0.08, Math.sin(t * 2.5) * 0.14, 0);
    const cheer = Math.sin(t * 7.5) * 0.14;
    rig.leftArm.shoulder.rotation.set(2.25 + cheer, 0, 0.34);
    rig.leftArm.elbow.rotation.set(-0.25, 0, 0);
    rig.rightArm.shoulder.rotation.set(2.25 - cheer, 0, -0.34);
    rig.rightArm.elbow.rotation.set(-0.25, 0, 0);
  } else if (st === "fail") {
    rig.body.position.set(Math.sin(t * 24) * 0.012, 0, 0);
    rig.swivel.rotation.y = 0;
    rig.chest.rotation.set(0.14, 0, 0);
    rig.head.rotation.set(0.1, Math.sin(t * 6.5) * 0.14, Math.sin(t * 3.5) * 0.04);
    const fast = Math.sin(t * 16 + i) * 0.09;
    rig.leftArm.shoulder.rotation.set(0.24, 0, 0.06);
    rig.leftArm.elbow.rotation.set(fast, 0.15, 0);
    rig.rightArm.shoulder.rotation.set(0.24, 0, -0.06);
    rig.rightArm.elbow.rotation.set(-fast, -0.15, 0);
  } else if (busy) {
    rig.body.position.set(0, 0, 0);
    rig.swivel.rotation.y = Math.sin(t * 0.7 + i) * 0.035;
    rig.chest.rotation.set(0.08 + Math.sin(t * 1.8 + i) * 0.02, 0, 0);
    rig.head.rotation.set(0.08 + Math.sin(t * 2.4 + i) * 0.04, Math.sin(t * 0.9 + i * 2.1) * 0.18, 0);
    const tap = Math.sin(t * 11.5 + i * 1.7) * 0.075;
    const useMouse = Math.sin(t * 0.45 + i) > 0.35;
    rig.leftArm.shoulder.rotation.set(0.2, 0, 0.08);
    rig.leftArm.elbow.rotation.set(tap, 0.16, 0);
    rig.rightArm.shoulder.rotation.set(0.2, useMouse ? -0.18 : 0, -0.08);
    rig.rightArm.elbow.rotation.set(useMouse ? Math.sin(t * 3.5 + i) * 0.03 : -tap, useMouse ? -0.22 + Math.sin(t * 2.8 + i) * 0.08 : -0.16, 0);
  } else {
    rig.body.position.set(0, 0, 0);
    rig.swivel.rotation.y = Math.sin(t * 0.45 + i * 1.9) * 0.08;
    rig.chest.rotation.set(0.02, 0, 0);
    rig.head.rotation.set(0.03, Math.sin(t * 0.55 + i * 2.7) * 0.24, Math.sin(t * 0.4 + i) * 0.03);
    rig.leftArm.shoulder.rotation.set(0.14, 0, 0.1);
    rig.leftArm.elbow.rotation.set(0.04, 0.1, 0);
    rig.rightArm.shoulder.rotation.set(0.14, 0, -0.1);
    rig.rightArm.elbow.rotation.set(0.04, -0.1, 0);
  }
}

// ---------------------------------------------------------------- Nhân viên đứng trò chuyện & đi dạo tự nhiên trong khuôn viên
export function buildWalkerRig(THREE, assets, mats, opts) {
  const { index: i, path, x = 0, z = 0, rotY = 0, holdCup = false, speed = 0.72 } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = rotY;

  const skinCol = SKIN[i % SKIN.length];
  const hairCol = opts.hair || HAIR[(i * 3 + 1) % HAIR.length];
  const irisCol = IRIS[(i * 2 + 1) % IRIS.length];
  const outfit = opts.outfit || OUTFIT[(i + 2) % OUTFIT.length];

  const skinMat = mats.physical(skinCol, { roughness: 0.62, sheen: 0.14, sheenRoughness: 0.8, sheenColor: "#d99272" });
  const faceMat = mats.physical("#ffffff", { roughness: 0.62, sheen: 0.14, sheenRoughness: 0.8, sheenColor: "#d99272", tex: "face:" + skinCol });
  const hairMat = mats.physical(hairCol, { roughness: 0.52, metalness: 0.05, clearcoat: 0.1, sheen: 0.12, tex: "hair", normal: 0.45 });
  const topMat = mats.physical(outfit.top, { roughness: 0.86, metalness: 0.02, sheen: 0.12, sheenRoughness: 0.85 });
  const innerMat = mats.physical(outfit.inner, { roughness: 0.84, metalness: 0.01, sheen: 0.08 });
  const pantsMat = mats.physical(outfit.pants, { roughness: 0.86, metalness: 0.02, sheen: 0.12, sheenRoughness: 0.85 });
  const shoeMat = mats.physical(i % 2 ? "#1e293b" : "#442c1e", { roughness: 0.34, clearcoat: 0.48 });
  const soleMat = mats.standard("#cbd5e1", { roughness: 0.68 });
  const whiteMat = mats.physical("#ffffff", { roughness: 0.06, clearcoat: 1.0 });
  const irisMat = mats.physical("#ffffff", { roughness: 0.06, clearcoat: 1.0, tex: "iris:" + irisCol });
  const lipMat = mats.physical("#bd6960", { roughness: 0.38, clearcoat: 0.3 });

  const sh = new THREE.Mesh(g.shadowDisc, mats.shadow());
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.018;
  sh.scale.setScalar(0.85);
  root.add(sh);

  const body = new THREE.Group();
  body.position.y = 0.835;
  root.add(body);

  const hip = new THREE.Mesh(g.hip, pantsMat);
  hip.scale.set(1.06, 0.65, 0.84);
  hip.castShadow = true;
  body.add(hip);

  // Hai chân đứng khớp hông (xoay bước đi tự nhiên)
  const makeLeg = (side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.115, -0.02, 0);
    body.add(leg);
    const thigh = new THREE.Mesh(g.thigh, pantsMat);
    thigh.position.set(0, -0.22, 0);
    thigh.castShadow = true;
    const shin = new THREE.Mesh(g.shin, pantsMat);
    shin.position.set(0, -0.54, 0);
    shin.castShadow = true;
    const shoe = new THREE.Mesh(g.shoe, shoeMat);
    shoe.position.set(0, -0.75, -0.05);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(0.95, 0.95, 0.82);
    shoe.castShadow = true;
    const sole = new THREE.Mesh(g.sole, soleMat);
    sole.position.set(0, -0.805, -0.05);
    leg.add(thigh, shin, shoe, sole);
    return leg;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const chest = new THREE.Group();
  chest.position.y = 0.04;
  body.add(chest);
  const torso = new THREE.Mesh(g.torso, topMat);
  torso.scale.set(1.08, 1.0, 0.72);
  torso.castShadow = torso.receiveShadow = true;
  const collar = new THREE.Mesh(g.collar, innerMat);
  collar.position.set(0, 0.532, -0.008);
  collar.rotation.x = Math.PI / 2 + 0.12;
  chest.add(torso, collar);

  const head = new THREE.Group();
  head.position.set(0, 0.555, -0.01);
  chest.add(head);
  const neck = new THREE.Mesh(g.neck, skinMat);
  neck.position.y = 0.055;
  const skull = new THREE.Mesh(g.head, faceMat);
  skull.position.y = 0.085;
  skull.castShadow = true;
  head.add(neck, skull);

  const eyelids = [];
  for (const side of [-1, 1]) {
    const ex = side * 0.052, ey = 0.278, ez = -0.132;
    const eye = new THREE.Mesh(g.eye, whiteMat);
    eye.position.set(ex, ey, ez);
    const iris = new THREE.Mesh(g.iris, irisMat);
    iris.position.set(ex, ey, ez - 0.0222);
    iris.rotation.y = Math.PI;
    const lid = new THREE.Mesh(g.lid, skinMat);
    lid.position.set(ex, ey, ez);
    lid.rotation.x = 0.56;
    eyelids.push(lid);
    const brow = new THREE.Mesh(g.brow, hairMat);
    brow.position.set(ex, ey + 0.04, ez - 0.01);
    brow.rotation.set(0, 0, Math.PI / 2 + side * 0.08);
    head.add(eye, iris, lid, brow);
  }
  const lip = new THREE.Mesh(g.lip, lipMat);
  lip.position.set(0, 0.178, -0.145);
  lip.rotation.z = Math.PI / 2;
  head.add(lip);

  const crown = new THREE.Mesh(g.hairCrown, hairMat);
  crown.position.set(0, 0.33, -0.002);
  crown.scale.set(1.01, 0.92, 1.06);
  crown.castShadow = true;
  const fringe = new THREE.Mesh(g.hairFringe, hairMat);
  fringe.position.set(i % 2 ? -0.02 : 0.02, 0.375, -0.106);
  fringe.rotation.set(0.18, i % 2 ? 0.15 : -0.15, Math.PI / 2 + (i % 2 ? 0.14 : -0.14));
  head.add(crown, fringe);
  if (i % 2 === 1) {
    const drape = new THREE.Mesh(g.hairBack, hairMat);
    drape.position.set(0, 0.21, 0.085);
    drape.scale.set(1.04, 1.0, 0.66);
    head.add(drape);
  }

  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.22, 0.47, -0.01);
    chest.add(arm);
    const cap = new THREE.Mesh(g.shoulderCap, topMat);
    const upper = new THREE.Mesh(g.upperArm, topMat);
    upper.position.set(side * 0.01, -0.14, 0);
    upper.castShadow = true;
    const fore = new THREE.Mesh(g.forearm, outfit.blazer ? topMat : skinMat);
    fore.position.set(side * 0.01, -0.37, -0.03);
    fore.rotation.x = 0.22;
    fore.castShadow = true;
    const hand = new THREE.Mesh(g.hand, skinMat);
    hand.position.set(side * 0.01, -0.51, -0.06);
    arm.add(cap, upper, fore, hand);
    if (holdCup && side > 0) {
      const cup = new THREE.Mesh(g.neck, mats.physical("#d6d3d1", { roughness: 0.22, clearcoat: 0.65 }));
      cup.position.set(0.01, -0.5, -0.14);
      cup.scale.set(0.8, 0.9, 0.8);
      arm.add(cup);
    }
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  if (holdCup && !opts.parcel) {
    /* Đã thêm cốc cà phê trên tay phải ở vòng makeArm */
  } else if (opts.parcel) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.22, 0.28),
      mats.standard("#c89d66", { roughness: 0.84 }),
    );
    box.position.set(0, 0.95, -0.26);
    box.castShadow = true;
    root.add(box);
  }

  return { root, body, chest, head, eyelids, leftLeg, rightLeg, leftArm, rightArm, path: path || null, speed, holdCup, index: i };
}

export function animateWalkerRig(w, t, motion) {
  const i = w.index;
  if (!motion) {
    w.body.position.y = 0.835;
    w.leftLeg.rotation.x = w.rightLeg.rotation.x = 0;
    w.leftArm.rotation.x = 0.08;
    w.rightArm.rotation.x = w.holdCup ? 0.65 : 0.08;
    w.head.rotation.set(0, 0, 0);
    for (const lid of w.eyelids) lid.rotation.x = 0.56;
    return;
  }

  const blinkPhase = (t + i * 1.7) % 4.3;
  const blink = blinkPhase < 0.14 ? Math.sin((blinkPhase / 0.14) * Math.PI) : 0;
  for (const lid of w.eyelids) lid.rotation.x = 0.56 - blink * 0.84;
  w.chest.scale.y = 1 + Math.sin(t * 2.2 + i) * 0.016;

  if (w.path && w.path.length >= 2) {
    // Đi bộ tuần hoàn mượt qua các điểm mốc (dọc sân vườn hồ bơi / hành lang)
    const segs = w.path.length;
    let total = 0;
    const lens = [];
    for (let k = 0; k < segs; k++) {
      const a = w.path[k], b = w.path[(k + 1) % segs];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      lens.push(d);
      total += d;
    }
    let dist = (t * w.speed + i * 3.1) % total;
    let seg = 0;
    while (seg < segs - 1 && dist > lens[seg]) {
      dist -= lens[seg];
      seg++;
    }
    const a = w.path[seg], b = w.path[(seg + 1) % segs];
    const u = lens[seg] > 1e-4 ? dist / lens[seg] : 0;
    const px = a[0] + (b[0] - a[0]) * u;
    const pz = a[1] + (b[1] - a[1]) * u;
    w.root.position.set(px, 0, pz);
    // Xoay mượt hướng đi ở các góc cua (không giật đột ngột)
    const targetYaw = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
    let diff = targetYaw - w.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    w.root.rotation.y += diff * 0.18;

    const stride = Math.sin(t * 5.4 + i);
    w.body.position.y = 0.835 + Math.abs(Math.cos(t * 5.4 + i)) * 0.032;
    w.leftLeg.rotation.x = stride * 0.42;
    w.rightLeg.rotation.x = -stride * 0.42;
    w.leftArm.rotation.x = -stride * 0.34;
    w.rightArm.rotation.x = w.holdCup ? 0.65 + stride * 0.06 : stride * 0.34;
    w.head.rotation.set(0, Math.sin(t * 0.9 + i) * 0.14, 0);
  } else {
    // Đứng trò chuyện tự nhiên tại quầy Pantry / Sảnh
    w.body.position.y = 0.835;
    w.leftLeg.rotation.x = w.rightLeg.rotation.x = 0;
    w.head.rotation.set(Math.sin(t * 1.4 + i) * 0.05, Math.sin(t * 0.8 + i * 2) * 0.2, 0);
    w.leftArm.rotation.x = 0.12 + Math.sin(t * 2.1 + i) * 0.12;
    w.rightArm.rotation.x = w.holdCup ? 0.68 + Math.sin(t * 1.2 + i) * 0.08 : 0.14 - Math.sin(t * 1.8 + i) * 0.1;
  }
}

// ---------------------------------------------------------------- Nhân vật 3D HD Ready Player Me + Motion Capture (tự quay mặt hướng -Z)
const HD_SHADOW_GEO = { geo: null };

export function buildHDHuman(THREE, hdAssets, mats, opts = {}) {
  if (!hdAssets) return null;
  const variant = opts.variant || ((opts.index || 0) % 2 === 0 ? "rpm_a" : "rpm_b");
  const parsed = hdAssets.get(variant === "rpm_b" ? "human_rpm_b" : "human_rpm_a")
    || hdAssets.get("human_rpm_a")
    || hdAssets.get("human_rpm_b");
  if (!parsed) return null;

  const inst = instantiateGLB(THREE, parsed, { targetHeight: opts.height || 1.74, rotY: Math.PI });
  if (opts.topColor || opts.bottomColor) {
    inst.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mn = o.material.name || "";
      if (mn === "Wolf3D_Outfit_Top" && opts.topColor) {
        const m = o.material.clone();
        m.color.set(opts.topColor);
        if (variant === "rpm_a") m.map = null;
        m.needsUpdate = true;
        mats.own(m);
        o.material = m;
      } else if (mn === "Wolf3D_Outfit_Bottom" && opts.bottomColor) {
        const m = o.material.clone();
        m.color.set(opts.bottomColor);
        if (variant === "rpm_a") m.map = null;
        m.needsUpdate = true;
        mats.own(m);
        o.material = m;
      }
    });
  }

  const bones = {};
  inst.root.traverse((o) => {
    if (o.name) bones[o.name] = o;
    if (o.isSkinnedMesh) o.frustumCulled = false;
  });

  if (!HD_SHADOW_GEO.geo) HD_SHADOW_GEO.geo = new THREE.PlaneGeometry(0.95, 0.95);
  const sh = new THREE.Mesh(HD_SHADOW_GEO.geo, mats.shadow());
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.016;
  inst.group.add(sh);

  let parcelGroup = null;
  if (opts.parcel) {
    parcelGroup = new THREE.Group();
    parcelGroup.position.set(0.24, 0.88, -0.14);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.22, 0.26),
      mats.standard("#c89d66", { roughness: 0.84 }),
    );
    box.castShadow = true;
    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(0.284, 0.025, 0.06),
      mats.standard("#fef3c7", { roughness: 0.45 }),
    );
    tape.position.set(0, 0.112, 0);
    parcelGroup.add(box, tape);
    inst.group.add(parcelGroup);
  }

  let cupGroup = null;
  if (opts.holdCup) {
    cupGroup = new THREE.Group();
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.038, 0.105, 12),
      mats.physical("#f8fafc", { roughness: 0.18, clearcoat: 0.8 }),
    );
    const coffee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.012, 10),
      mats.standard("#4a2c18", { roughness: 0.22 }),
    );
    coffee.position.y = 0.048;
    cupGroup.add(mug, coffee);
    if (bones.RightHand) {
      cupGroup.position.set(0, 0.07, 0.04);
      bones.RightHand.add(cupGroup);
    } else {
      cupGroup.position.set(0.18, 1.08, -0.26);
      inst.group.add(cupGroup);
    }
  }

  const mixer = new THREE.AnimationMixer(inst.root);
  const actions = {};
  const clips = {
    walk: hdAssets.get(opts.femaleWalk ? "anim_walk_f" : "anim_walk_m") || hdAssets.get("anim_walk_m"),
    idle: hdAssets.get("anim_idle_m"),
    talk: hdAssets.get("anim_talk"),
  };
  for (const [k, cp] of Object.entries(clips)) {
    const clip = cp ? bindAnimationClip(THREE, cp, inst.root, { inPlace: true, name: `hd_${k}` }) : null;
    if (clip) actions[k] = mixer.clipAction(clip);
  }
  const initKey = actions[opts.mode || "idle"] ? (opts.mode || "idle") : (actions.idle ? "idle" : Object.keys(actions)[0]);
  if (initKey && actions[initKey]) {
    actions[initKey].play();
    mixer.setTime((opts.phase || ((opts.index || 0) * 0.73)) % 2.4);
  }

  inst.group.position.set(opts.x || 0, 0, opts.z || 0);
  if (opts.rotY) inst.group.rotation.y = opts.rotY;

  return {
    root: inst.group,
    meshRoot: inst.root,
    bones,
    parcelGroup,
    cupGroup,
    carryingParcel: Boolean(opts.parcel),
    holdingCup: Boolean(opts.holdCup),
    lookAround: false,
    isHD: true,
    mixer,
    actions,
    curMode: initKey || "",
    path: opts.path || null,
    speed: opts.speed || 0.78,
    index: opts.index || 0,
  };
}

export function setHDHumanMode(h, mode) {
  if (!h || !h.actions) return;
  const nextKey = h.actions[mode] ? mode : (h.actions.idle ? "idle" : Object.keys(h.actions)[0]);
  if (!nextKey || nextKey === h.curMode) return;
  const prev = h.curMode ? h.actions[h.curMode] : null;
  const next = h.actions[nextKey];
  if (prev) prev.fadeOut(0.22);
  next.reset().fadeIn(0.22).play();
  h.curMode = nextKey;
}

const _postQ = { v: null };
const _postAxis = { v: null };
function nudgeLocalBone(bone, ax, ay, az, angle) {
  if (!bone || !angle) return;
  if (!_postQ.v) {
    _postQ.v = bone.quaternion.clone();
    _postAxis.v = bone.position.clone();
  }
  _postAxis.v.set(ax, ay, az).normalize();
  _postQ.v.setFromAxisAngle(_postAxis.v, angle);
  bone.quaternion.multiply(_postQ.v);
}

export function animateHDHuman(h, t, dt, motion, modeOverride, speedScale = 1) {
  if (!h || !h.mixer) return;
  if (h.parcelGroup) h.parcelGroup.visible = Boolean(h.carryingParcel);
  if (h.cupGroup) h.cupGroup.visible = Boolean(h.holdingCup);

  if (!motion) {
    setHDHumanMode(h, modeOverride || "idle");
    h.mixer.update(0);
    return;
  }
  if (h.path && h.path.length >= 2) {
    const segs = h.path.length;
    let total = 0;
    const lens = [];
    for (let k = 0; k < segs; k++) {
      const a = h.path[k], b = h.path[(k + 1) % segs];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      lens.push(d);
      total += d;
    }
    let dist = (t * h.speed + h.index * 3.1) % total;
    let seg = 0;
    while (seg < segs - 1 && dist > lens[seg]) {
      dist -= lens[seg];
      seg++;
    }
    const a = h.path[seg], b = h.path[(seg + 1) % segs];
    const u = lens[seg] > 1e-4 ? dist / lens[seg] : 0;
    h.root.position.set(a[0] + (b[0] - a[0]) * u, 0, a[1] + (b[1] - a[1]) * u);
    const targetYaw = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1]));
    let diff = targetYaw - h.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    h.root.rotation.y += diff * 0.18;
    setHDHumanMode(h, "walk");
    h.mixer.update(dt * Math.max(0.55, Math.min(1.5, h.speed / 1.32)));
  } else {
    const targetMode = modeOverride || h.curMode || "idle";
    setHDHumanMode(h, targetMode);
    const rate = targetMode === "walk" ? Math.max(0.55, Math.min(1.65, speedScale)) : 1.0;
    h.mixer.update(dt * rate);
  }

  // Nhịp đạo cụ tự nhiên & ngoái nhìn quanh nhẹ (không ghi đè Euler xương tay làm vặn khớp Ready Player Me!)
  const b = h.bones;
  if (h.carryingParcel && h.parcelGroup) {
    const bob = h.curMode === "walk" ? Math.sin(t * 7.0 + h.index) * 0.018 : Math.sin(t * 2.0 + h.index) * 0.005;
    h.parcelGroup.position.y = 0.88 + bob;
  }
  if (b && h.lookAround && h.curMode !== "walk" && b.Head) {
    nudgeLocalBone(b.Head, 0, 1, 0, Math.sin(t * 0.65 + h.index * 1.9) * 0.24);
  }
}

// ---------------------------------------------------------------- Nhân vật văn phòng Ready Player Me ngồi ghế công thái học / phòng họp / giám đốc
const _qParent = { v: null };
const _qDelta = { v: null };
const _qInv = { v: null };
const _axVec = { v: null };

function rotateBoneWorld(THREE, bone, ax, ay, az, angle) {
  if (!bone || !bone.parent) return;
  if (!_qParent.v) {
    _qParent.v = new THREE.Quaternion();
    _qDelta.v = new THREE.Quaternion();
    _qInv.v = new THREE.Quaternion();
    _axVec.v = new THREE.Vector3();
  }
  bone.parent.getWorldQuaternion(_qParent.v);
  _axVec.v.set(ax, ay, az).normalize();
  _qDelta.v.setFromAxisAngle(_axVec.v, angle);
  _qInv.v.copy(_qParent.v).invert();
  bone.quaternion.premultiply(_qParent.v).premultiply(_qDelta.v).premultiply(_qInv.v);
}

function worldAxisToLocal(THREE, bone, ax, ay, az) {
  const qW = new THREE.Quaternion();
  bone.getWorldQuaternion(qW);
  return new THREE.Vector3(ax, ay, az).normalize().applyQuaternion(qW.invert()).normalize();
}

export function buildSeatedHDHuman(THREE, assets, hdAssets, mats, opts = {}) {
  const parsed = hdAssets && hdAssets.get("human_rpm_a");
  if (!parsed) return null;

  const { index: i = 0, theme, seat, season, pick } = opts;
  const g = assets.geos;
  const { root, swivel } = buildErgonomicChair(THREE, g, mats, theme, opts.noChair);
  const outfit = OUTFIT[i % OUTFIT.length];
  const hairCol = HAIR[(i * 3) % HAIR.length];
  const isAgent = Boolean(seat && seat.label);

  // Dựng ở rotY = 0 (mặt hướng +Z, trái +X, trên +Y) để căn khớp xương ngồi chuẩn xác trước khi xoay về -Z
  const inst = instantiateGLB(THREE, parsed, { targetHeight: 1.72, rotY: 0, centerXZ: false, groundY: false });
  inst.root.position.set(0, 0, 0);

  const bones = {};
  inst.root.traverse((o) => {
    if (o.name) bones[o.name] = o;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    if (!o.isMesh || !o.material) return;
    const mn = o.material.name || "";
    if (mn === "Wolf3D_Outfit_Top" || mn === "Wolf3D_Outfit_Bottom" || mn === "Wolf3D_Hair") {
      const m = o.material.clone();
      if (mn === "Wolf3D_Outfit_Top") {
        m.color.set(outfit.top);
        m.roughness = 0.84;
      } else if (mn === "Wolf3D_Outfit_Bottom") {
        m.color.set(outfit.pants);
        m.roughness = 0.86;
      } else {
        m.color.set(hairCol);
      }
      m.map = null;
      m.needsUpdate = true;
      mats.own(m);
      o.material = m;
    }
  });

  if (bones.Hips) {
    bones.Hips.position.y = 0.595;
    bones.Hips.position.z = -0.02;
  }
  inst.root.updateMatrixWorld(true);

  if (bones.LeftUpLeg) {
    rotateBoneWorld(THREE, bones.LeftUpLeg, -1, 0, 0, 1.50);
    rotateBoneWorld(THREE, bones.LeftUpLeg, 0, 1, 0, 0.06);
  }
  if (bones.RightUpLeg) {
    rotateBoneWorld(THREE, bones.RightUpLeg, -1, 0, 0, 1.50);
    rotateBoneWorld(THREE, bones.RightUpLeg, 0, 1, 0, -0.06);
  }
  inst.root.updateMatrixWorld(true);

  if (bones.LeftLeg) rotateBoneWorld(THREE, bones.LeftLeg, 1, 0, 0, 1.46);
  if (bones.RightLeg) rotateBoneWorld(THREE, bones.RightLeg, 1, 0, 0, 1.46);
  if (bones.Spine) rotateBoneWorld(THREE, bones.Spine, 1, 0, 0, 0.06);
  if (bones.Spine1) rotateBoneWorld(THREE, bones.Spine1, 1, 0, 0, 0.04);
  inst.root.updateMatrixWorld(true);

  if (bones.LeftArm) {
    rotateBoneWorld(THREE, bones.LeftArm, 0, 0, -1, 0.58);
    rotateBoneWorld(THREE, bones.LeftArm, -1, 0, 0, 0.42);
  }
  if (bones.RightArm) {
    rotateBoneWorld(THREE, bones.RightArm, 0, 0, 1, 0.58);
    rotateBoneWorld(THREE, bones.RightArm, -1, 0, 0, 0.42);
  }
  inst.root.updateMatrixWorld(true);

  if (bones.LeftForeArm) {
    rotateBoneWorld(THREE, bones.LeftForeArm, -1, 0, 0, 1.12);
    rotateBoneWorld(THREE, bones.LeftForeArm, 0, -1, 0, 0.22);
  }
  if (bones.RightForeArm) {
    rotateBoneWorld(THREE, bones.RightForeArm, -1, 0, 0, 1.12);
    rotateBoneWorld(THREE, bones.RightForeArm, 0, 1, 0, 0.22);
  }
  inst.root.updateMatrixWorld(true);

  const animBones = {};
  for (const name of ["Spine1", "Head", "LeftArm", "RightArm", "LeftForeArm", "RightForeArm"]) {
    const b = bones[name];
    if (!b) continue;
    animBones[name] = {
      bone: b,
      baseQ: b.quaternion.clone(),
      pitchAxis: worldAxisToLocal(THREE, b, 1, 0, 0),
      yawAxis: worldAxisToLocal(THREE, b, 0, 1, 0),
      rollAxis: worldAxisToLocal(THREE, b, 0, 0, 1),
    };
  }

  let micLed = null;
  if (bones.Head && (isAgent || season === "noel" || season === "tet")) {
    const qHeadW = new THREE.Quaternion();
    bones.Head.getWorldQuaternion(qHeadW);
    const qInvHead = qHeadW.clone().invert();
    const headMount = new THREE.Group();
    headMount.quaternion.copy(qInvHead).multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
    );
    headMount.position.set(0, -0.055, 0.025).applyQuaternion(qInvHead);
    headMount.scale.setScalar(0.58);
    const darkMat = mats.standard("#0f172a", { roughness: 0.2, metalness: 0.15 });
    const innerMat = mats.physical(outfit.inner, { roughness: 0.84, metalness: 0.01, sheen: 0.08 });
    micLed = attachHeadAccessories(THREE, g, mats, theme, isAgent, season, headMount, darkMat, innerMat);
    bones.Head.add(headMount);
  }

  // Xoay cả nhân vật ngồi quay mặt về hướng -Z (về phía màn hình & bàn phím)
  inst.root.rotation.y = Math.PI;
  inst.root.position.z = 0.04;
  swivel.add(inst.group);

  tagPick(root, pick);
  return {
    root,
    swivel,
    isHDSeated: true,
    animBones,
    micLed,
    index: i,
    role: opts.role || (isAgent ? "agent" : "desk"),
    meetingIdx: opts.meetingIdx !== undefined ? opts.meetingIdx : -1,
    state: seat ? seat.state : "idle",
  };
}

// Người lái mô tô / xe tay ga chuẩn Ready Player Me HD ngồi đúng tư thế tay nắm ghi-đông & đội mũ bảo hiểm
export function buildMotoHDHuman(THREE, hdAssets, mats, opts = {}) {
  const parsed = hdAssets && (hdAssets.get("human_rpm_a") || hdAssets.get("human_rpm_b"));
  if (!parsed) return null;
  const scooter = Boolean(opts.scooter);
  const inst = instantiateGLB(THREE, parsed, { targetHeight: 1.64, rotY: 0, centerXZ: false, groundY: false });
  inst.root.position.set(0, 0, 0);

  const bones = {};
  inst.root.traverse((o) => {
    if (o.name) bones[o.name] = o;
    if (o.isSkinnedMesh) o.frustumCulled = false;
    if (!o.isMesh || !o.material) return;
    const mn = o.material.name || "";
    if (mn === "Wolf3D_Outfit_Top" || mn === "Wolf3D_Outfit_Bottom") {
      const m = o.material.clone();
      if (mn === "Wolf3D_Outfit_Top") {
        m.color.set(opts.jacketColor || "#1d4ed8");
        m.roughness = 0.82;
      } else {
        m.color.set("#1e293b");
        m.roughness = 0.86;
      }
      m.map = null;
      m.needsUpdate = true;
      mats.own(m);
      o.material = m;
    }
  });

  if (bones.Hips) {
    bones.Hips.position.y = scooter ? 0.69 : 0.73;
    bones.Hips.position.z = 0;
  }
  inst.root.updateMatrixWorld(true);

  if (bones.LeftUpLeg) {
    rotateBoneWorld(THREE, bones.LeftUpLeg, -1, 0, 0, scooter ? 1.32 : 1.12);
    rotateBoneWorld(THREE, bones.LeftUpLeg, 0, 1, 0, scooter ? 0.16 : 0.28);
  }
  if (bones.RightUpLeg) {
    rotateBoneWorld(THREE, bones.RightUpLeg, -1, 0, 0, scooter ? 1.32 : 1.12);
    rotateBoneWorld(THREE, bones.RightUpLeg, 0, 1, 0, scooter ? -0.16 : -0.28);
  }
  inst.root.updateMatrixWorld(true);

  if (bones.LeftLeg) rotateBoneWorld(THREE, bones.LeftLeg, 1, 0, 0, scooter ? 1.28 : 1.38);
  if (bones.RightLeg) rotateBoneWorld(THREE, bones.RightLeg, 1, 0, 0, scooter ? 1.28 : 1.38);
  if (bones.Spine) rotateBoneWorld(THREE, bones.Spine, 1, 0, 0, scooter ? 0.12 : 0.34);
  if (bones.Spine1) rotateBoneWorld(THREE, bones.Spine1, 1, 0, 0, scooter ? 0.06 : 0.18);
  if (bones.Head) rotateBoneWorld(THREE, bones.Head, -1, 0, 0, scooter ? 0.12 : 0.38);
  inst.root.updateMatrixWorld(true);

  if (bones.LeftArm) {
    rotateBoneWorld(THREE, bones.LeftArm, 0, 0, -1, 0.56);
    rotateBoneWorld(THREE, bones.LeftArm, -1, 0, 0, scooter ? 0.92 : 1.04);
  }
  if (bones.RightArm) {
    rotateBoneWorld(THREE, bones.RightArm, 0, 0, 1, 0.56);
    rotateBoneWorld(THREE, bones.RightArm, -1, 0, 0, scooter ? 0.92 : 1.04);
  }
  inst.root.updateMatrixWorld(true);

  if (bones.LeftForeArm) rotateBoneWorld(THREE, bones.LeftForeArm, -1, 0, 0, 0.34);
  if (bones.RightForeArm) rotateBoneWorld(THREE, bones.RightForeArm, -1, 0, 0, 0.34);
  inst.root.updateMatrixWorld(true);

  // Mũ bảo hiểm bóng clearcoat + kính râm ôm khít đầu Ready Player Me
  if (bones.Head && opts.helmetGeo && opts.visorGeo) {
    const qHeadW = new THREE.Quaternion();
    bones.Head.getWorldQuaternion(qHeadW);
    const qInvHead = qHeadW.clone().invert();
    const hMount = new THREE.Group();
    hMount.quaternion.copy(qInvHead);
    hMount.position.set(0, 0.11, 0.015).applyQuaternion(qInvHead);
    const helmetMat = mats.physical(opts.helmetColor || "#f8fafc", { roughness: 0.14, clearcoat: 1.0, clearcoatRoughness: 0.05 });
    const visorMat = mats.physical("#0f172a", { roughness: 0.08, clearcoat: 1.0 });
    const helm = new THREE.Mesh(opts.helmetGeo, helmetMat);
    helm.scale.set(0.84, 0.86, 0.92);
    helm.castShadow = true;
    const visor = new THREE.Mesh(opts.visorGeo, visorMat);
    visor.scale.set(0.84, 0.86, 0.92);
    hMount.add(helm, visor);
    bones.Head.add(hMount);
  }

  // Xoay mặt người lái từ +Z sang +X (khớp trục đầu xe)
  inst.group.rotation.y = Math.PI / 2;
  inst.group.position.set(scooter ? -0.18 : -0.14, 0, 0);
  const headBone = bones.Head || null;
  const spineBone = bones.Spine1 || bones.Spine || null;
  return {
    group: inst.group,
    headBone,
    spineBone,
    baseHeadQ: headBone ? headBone.quaternion.clone() : null,
    baseSpineQ: spineBone ? spineBone.quaternion.clone() : null,
    headYawAxis: headBone ? worldAxisToLocal(THREE, headBone, 0, 1, 0) : null,
    spinePitchAxis: spineBone ? worldAxisToLocal(THREE, spineBone, 1, 0, 0) : null,
    scooter,
  };
}

export function animateMotoHDHuman(rider, t, speed, braking, idx = 0) {
  if (!rider) return;
  const stopped = speed < 0.25;
  if (rider.spineBone && rider.baseSpineQ && rider.spinePitchAxis) {
    // Rung nhẹ theo nhịp động cơ khi dừng đèn đỏ, rướn nhẹ về trước khi tăng ga, ghì thẳng khi phanh
    const lean = braking ? -0.07 : (stopped ? Math.sin(t * 2.4 + idx) * 0.018 : Math.min(0.11, speed * 0.02));
    rider.spineBone.quaternion.copy(rider.baseSpineQ);
    if (!_qDelta.v) _qDelta.v = rider.baseSpineQ.clone();
    _qDelta.v.setFromAxisAngle(rider.spinePitchAxis, lean);
    rider.spineBone.quaternion.multiply(_qDelta.v);
  }
  if (rider.headBone && rider.baseHeadQ && rider.headYawAxis) {
    // Khi dừng đèn đỏ quay đầu quan sát giao lộ hai bên; khi chạy nhìn tập trung phía trước kèm liếc gương nhẹ
    const yaw = stopped
      ? Math.sin(t * 0.95 + idx * 1.7) * 0.34
      : Math.sin(t * 0.55 + idx * 2.1) * 0.09;
    rider.headBone.quaternion.copy(rider.baseHeadQ);
    if (!_qDelta.v) _qDelta.v = rider.baseHeadQ.clone();
    _qDelta.v.setFromAxisAngle(rider.headYawAxis, yaw);
    rider.headBone.quaternion.multiply(_qDelta.v);
  }
}

function applyBoneOffsets(ab, pitch, yaw, roll) {
  if (!ab) return;
  ab.bone.quaternion.copy(ab.baseQ);
  if (pitch) ab.bone.quaternion.multiply(_qDelta.v.setFromAxisAngle(ab.pitchAxis, pitch));
  if (yaw) ab.bone.quaternion.multiply(_qInv.v.setFromAxisAngle(ab.yawAxis, yaw));
  if (roll) ab.bone.quaternion.multiply(_qParent.v.setFromAxisAngle(ab.rollAxis, roll));
}

export function animateSeatedHDHuman(rig, t, motion, state) {
  const i = rig.index;
  const st = state || rig.state;
  const busy = st === "work" || st === "npc";
  const b = rig.animBones;
  if (!motion) {
    rig.swivel.rotation.y = 0;
    for (const k of Object.keys(b)) applyBoneOffsets(b[k], 0, 0, 0);
    if (st === "wait") {
      applyBoneOffsets(b.RightArm, -0.75, 0, 0.25);
      applyBoneOffsets(b.RightForeArm, -0.45, 0, 0);
    } else if (st === "done") {
      applyBoneOffsets(b.LeftArm, -0.8, 0, -0.22);
      applyBoneOffsets(b.RightArm, -0.8, 0, 0.22);
    }
    return;
  }

  const breath = Math.sin(t * 2.1 + i * 1.3) * 0.018;
  applyBoneOffsets(b.Spine1, breath, 0, 0);

  // 1. Phòng họp: luân phiên 1 người trình bày (cử chỉ tay tự nhiên), 5 người còn lại quay nhìn & gật đầu lắng nghe / ghi chép
  if (rig.role === "meeting") {
    const mIdx = rig.meetingIdx >= 0 ? rig.meetingIdx : (i % 6);
    const speaker = Math.floor(t / 5.6) % 6;
    const isSpeaker = mIdx === speaker;
    const isNorthRow = mIdx < 3;
    const spNorthRow = speaker < 3;
    const colDiff = (speaker % 3) - (mIdx % 3);
    if (isSpeaker) {
      rig.swivel.rotation.y = Math.sin(t * 0.55 + i) * 0.06;
      applyBoneOffsets(b.Spine1, 0.055 + breath, 0, 0);
      applyBoneOffsets(b.Head, -0.02 + Math.sin(t * 2.2) * 0.04, Math.sin(t * 0.85) * 0.24, Math.sin(t * 1.3) * 0.03);
      const gest = Math.sin(t * 3.2 + i) * 0.16;
      applyBoneOffsets(b.LeftArm, -0.18 + gest * 0.4, 0, -0.06);
      applyBoneOffsets(b.RightArm, -0.22 - gest * 0.5, 0, 0.08);
      applyBoneOffsets(b.LeftForeArm, -0.25 + gest * 0.7, 0.12, 0);
      applyBoneOffsets(b.RightForeArm, -0.32 - gest * 0.8, -0.14, 0);
    } else {
      const lookScreen = Math.sin(t * 0.35 + mIdx * 1.4) > 0.65;
      const baseYaw = lookScreen
        ? (isNorthRow ? 0.28 * (mIdx - 1) : 0.14 * (1 - (mIdx % 3)))
        : Math.max(-0.42, Math.min(0.42, (isNorthRow ? -1 : 1) * colDiff * 0.22 + (isNorthRow === spNorthRow ? (colDiff >= 0 ? 0.16 : -0.16) : 0)));
      const nodPhase = (t + mIdx * 1.3) % 4.6;
      const nod = nodPhase < 0.75 ? Math.sin((nodPhase / 0.75) * Math.PI * 2) * 0.075 : 0;
      const takingNotes = Math.sin(t * 0.4 + mIdx * 2.3) > 0.45;
      rig.swivel.rotation.y = Math.sin(t * 0.25 + mIdx) * 0.025;
      applyBoneOffsets(b.Head, (takingNotes ? 0.1 : -0.01) + nod, baseYaw + Math.sin(t * 0.6 + mIdx) * 0.05, 0);
      applyBoneOffsets(b.LeftArm, 0.04, 0, 0);
      applyBoneOffsets(b.RightArm, takingNotes ? 0.02 : 0.05, takingNotes ? -0.08 : 0, 0);
      applyBoneOffsets(b.LeftForeArm, 0.06, 0.08, 0);
      applyBoneOffsets(b.RightForeArm, takingNotes ? Math.sin(t * 6.5 + mIdx) * 0.04 : 0.06, takingNotes ? -0.14 : -0.08, 0);
    }
    return;
  }

  // 2. Giám đốc: phong thái điều hành điềm tĩnh (xem báo cáo màn hình lớn, gõ chậm, ngả lưng suy nghĩ, quan sát văn phòng)
  if (rig.role === "director") {
    const phase = (t * 0.14) % 3;
    if (phase < 1.2) {
      rig.swivel.rotation.y = Math.sin(t * 0.35) * 0.04;
      applyBoneOffsets(b.Spine1, 0.03 + breath, 0, 0);
      applyBoneOffsets(b.Head, 0.04 + Math.sin(t * 1.1) * 0.025, Math.sin(t * 0.5) * 0.14, 0);
      applyBoneOffsets(b.LeftArm, 0.02, 0, 0);
      applyBoneOffsets(b.RightArm, 0, -0.12, 0);
      applyBoneOffsets(b.LeftForeArm, 0.04, 0.06, 0);
      applyBoneOffsets(b.RightForeArm, Math.sin(t * 2.2) * 0.025, -0.15 + Math.sin(t * 1.8) * 0.06, 0);
    } else if (phase < 2.1) {
      rig.swivel.rotation.y = Math.sin(t * 0.4) * 0.11;
      applyBoneOffsets(b.Spine1, -0.07 + breath, 0, 0);
      applyBoneOffsets(b.Head, -0.03, Math.sin(t * 0.45) * 0.22, Math.sin(t * 0.3) * 0.03);
      applyBoneOffsets(b.LeftArm, 0.08, 0, 0);
      applyBoneOffsets(b.RightArm, 0.08, 0, 0);
      applyBoneOffsets(b.LeftForeArm, 0.12, 0.12, 0);
      applyBoneOffsets(b.RightForeArm, 0.12, -0.12, 0);
    } else {
      const tap = Math.sin(t * 7.8) * 0.05;
      rig.swivel.rotation.y = Math.sin(t * 0.28) * 0.02;
      applyBoneOffsets(b.Spine1, 0.04 + breath, 0, 0);
      applyBoneOffsets(b.Head, 0.05, Math.sin(t * 0.7) * 0.08, 0);
      applyBoneOffsets(b.LeftArm, 0, 0, 0);
      applyBoneOffsets(b.RightArm, 0, 0, 0);
      applyBoneOffsets(b.LeftForeArm, tap, 0.06, 0);
      applyBoneOffsets(b.RightForeArm, -tap, -0.06, 0);
    }
    return;
  }

  // 3. Agent & nhân viên tại bàn làm việc: gõ phím theo đợt tự nhiên + đọc màn hình + rê chuột + chờ duyệt / debug / nghỉ
  if (st === "wait") {
    rig.swivel.rotation.y = Math.sin(t * 0.7 + i) * 0.06;
    applyBoneOffsets(b.Spine1, -0.02 + breath, 0, 0);
    applyBoneOffsets(b.Head, -0.04, Math.sin(t * 0.9 + i) * 0.22, Math.sin(t * 1.1 + i) * 0.03);
    const waveCycle = (t + i * 1.3) % 5.2;
    const raise = waveCycle < 1.8 ? Math.sin((waveCycle / 1.8) * Math.PI) : 0;
    applyBoneOffsets(b.LeftArm, 0.04, 0, 0);
    applyBoneOffsets(b.LeftForeArm, 0.06, 0, 0);
    applyBoneOffsets(b.RightArm, -0.58 * raise, 0, 0.16 * raise);
    applyBoneOffsets(b.RightForeArm, -0.32 * raise + Math.sin(t * 4.2) * 0.08 * raise, 0, 0);
  } else if (st === "done") {
    rig.swivel.rotation.y = Math.sin(t * 1.1 + i) * 0.08;
    const donePulse = Math.max(0, Math.sin(t * 1.2 + i));
    applyBoneOffsets(b.Spine1, breath - 0.05 * donePulse, 0, 0);
    applyBoneOffsets(b.Head, -0.05 + Math.sin(t * 2.8) * 0.04, Math.sin(t * 1.1) * 0.14, 0);
    const cheer = Math.sin(t * 5.2) * 0.12 * donePulse;
    applyBoneOffsets(b.LeftArm, -0.62 * donePulse - cheer, 0, -0.18 * donePulse);
    applyBoneOffsets(b.LeftForeArm, -0.24 * donePulse, 0, 0);
    applyBoneOffsets(b.RightArm, -0.62 * donePulse + cheer, 0, 0.18 * donePulse);
    applyBoneOffsets(b.RightForeArm, -0.24 * donePulse, 0, 0);
  } else if (st === "fail") {
    rig.swivel.rotation.y = 0;
    applyBoneOffsets(b.Spine1, 0.08 + breath, 0, 0);
    const shakeCycle = (t + i) % 3.8;
    const shake = shakeCycle < 1.1 ? Math.sin((shakeCycle / 1.1) * Math.PI * 3) * 0.14 : 0;
    applyBoneOffsets(b.Head, 0.09, shake, 0.03);
    const burst = Math.sin(t * 1.6 + i) > -0.2 ? Math.sin(t * 10.5 + i) * 0.065 : 0;
    applyBoneOffsets(b.LeftArm, 0, 0, 0);
    applyBoneOffsets(b.RightArm, 0, 0, 0);
    applyBoneOffsets(b.LeftForeArm, burst, 0.05, 0);
    applyBoneOffsets(b.RightForeArm, -burst, -0.05, 0);
  } else if (busy) {
    const workCycle = (t + i * 2.17) % 5.0;
    const typing = workCycle < 3.1;
    const useMouse = workCycle >= 3.1 && workCycle < 4.35;
    rig.swivel.rotation.y = Math.sin(t * 0.42 + i * 1.3) * 0.035;
    applyBoneOffsets(b.Spine1, (typing ? 0.035 : 0.005) + breath, 0, 0);
    applyBoneOffsets(
      b.Head,
      (typing ? 0.05 : 0.02) + Math.sin(t * 1.4 + i) * 0.025,
      Math.sin(t * 0.65 + i * 2.1) * 0.16,
      0,
    );
    const tapL = typing ? Math.sin(t * 9.2 + i * 1.7) * 0.055 : 0.02;
    const tapR = typing ? Math.sin(t * 9.8 + i * 2.3 + 1.1) * 0.055 : 0.02;
    applyBoneOffsets(b.LeftArm, 0, 0, 0);
    applyBoneOffsets(b.LeftForeArm, tapL, 0.05, 0);
    applyBoneOffsets(b.RightArm, 0, useMouse ? -0.14 : 0, 0);
    applyBoneOffsets(
      b.RightForeArm,
      useMouse ? Math.sin(t * 2.8 + i) * 0.025 : tapR,
      useMouse ? -0.18 + Math.sin(t * 2.1 + i) * 0.07 : -0.05,
      0,
    );
  } else {
    rig.swivel.rotation.y = Math.sin(t * 0.35 + i * 1.9) * 0.08;
    applyBoneOffsets(b.Spine1, -0.03 + breath, 0, 0);
    applyBoneOffsets(b.Head, 0.01, Math.sin(t * 0.45 + i * 2.7) * 0.24, Math.sin(t * 0.35 + i) * 0.03);
    applyBoneOffsets(b.LeftArm, 0.05, 0, 0);
    applyBoneOffsets(b.RightArm, 0.05, 0, 0);
    applyBoneOffsets(b.LeftForeArm, 0.08, 0.08, 0);
    applyBoneOffsets(b.RightForeArm, 0.08, -0.08, 0);
  }
}

// ---------------------------------------------------------------- Bộ điều khiển hành vi NPC có mục tiêu (dùng chung cho văn phòng & đường phố)
function lerpAngle(cur, target, alpha) {
  let diff = target - cur;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return cur + diff * alpha;
}

export function createScheduledNPC(rig, steps, initStepIdx = 0, initElapsed = 0, id = null) {
  const s = steps[initStepIdx] || steps[0];
  let initX = 0, initZ = 0, initYaw = 0;
  if (s.act === "wait") {
    [initX, initZ] = s.pos;
    initYaw = s.yaw || 0;
  } else {
    const dx = s.to[0] - s.from[0], dz = s.to[1] - s.from[1];
    const len = Math.hypot(dx, dz) || 1;
    const u = Math.min(1, initElapsed / len);
    initX = s.from[0] + dx * u;
    initZ = s.from[1] + dz * u;
    initYaw = Math.atan2(-dx, -dz);
  }
  rig.path = null;
  rig.root.position.set(initX, 0, initZ);
  rig.root.rotation.y = initYaw;
  return {
    id: id || `npc_${rig.index !== undefined ? rig.index : Math.round(initX * 31 + initZ * 17)}`,
    rig,
    steps,
    initStepIdx,
    initElapsed,
    initX,
    initZ,
    initYaw,
    x: initX,
    z: initZ,
    vx: 0,
    vz: 0,
    detourSide: 0,
    detourHold: 0,
    bestRem: Infinity,
    stepIdx: initStepIdx,
    elapsed: initElapsed,
    committed: false,
    stallTime: 0,
  };
}

function playNPCPose(w, t, dt, actualSpeed, mode, walking) {
  if (w.isHD) {
    if (walking) {
      w.speed = actualSpeed;
      animateHDHuman(w, t, dt, true, "walk", actualSpeed / 1.32);
    } else {
      animateHDHuman(w, t, dt, true, mode || "idle", 1.0);
    }
    return;
  }
  const i = w.index || 0;
  if (walking) {
    const stride = Math.sin(t * 5.6 + i);
    w.body.position.y = 0.835 + Math.abs(Math.cos(t * 5.6 + i)) * 0.032;
    w.leftLeg.rotation.x = stride * 0.44;
    w.rightLeg.rotation.x = -stride * 0.44;
    w.leftArm.rotation.x = -stride * 0.34;
    w.rightArm.rotation.x = w.holdCup ? 0.65 + stride * 0.05 : stride * 0.34;
    w.head.rotation.set(0, Math.sin(t * 0.9 + i) * 0.14, 0);
  } else {
    w.body.position.y = 0.835;
    w.leftLeg.rotation.x = w.rightLeg.rotation.x = 0;
    w.head.rotation.set(Math.sin(t * 1.4 + i) * 0.05, Math.sin(t * 0.8 + i * 2) * 0.22, 0);
    w.leftArm.rotation.x = mode === "talk" ? 0.14 + Math.sin(t * 2.2 + i) * 0.14 : 0.06;
    w.rightArm.rotation.x = mode === "talk" ? 0.16 - Math.sin(t * 1.9 + i) * 0.12 : (w.holdCup ? 0.65 : 0.06);
  }
}

export function stepScheduledNPC(npc, t, dt, motion, opts = {}) {
  const { gateCheck = null, physics = null, layer = "outdoor" } = typeof opts === "function" ? { gateCheck: opts } : opts;
  const w = npc.rig;
  if (!motion) {
    npc.stepIdx = npc.initStepIdx;
    npc.elapsed = npc.initElapsed;
    npc.committed = false;
    npc.stallTime = 0;
    npc.detourSide = 0;
    npc.detourHold = 0;
    npc.vx = 0;
    npc.vz = 0;
    npc.bestRem = Infinity;
    npc.x = npc.initX;
    npc.z = npc.initZ;
    w.root.position.set(npc.initX, 0, npc.initZ);
    w.root.rotation.y = npc.initYaw;
    if (physics) physics.setHuman(layer, npc.id, npc.x, npc.z, 0.36);
    if (w.isHD) animateHDHuman(w, 0, 0, false, "idle");
    else animateWalkerRig(w, 0, false);
    return;
  }

  const s = npc.steps[npc.stepIdx];
  if (!s) return;

  // Cập nhật đạo cụ (ôm kiện hàng / cầm cốc cà phê) & hướng nhìn quan sát khớp đúng từng bước công việc
  if (w.parcelGroup && s.carry !== undefined) w.carryingParcel = Boolean(s.carry);
  if (w.cupGroup && s.cup !== undefined) w.holdingCup = Boolean(s.cup);
  w.lookAround = Boolean(s.look);

  const advanceStep = () => {
    npc.stepIdx = (npc.stepIdx + 1) % npc.steps.length;
    npc.elapsed = 0;
    npc.committed = false;
    npc.stallTime = 0;
    npc.detourSide = 0;
    npc.detourHold = 0;
    npc.bestRem = Infinity;
  };

  if (npc.detourHold > 0) npc.detourHold = Math.max(0, npc.detourHold - dt);

  if (s.act === "wait") {
    const dx = s.pos[0] - npc.x;
    const dz = s.pos[1] - npc.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.48 && npc.stallTime < 1.2) {
      const steer = physics
        ? physics.steerAround(layer, npc.x, npc.z, dx, dz, 0.36, npc.id, npc.detourSide)
        : { dx: dx / d, dz: dz / d, side: 0, clear: true };
      if (!steer.clear && steer.side !== 0) {
        npc.detourSide = steer.side;
        npc.detourHold = 0.6;
      }
      const stepD = Math.min(d, 1.2 * dt);
      const res = physics
        ? physics.resolveCircle(layer, npc.x + steer.dx * stepD, npc.z + steer.dz * stepD, 0.36, npc.id)
        : { x: npc.x + steer.dx * stepD, z: npc.z + steer.dz * stepD, collided: false };
      const mvX = res.x - npc.x;
      const mvZ = res.z - npc.z;
      const mv = Math.hypot(mvX, mvZ);
      npc.x = res.x;
      npc.z = res.z;
      w.root.position.set(npc.x, 0, npc.z);
      // Nếu điểm chờ sát mép bị Hero hoặc NPC khác chiếm chỗ, đứng yên tự nhiên thay vì cố chen gây rung giật
      if (d <= 0.95 && res.collided) {
        npc.stallTime = 2.0;
      } else if (mv > 0.008) {
        w.root.rotation.y = lerpAngle(w.root.rotation.y, Math.atan2(-mvX, -mvZ), Math.min(1, dt * 7.0));
        playNPCPose(w, t, dt, mv / Math.max(dt, 1e-3), "walk", true);
        if (physics) physics.setHuman(layer, npc.id, npc.x, npc.z, 0.36);
        return;
      } else {
        npc.stallTime += dt;
      }
    }
    const res = physics ? physics.resolveCircle(layer, npc.x, npc.z, 0.36, npc.id) : { x: npc.x, z: npc.z };
    npc.x = res.x;
    npc.z = res.z;
    npc.vx = 0;
    npc.vz = 0;
    w.root.position.set(npc.x, 0, npc.z);
    w.root.rotation.y = lerpAngle(w.root.rotation.y, s.yaw || 0, Math.min(1, dt * 6.5));
    if (physics) physics.setHuman(layer, npc.id, npc.x, npc.z, 0.36);
    npc.elapsed += dt;
    playNPCPose(w, t, dt, 0, s.mode || "idle", false);
    if (npc.elapsed >= (s.dur || 3.5)) advanceStep();
    return;
  }

  // Hỗ trợ kiểm tra đèn tín hiệu + dự báo xe đang lao tới trước khi bước xuống vạch qua đường
  if (s.cross && !npc.committed) {
    const df = Math.hypot(s.from[0] - npc.x, s.from[1] - npc.z);
    const sigOk = gateCheck ? gateCheck(s.cross) : true;
    const roadClear = !physics || physics.isCrossingSafe(npc.x, npc.z, s.to[0], s.to[1]);
    if (!sigOk || !roadClear) {
      if (df > 0.52) {
        const st = physics
          ? physics.steerAround(layer, npc.x, npc.z, s.from[0] - npc.x, s.from[1] - npc.z, 0.36, npc.id, npc.detourSide)
          : { dx: (s.from[0] - npc.x) / df, dz: (s.from[1] - npc.z) / df };
        const step = Math.min(df, 1.25 * dt);
        const res = physics ? physics.resolveCircle(layer, npc.x + st.dx * step, npc.z + st.dz * step, 0.36, npc.id) : { x: npc.x + st.dx * step, z: npc.z + st.dz * step };
        npc.x = res.x;
        npc.z = res.z;
      } else if (physics) {
        const res = physics.resolveCircle(layer, npc.x, npc.z, 0.36, npc.id);
        npc.x = res.x;
        npc.z = res.z;
      }
      npc.vx = 0;
      npc.vz = 0;
      w.root.position.set(npc.x, 0, npc.z);
      w.root.rotation.y = lerpAngle(w.root.rotation.y, Math.atan2(-(s.to[0] - npc.x), -(s.to[1] - npc.z)), Math.min(1, dt * 7.5));
      if (physics) physics.setHuman(layer, npc.id, npc.x, npc.z, 0.36);
      // Khi đứng đợi đèn đỏ, khẽ quay đầu quan sát xe cộ hai bên một cách tự nhiên
      w.lookAround = true;
      playNPCPose(w, t, dt, 0, "idle", false);
      return;
    }
    npc.committed = true;
  }

  // Chỉ kiểm tra nguy cơ xe lao tới khi NPC đang thực sự sang đường (không bao giờ hoảng loạn khi đang đi trên vỉa hè!)
  const threat = (physics && layer === "outdoor" && s.cross) ? physics.getVehicleThreat(npc.x, npc.z, 0.38) : null;
  let tgtX = s.to[0];
  let tgtZ = s.to[1];
  let spd = s.speed || 1.35;
  let dirX = tgtX - npc.x;
  let dirZ = tgtZ - npc.z;
  let rem = Math.hypot(dirX, dirZ);

  if (threat) {
    const distFromEntry = Math.hypot(npc.x - s.from[0], npc.z - s.from[1]);
    if (distFromEntry < 2.4) {
      tgtX = s.from[0];
      tgtZ = s.from[1];
      dirX = tgtX - npc.x;
      dirZ = tgtZ - npc.z;
      rem = Math.hypot(dirX, dirZ) || 1;
      npc.committed = false;
    } else {
      dirX = threat.escapeX;
      dirZ = threat.escapeZ;
      rem = 1;
    }
    spd = 2.65;
  } else if (physics) {
    const st = physics.steerAround(layer, npc.x, npc.z, dirX, dirZ, 0.36, npc.id, npc.detourSide, Boolean(s.cross));
    dirX = st.dx;
    dirZ = st.dz;
    if (st.clear && npc.detourHold <= 0) {
      npc.detourSide = 0;
    } else if (!st.clear && st.side !== 0) {
      npc.detourSide = st.side;
      npc.detourHold = Math.max(npc.detourHold, 0.55);
    }
  } else if (rem > 1e-4) {
    dirX /= rem;
    dirZ /= rem;
  }

  const dLen = Math.hypot(dirX, dirZ) || 1;
  dirX /= dLen;
  dirZ /= dLen;

  // Lọc mượt vector hướng đi giúp NPC bo cua quanh vật cản uyển chuyển, tuyệt đối không giật lắc
  const blend = threat ? 1 : Math.min(1, dt * 11.5);
  npc.vx = npc.vx + (dirX - npc.vx) * blend;
  npc.vz = npc.vz + (dirZ - npc.vz) * blend;
  const vLen = Math.hypot(npc.vx, npc.vz);
  if (vLen > 1e-4) {
    dirX = npc.vx / vLen;
    dirZ = npc.vz / vLen;
  }

  const stepD = threat ? spd * dt : Math.min(Math.max(rem, 0.25), spd * dt);
  const propX = npc.x + dirX * stepD;
  const propZ = npc.z + dirZ * stepD;
  const res = physics
    ? physics.resolveCircle(layer, propX, propZ, 0.36, npc.id, { ignoreVehicles: !s.cross })
    : { x: propX, z: propZ };
  const mvX = res.x - npc.x;
  const mvZ = res.z - npc.z;
  const moved = Math.hypot(mvX, mvZ);
  npc.x = res.x;
  npc.z = res.z;
  w.root.position.set(npc.x, 0, npc.z);
  if (physics) physics.setHuman(layer, npc.id, npc.x, npc.z, 0.36);

  const newRem = Math.hypot(s.to[0] - npc.x, s.to[1] - npc.z);
  if (!threat) {
    if (newRem < npc.bestRem - 0.08) {
      npc.bestRem = newRem;
      npc.stallTime = 0;
    } else {
      npc.stallTime += dt;
      if (npc.stallTime > 1.35 && npc.detourHold <= 0) {
        npc.detourSide = npc.detourSide ? -npc.detourSide : 1;
        npc.detourHold = 0.9;
      }
    }
  }

  const actualSpd = moved / Math.max(dt, 1e-3);
  if (moved > 0.008 && actualSpd > 0.16) {
    const faceYaw = Math.atan2(-mvX, -mvZ);
    w.root.rotation.y = lerpAngle(w.root.rotation.y, faceYaw, threat ? 0.85 : Math.min(1, dt * 7.5));
    playNPCPose(w, t, dt, actualSpd, "walk", true);
  } else {
    w.root.rotation.y = lerpAngle(w.root.rotation.y, Math.atan2(-dirX, -dirZ), Math.min(1, dt * 5.0));
    playNPCPose(w, t, dt, 0, "idle", false);
  }

  // Tuyệt đối không bỏ qua bước sang đường (s.cross) để NPC không bao giờ băng chéo giữa giao lộ!
  if (!threat && (newRem <= 0.48 || (!s.cross && npc.stallTime > 7.5))) {
    advanceStep();
  }
}
