// Hệ thống giao thông đô thị 3D đa ngã tư bao quanh khu phố văn phòng:
// - Đèn tín hiệu giao thông đồng bộ 2 pha tại nút qua đường chính & cả 4 ngã tư (Tây-Nam, Đông-Nam, Tây-Bắc, Đông-Bắc).
// - Ô tô sơn bóng clearcoat & xe máy kèm người lái đội mũ bảo hiểm chạy dọc hết cả 4 tuyến đường (Đông-Tây & Bắc-Nam).
// - Xe tự giữ khoảng cách an toàn, dừng đúng vạch trắng đèn đỏ ở mọi ngã tư và sáng đèn phanh HDR.
// - Người đi bộ dạo trên vỉa hè cả 4 tuyến phố và qua đường đúng nhịp đèn đỏ tại nút chính + các ngã tư.
import { buildWalkerRig, animateWalkerRig } from "./human3d.js";
import { instantiateGLB } from "./glb.js";

const CYCLE = 18.0; // 0–8.5s ĐT Xanh/BN Đỏ · 8.5–10.5s ĐT Vàng/BN Đỏ · 10.5–16.5s ĐT Đỏ/BN Xanh · 16.5–18s ĐT Đỏ/BN Vàng

export function createTrafficAssets(THREE) {
  const geos = {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    pole: new THREE.CylinderGeometry(0.08, 0.105, 4.3, 12),
    arm: new THREE.CylinderGeometry(0.055, 0.068, 2.6, 10),
    lamp: new THREE.SphereGeometry(0.115, 12, 10),
    pedLamp: new THREE.BoxGeometry(0.16, 0.16, 0.06),
    motoWheel: new THREE.CylinderGeometry(0.24, 0.24, 0.12, 14),
    motoRim: new THREE.CylinderGeometry(0.14, 0.14, 0.135, 10),
    motoFork: new THREE.CylinderGeometry(0.025, 0.028, 0.68, 8),
    motoHandle: new THREE.CylinderGeometry(0.018, 0.018, 0.68, 8),
    motoHead: new THREE.SphereGeometry(0.075, 10, 8),
    helmet: new THREE.SphereGeometry(0.175, 16, 12),
    visor: new THREE.SphereGeometry(0.18, 14, 10, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.24, Math.PI * 0.34),
    exhaust: new THREE.CylinderGeometry(0.04, 0.048, 0.56, 8),
    riderTorso: new THREE.CapsuleGeometry(0.145, 0.28, 6, 12),
    riderLimb: new THREE.CapsuleGeometry(0.052, 0.3, 4, 8),
    riderArm: new THREE.CapsuleGeometry(0.042, 0.28, 4, 8),
  };
  return {
    geos,
    dispose() {
      for (const g of Object.values(geos)) g.dispose();
    },
  };
}

function addShadow(THREE, group, natureAssets, mats, sx, sz) {
  const m = new THREE.Mesh(natureAssets.geos.shadowDisc, mats.shadow());
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.016;
  m.scale.set(sx, sz, 1);
  group.add(m);
}

// ---------------------------------------------------------------- Cột đèn giao thông 3 màu + đèn đi bộ (xoay được theo hướng đường)
function buildTrafficLight(THREE, tAssets, mats, x, z, dirZ, rotY, sigAxis) {
  const g = tAssets.geos;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = rotY;
  const metal = mats.standard("#1f2937", { roughness: 0.34, metalness: 0.8 });
  const hood = mats.standard("#111827", { roughness: 0.45, metalness: 0.5 });

  const pole = new THREE.Mesh(g.pole, metal);
  pole.position.y = 2.15;
  pole.castShadow = true;
  root.add(pole);

  const arm = new THREE.Mesh(g.arm, metal);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 4.1, dirZ * 1.25);
  arm.castShadow = true;
  root.add(arm);

  const mkLightMat = (col) => mats.freshStandard(col, { roughness: 0.12, emissive: col, emissiveIntensity: 0.05 });
  const redMat = mkLightMat("#ef4444");
  const yelMat = mkLightMat("#f59e0b");
  const grnMat = mkLightMat("#22c55e");
  const pedRedMat = mkLightMat("#ef4444");
  const pedGrnMat = mkLightMat("#22c55e");

  const box = new THREE.Mesh(g.unitBox, hood);
  box.position.set(0, 3.62, dirZ * 2.15);
  box.scale.set(0.42, 1.02, 0.36);
  box.castShadow = true;
  root.add(box);

  for (const [ly, mat] of [[3.92, redMat], [3.62, yelMat], [3.32, grnMat]]) {
    for (const sx of [-0.18, 0.18]) {
      const lm = new THREE.Mesh(g.lamp, mat);
      lm.position.set(sx, ly, dirZ * 2.15);
      lm.scale.set(0.65, 1, 1);
      root.add(lm);
    }
  }

  const pBox = new THREE.Mesh(g.unitBox, hood);
  pBox.position.set(-dirZ * 0.16, 2.35, 0);
  pBox.scale.set(0.26, 0.52, 0.24);
  root.add(pBox);

  const pRed = new THREE.Mesh(g.pedLamp, pedRedMat);
  pRed.position.set(-dirZ * 0.16, 2.48, dirZ * 0.11);
  const pGrn = new THREE.Mesh(g.pedLamp, pedGrnMat);
  pGrn.position.set(-dirZ * 0.16, 2.22, dirZ * 0.11);
  root.add(pRed, pGrn);

  return { root, sigAxis, redMat, yelMat, grnMat, pedRedMat, pedGrnMat };
}

