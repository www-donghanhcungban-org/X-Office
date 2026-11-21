// Hệ thống giao thông đô thị 3D sống động phía trước văn phòng:
// - Đèn tín hiệu giao thông thật (Đỏ / Vàng / Xanh + đèn người đi bộ) có quầng sáng HDR Bloom.
// - Ô tô sơn bóng clearcoat (bánh xe quay thật, đèn phanh đỏ bừng khi dừng đèn đỏ/giữ khoảng cách).
// - Xe máy / xe tay ga chi tiết kèm người lái đội mũ bảo hiểm kính râm, tay cầm lái.
// - Người đi bộ dạo trên hai vỉa hè và đứng chờ vạch qua đường, chỉ băng qua khi đèn giao thông chuyển Đỏ.
import { buildWalkerRig, animateWalkerRig } from "./human3d.js";

const CYCLE = 18.0; // chu kỳ đèn: 0–8.5s Xanh · 8.5–10.5s Vàng · 10.5–18.0s Đỏ (xe dừng, người qua đường 11–16.5s)

export function createTrafficAssets(THREE) {
  const geos = {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    pole: new THREE.CylinderGeometry(0.08, 0.105, 4.3, 12),
    arm: new THREE.CylinderGeometry(0.055, 0.068, 2.6, 10),
    lamp: new THREE.SphereGeometry(0.115, 12, 10),
    pedLamp: new THREE.BoxGeometry(0.16, 0.16, 0.06),
    // Xe máy / tay ga
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

// ---------------------------------------------------------------- Cột đèn giao thông 3 màu + đèn tín hiệu người đi bộ
function buildTrafficLight(THREE, tAssets, mats, x, z, dirZ) {
  const g = tAssets.geos;
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  const metal = mats.standard("#1f2937", { roughness: 0.34, metalness: 0.8 });
  const hood = mats.standard("#111827", { roughness: 0.45, metalness: 0.5 });

  const pole = new THREE.Mesh(g.pole, metal);
  pole.position.y = 2.15;
  pole.castShadow = true;
  root.add(pole);

  // Tay vươn ngang ra lòng đường treo hộp đèn chính
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

  // Hộp đèn 3 màu treo cao (nhìn rõ từ cả hai chiều đại lộ)
  const box = new THREE.Mesh(g.unitBox, hood);
  box.position.set(0, 3.62, dirZ * 2.15);
  box.scale.set(0.42, 1.02, 0.36);
  box.castShadow = true;
  root.add(box);

  const cols = [
    [3.92, redMat],
    [3.62, yelMat],
    [3.32, grnMat],
  ];
  for (const [ly, mat] of cols) {
    for (const sx of [-0.18, 0.18]) {
      const lm = new THREE.Mesh(g.lamp, mat);
      lm.position.set(sx, ly, dirZ * 2.15);
      lm.scale.set(0.65, 1, 1);
      root.add(lm);
    }
  }

  // Hộp đèn đi bộ gắn trên thân cột quay về vạch qua đường
  const pBox = new THREE.Mesh(g.unitBox, hood);
  pBox.position.set(-dirZ * 0.16, 2.35, 0);
  pBox.scale.set(0.26, 0.52, 0.24);
  root.add(pBox);

  const pRed = new THREE.Mesh(g.pedLamp, pedRedMat);
  pRed.position.set(-dirZ * 0.16, 2.48, dirZ * 0.11);
  const pGrn = new THREE.Mesh(g.pedLamp, pedGrnMat);
  pGrn.position.set(-dirZ * 0.16, 2.22, dirZ * 0.11);
  root.add(pRed, pGrn);

  return { root, redMat, yelMat, grnMat, pedRedMat, pedGrnMat };
}

// ---------------------------------------------------------------- Ô tô chạy đường bộ (bánh xoay + đèn phanh HDR)
function buildTrafficCar(THREE, natureAssets, mats, color) {
  const g = natureAssets.geos;
  const root = new THREE.Group();
  addShadow(THREE, root, natureAssets, mats, 4.9, 2.35);

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
  const tailMat = mats.freshStandard("#ef4444", { roughness: 0.12, emissive: "#ef4444", emissiveIntensity: 0.75 });
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
  return { root, wheels, tailMat, halfLen: 2.35, wheelR: 0.32 };
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

  // Bánh trước & bánh sau (xoay thật khi lăn bánh)
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

  // Khung sườn, yếm trước khí động học, yên da, ống xả inox, ghi-đông & đèn pha/hậu
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

  // Người lái xe máy ngồi tự nhiên (áo khoác, quần tối, hai tay nắm ghi-đông, mũ bảo hiểm bóng có kính râm)
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

// ---------------------------------------------------------------- Hệ thống giao thông hoàn chỉnh ngoài đại lộ
export function buildStreetTraffic(THREE, tAssets, natureAssets, humanAssets, mats, plan, streetZ) {
  const root = new THREE.Group();
  const pad = plan.levels ? 6 : 4;
  const xMin = -18.0;
  const xMax = plan.W + pad + 18.0;
  const span = xMax - xMin;
  const laneWestZ = streetZ + 4.15; // làn trên: đi sang trái (-X)
  const laneEastZ = streetZ + 7.65; // làn dưới: đi sang phải (+X)

  // Hai trụ đèn tín hiệu giao thông kẹp hai bên vạch qua đường (x = 3.2..6.8)
  const lightNorth = buildTrafficLight(THREE, tAssets, mats, 8.2, streetZ + 2.12, 1);
  const lightSouth = buildTrafficLight(THREE, tAssets, mats, 1.9, streetZ + 9.68, -1);
  const lights = [lightNorth, lightSouth];
  root.add(lightNorth.root, lightSouth.root);

  // Đội xe thực tế trên hai làn (ô tô + xe máy xen kẽ, tự giữ khoảng cách & dừng đúng vạch khi đèn đỏ)
  const vehicleSpecs = [
    // Làn đi sang phải (+X, z = laneEastZ, vạch dừng x <= 1.85)
    { kind: "car", dir: 1, z: laneEastZ, x: 12.0, maxV: 4.8, col: "#f1f5f9" },
    { kind: "moto", dir: 1, z: laneEastZ - 0.55, x: 22.0, maxV: 4.2, col: "#dc2626", j: "#1d4ed8", h: "#f8fafc" },
    { kind: "car", dir: 1, z: laneEastZ, x: 31.5, maxV: 4.6, col: "#0284c7" },
    { kind: "moto", dir: 1, z: laneEastZ + 0.52, x: 43.0, maxV: 4.4, col: "#0f766e", j: "#334155", h: "#111827" },
    { kind: "car", dir: 1, z: laneEastZ, x: -2.0, maxV: 4.5, col: "#b91c1c" },
    // Làn đi sang trái (-X, z = laneWestZ, vạch dừng x >= 8.2)
    { kind: "car", dir: -1, z: laneWestZ, x: 18.0, maxV: 4.7, col: "#94a3b8" },
    { kind: "moto", dir: -1, z: laneWestZ - 0.52, x: 26.5, maxV: 4.3, col: "#f8fafc", j: "#15803d", h: "#dc2626" },
    { kind: "moto", dir: -1, z: laneWestZ + 0.5, x: 35.5, maxV: 4.1, col: "#1e3a8a", j: "#c2410c", h: "#facc15" },
    { kind: "car", dir: -1, z: laneWestZ, x: 45.0, maxV: 4.6, col: "#0f766e" },
    { kind: "moto", dir: -1, z: laneWestZ - 0.42, x: 1.0, maxV: 4.5, col: "#18181b", j: "#6d28d9", h: "#e2e8f0" },
  ];

  const vehicles = vehicleSpecs.map((s) => {
    const v = s.kind === "car"
      ? buildTrafficCar(THREE, natureAssets, mats, s.col)
      : buildMotorbike(THREE, tAssets, natureAssets, mats, s.col, s.j, s.h);
    v.root.position.set(s.x, 0, s.z);
    v.root.rotation.y = s.dir > 0 ? 0 : Math.PI;
    root.add(v.root);
    return {
      ...v,
      dir: s.dir,
      x: s.x,
      initX: s.x,
      z: s.z,
      speed: s.maxV * 0.7,
      maxV: s.maxV,
      stopLine: s.dir > 0 ? 1.85 : 8.25,
    };
  });

  // 4 người đi bộ dạo trên hai vỉa hè (vỉa hè Bắc & vỉa hè Nam) — không bao giờ chạm lòng đường hay cây/đèn
  const sidewalkWalkers = [
    { index: 41, path: [[9.5, streetZ + 1.15], [38.0, streetZ + 1.15]], x: 16.0, z: streetZ + 1.15, holdCup: true, speed: 0.78 },
    { index: 42, path: [[36.0, streetZ + 1.55], [10.0, streetZ + 1.55]], x: 28.0, z: streetZ + 1.55, holdCup: false, speed: 0.72 },
    { index: 43, path: [[8.5, streetZ + 10.4], [39.0, streetZ + 10.4]], x: 14.0, z: streetZ + 10.4, holdCup: false, speed: 0.75 },
    { index: 44, path: [[38.0, streetZ + 10.85], [8.5, streetZ + 10.85]], x: 30.0, z: streetZ + 10.85, holdCup: true, speed: 0.7 },
  ].map((spec) => {
    const w = buildWalkerRig(THREE, humanAssets, mats, spec);
    root.add(w.root);
    return w;
  });

  // 2 người đi bộ băng qua vạch qua đường (x = 4.3 & 5.7): chờ đúng lề khi đèn xe Xanh/Vàng, qua đường khi đèn Đỏ!
  const crossers = [
    { index: 45, x: 4.3, zNorth: streetZ + 1.65, zSouth: streetZ + 10.25, fromNorth: true },
    { index: 46, x: 5.75, zNorth: streetZ + 1.65, zSouth: streetZ + 10.25, fromNorth: false },
  ].map((c) => {
    const w = buildWalkerRig(THREE, humanAssets, mats, { index: c.index, x: c.x, z: c.fromNorth ? c.zNorth : c.zSouth, rotY: c.fromNorth ? Math.PI : 0 });
    root.add(w.root);
    return { rig: w, ...c, progress: 0, dir: c.fromNorth ? 1 : -1 };
  });

  let prevT = 0;

  return {
    root,
    animate(t, motion) {
      const phase = (motion ? t : 3.0) % CYCLE;
      const sig = phase < 8.5 ? "green" : phase < 10.5 ? "yellow" : "red";
      const pedGo = phase >= 11.1 && phase <= 16.4;

      // 1. Cập nhật đèn tín hiệu (HDR emissive intensity cao tạo quầng Bloom thật)
      for (const l of lights) {
        l.redMat.emissiveIntensity = sig === "red" ? 2.4 : 0.04;
        l.yelMat.emissiveIntensity = sig === "yellow" ? 2.3 : 0.04;
        l.grnMat.emissiveIntensity = sig === "green" ? 2.2 : 0.04;
        l.pedGrnMat.emissiveIntensity = pedGo ? 2.1 : 0.04;
        l.pedRedMat.emissiveIntensity = pedGo ? 0.04 : 2.0;
      }

      if (!motion) {
        for (const v of vehicles) {
          v.x = v.initX;
          v.root.position.x = v.x;
          v.tailMat.emissiveIntensity = 0.75;
        }
        for (const sw of sidewalkWalkers) animateWalkerRig(sw, 0, false);
        for (const cr of crossers) {
          cr.rig.root.position.z = cr.fromNorth ? cr.zNorth : cr.zSouth;
          animateWalkerRig(cr.rig, 0, false);
        }
        prevT = t;
        return;
      }

      const dt = prevT ? Math.min(0.06, Math.max(0.001, t - prevT)) : 0.016;
      prevT = t;

      // 2. Mô phỏng động học xe cộ trên 2 làn: dừng trước vạch khi đèn Đỏ/Vàng + tự giữ khoảng cách xe phía trước
      for (const v of vehicles) {
        let desired = v.maxV;

        // Kiểm tra vạch dừng đèn đỏ / vàng phía trước mũi xe
        if (sig !== "green") {
          const distToLine = (v.stopLine - v.x) * v.dir - v.halfLen;
          if (distToLine > -0.35 && distToLine < 8.5) {
            if (distToLine <= 0.35) desired = 0;
            else desired = Math.min(desired, (distToLine / 5.5) * v.maxV);
          }
        }

        // Kiểm tra xe cùng làn phía trước để không bao giờ đâm/xuyên qua nhau
        for (const o of vehicles) {
          if (o === v || o.dir !== v.dir || Math.abs(o.z - v.z) > 0.95) continue;
          let gap = (o.x - v.x) * v.dir;
          if (gap < 0) gap += span;
          const clear = gap - v.halfLen - o.halfLen;
          if (clear < 5.5) {
            if (clear <= 1.15) desired = 0;
            else desired = Math.min(desired, ((clear - 1.15) / 4.35) * v.maxV);
          }
        }

        const braking = desired < v.speed - 0.15 || desired < 0.25;
        const accel = braking ? 7.8 : 3.2;
        v.speed += Math.sign(desired - v.speed) * Math.min(Math.abs(desired - v.speed), accel * dt);
        v.speed = Math.max(0, v.speed);
        v.x += v.dir * v.speed * dt;
        if (v.dir > 0 && v.x > xMax) v.x = xMin;
        else if (v.dir < 0 && v.x < xMin) v.x = xMax;

        v.root.position.x = v.x;
        const dSpin = (v.speed * dt) / v.wheelR;
        for (const w of v.wheels) w.rotation.z -= dSpin;
        v.tailMat.emissiveIntensity = braking ? 2.8 : 0.75;
      }

      // 3. Người đi bộ trên hai vỉa hè
      for (const sw of sidewalkWalkers) animateWalkerRig(sw, t, true);

      // 4. Người qua đường đúng nhịp đèn đỏ (băng qua vạch trắng khi xe đã dừng hẳn)
      for (const cr of crossers) {
        const w = cr.rig;
        if (cr.progress >= 1 && !pedGo) {
          cr.dir *= -1;
          cr.progress = 0;
        }
        const movingCross = (pedGo && cr.progress < 1) || (cr.progress > 0.02 && cr.progress < 1);
        if (movingCross) {
          cr.progress = Math.min(1, cr.progress + dt * 0.22);
          const u = cr.dir > 0 ? cr.progress : 1 - cr.progress;
          w.root.position.z = cr.zNorth + (cr.zSouth - cr.zNorth) * u;
          w.root.rotation.y = cr.dir > 0 ? Math.PI : 0;
          const stride = Math.sin(t * 5.8 + cr.index);
          w.body.position.y = 0.835 + Math.abs(Math.cos(t * 5.8 + cr.index)) * 0.032;
          w.leftLeg.rotation.x = stride * 0.44;
          w.rightLeg.rotation.x = -stride * 0.44;
          w.leftArm.rotation.x = -stride * 0.36;
          w.rightArm.rotation.x = stride * 0.36;
        } else {
          // Đứng chờ lịch sự ngay mép vỉa hè nhìn đèn & dòng xe
          w.root.rotation.y = cr.dir > 0 ? Math.PI : 0;
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
