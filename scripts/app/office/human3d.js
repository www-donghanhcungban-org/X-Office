// Nhân vật 3D điêu khắc + ghế công thái học + khớp chuyển động theo trạng thái agent (Three.js PBR).
// Hệ toạ độ cục bộ: gốc (0, 0, 0) là mặt sàn tâm ghế, nhân vật quay mặt về hướng -z (phía bàn & màn hình).

const SKIN = ["#f1c29b", "#e0a97b", "#c58652", "#f5cfa9", "#8c5530", "#f8d8be", "#a46a4a"];
const HAIR = ["#1f1510", "#4e2e1c", "#111827", "#8d5524", "#3b3f46", "#6b2d18", "#9ca3af"];
const IRIS = ["#2b1a10", "#3d2817", "#1f3a52", "#3b4d2b", "#18181b"];
const OUTFIT = [
  { top: "#2563eb", inner: "#f8fafc", pants: "#1e293b", blazer: true },
  { top: "#15803d", inner: "#f8fafc", pants: "#334155", blazer: false },
  { top: "#6d28d9", inner: "#f8fafc", pants: "#1e293b", blazer: true },
  { top: "#be123c", inner: "#fff1f2", pants: "#1f2937", blazer: false },
  { top: "#0f766e", inner: "#f8fafc", pants: "#334155", blazer: true },
  { top: "#c2410c", inner: "#fffbeb", pants: "#1e293b", blazer: false },
  { top: "#3730a3", inner: "#eef2ff", pants: "#111827", blazer: true },
  { top: "#0369a1", inner: "#f8fafc", pants: "#27272a", blazer: false },
  { top: "#9d174d", inner: "#fdf2f8", pants: "#1f2937", blazer: true },
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

export function buildHumanRig(THREE, assets, mats, opts) {
  const { index: i, theme, seat, season, pick } = opts;
  const g = assets.geos;
  const root = new THREE.Group();
  const skinCol = SKIN[i % SKIN.length];
  const hairCol = HAIR[(i * 3) % HAIR.length];
  const irisCol = IRIS[(i * 2) % IRIS.length];
  const outfit = OUTFIT[i % OUTFIT.length];
  const isAgent = Boolean(seat && seat.label);

  const skinMat = mats.physical(skinCol, { roughness: 0.56, metalness: 0.0, sheen: 0.38, sheenRoughness: 0.72, sheenColor: "#ffb396" });
  const hairMat = mats.physical(hairCol, { roughness: 0.44, metalness: 0.08, clearcoat: 0.24, sheen: 0.36, sheenColor: "#e2e8f0", tex: "hair", normal: 0.55 });
  const topMat = mats.physical(outfit.top, { roughness: 0.88, metalness: 0.02, sheen: 0.52, sheenRoughness: 0.76, sheenColor: "#f8fafc", tex: "fabric", normal: 0.35, roughMap: true });
  const innerMat = mats.physical(outfit.inner, { roughness: 0.84, metalness: 0.01, sheen: 0.4, sheenRoughness: 0.8, tex: "fabric", normal: 0.25, roughMap: true });
  const pantsMat = mats.physical(outfit.pants, { roughness: 0.9, metalness: 0.02, sheen: 0.45, sheenRoughness: 0.78, tex: "fabric", normal: 0.3, roughMap: true });
  const chairMat = mats.physical(theme.chair, { roughness: 0.82, metalness: 0.04, sheen: 0.48, sheenRoughness: 0.75, tex: "fabric", normal: 0.35, roughMap: true });
  const chairDark = mats.standard("#1e293b", { roughness: 0.38, metalness: 0.42 });
  const chromeMat = mats.standard("#e2e8f0", { roughness: 0.14, metalness: 0.94 });
  const shoeMat = mats.physical(i % 2 ? "#1e293b" : "#442c1e", { roughness: 0.34, metalness: 0.06, clearcoat: 0.48 });
  const soleMat = mats.standard("#f1f5f9", { roughness: 0.68, metalness: 0.02 });
  const whiteMat = mats.physical("#ffffff", { roughness: 0.06, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.04 });
  const darkMat = mats.standard("#0f172a", { roughness: 0.2, metalness: 0.15 });
  const lipMat = mats.physical("#bd6960", { roughness: 0.38, clearcoat: 0.3 });

  // Bóng tiếp xúc mềm dưới ghế (Ambient Occlusion tiếp đất)
  const sh = new THREE.Mesh(g.shadowDisc, mats.shadow());
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.016;
  root.add(sh);

  // ---------------- 1. Ghế xoay công thái học 5 chân (bỏ qua khi nhân vật ngồi sẵn ghế phòng họp / giám đốc)
  const chairGroup = new THREE.Group();
  root.add(chairGroup);
  const swivel = new THREE.Group();
  chairGroup.add(swivel);
  if (!opts.noChair) {
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
    roughness: 0.54, metalness: 0.0, sheen: 0.4, sheenRoughness: 0.7, sheenColor: "#ffb396", tex: "face:" + skinCol,
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

  // Tai nghe phòng thu + mic cho 5 AI agent
  let micLed = null;
  if (isAgent) {
    const hsMat = mats.standard("#1f2937", { roughness: 0.35, metalness: 0.45 });
    const band = new THREE.Mesh(g.headband, hsMat);
    band.position.y = 0.065;
    head.add(band);
    for (const side of [-1, 1]) {
      const cup = new THREE.Mesh(g.earcup, hsMat);
      cup.position.set(side * 0.165, 0.25, 0.005);
      cup.rotation.z = Math.PI / 2;
      const pad = new THREE.Mesh(g.earpad, darkMat);
      pad.position.set(side * 0.15, 0.25, 0.005);
      pad.rotation.y = Math.PI / 2;
      head.add(cup, pad);
    }
    const boom = new THREE.Mesh(g.micBoom, hsMat);
    boom.position.y = 0.065;
    micLed = new THREE.Mesh(g.micTip, mats.standard(theme.glow, { roughness: 0.2, emissive: theme.glow, emissiveIntensity: 0.65 }));
    micLed.position.set(0.065, 0.18, -0.175);
    head.add(boom, micLed);
  }

  // Mũ mùa lễ hội (Noel / Tết)
  if (season === "noel") {
    const cuff = new THREE.Mesh(g.noelCuff, innerMat);
    cuff.position.set(0, 0.405, 0.01);
    cuff.rotation.x = Math.PI / 2;
    const cone = new THREE.Mesh(g.noelCone, mats.standard("#dc2626", { roughness: 0.78, tex: "fabric" }));
    cone.position.set(0, 0.56, 0.04);
    cone.rotation.x = 0.18;
    const pom = new THREE.Mesh(g.noelPom, innerMat);
    pom.position.set(0, 0.72, 0.075);
    head.add(cuff, cone, pom);
  } else if (season === "tet") {
    const cap = new THREE.Mesh(g.tetCap, mats.standard("#dc2626", { roughness: 0.72, tex: "fabric" }));
    cap.position.set(0, 0.415, 0.01);
    const gold = new THREE.Mesh(g.noelPom, mats.standard("#facc15", { roughness: 0.28, metalness: 0.7 }));
    gold.position.set(0, 0.425, -0.145);
    gold.scale.setScalar(0.65);
    head.add(cap, gold);
  }

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

  const skinMat = mats.physical(skinCol, { roughness: 0.56, sheen: 0.38, sheenRoughness: 0.72, sheenColor: "#ffb396" });
  const faceMat = mats.physical("#ffffff", { roughness: 0.54, sheen: 0.4, sheenRoughness: 0.7, sheenColor: "#ffb396", tex: "face:" + skinCol });
  const hairMat = mats.physical(hairCol, { roughness: 0.44, metalness: 0.08, clearcoat: 0.24, sheen: 0.36, tex: "hair", normal: 0.55 });
  const topMat = mats.physical(outfit.top, { roughness: 0.88, sheen: 0.5, tex: "fabric", normal: 0.35, roughMap: true });
  const innerMat = mats.physical(outfit.inner, { roughness: 0.84, sheen: 0.4, tex: "fabric", roughMap: true });
  const pantsMat = mats.physical(outfit.pants, { roughness: 0.9, sheen: 0.45, tex: "fabric", normal: 0.3, roughMap: true });
  const shoeMat = mats.physical(i % 2 ? "#1e293b" : "#442c1e", { roughness: 0.34, clearcoat: 0.48 });
  const soleMat = mats.standard("#f1f5f9", { roughness: 0.68 });
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
      const cup = new THREE.Mesh(g.neck, mats.physical("#ffffff", { roughness: 0.15, clearcoat: 0.85 }));
      cup.position.set(0.01, -0.5, -0.14);
      cup.scale.set(0.8, 0.9, 0.8);
      arm.add(cup);
    }
    return arm;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

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