// ---------------------------------------------------------------- Ô tô chạy đường bộ (bánh xoay + đèn phanh HDR)
function buildTrafficCar(THREE, natureAssets, mats, color, hdAssets) {
  const g = natureAssets.geos;
  const root = new THREE.Group();
  addShadow(THREE, root, natureAssets, mats, 4.9, 2.35);

  const carParsed = hdAssets && hdAssets.get("car");
  const tailMat = mats.freshStandard("#ef4444", { roughness: 0.12, emissive: "#ef4444", emissiveIntensity: 0.75 });
  if (carParsed) {
    const inst = instantiateGLB(THREE, carParsed, { targetLength: 4.55 });
    const carPaint = mats.physical(color, { roughness: 0.16, metalness: 0.65, clearcoat: 1.0, clearcoatRoughness: 0.06 });
    inst.group.traverse((o) => {
      if (o.isMesh && o.material && o.material.name === "Paint 1 Carmine") o.material = carPaint;
    });
    const sz = new THREE.Box3().setFromObject(inst.group).getSize(new THREE.Vector3());
    if (sz.z > sz.x) inst.group.rotation.y = Math.PI / 2;
    root.add(inst.group);
    const tl = new THREE.Mesh(g.unitBox, tailMat);
    tl.position.set(-2.22, 0.72, 0);
    tl.scale.set(0.06, 0.09, 1.38);
    root.add(tl);
    return { root, wheels: [], mixer: null, tailMat, halfLen: 2.35, wheelR: 0.32 };
  }

  const paintMat = mats.physical(color, { roughness: 0.15, metalness: 0.72, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const glassMat = mats.physical("#0f172a", { roughness: 0.06, metalness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.04 });
  const tireMat = mats.standard("#18181b", { roughness: 0.85, metalness: 0.05 });
  const rimMat = mats.standard("#e2e8f0", { roughness: 0.14, metalness: 0.94 });

  const body = new THREE.Mesh(g.carBody, paintMat);
  body.castShadow = body.receiveShadow = true;
  root.add(body);

  const cabin = new THREE.Mesh(g.unitBox, glassMat);
  cabin.position.set(-0.22, 1.1, 0);
  cabin.scale.set(2.05, 0.44, 1.66);
  root.add(cabin);

  const headMat = mats.standard("#ffffff", { roughness: 0.1, emissive: "#fef9c3", emissiveIntensity: 1.6 });
  for (const sz of [-0.56, 0.56]) {
    const hl = new THREE.Mesh(g.unitBox, headMat);
    hl.position.set(2.22, 0.62, sz);
    hl.scale.set(0.08, 0.12, 0.32);
    root.add(hl);
  }
  const tl = new THREE.Mesh(g.unitBox, tailMat);
  tl.position.set(-2.22, 0.68, 0);
  tl.scale.set(0.06, 0.1, 1.48);
  root.add(tl);

  const wheels = [];
  for (const [wx, wz] of [[1.32, 0.84], [1.32, -0.84], [-1.32, 0.84], [-1.32, -0.84]]) {
    const wg = new THREE.Group();
    wg.position.set(wx, 0.32, wz);
    const tire = new THREE.Mesh(g.carWheel, tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    const rim = new THREE.Mesh(g.carRim, rimMat);
    rim.rotation.x = Math.PI / 2;
    wg.add(tire, rim);
    root.add(wg);
    wheels.push(wg);
  }
  return { root, wheels, mixer: null, tailMat, halfLen: 2.35, wheelR: 0.32 };
}

function buildTrafficTruck(THREE, natureAssets, mats, color, hdAssets) {
  const truckParsed = hdAssets && hdAssets.get("truck");
  if (!truckParsed) return buildTrafficCar(THREE, natureAssets, mats, color, hdAssets);
  const g = natureAssets.geos;
  const root = new THREE.Group();
  addShadow(THREE, root, natureAssets, mats, 5.6, 2.45);
  const inst = instantiateGLB(THREE, truckParsed, { targetLength: 5.2 });
  const sz = new THREE.Box3().setFromObject(inst.group).getSize(new THREE.Vector3());
  if (sz.z > sz.x) inst.group.rotation.y = Math.PI / 2;
  root.add(inst.group);
  const tailMat = mats.freshStandard("#ef4444", { roughness: 0.12, emissive: "#ef4444", emissiveIntensity: 0.75 });
  const tl = new THREE.Mesh(g.unitBox, tailMat);
  tl.position.set(-2.55, 0.82, 0);
  tl.scale.set(0.06, 0.1, 1.5);
  root.add(tl);
  return { root, wheels: [], mixer: inst.mixer || null, tailMat, halfLen: 2.75, wheelR: 0.4 };
}

// ---------------------------------------------------------------- Xe máy / tay ga kèm người lái đội mũ bảo hiểm
function buildMotorbike(THREE, tAssets, natureAssets, mats, bodyColor, jacketColor, helmetColor) {
  const g = tAssets.geos;
  const root = new THREE.Group();
  addShadow(THREE, root, natureAssets, mats, 2.05, 0.95);

  const paintMat = mats.physical(bodyColor, { roughness: 0.18, metalness: 0.55, clearcoat: 1.0, clearcoatRoughness: 0.06 });
  const darkMat = mats.standard("#18181b", { roughness: 0.55, metalness: 0.25 });
  const chromeMat = mats.standard("#e2e8f0", { roughness: 0.14, metalness: 0.94 });
  const seatMat = mats.physical("#1e293b", { roughness: 0.58, clearcoat: 0.2 });

  const wheels = [];
  for (const wx of [0.62, -0.6]) {
    const wg = new THREE.Group();
    wg.position.set(wx, 0.24, 0);
    const tire = new THREE.Mesh(g.motoWheel, darkMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    const rim = new THREE.Mesh(g.motoRim, chromeMat);
    rim.rotation.x = Math.PI / 2;
    wg.add(tire, rim);
    root.add(wg);
    wheels.push(wg);
  }

  const deck = new THREE.Mesh(g.unitBox, darkMat);
  deck.position.set(0.02, 0.32, 0);
  deck.scale.set(0.86, 0.12, 0.36);
  const body = new THREE.Mesh(g.unitBox, paintMat);
  body.position.set(-0.34, 0.54, 0);
  body.scale.set(0.76, 0.3, 0.38);
  body.castShadow = true;
  const shield = new THREE.Mesh(g.unitBox, paintMat);
  shield.position.set(0.46, 0.64, 0);
  shield.rotation.z = 0.26;
  shield.scale.set(0.24, 0.62, 0.36);
  shield.castShadow = true;
  const seat = new THREE.Mesh(g.unitBox, seatMat);
  seat.position.set(-0.28, 0.72, 0);
  seat.scale.set(0.72, 0.1, 0.34);
  const fork = new THREE.Mesh(g.motoFork, chromeMat);
  fork.position.set(0.54, 0.56, 0);
  fork.rotation.z = 0.28;
  const handle = new THREE.Mesh(g.motoHandle, darkMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0.42, 0.94, 0);
  const exhaust = new THREE.Mesh(g.exhaust, chromeMat);
  exhaust.rotation.z = Math.PI / 2 + 0.14;
  exhaust.position.set(-0.48, 0.3, 0.22);

  const headLamp = new THREE.Mesh(g.motoHead, mats.standard("#ffffff", { roughness: 0.1, emissive: "#fef9c3", emissiveIntensity: 1.7 }));
  headLamp.position.set(0.58, 0.86, 0);
  const tailMat = mats.freshStandard("#ef4444", { roughness: 0.12, emissive: "#ef4444", emissiveIntensity: 0.8 });
  const tailLamp = new THREE.Mesh(g.unitBox, tailMat);
  tailLamp.position.set(-0.74, 0.66, 0);
  tailLamp.scale.set(0.05, 0.09, 0.2);
  root.add(deck, body, shield, seat, fork, handle, exhaust, headLamp, tailLamp);

  const rider = new THREE.Group();
  root.add(rider);
  const jacketMat = mats.physical(jacketColor, { roughness: 0.78, sheen: 0.45, tex: "fabric" });
  const pantsMat = mats.standard("#1e293b", { roughness: 0.85, tex: "fabric" });
  const helmetMat = mats.physical(helmetColor, { roughness: 0.14, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const visorMat = mats.physical("#0f172a", { roughness: 0.08, clearcoat: 1.0 });

  const torso = new THREE.Mesh(g.riderTorso, jacketMat);
  torso.position.set(-0.14, 1.08, 0);
  torso.rotation.z = -0.22;
  torso.castShadow = true;
  rider.add(torso);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(g.riderLimb, pantsMat);
    leg.position.set(0.06, 0.56, side * 0.18);
    leg.rotation.z = -0.32;
    const arm = new THREE.Mesh(g.riderArm, jacketMat);
    arm.position.set(0.18, 1.04, side * 0.24);
    arm.rotation.set(0, side * -0.15, -1.05);
    arm.castShadow = true;
    rider.add(leg, arm);
  }

  const helm = new THREE.Mesh(g.helmet, helmetMat);
  helm.position.set(-0.04, 1.48, 0);
  helm.castShadow = true;
  const visor = new THREE.Mesh(g.visor, visorMat);
  visor.position.set(-0.02, 1.48, 0);
  visor.rotation.y = Math.PI / 2;
  rider.add(helm, visor);

  return { root, wheels, tailMat, halfLen: 1.05, wheelR: 0.24 };
}

// ---------------------------------------------------------------- Hệ thống giao thông hoàn chỉnh toàn khu phố
export function buildStreetTraffic(THREE, tAssets, natureAssets, humanAssets, mats, plan, streetZ, hdAssets) {
  const root = new THREE.Group();
  const pad = plan.levels ? 6 : 4;
  const W = plan.W;
  const westRoadX = -6.6;
  const eastRoadX = W + pad + 5.2;
  const northRoadZ = -6.4;
  const mainRoadZ = streetZ + 5.9;

  // Toàn tuyến chạy dọc hết đường phố hiển thị
  const ewMin = -64.0, ewMax = eastRoadX + 58.0, ewSpan = ewMax - ewMin;
  const nsMin = -52.0, nsMax = streetZ + 50.0, nsSpan = nsMax - nsMin;

  // 1. Hệ thống cột đèn tín hiệu đồng bộ 2 pha tại nút chính & cả 4 ngã tư
  const lightSpecs = [
    // Nút qua đường chính trước sảnh X-Office (Đông-Tây)
    [8.2, streetZ + 2.12, 1, 0, "ew"],
    [1.9, streetZ + 9.68, -1, 0, "ew"],
    // Ngã tư Tây-Nam (westRoadX, mainRoadZ)
    [westRoadX + 3.7, mainRoadZ - 3.7, 1, 0, "ew"],
    [westRoadX - 3.7, mainRoadZ + 3.7, -1, Math.PI / 2, "ns"],
    // Ngã tư Đông-Nam (eastRoadX, mainRoadZ)
    [eastRoadX - 3.7, mainRoadZ + 3.7, -1, 0, "ew"],
    [eastRoadX + 3.7, mainRoadZ - 3.7, 1, Math.PI / 2, "ns"],
    // Ngã tư Tây-Bắc (westRoadX, northRoadZ)
    [westRoadX + 3.7, northRoadZ - 3.5, 1, 0, "ew"],
    [westRoadX - 3.7, northRoadZ + 3.5, -1, Math.PI / 2, "ns"],
    // Ngã tư Đông-Bắc (eastRoadX, northRoadZ)
    [eastRoadX - 3.7, northRoadZ + 3.5, -1, 0, "ew"],
    [eastRoadX + 3.7, northRoadZ - 3.5, 1, Math.PI / 2, "ns"],
  ];
  const lights = lightSpecs.map(([lx, lz, dirZ, rotY, sigAxis]) => {
    const l = buildTrafficLight(THREE, tAssets, mats, lx, lz, dirZ, rotY, sigAxis);
    root.add(l.root);
    return l;
  });

  // 2. Đội xe chạy dọc hết cả 4 tuyến đường (Đông-Tây & Bắc-Nam)
  const mainEastStop = [westRoadX - 5.9, 1.85, eastRoadX - 5.9];
  const mainWestStop = [eastRoadX + 5.9, 8.25, westRoadX + 5.9];
  const northEastStop = [westRoadX - 5.9, eastRoadX - 5.9];
  const northWestStop = [eastRoadX + 5.9, westRoadX + 5.9];
  const nsSouthStop = [northRoadZ - 6.0, mainRoadZ - 6.0];
  const nsNorthStop = [mainRoadZ + 6.0, northRoadZ + 6.0];

  const vehicleSpecs = [
    // Đại lộ chính Nam (Eastbound +X)
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.75, pos: -38.0, maxV: 4.5, kind: "truck", col: "#f1f5f9", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.2, pos: -16.0, maxV: 4.5, kind: "moto", col: "#dc2626", j: "#1d4ed8", h: "#f8fafc", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.75, pos: 12.0, maxV: 5.0, kind: "car", col: "#0284c7", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 2.25, pos: 26.0, maxV: 4.6, kind: "moto", col: "#0f766e", j: "#334155", h: "#111827", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.75, pos: 42.0, maxV: 4.8, kind: "car", col: "#b91c1c", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.2, pos: eastRoadX + 26.0, maxV: 4.7, kind: "moto", col: "#ea580c", j: "#1e293b", h: "#f8fafc", stopLines: mainEastStop },
    // Đại lộ chính Nam (Westbound -X)
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.75, pos: eastRoadX + 34.0, maxV: 5.1, kind: "car", col: "#94a3b8", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 2.25, pos: 35.0, maxV: 4.4, kind: "moto", col: "#f8fafc", j: "#15803d", h: "#dc2626", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.75, pos: 18.0, maxV: 4.9, kind: "car", col: "#0f766e", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.25, pos: 1.5, maxV: 4.6, kind: "moto", col: "#1e3a8a", j: "#c2410c", h: "#facc15", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.75, pos: -24.0, maxV: 5.0, kind: "car", col: "#334155", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.25, pos: -48.0, maxV: 4.5, kind: "moto", col: "#18181b", j: "#6d28d9", h: "#e2e8f0", stopLines: mainWestStop },
    // Đại lộ phía Bắc (sau lưng văn phòng, chạy suốt tuyến)
    { axis: "x", sigAxis: "ew", dir: 1, lane: northRoadZ + 1.55, pos: -32.0, maxV: 4.8, kind: "car", col: "#e2e8f0", stopLines: northEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: northRoadZ + 1.55, pos: 14.0, maxV: 4.7, kind: "moto", col: "#0284c7", j: "#0f172a", h: "#f8fafc", stopLines: northEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: northRoadZ + 1.55, pos: eastRoadX + 18.0, maxV: 4.9, kind: "car", col: "#1d4ed8", stopLines: northEastStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: northRoadZ - 1.55, pos: eastRoadX + 24.0, maxV: 4.5, kind: "truck", col: "#0f766e", stopLines: northWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: northRoadZ - 1.55, pos: 22.0, maxV: 4.6, kind: "moto", col: "#b91c1c", j: "#1e293b", h: "#facc15", stopLines: northWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: northRoadZ - 1.55, pos: -26.0, maxV: 4.8, kind: "car", col: "#64748b", stopLines: northWestStop },
    // Đại lộ nhánh Tây (Bắc-Nam, qua ngã tư Tây-Bắc & Tây-Nam)
    { axis: "z", sigAxis: "ns", dir: 1, lane: westRoadX - 1.65, pos: -34.0, maxV: 4.8, kind: "car", col: "#f8fafc", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: 1, lane: westRoadX - 1.2, pos: 6.0, maxV: 4.5, kind: "moto", col: "#dc2626", j: "#1d4ed8", h: "#f8fafc", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: 1, lane: westRoadX - 1.65, pos: mainRoadZ + 18.0, maxV: 4.9, kind: "car", col: "#0284c7", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: westRoadX + 1.65, pos: mainRoadZ + 28.0, maxV: 4.8, kind: "car", col: "#334155", stopLines: nsNorthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: westRoadX + 1.2, pos: 14.0, maxV: 4.4, kind: "moto", col: "#0f766e", j: "#c2410c", h: "#f8fafc", stopLines: nsNorthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: westRoadX + 1.65, pos: -24.0, maxV: 4.7, kind: "car", col: "#b91c1c", stopLines: nsNorthStop },
    // Đại lộ nhánh Đông (Bắc-Nam, qua ngã tư Đông-Bắc & Đông-Nam)
    { axis: "z", sigAxis: "ns", dir: 1, lane: eastRoadX - 1.65, pos: -28.0, maxV: 4.4, kind: "truck", col: "#94a3b8", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: 1, lane: eastRoadX - 1.2, pos: 9.0, maxV: 4.5, kind: "moto", col: "#1e3a8a", j: "#334155", h: "#facc15", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: 1, lane: eastRoadX - 1.65, pos: mainRoadZ + 20.0, maxV: 4.7, kind: "car", col: "#15803d", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: eastRoadX + 1.65, pos: mainRoadZ + 32.0, maxV: 4.8, kind: "car", col: "#f1f5f9", stopLines: nsNorthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: eastRoadX + 1.2, pos: 17.0, maxV: 4.4, kind: "moto", col: "#ea580c", j: "#1d4ed8", h: "#f8fafc", stopLines: nsNorthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: eastRoadX + 1.65, pos: -22.0, maxV: 4.8, kind: "car", col: "#0284c7", stopLines: nsNorthStop },
  ];

  const vehicles = vehicleSpecs.map((s) => {
    const v = s.kind === "truck"
      ? buildTrafficTruck(THREE, natureAssets, mats, s.col, hdAssets)
      : s.kind === "car"
        ? buildTrafficCar(THREE, natureAssets, mats, s.col, hdAssets)
        : buildMotorbike(THREE, tAssets, natureAssets, mats, s.col, s.j, s.h);
    if (s.axis === "x") {
      v.root.position.set(s.pos, 0, s.lane);
      v.root.rotation.y = s.dir > 0 ? 0 : Math.PI;
    } else {
      v.root.position.set(s.lane, 0, s.pos);
      v.root.rotation.y = s.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    root.add(v.root);
    const min = s.axis === "x" ? ewMin : nsMin;
    const max = s.axis === "x" ? ewMax : nsMax;
    return {
      ...v,
      axis: s.axis,
      sigAxis: s.sigAxis,
      dir: s.dir,
      pos: s.pos,
      initPos: s.pos,
      lane: s.lane,
      min,
      max,
      span: max - min,
      speed: s.maxV * 0.72,
      maxV: s.maxV,
      stopLines: s.stopLines,
    };
  });

  // 3. Người đi bộ dạo trên vỉa hè cả 4 tuyến đường bao quanh khu phố (dùng mô hình xương .glb nếu có)
  const humanParsed = hdAssets && hdAssets.get("human");
  const glbWalkers = [];
  const sidewalkWalkers = [];
  [
    { index: 41, path: [[9.5, streetZ + 1.15], [W + 1.5, streetZ + 1.15]], x: 16.0, z: streetZ + 1.15, holdCup: true, speed: 0.78 },
    { index: 42, path: [[W + 0.5, streetZ + 1.55], [10.0, streetZ + 1.55]], x: 28.0, z: streetZ + 1.55, holdCup: false, speed: 0.72 },
    { index: 43, path: [[8.5, streetZ + 10.4], [W + 2.0, streetZ + 10.4]], x: 14.0, z: streetZ + 10.4, holdCup: false, speed: 0.75 },
    { index: 44, path: [[W + 1.0, streetZ + 10.85], [8.5, streetZ + 10.85]], x: 30.0, z: streetZ + 10.85, holdCup: true, speed: 0.7 },
    { index: 47, path: [[0.5, -10.8], [W + 2.0, -10.8]], x: 12.0, z: -10.8, holdCup: false, speed: 0.74 },
    { index: 48, path: [[-11.3, 1.0], [-11.3, streetZ - 1.5]], x: -11.3, z: 10.0, holdCup: true, speed: 0.76 },
    { index: 49, path: [[eastRoadX + 4.5, streetZ - 1.5], [eastRoadX + 4.5, 1.0]], x: eastRoadX + 4.5, z: 14.0, holdCup: false, speed: 0.73 },
  ].forEach((spec, idx) => {
    if (humanParsed && idx < 3) {
      const inst = instantiateGLB(THREE, humanParsed, { targetHeight: 1.72 });
      inst.group.position.set(spec.x, 0, spec.z);
      root.add(inst.group);
      const [p0, p1] = spec.path;
      const dist = Math.max(1, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
      glbWalkers.push({ inst, p0, p1, dist, speed: (spec.speed || 0.75) * 1.4, phase: idx * 3.1 });
    } else {
      const w = buildWalkerRig(THREE, humanAssets, mats, spec);
      root.add(w.root);
      sidewalkWalkers.push(w);
    }
  });

  // 4. Người đi bộ băng qua vạch trắng tại nút chính & các ngã tư (tuân thủ đèn đỏ từng hướng!)
  const crossers = [
    // Nút chính trước X-Office (băng qua đại lộ theo chiều Bắc-Nam)
    { index: 45, axis: "z", pedGroup: "ns", fixed: 4.3, p0: streetZ + 1.65, p1: streetZ + 10.25, from0: true },
    { index: 46, axis: "z", pedGroup: "ns", fixed: 5.75, p0: streetZ + 1.65, p1: streetZ + 10.25, from0: false },
    // Ngã tư Tây-Nam (1 người băng đại lộ Nam, 1 người băng đường nhánh Tây)
    { index: 50, axis: "z", pedGroup: "ns", fixed: westRoadX - 4.4, p0: mainRoadZ - 4.4, p1: mainRoadZ + 4.4, from0: true },
    { index: 51, axis: "x", pedGroup: "ew", fixed: mainRoadZ + 4.6, p0: westRoadX - 4.2, p1: westRoadX + 4.2, from0: false },
    // Ngã tư Đông-Nam (1 người băng đại lộ Nam, 1 người băng đường nhánh Đông)
    { index: 52, axis: "z", pedGroup: "ns", fixed: eastRoadX + 4.4, p0: mainRoadZ - 4.4, p1: mainRoadZ + 4.4, from0: false },
    { index: 53, axis: "x", pedGroup: "ew", fixed: mainRoadZ + 4.6, p0: eastRoadX - 4.2, p1: eastRoadX + 4.2, from0: true },
  ].map((c) => {
    const startP = c.from0 ? c.p0 : c.p1;
    const x = c.axis === "z" ? c.fixed : startP;
    const z = c.axis === "z" ? startP : c.fixed;
    const rotY = c.axis === "z" ? (c.from0 ? 0 : Math.PI) : (c.from0 ? Math.PI / 2 : -Math.PI / 2);
    const w = buildWalkerRig(THREE, humanAssets, mats, { index: c.index, x, z, rotY });
    root.add(w.root);
    return { rig: w, ...c, progress: 0, dir: c.from0 ? 1 : -1 };
  });

  let prevT = 0;

  return {
    root,
    animate(t, motion) {
      const phase = (motion ? t : 3.0) % CYCLE;
      const ewSig = phase < 8.5 ? "green" : phase < 10.5 ? "yellow" : "red";
      const nsSig = phase < 10.5 ? "red" : phase < 16.5 ? "green" : "yellow";
      const pedGoNS = phase >= 11.0 && phase <= 16.5;
      const pedGoEW = phase >= 0.6 && phase <= 8.0;

      for (const l of lights) {
        const sig = l.sigAxis === "ew" ? ewSig : nsSig;
        const pGo = l.sigAxis === "ew" ? pedGoNS : pedGoEW;
        l.redMat.emissiveIntensity = sig === "red" ? 2.4 : 0.04;
        l.yelMat.emissiveIntensity = sig === "yellow" ? 2.3 : 0.04;
        l.grnMat.emissiveIntensity = sig === "green" ? 2.2 : 0.04;
        l.pedGrnMat.emissiveIntensity = pGo ? 2.1 : 0.04;
        l.pedRedMat.emissiveIntensity = pGo ? 0.04 : 2.0;
      }

      if (!motion) {
        for (const v of vehicles) {
          v.pos = v.initPos;
          if (v.axis === "x") v.root.position.x = v.pos;
          else v.root.position.z = v.pos;
          v.tailMat.emissiveIntensity = 0.75;
        }
        for (const sw of sidewalkWalkers) animateWalkerRig(sw, 0, false);
        for (const gw of glbWalkers) {
          if (gw.inst.mixer) {
            gw.inst.mixer.setTime(0.25);
          }
        }
        for (const cr of crossers) {
          const p = cr.from0 ? cr.p0 : cr.p1;
          if (cr.axis === "z") cr.rig.root.position.z = p;
          else cr.rig.root.position.x = p;
          animateWalkerRig(cr.rig, 0, false);
        }
        prevT = t;
        return;
      }

      const dt = prevT ? Math.min(0.06, Math.max(0.001, t - prevT)) : 0.016;
      prevT = t;

      // Động học xe cộ trên cả 4 tuyến đường
      for (const v of vehicles) {
        let desired = v.maxV;
        const sig = v.sigAxis === "ew" ? ewSig : nsSig;

        if (sig !== "green") {
          for (const sl of v.stopLines) {
            const distToLine = (sl - v.pos) * v.dir - v.halfLen;
            if (distToLine > -0.35 && distToLine < 8.5) {
              if (distToLine <= 0.35) desired = 0;
              else desired = Math.min(desired, (distToLine / 5.5) * v.maxV);
            }
          }
        }

        for (const o of vehicles) {
          if (o === v || o.axis !== v.axis || o.dir !== v.dir || Math.abs(o.lane - v.lane) > 0.95) continue;
          let gap = (o.pos - v.pos) * v.dir;
          if (gap < 0) gap += v.span;
          const clear = gap - v.halfLen - o.halfLen;
          if (clear < 5.5) {
            if (clear <= 1.2) desired = 0;
            else desired = Math.min(desired, ((clear - 1.2) / 4.3) * v.maxV);
          }
        }

        const braking = desired < v.speed - 0.15 || desired < 0.25;
        const accel = braking ? 7.8 : 3.4;
        v.speed += Math.sign(desired - v.speed) * Math.min(Math.abs(desired - v.speed), accel * dt);
        v.speed = Math.max(0, v.speed);
        v.pos += v.dir * v.speed * dt;
        if (v.dir > 0 && v.pos > v.max) v.pos = v.min;
        else if (v.dir < 0 && v.pos < v.min) v.pos = v.max;

        if (v.axis === "x") v.root.position.x = v.pos;
        else v.root.position.z = v.pos;
        const dSpin = (v.speed * dt) / v.wheelR;
        for (const w of v.wheels) w.rotation.z -= dSpin;
        if (v.mixer && v.speed > 0.05) v.mixer.update(dt * (v.speed / 3.8));
        v.tailMat.emissiveIntensity = braking ? 2.8 : 0.75;
      }

      for (const sw of sidewalkWalkers) animateWalkerRig(sw, t, true);
      for (const gw of glbWalkers) {
        const uRaw = (((t + gw.phase) * gw.speed) / gw.dist) % 2;
        const forward = uRaw <= 1;
        const u = forward ? uRaw : 2 - uRaw;
        const x = gw.p0[0] + (gw.p1[0] - gw.p0[0]) * u;
        const z = gw.p0[1] + (gw.p1[1] - gw.p0[1]) * u;
        const dx = (gw.p1[0] - gw.p0[0]) * (forward ? 1 : -1);
        const dz = (gw.p1[1] - gw.p0[1]) * (forward ? 1 : -1);
        gw.inst.group.position.set(x, 0, z);
        gw.inst.group.rotation.y = Math.atan2(dx, dz);
        if (gw.inst.mixer) gw.inst.mixer.update(dt * 1.15);
      }

      // Người qua đường tại các vạch kẻ ngã tư & nút chính
      for (const cr of crossers) {
        const w = cr.rig;
        const pGo = cr.pedGroup === "ns" ? pedGoNS : pedGoEW;
        if (cr.progress >= 1 && !pGo) {
          cr.dir *= -1;
          cr.progress = 0;
        }
        const movingCross = (pGo && cr.progress < 1) || (cr.progress > 0.02 && cr.progress < 1);
        const yaw = cr.axis === "z" ? (cr.dir > 0 ? 0 : Math.PI) : (cr.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        w.root.rotation.y = yaw;
        if (movingCross) {
          cr.progress = Math.min(1, cr.progress + dt * 0.22);
          const u = cr.dir > 0 ? cr.progress : 1 - cr.progress;
          const p = cr.p0 + (cr.p1 - cr.p0) * u;
          if (cr.axis === "z") w.root.position.z = p;
          else w.root.position.x = p;
          const stride = Math.sin(t * 5.8 + cr.index);
          w.body.position.y = 0.835 + Math.abs(Math.cos(t * 5.8 + cr.index)) * 0.032;
          w.leftLeg.rotation.x = stride * 0.44;
          w.rightLeg.rotation.x = -stride * 0.44;
          w.leftArm.rotation.x = -stride * 0.36;
          w.rightArm.rotation.x = stride * 0.36;
        } else {
          w.body.position.y = 0.835;
          w.leftLeg.rotation.x = w.rightLeg.rotation.x = 0;
          w.leftArm.rotation.x = w.rightArm.rotation.x = 0.06;
          w.head.rotation.y = Math.sin(t * 1.1 + cr.index) * 0.25;
        }
        const blinkPhase = (t + cr.index * 1.5) % 4.1;
        const blink = blinkPhase < 0.14 ? Math.sin((blinkPhase / 0.14) * Math.PI) : 0;
        for (const lid of w.eyelids) lid.rotation.x = 0.56 - blink * 0.84;
      }
    },
  };
}
