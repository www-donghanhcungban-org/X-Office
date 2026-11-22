// Khu phố đô thị 3D hoàn chỉnh bao quanh văn phòng X-Office (nhà phố, shophouse quán cà phê, chung cư ban công,
// cao ốc văn phòng kính, ngã tư đường nhánh, công viên nhỏ có đài phun nước, trạm xe buýt & đường chân trời thành phố).
// Mọi cao độ mặt trước (Nam & Đông) được tính hình học chuẩn để KHÔNG che phòng văn phòng hay làn xe ở góc nhìn mặc định.
import { buildTree, buildFlowerbed } from "./nature3d.js";
import { instantiateGLB } from "./glb.js";
import { buildSaigonLandmarks } from "./saigon3d.js";
import { upgradeVehicleGLB } from "./traffic3d.js";

function rnd(s) {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createCityAssets(THREE) {
  const geos = {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    unitPlane: new THREE.PlaneGeometry(1, 1),
    unitCyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    umbrellaTop: new THREE.ConeGeometry(1.12, 0.42, 8),
    pitchedRoof: new THREE.ConeGeometry(0.71, 1, 4),
    dome: new THREE.SphereGeometry(0.5, 12, 8),
    fountainBasin: new THREE.CylinderGeometry(1.45, 1.25, 0.46, 18),
    fountainTier: new THREE.CylinderGeometry(0.68, 0.35, 0.28, 16),
  };
  return {
    geos,
    dispose() {
      for (const g of Object.values(geos)) g.dispose();
    },
  };
}

function putBox(THREE, parent, geo, mat, x, y, z, sx, sy, sz, cast = false, recv = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = cast;
  m.receiveShadow = recv;
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------- Khu phố & hạ tầng đường giao nhau
export function buildSurroundingCity(THREE, cityAssets, natureAssets, sgAssets, hdAssets, mats, plan, streetZ, anim, physics) {
  const g = cityAssets.geos;
  const regBox = (x0, z0, x1, z1, tag) => { if (physics) physics.addBox("outdoor", x0, z0, x1, z1, tag); };
  const regOBox = (cx, cz, hl, hw, ry, tag) => { if (physics) physics.addOrientedBox("outdoor", cx, cz, hl, hw, ry, tag); };
  const regCircle = (cx, cz, r, tag) => { if (physics) physics.addCircle("outdoor", cx, cz, r, tag); };
  const root = new THREE.Group();
  const pad = plan.levels ? 6 : 4;
  const W = plan.W;
  const eastRoadX = W + pad + 5.2; // tâm đại lộ nhánh Đông (rộng 6.8m: +1.8..+8.6)
  const westRoadX = -6.6;          // tâm đại lộ nhánh Tây (rộng 6.8m: -10.0..-3.2)
  const northRoadZ = -6.4;         // tâm đường phố Bắc (rộng 6.4m: -9.6..-3.2)
  const mainRoadZ = streetZ + 5.9; // tâm đại lộ chính phía Nam

  // Vật liệu phát sáng linh hoạt theo chế độ ánh sáng Ngày / Hoàng hôn / Ban đêm
  const winWarmA = mats.freshStandard("#fef3c7", { roughness: 0.16, metalness: 0.18, emissive: "#fbbf24", emissiveIntensity: 0.08 });
  const winWarmB = mats.freshStandard("#fde68a", { roughness: 0.18, metalness: 0.15, emissive: "#f59e0b", emissiveIntensity: 0.08 });
  const winCool = mats.freshStandard("#e0f2fe", { roughness: 0.14, metalness: 0.22, emissive: "#7dd3fc", emissiveIntensity: 0.06 });
  const winDark = mats.physical("#25364a", { roughness: 0.12, metalness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  const shopGlow = mats.freshStandard("#fffbeb", { roughness: 0.14, emissive: "#fde68a", emissiveIntensity: 0.28 });
  const lampGlobe = mats.freshStandard("#fffbeb", { roughness: 0.18, emissive: "#fde68a", emissiveIntensity: 0.22 });
  const beaconMat = mats.freshStandard("#ef4444", { roughness: 0.15, emissive: "#ef4444", emissiveIntensity: 0.25 });
  const signMats = [
    mats.freshStandard("#0ea5e9", { roughness: 0.2, emissive: "#38bdf8", emissiveIntensity: 0.45 }),
    mats.freshStandard("#f97316", { roughness: 0.2, emissive: "#fb923c", emissiveIntensity: 0.45 }),
    mats.freshStandard("#10b981", { roughness: 0.2, emissive: "#34d399", emissiveIntensity: 0.45 }),
    mats.freshStandard("#ec4899", { roughness: 0.2, emissive: "#f472b6", emissiveIntensity: 0.42 }),
  ];

  // 1. Nền đô thị mở rộng + mạng lưới đường phố 4 hướng bao quanh khối nhà X-Office
  const urbanBase = mats.standard("#9499a1", { roughness: 0.94 });
  const ground = new THREE.Mesh(g.unitPlane, urbanBase);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(W / 2, -0.068, streetZ / 2 + 4);
  ground.scale.set(250, 250, 1);
  ground.receiveShadow = true;
  root.add(ground);

  const roadMat = mats.standard("#8a919c", { roughness: 0.88, tex: "road", normal: 0.6, roughMap: true });
  const swMat = mats.standard("#dedad2", { roughness: 0.86, tex: "sidewalk", normal: 0.45 });
  const curbMat = mats.standard("#a8a29e", { roughness: 0.84, tex: "stone" });
  const stripeMat = mats.standard("#f1f5f9", { roughness: 0.72, polygonOffset: true, offsetUnits: -2 });
  const centerStripeMat = mats.standard("#e5a93c", { roughness: 0.72, polygonOffset: true, offsetUnits: -2 });

  const addRoad = (x, z, sx, sz, y = -0.036) => {
    const m = new THREE.Mesh(g.unitPlane, roadMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.scale.set(sx, sz, 1);
    m.receiveShadow = true;
    root.add(m);
  };
  const addBlockSlab = (x, z, sx, sz) => {
    putBox(THREE, root, g.unitBox, swMat, x, -0.048, z, sx, 0.08, sz, false, true);
  };

  // Kéo dài đại lộ chính về hai phía Tây & Đông + 3 tuyến đường bao quanh khu phố
  addRoad(W / 2, mainRoadZ, 210, 7.2, -0.038);
  addRoad(W / 2, northRoadZ, 210, 6.4, -0.036);
  addRoad(westRoadX, streetZ / 2 + 4, 6.8, 160, -0.035);
  addRoad(eastRoadX, streetZ / 2 + 4, 6.8, 160, -0.035);

  // Vạch phân làn vàng ấm & vạch trắng ngã tư
  const addDash = (x, z, sx, sz, mat = stripeMat) => {
    const ln = new THREE.Mesh(g.unitPlane, mat);
    ln.rotation.x = -Math.PI / 2;
    ln.position.set(x, -0.02, z);
    ln.scale.set(sx, sz, 1);
    root.add(ln);
  };
  for (let x = -72; x < -12; x += 4.6) {
    if (Math.abs(x - westRoadX) < 6.0) continue;
    addDash(x, mainRoadZ, 2.2, 0.16, centerStripeMat);
    addDash(x, northRoadZ, 2.0, 0.15, centerStripeMat);
  }
  for (let x = eastRoadX + 6; x < eastRoadX + 64; x += 4.6) {
    addDash(x, mainRoadZ, 2.2, 0.16, centerStripeMat);
    addDash(x, northRoadZ, 2.0, 0.15, centerStripeMat);
  }
  for (let x = -1; x < W + pad; x += 4.6) addDash(x, northRoadZ, 2.0, 0.15, centerStripeMat);
  for (let z = -54; z < streetZ + 52; z += 4.6) {
    if (Math.abs(z - mainRoadZ) < 6.5 || Math.abs(z - northRoadZ) < 6.0) continue;
    addDash(westRoadX, z, 0.16, 2.2, centerStripeMat);
    addDash(eastRoadX, z, 0.16, 2.2, centerStripeMat);
  }

  // Vạch qua đường & vạch dừng đèn đỏ tại cả 4 ngã tư (Tây-Nam, Đông-Nam, Tây-Bắc, Đông-Bắc)
  for (const [ix, iz] of [
    [westRoadX, mainRoadZ],
    [eastRoadX, mainRoadZ],
    [westRoadX, northRoadZ],
    [eastRoadX, northRoadZ],
  ]) {
    const rw = iz === mainRoadZ ? 6.2 : 5.4;
    // Vạch qua đường hai đầu Đông-Tây của ngã tư
    for (const dx of [-4.4, 4.4]) {
      for (let k = -2; k <= 2; k++) addDash(ix + dx, iz + k * (rw / 5.2), 1.35, 0.42);
    }
    // Vạch qua đường hai đầu Bắc-Nam của ngã tư
    for (const dz of [-4.6, 4.6]) {
      for (let k = -2; k <= 2; k++) addDash(ix + k * 1.15, iz + dz, 0.42, 1.35);
    }
    // Vạch trắng dừng đèn đỏ 4 hướng trước ngã tư
    addDash(ix - 5.8, iz + (iz === mainRoadZ ? 1.75 : 1.55), 0.28, 2.9);
    addDash(ix + 5.8, iz - (iz === mainRoadZ ? 1.75 : 1.55), 0.28, 2.9);
    addDash(ix - 1.65, iz - 5.9, 2.8, 0.28);
    addDash(ix + 1.65, iz + 5.9, 2.8, 0.28);
  }

  // Vỉa hè các ô phố xung quanh (Bắc, Tây, Đông, Nam và 4 ô góc — mép khớp chuẩn với vỉa hè đại lộ, không đội người đi bộ)
  const blockW = W + pad + 4.4;
  const blockCx = (W + pad - 2.0) / 2;
  addBlockSlab(blockCx, streetZ + 30.72, blockW, 38);            // Ô phố Nam (bắt đầu ngay sau vỉa hè Nam Z = streetZ + 11.72)
  addBlockSlab(blockCx, -29.5, blockW, 38);                      // Ô phố Bắc (sau lưng văn phòng)
  addBlockSlab(-29.5, streetZ / 2 - 1.5, 38, streetZ + 2.5);     // Ô phố Tây
  addBlockSlab(eastRoadX + 22.8, streetZ / 2 - 1.5, 38, streetZ + 2.5); // Ô phố Đông
  addBlockSlab(-29.5, -29.5, 38, 38);                            // Ô góc Tây-Bắc
  addBlockSlab(eastRoadX + 22.8, -29.5, 38, 38);                 // Ô góc Đông-Bắc
  addBlockSlab(-29.5, streetZ + 30.72, 38, 38);                  // Ô góc Tây-Nam
  addBlockSlab(eastRoadX + 22.8, streetZ + 30.72, 38, 38);       // Ô góc Đông-Nam

  // Gom toàn bộ ô cửa sổ của khu phố vào 4 danh sách InstancedMesh để dựng 1.000+ cửa sổ mà siêu mượt 60fps
  const winBuckets = { warmA: [], warmB: [], cool: [], dark: [] };
  const dummy = new THREE.Object3D();
  const pushWin = (bucket, x, y, z, sx, sy, sz) => {
    winBuckets[bucket].push([x, y, z, sx, sy, sz]);
  };
  const pickWin = (seed, style) => {
    const r = rnd(seed);
    if (style === "tower") {
      if (r > 0.66) return "cool";
      if (r > 0.42) return "warmA";
      return "dark";
    }
    if (r > 0.64) return "warmA";
    if (r > 0.44) return "warmB";
    if (r > 0.34) return "cool";
    return "dark";
  };

  // Hàm dựng từng mẫu công trình kiến trúc thật (nhà phố, shophouse, chung cư, cao ốc kính, quán cà phê)
  const trimDark = mats.standard("#334155", { roughness: 0.42, metalness: 0.48 });
  const trimLight = mats.standard("#e2e8f0", { roughness: 0.62 });
  const metalMat = mats.standard("#94a3b8", { roughness: 0.28, metalness: 0.78 });
  const woodMat = mats.standard("#9a6539", { roughness: 0.68, tex: "wood" });
  const roofDark = mats.standard("#475569", { roughness: 0.78 });
  const terracottaTile = mats.standard("#b4532a", { roughness: 0.76 });
  const slateTile = mats.standard("#334155", { roughness: 0.74 });
  const bushMat = mats.standard("#2f855a", { roughness: 0.82 });
  const railGlass = mats.physical("#93c5fd", { roughness: 0.1, clearcoat: 0.9, transparent: true, opacity: 0.42 });
  const whiteCloth = mats.standard("#f8fafc", { roughness: 0.75 });

  function addRooftopDetails(cx, topY, cz, bw, bd, seed, tall) {
    // Tường lan can mái + bồn nước inox / cục nóng điều hoà / giàn hoa sân thượng
    putBox(THREE, root, g.unitBox, trimLight, cx, topY + 0.18, cz + bd / 2 - 0.12, bw + 0.08, 0.36, 0.24);
    putBox(THREE, root, g.unitBox, trimLight, cx, topY + 0.18, cz - bd / 2 + 0.12, bw + 0.08, 0.36, 0.24);
    putBox(THREE, root, g.unitBox, trimLight, cx - bw / 2 + 0.12, topY + 0.18, cz, 0.24, 0.36, bd);
    putBox(THREE, root, g.unitBox, trimLight, cx + bw / 2 - 0.12, topY + 0.18, cz, 0.24, 0.36, bd);

    const k = rnd(seed * 7.3);
    if (tall) {
      // Tum kỹ thuật + ăng-ten + đèn báo hàng không nhấp nháy đỏ
      putBox(THREE, root, g.unitBox, roofDark, cx - bw * 0.12, topY + 0.9, cz - bd * 0.1, bw * 0.42, 1.8, bd * 0.38);
      const mast = new THREE.Mesh(g.unitCyl, metalMat);
      mast.position.set(cx + bw * 0.18, topY + 2.1, cz);
      mast.scale.set(0.08, 4.2, 0.08);
      root.add(mast);
      const bc = new THREE.Mesh(g.dome, beaconMat);
      bc.position.set(cx + bw * 0.18, topY + 4.25, cz);
      bc.scale.setScalar(0.24);
      root.add(bc);
    } else if (k > 0.55) {
      // Bồn nước inox + 2 cục điều hoà
      const tank = new THREE.Mesh(g.unitCyl, metalMat);
      tank.position.set(cx - bw * 0.22, topY + 0.65, cz - bd * 0.15);
      tank.scale.set(0.85, 1.15, 0.85);
      root.add(tank);
      putBox(THREE, root, g.unitBox, trimLight, cx + bw * 0.18, topY + 0.42, cz + bd * 0.15, 0.95, 0.68, 0.62);
      putBox(THREE, root, g.unitBox, trimLight, cx + bw * 0.18, topY + 0.42, cz - bd * 0.18, 0.85, 0.62, 0.56);
    } else if (k > 0.25) {
      // Giàn pergola gỗ + cây xanh sân thượng
      for (const sx of [-bw * 0.24, bw * 0.24]) {
        for (const sz of [-bd * 0.2, bd * 0.2]) {
          putBox(THREE, root, g.unitBox, woodMat, cx + sx, topY + 0.85, cz + sz, 0.14, 1.7, 0.14);
        }
      }
      putBox(THREE, root, g.unitBox, woodMat, cx, topY + 1.72, cz, bw * 0.56, 0.12, bd * 0.48);
      putBox(THREE, root, g.unitBox, bushMat, cx - bw * 0.28, topY + 0.42, cz + bd * 0.3, 0.9, 0.55, 0.55);
      putBox(THREE, root, g.unitBox, bushMat, cx + bw * 0.28, topY + 0.42, cz + bd * 0.3, 0.9, 0.55, 0.55);
    } else {
      // Tấm pin năng lượng mặt trời nghiêng
      const panelMat = mats.physical("#1e3a5f", { roughness: 0.16, metalness: 0.65, clearcoat: 0.9 });
      for (let p = -1; p <= 1; p += 2) {
        const sp = putBox(THREE, root, g.unitBox, panelMat, cx + p * bw * 0.2, topY + 0.42, cz, bw * 0.32, 0.08, bd * 0.46);
        sp.rotation.x = 0.24;
      }
    }
  }

  function addAwning(cx, y, cz, width, depth, color, alongZ = false) {
    const colMat = mats.standard(color, { roughness: 0.72 });
    const stripes = Math.max(4, Math.round(width / 0.65));
    const sw = width / stripes;
    for (let i = 0; i < stripes; i++) {
      const mat = i % 2 === 0 ? colMat : whiteCloth;
      if (!alongZ) {
        const m = putBox(THREE, root, g.unitBox, mat, cx - width / 2 + (i + 0.5) * sw, y, cz, sw * 0.98, 0.12, depth, true, false);
        m.rotation.x = 0.28;
      } else {
        const m = putBox(THREE, root, g.unitBox, mat, cx, y, cz - width / 2 + (i + 0.5) * sw, depth, 0.12, sw * 0.98, true, false);
        m.rotation.z = -0.28;
      }
    }
  }

  function addBuilding(spec) {
    const {
      x, z, w, d, h, style, color, accent, face = "south", seed = 1, cast = false, pitched = false, signIdx = -1,
    } = spec;
    regBox(x - w / 2 - 0.18, z - d / 2 - 0.18, x + w / 2 + 0.18, z + d / 2 + 0.18, "bldg");
    const wallMat = mats.standard(color, { roughness: 0.82, tex: "plaster", bump: 0.014 });
    const accentMat = mats.standard(accent || "#475569", { roughness: 0.6 });
    const floors = Math.max(1, Math.round(h / 3.15));
    const flH = h / floors;

    // Khối chính + chân đế đá kiến trúc
    putBox(THREE, root, g.unitBox, style === "tower" ? winDark : wallMat, x, h / 2, z, w, h, d, cast, true);
    putBox(THREE, root, g.unitBox, curbMat, x, 0.22, z, w + 0.16, 0.44, d + 0.16, false, true);

    if (style === "tower") {
      // Toà cao ốc văn phòng kính có bản sàn bê tông & đố nhôm sắc nét
      for (let f = 1; f <= floors; f++) {
        const fy = f * flH;
        putBox(THREE, root, g.unitBox, trimLight, x, fy - 0.14, z, w + 0.24, 0.28, d + 0.24, false, true);
      }
      // Sảnh tầng trệt kính sáng + mái đón kim loại
      putBox(THREE, root, g.unitBox, shopGlow, x, 1.45, z, w - 0.3, 2.5, d + 0.06, false, false);
      if (face === "south" || face === "north") {
        const fz = face === "south" ? z + d / 2 : z - d / 2;
        const dir = face === "south" ? 1 : -1;
        putBox(THREE, root, g.unitBox, trimDark, x, 3.05, fz + dir * 0.75, Math.min(w * 0.7, 5.2), 0.18, 1.5, false, true);
      }
      // Ô kính các tầng trên (InstancedMesh trên 4 mặt)
      const colsX = Math.max(2, Math.floor(w / 1.9));
      const colsZ = Math.max(2, Math.floor(d / 1.9));
      for (let f = 1; f < floors; f++) {
        const wy = f * flH + flH * 0.48;
        const wh = flH * 0.62;
        for (let c = 0; c < colsX; c++) {
          const wx = x - w / 2 + ((c + 0.5) / colsX) * w;
          const bw = (w / colsX) * 0.72;
          const bk1 = pickWin(seed * 37 + f * 13 + c, "tower");
          const bk2 = pickWin(seed * 53 + f * 17 + c, "tower");
          pushWin(bk1, wx, wy, z + d / 2 + 0.03, bw, wh, 0.05);
          pushWin(bk2, wx, wy, z - d / 2 - 0.03, bw, wh, 0.05);
        }
        for (let c = 0; c < colsZ; c++) {
          const wz = z - d / 2 + ((c + 0.5) / colsZ) * d;
          const bd = (d / colsZ) * 0.72;
          const bk3 = pickWin(seed * 71 + f * 19 + c, "tower");
          const bk4 = pickWin(seed * 89 + f * 23 + c, "tower");
          pushWin(bk3, x + w / 2 + 0.03, wy, wz, 0.05, wh, bd);
          pushWin(bk4, x - w / 2 - 0.03, wy, wz, 0.05, wh, bd);
        }
      }
      addRooftopDetails(x, h, z, w, d, seed, true);
      return;
    }

    // Mặt tiền tầng trệt (cửa hàng / quán cà phê / shophouse có kính ấm, mái hiên sọc, biển hiệu phát sáng)
    const isFrontZ = face === "south" || face === "north";
    const fDir = face === "south" || face === "east" ? 1 : -1;
    if (style === "shophouse" || style === "cafe") {
      if (isFrontZ) {
        const fz = z + fDir * (d / 2);
        putBox(THREE, root, g.unitBox, shopGlow, x, 1.45, fz + fDir * 0.03, w * 0.78, 2.3, 0.06, false, false);
        putBox(THREE, root, g.unitBox, trimDark, x, 2.66, fz + fDir * 0.06, w * 0.84, 0.14, 0.12);
        addAwning(x, 2.62, fz + fDir * 0.78, w * 0.84, 1.4, accent || "#c2410c", false);
        if (signIdx >= 0) {
          putBox(THREE, root, g.unitBox, signMats[signIdx % signMats.length], x, 3.1, fz + fDir * 0.1, w * 0.68, 0.44, 0.12);
        }
      } else {
        const fx = x + fDir * (w / 2);
        putBox(THREE, root, g.unitBox, shopGlow, fx + fDir * 0.03, 1.45, z, 0.06, 2.3, d * 0.78, false, false);
        putBox(THREE, root, g.unitBox, trimDark, fx + fDir * 0.06, 2.66, z, 0.12, 0.14, d * 0.84);
        addAwning(fx + fDir * 0.78, 2.62, z, d * 0.84, 1.4, accent || "#0f766e", true);
        if (signIdx >= 0) {
          putBox(THREE, root, g.unitBox, signMats[signIdx % signMats.length], fx + fDir * 0.1, 3.1, z, 0.12, 0.44, d * 0.68);
        }
      }
    } else if (style === "apartment") {
      // Lam gỗ đứng & chỉ tường kiến trúc hiện đại cho chung cư
      for (const sx of [-w * 0.38, w * 0.38]) {
        putBox(THREE, root, g.unitBox, woodMat, x + sx, h * 0.54, z + d / 2 + 0.06, 0.24, h * 0.76, 0.12);
        putBox(THREE, root, g.unitBox, woodMat, x + sx, h * 0.54, z - d / 2 - 0.06, 0.24, h * 0.76, 0.12);
      }
      putBox(THREE, root, g.unitBox, shopGlow, x, 1.4, z + (face === "north" ? -d / 2 - 0.03 : d / 2 + 0.03), w * 0.42, 2.3, 0.06);
    }

    // Các tầng trên: gờ phào, ban công có lan can kính & chậu cây + lưới cửa sổ sáng ấm
    const colsX = Math.max(2, Math.floor(w / 2.2));
    const colsZ = Math.max(2, Math.floor(d / 2.4));
    const startFloor = style === "shophouse" || style === "cafe" ? 1 : 0;
    for (let f = startFloor; f < floors; f++) {
      const fy = f * flH;
      if (f > 0) {
        putBox(THREE, root, g.unitBox, accentMat, x, fy + 0.08, z, w + 0.14, 0.16, d + 0.14, false, true);
      }
      const wy = fy + flH * 0.54;
      const wh = Math.min(1.55, flH * 0.52);
      // Cửa sổ mặt Nam & Bắc
      for (let c = 0; c < colsX; c++) {
        const wx = x - w / 2 + ((c + 0.5) / colsX) * w;
        const ww = Math.min(1.25, (w / colsX) * 0.58);
        if (f > 0 || face !== "south") pushWin(pickWin(seed * 19 + f * 11 + c, style), wx, wy, z + d / 2 + 0.03, ww, wh, 0.05);
        if (f > 0 || face !== "north") pushWin(pickWin(seed * 29 + f * 13 + c, style), wx, wy, z - d / 2 - 0.03, ww, wh, 0.05);
      }
      // Cửa sổ mặt Đông & Tây
      for (let c = 0; c < colsZ; c++) {
        const wz = z - d / 2 + ((c + 0.5) / colsZ) * d;
        const wd = Math.min(1.25, (d / colsZ) * 0.56);
        if (f > 0 || face !== "east") pushWin(pickWin(seed * 41 + f * 7 + c, style), x + w / 2 + 0.03, wy, wz, 0.05, wh, wd);
        if (f > 0 || face !== "west") pushWin(pickWin(seed * 47 + f * 9 + c, style), x - w / 2 - 0.03, wy, wz, 0.05, wh, wd);
      }
      // Ban công vươn ra mặt chính ở tầng trên + cây xanh bồn hoa
      if (f >= 1 && (style === "apartment" || style === "townhouse" || style === "shophouse")) {
        if (isFrontZ) {
          const bz = z + fDir * (d / 2 + 0.45);
          putBox(THREE, root, g.unitBox, trimLight, x, fy + 0.08, bz, w * 0.72, 0.14, 0.9, false, true);
          putBox(THREE, root, g.unitBox, railGlass, x, fy + 0.56, z + fDir * (d / 2 + 0.86), w * 0.72, 0.82, 0.05, false, false);
          putBox(THREE, root, g.unitBox, trimDark, x, fy + 0.98, z + fDir * (d / 2 + 0.86), w * 0.74, 0.06, 0.08);
          if ((f + Math.round(seed)) % 2 === 0) {
            putBox(THREE, root, g.unitBox, bushMat, x - w * 0.2, fy + 0.34, bz, 0.85, 0.38, 0.38);
          }
        } else {
          const bx = x + fDir * (w / 2 + 0.45);
          putBox(THREE, root, g.unitBox, trimLight, bx, fy + 0.08, z, 0.9, 0.14, d * 0.72, false, true);
          putBox(THREE, root, g.unitBox, railGlass, x + fDir * (w / 2 + 0.86), fy + 0.56, z, 0.05, 0.82, d * 0.72, false, false);
          putBox(THREE, root, g.unitBox, trimDark, x + fDir * (w / 2 + 0.86), fy + 0.98, z, 0.08, 0.06, d * 0.74);
        }
      }
    }

    // Mái ngói chóp hoặc sân thượng đầy đủ chi tiết
    if (pitched) {
      const roof = new THREE.Mesh(g.pitchedRoof, rnd(seed * 3.1) > 0.45 ? terracottaTile : slateTile);
      roof.position.set(x, h + 1.15, z);
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(w + 0.4, 2.3, d + 0.4);
      roof.castShadow = cast;
      roof.receiveShadow = true;
      root.add(roof);
    } else {
      addRooftopDetails(x, h, z, w, d, seed, false);
    }
  }

  // ---------------------------------------------------------------- Ngoại thất đường phố: bàn dù cà phê, trạm buýt, công viên, đèn đường
  const cafeSetParsed = hdAssets && hdAssets.get("cafe_set");
  const lampParsed = hdAssets && hdAssets.get("streetlamp");

  function addCafeUmbrella(cx, cz, color) {
    regCircle(cx, cz, 0.92, "cafe");
    if (cafeSetParsed) {
      const inst = instantiateGLB(THREE, cafeSetParsed, { targetHeight: 1.05 });
      inst.group.position.set(cx, 0, cz);
      root.add(inst.group);
    } else {
      putBox(THREE, root, g.unitCyl, trimDark, cx, 0.38, cz, 0.12, 0.76, 0.12);
      putBox(THREE, root, g.unitCyl, woodMat, cx, 0.76, cz, 0.92, 0.06, 0.92, true, true);
      for (const [dx, dz] of [[-0.65, 0], [0.65, 0]]) {
        putBox(THREE, root, g.unitBox, woodMat, cx + dx, 0.44, cz + dz, 0.38, 0.06, 0.38);
        putBox(THREE, root, g.unitBox, trimDark, cx + dx, 0.22, cz + dz, 0.32, 0.44, 0.32);
      }
    }
    putBox(THREE, root, g.unitCyl, metalMat, cx, 1.48, cz, 0.05, 1.45, 0.05);
    const umb = new THREE.Mesh(g.umbrellaTop, mats.standard(color, { roughness: 0.72 }));
    umb.position.set(cx, 2.24, cz);
    umb.castShadow = true;
    root.add(umb);
  }

  function addCityLamp(lx, lz) {
    regCircle(lx, lz, 0.25, "lamp");
    if (lampParsed) {
      const inst = instantiateGLB(THREE, lampParsed, { targetHeight: 4.1 });
      inst.group.position.set(lx, 0, lz);
      root.add(inst.group);
      const gl = new THREE.Mesh(g.dome, lampGlobe);
      gl.position.set(lx, 3.85, lz);
      gl.scale.setScalar(0.24);
      root.add(gl);
      return;
    }
    putBox(THREE, root, g.unitCyl, trimDark, lx, 1.85, lz, 0.12, 3.7, 0.12);
    putBox(THREE, root, g.unitBox, trimDark, lx, 3.65, lz, 0.55, 0.08, 0.08);
    const gl = new THREE.Mesh(g.dome, lampGlobe);
    gl.position.set(lx, 3.82, lz);
    gl.scale.setScalar(0.32);
    root.add(gl);
  }

  // ---------------------------------------------------------------- 2. Ô PHỐ PHÍA NAM (đối diện đại lộ — đổ bóng thật xuống lòng đường nhựa)
  const sfZ = streetZ + 17.8; // mặt trước ở streetZ + 13.8 (cách vỉa hè Nam 2m dành cho patio cà phê!)
  const southFront = [
    { x: 3.4, z: sfZ, w: 8.0, d: 8.0, h: 4.8, style: "cafe", color: "#f6eadb", accent: "#c2410c", face: "north", seed: 101, signIdx: 1, cast: true },
    { x: 11.8, z: sfZ, w: 7.4, d: 7.8, h: 5.4, style: "shophouse", color: "#eef2f6", accent: "#0284c7", face: "north", seed: 102, signIdx: 0, cast: true },
    // (X = 16.2 .. 25.0 để mở cho Công viên tiểu cảnh + Đài phun nước + Trạm xe buýt!)
    { x: 29.0, z: sfZ, w: 7.2, d: 7.8, h: 5.0, style: "cafe", color: "#f5efe6", accent: "#15803d", face: "north", seed: 103, signIdx: 2, cast: true },
    { x: 36.2, z: sfZ, w: 6.2, d: 7.8, h: 5.6, style: "shophouse", color: "#e8dfd5", accent: "#9a3412", face: "north", seed: 104, pitched: true, cast: true },
    { x: 43.2, z: sfZ, w: 6.8, d: 7.8, h: 5.2, style: "shophouse", color: "#f1f5f9", accent: "#1d4ed8", face: "north", seed: 105, signIdx: 3, cast: true },
  ];
  for (const b of southFront) addBuilding(b);

  // Patio bàn dù cà phê ngoài trời trước 2 quán cà phê đối diện đại lộ
  addCafeUmbrella(1.2, streetZ + 12.6, "#ea580c");
  addCafeUmbrella(4.2, streetZ + 12.6, "#dc2626");
  addCafeUmbrella(27.2, streetZ + 12.6, "#15803d");
  addCafeUmbrella(30.4, streetZ + 12.6, "#0d9488");

  // Công viên nhỏ & đài phun nước ở giữa ô phố Nam (X = 16.4..24.8, Z = streetZ + 12.2..22.6)
  const parkLawn = mats.standard("#6fa65a", { roughness: 0.94, tex: "grass" });
  putBox(THREE, root, g.unitBox, parkLawn, 20.6, 0.04, streetZ + 17.4, 8.4, 0.08, 10.2, false, true);
  putBox(THREE, root, g.unitBox, swMat, 20.6, 0.055, streetZ + 17.4, 2.0, 0.08, 10.2, false, true);
  putBox(THREE, root, g.unitBox, swMat, 20.6, 0.055, streetZ + 17.4, 8.4, 0.08, 2.0, false, true);
  // Đài phun nước đá 2 tầng + mặt nước xanh sáng
  const stoneMat = mats.standard("#d6d3d1", { roughness: 0.72, tex: "stone" });
  const fountainWater = mats.physical("#38bdf8", { roughness: 0.06, clearcoat: 1.0, emissive: "#0ea5e9", emissiveIntensity: 0.35 });
  const basin = new THREE.Mesh(g.fountainBasin, stoneMat);
  basin.position.set(20.6, 0.31, streetZ + 17.4);
  basin.castShadow = basin.receiveShadow = true;
  const fWater = new THREE.Mesh(g.unitCyl, fountainWater);
  fWater.position.set(20.6, 0.5, streetZ + 17.4);
  fWater.scale.set(2.45, 0.08, 2.45);
  const fPed = new THREE.Mesh(g.unitCyl, stoneMat);
  fPed.position.set(20.6, 0.92, streetZ + 17.4);
  fPed.scale.set(0.36, 0.95, 0.36);
  const fTier = new THREE.Mesh(g.fountainTier, stoneMat);
  fTier.position.set(20.6, 1.38, streetZ + 17.4);
  const fJet = new THREE.Mesh(g.unitCyl, mats.physical("#e0f2fe", { roughness: 0.1, transparent: true, opacity: 0.75, emissive: "#bae6fd", emissiveIntensity: 0.45 }));
  fJet.position.set(20.6, 1.85, streetZ + 17.4);
  fJet.scale.set(0.14, 0.78, 0.14);
  root.add(basin, fWater, fPed, fTier, fJet);
  regCircle(20.6, streetZ + 17.4, 1.62, "fountain");
  // Ghế công viên + cây xanh + hoa công viên
  const benchParsed = hdAssets && hdAssets.get("bench");
  const shrubParsed = hdAssets && hdAssets.get("shrub");
  const planterParsed = hdAssets && hdAssets.get("planter_box");
  for (const [bx, bz, ry] of [[17.8, streetZ + 15.2, 0], [23.4, streetZ + 19.6, Math.PI]]) {
    regBox(bx - 0.92, bz - 0.35, bx + 0.92, bz + 0.35, "bench");
    if (benchParsed) {
      const inst = instantiateGLB(THREE, benchParsed, { targetLength: 1.75 });
      inst.group.position.set(bx, 0, bz);
      inst.group.rotation.y = ry;
      root.add(inst.group);
    } else {
      putBox(THREE, root, g.unitBox, woodMat, bx, 0.45, bz, 1.7, 0.1, 0.52);
    }
  }
  root.add(buildTree(THREE, natureAssets, mats, { x: 16.6, y: streetZ + 19.4, color: "#2f855a", scale: 0.92 }, anim));
  regCircle(17.6, streetZ + 20.4, 0.48, "tree");
  root.add(buildTree(THREE, natureAssets, mats, { x: 22.6, y: streetZ + 13.4, color: "#3b8f4f", scale: 0.88 }, anim));
  regCircle(23.6, streetZ + 14.4, 0.48, "tree");
  root.add(buildFlowerbed(THREE, natureAssets, mats, 17.8, streetZ + 13.4, "#f43f5e"));
  root.add(buildFlowerbed(THREE, natureAssets, mats, 23.4, streetZ + 21.0, "#facc15"));
  if (shrubParsed) {
    for (const [sx, sz, h] of [[17.5, streetZ + 13.8, 0.85], [23.5, streetZ + 20.6, 0.9]]) {
      const inst = instantiateGLB(THREE, shrubParsed, { targetHeight: h });
      inst.group.position.set(sx, 0, sz);
      root.add(inst.group);
      regCircle(sx, sz, 0.45, "shrub");
    }
  }
  if (planterParsed) {
    for (const [px, pz] of [[18.6, streetZ + 12.6], [22.6, streetZ + 12.6]]) {
      const inst = instantiateGLB(THREE, planterParsed, { targetLength: 1.25 });
      inst.group.position.set(px, 0, pz);
      root.add(inst.group);
      regBox(px - 0.65, pz - 0.38, px + 0.65, pz + 0.38, "planter");
    }
  }

  // Trạm dừng xe buýt kính đặt lệch sang trái để chừa thoáng trọn vẹn lối vào công viên (X = 19.6..21.6)
  const busX = 16.8, busZ = streetZ + 11.7;
  putBox(THREE, root, g.unitBox, trimDark, busX, 2.38, busZ, 3.2, 0.12, 1.35, true, true);
  putBox(THREE, root, g.unitBox, railGlass, busX, 1.24, busZ + 0.58, 2.95, 2.15, 0.06);
  for (const bx of [busX - 1.48, busX + 1.48]) putBox(THREE, root, g.unitBox, trimDark, bx, 1.2, busZ + 0.55, 0.09, 2.35, 0.09);
  putBox(THREE, root, g.unitBox, woodMat, busX, 0.52, busZ + 0.35, 2.2, 0.09, 0.42);
  putBox(THREE, root, g.unitBox, signMats[0], busX + 1.54, 1.55, busZ, 0.14, 1.15, 0.72);
  regBox(busX - 1.65, busZ + 0.15, busX + 1.65, busZ + 0.68, "shelter");

  // Hàng nhà phố & chung cư lớp thứ 2 phía Nam (Z = streetZ + 31.5 — khi xoay 360° thấy khu phố dày đặc)
  const s2Z = streetZ + 32.0;
  const southBack = [
    { x: 3.5, z: s2Z, w: 9.0, d: 10.5, h: 11.5, style: "apartment", color: "#ede9e0", accent: "#64748b", face: "north", seed: 111 },
    { x: 13.0, z: s2Z, w: 8.2, d: 9.5, h: 9.6, style: "townhouse", color: "#f3e5d8", accent: "#b45309", face: "north", seed: 112, pitched: true },
    { x: 22.0, z: s2Z, w: 8.6, d: 10.0, h: 12.6, style: "apartment", color: "#e6ecf2", accent: "#334155", face: "north", seed: 113 },
    { x: 31.5, z: s2Z, w: 8.2, d: 9.5, h: 10.2, style: "townhouse", color: "#e5ece6", accent: "#0f766e", face: "north", seed: 114, pitched: true },
    { x: 41.2, z: s2Z, w: 9.2, d: 10.5, h: 13.0, style: "apartment", color: "#f1ede4", accent: "#475569", face: "north", seed: 115 },
  ];
  for (const b of southBack) addBuilding(b);

  // ---------------------------------------------------------------- 3. Ô PHỐ PHÍA BẮC (hậu cảnh chính sau lưng văn phòng — cao ốc, chung cư, nhà phố!)
  const n1Z = -16.8;
  const northFront = [
    { x: 1.5, z: n1Z, w: 7.6, d: 9.6, h: 12.8, style: "apartment", color: "#f2ece1", accent: "#475569", face: "south", seed: 201, cast: true },
    { x: 9.2, z: n1Z + 0.4, w: 5.8, d: 8.8, h: 9.8, style: "townhouse", color: "#f5e3d3", accent: "#c2410c", face: "south", seed: 202, pitched: true },
    { x: 15.2, z: n1Z + 0.4, w: 5.4, d: 8.8, h: 11.4, style: "shophouse", color: "#e8eef4", accent: "#0284c7", face: "south", seed: 203, signIdx: 0 },
    { x: 23.2, z: n1Z - 0.8, w: 9.2, d: 10.8, h: 22.5, style: "tower", color: "#2c3e55", accent: "#94a3b8", face: "south", seed: 204 },
    { x: 32.8, z: n1Z + 0.2, w: 8.2, d: 9.2, h: 15.8, style: "apartment", color: "#eef2eb", accent: "#0f766e", face: "south", seed: 205 },
    { x: 40.6, z: n1Z + 0.4, w: 5.8, d: 8.8, h: 10.5, style: "townhouse", color: "#f4eadc", accent: "#b45309", face: "south", seed: 206, pitched: true },
    { x: 46.8, z: n1Z, w: 6.0, d: 9.2, h: 13.6, style: "shophouse", color: "#eceef2", accent: "#1d4ed8", face: "south", seed: 207, signIdx: 1 },
  ];
  for (const b of northFront) addBuilding(b);

  // Lớp cao ốc hậu cảnh phía Bắc (Z = -34) tạo đường chân trời đô thị dày sâu
  const n2Z = -34.0;
  const northBack = [
    { x: -4.0, z: n2Z, w: 10.5, d: 11.5, h: 25.0, style: "tower", color: "#28394f", face: "south", seed: 211 },
    { x: 9.5, z: n2Z - 1.5, w: 11.2, d: 11.8, h: 31.0, style: "tower", color: "#1e3248", face: "south", seed: 212 },
    { x: 22.5, z: n2Z, w: 10.2, d: 10.8, h: 20.5, style: "apartment", color: "#eae6dc", accent: "#475569", face: "south", seed: 213 },
    { x: 35.0, z: n2Z - 2.0, w: 11.5, d: 12.0, h: 28.5, style: "tower", color: "#24374e", face: "south", seed: 214 },
    { x: 47.5, z: n2Z, w: 9.8, d: 10.5, h: 22.0, style: "tower", color: "#2d4057", face: "south", seed: 215 },
  ];
  for (const b of northBack) addBuilding(b);

  // ---------------------------------------------------------------- 4. Ô PHỐ PHÍA TÂY (trái văn phòng, qua đại lộ nhánh Tây — đổ bóng chiều xuống đường!)
  const w1X = -16.8;
  const westRow = [
    { x: w1X + 0.4, z: 3.5, w: 8.6, d: 7.4, h: 13.4, style: "apartment", color: "#f1ece1", accent: "#475569", face: "east", seed: 302, cast: true },
    { x: w1X + 0.6, z: 11.0, w: 8.2, d: 6.2, h: 9.6, style: "townhouse", color: "#f4e2d2", accent: "#c2410c", face: "east", seed: 303, pitched: true, cast: true },
    { x: w1X + 0.6, z: 17.6, w: 8.2, d: 6.0, h: 10.8, style: "shophouse", color: "#e8eff5", accent: "#0f766e", face: "east", seed: 304, signIdx: 2, cast: true },
    { x: w1X + 0.4, z: 24.4, w: 8.6, d: 6.6, h: 8.2, style: "cafe", color: "#f7efe4", accent: "#b91c1c", face: "east", seed: 305, signIdx: 1, cast: true },
    // Góc Tây-Nam (bên kia đại lộ)
    { x: w1X + 0.4, z: sfZ, w: 8.8, d: 8.0, h: 6.2, style: "shophouse", color: "#f2ebe0", accent: "#1d4ed8", face: "north", seed: 306, signIdx: 0, cast: true },
    { x: w1X - 12.0, z: 8.0, w: 10.5, d: 11.0, h: 11.5, style: "tower", color: "#20334a", face: "east", seed: 307 },
    { x: w1X - 12.0, z: 21.0, w: 10.0, d: 10.2, h: 15.6, style: "apartment", color: "#ebe8e0", accent: "#64748b", face: "east", seed: 308 },
  ];
  for (const b of westRow) addBuilding(b);

  // ---------------------------------------------------------------- 5. Ô PHỐ PHÍA ĐÔNG (qua đại lộ nhánh Đông — thấp tầng ở mặt trước, cao dần về Đông-Bắc!)
  const e1X = eastRoadX + 10.2;
  const eastRow = [
    // Góc Đông-Bắc (sau góc nhìn -> cao ốc hiện đại)
    { x: e1X + 0.5, z: -17.5, w: 9.8, d: 10.4, h: 21.0, style: "tower", color: "#273b52", face: "west", seed: 401 },
    { x: e1X + 12.5, z: -17.5, w: 10.4, d: 10.6, h: 26.5, style: "tower", color: "#1e3248", face: "west", seed: 402 },
    { x: e1X + 0.4, z: 2.5, w: 8.6, d: 7.4, h: 12.0, style: "apartment", color: "#f0ece2", accent: "#334155", face: "west", seed: 403, cast: true },
    // Mặt Đông song song sân vườn (h = 5.0..6.2m nên không che vườn hay hồ bơi ở góc nhìn chuẩn!)
    { x: e1X + 0.4, z: 10.2, w: 8.4, d: 6.4, h: 5.8, style: "townhouse", color: "#f4e5d6", accent: "#c2410c", face: "west", seed: 404, pitched: true, cast: true },
    { x: e1X + 0.4, z: 17.0, w: 8.4, d: 6.2, h: 5.2, style: "cafe", color: "#f6efe5", accent: "#15803d", face: "west", seed: 405, signIdx: 2, cast: true },
    { x: e1X + 0.4, z: 23.8, w: 8.4, d: 6.4, h: 5.6, style: "shophouse", color: "#edf2f7", accent: "#0284c7", face: "west", seed: 406, signIdx: 0, cast: true },
    // Góc Đông-Nam (qua ngã tư đại lộ)
    { x: e1X + 0.4, z: sfZ, w: 8.6, d: 8.0, h: 5.4, style: "shophouse", color: "#f2ece2", accent: "#9a3412", face: "north", seed: 407, signIdx: 3, cast: true },
    { x: e1X + 13.0, z: 14.0, w: 9.8, d: 10.4, h: 11.2, style: "apartment", color: "#eae7de", accent: "#475569", face: "west", seed: 408 },
    { x: e1X + 13.0, z: sfZ + 12.0, w: 10.0, d: 10.0, h: 12.5, style: "apartment", color: "#e6ecf2", accent: "#334155", face: "north", seed: 409 },
  ];
  for (const b of eastRow) addBuilding(b);

  // ---------------------------------------------------------------- 6. Hàng cây nhiệt đới dày xanh, cột điện & đường dây võng, xe đỗ ven đường & chi tiết đường phố AAA
  const extraGeos = [];
  const poleWood = mats.standard("#5c4433", { roughness: 0.9, tex: "bark" });
  const wireMat = mats.standard("#18181b", { roughness: 0.65, metalness: 0.35 });
  const ceramicMat = mats.standard("#e2e8f0", { roughness: 0.25 });

  function buildUtilityLine(pts, armAlongZ) {
    const offsets = [-0.56, 0, 0.56];
    for (let idx = 0; idx < pts.length; idx++) {
      const [px, pz] = pts[idx];
      regCircle(px, pz, 0.28, "pole");
      const pole = new THREE.Mesh(g.unitCyl, poleWood);
      pole.position.set(px, 3.7, pz);
      pole.scale.set(0.22, 7.4, 0.22);
      pole.castShadow = pole.receiveShadow = true;
      root.add(pole);
      putBox(
        THREE, root, g.unitBox, trimDark,
        px, 6.9, pz,
        armAlongZ ? 0.14 : 1.45, 0.12, armAlongZ ? 1.45 : 0.14, true, false,
      );
      for (const off of offsets) {
        const ix = armAlongZ ? px : px + off;
        const iz = armAlongZ ? pz + off : pz;
        const ins = new THREE.Mesh(g.unitCyl, ceramicMat);
        ins.position.set(ix, 7.02, iz);
        ins.scale.set(0.08, 0.14, 0.08);
        root.add(ins);
      }
      if (idx % 2 === 1) {
        const xf = new THREE.Mesh(g.unitCyl, metalMat);
        xf.position.set(px + (armAlongZ ? 0.28 : 0), 5.45, pz + (armAlongZ ? 0 : 0.28));
        xf.scale.set(0.42, 0.68, 0.42);
        xf.castShadow = true;
        root.add(xf);
      }
      if (idx > 0) {
        const [qx, qz] = pts[idx - 1];
        for (const off of offsets) {
          const p0 = new THREE.Vector3(armAlongZ ? qx : qx + off, 7.05, armAlongZ ? qz + off : qz);
          const p1 = new THREE.Vector3(armAlongZ ? px : px + off, 7.05, armAlongZ ? pz + off : pz);
          const mid = p0.clone().add(p1).multiplyScalar(0.5);
          mid.y -= 0.42;
          const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, mid, p1]), 10, 0.016, 5, false);
          extraGeos.push(tubeGeo);
          root.add(new THREE.Mesh(tubeGeo, wireMat));
        }
      }
    }
  }

  buildUtilityLine(
    [-26, -11, 6, 22, 38, 54].map((x) => [x, streetZ + 11.48]),
    true,
  );
  buildUtilityLine(
    [-22, -10.8, 2, 16, streetZ + 11.48].map((z) => [-10.9, z]),
    false,
  );

  // Xe ô tô & xe bán tải HD đa sắc màu đỗ tự nhiên dọc lề đường & trước sân nhà phố (1–2 draw call mỗi xe)
  const parkedSpecs = [
    ["veh_delivery", "#f8fafc", 10.8, streetZ + 12.6, 0, 5.85, true],
    ["veh_pickup", "#dc2626", -14.8, streetZ + 12.8, 0.04, 4.95, false],
    ["veh_suv", "#1d4ed8", -22.4, streetZ + 12.7, Math.PI, 4.78, false],
    ["veh_suv", "#059669", 41.2, streetZ + 12.6, Math.PI, 4.75, false],
    ["veh_sedan", "#d97706", -13.0, 14.0, Math.PI / 2, 4.65, false],
    ["veh_sedan", "#7c3aed", eastRoadX + 6.4, 13.8, -Math.PI / 2, 4.65, false],
  ];
  for (const [key, color, px, pz, ry, targetLength, keepWhite] of parkedSpecs) {
    const pv = upgradeVehicleGLB(THREE, natureAssets, mats, hdAssets, key, {
      targetLength,
      rotY: Math.PI / 2,
      color,
      keepWhitePaint: keepWhite,
      parked: true,
    });
    if (pv) {
      pv.root.position.set(px, 0, pz);
      pv.root.rotation.y = ry;
      root.add(pv.root);
      regOBox(px, pz, targetLength * 0.5, 1.06, ry, "parked");
    }
  }

  // Hàng rào sân bên & bạt phủ xanh ven vỉa hè khu nhà phố Tây-Nam
  putBox(THREE, root, g.unitBox, mats.standard("#2d4a36", { roughness: 0.78 }), -18.2, 0.52, streetZ + 13.8, 2.8, 1.04, 1.35, true, true);
  regBox(-19.7, streetZ + 13.0, -16.7, streetZ + 14.55, "tarp");
  for (const fx of [-25.5, -23.0, -20.5, -18.0, -15.5, -13.0]) {
    putBox(THREE, root, g.unitBox, trimDark, fx, 0.55, streetZ + 13.2, 0.08, 1.1, 0.08, true, false);
  }
  putBox(THREE, root, g.unitBox, metalMat, -19.25, 0.88, streetZ + 13.2, 12.6, 0.05, 0.05);
  regBox(-25.6, streetZ + 13.05, -12.9, streetZ + 13.35, "fence");

  // Cây tán rộng & cây dừa nhiệt đới đổ bóng dày dặn (đặt chuẩn theo toạ độ tâm thân +1m, tránh hoàn toàn lòng đường & xe đỗ!)
  const southTrees = [
    [-27.5, streetZ + 12.7, true],
    [-11.8, streetZ + 12.7, false],
    [7.8, streetZ + 12.6, false],
    [13.8, streetZ + 12.6, true],
    [24.8, streetZ + 12.6, false],
    [34.2, streetZ + 12.6, true],
    [47.2, streetZ + 12.6, false],
    [eastRoadX + 5.2, streetZ + 12.7, true],
  ];
  for (const [tx, tz, isPalm] of southTrees) {
    root.add(buildTree(THREE, natureAssets, mats, {
      x: tx - 1.0, y: tz - 1.0, color: isPalm ? "#316b3b" : "#285e38", palm: isPalm, scale: isPalm ? 1.25 : 1.05,
    }, anim));
    regCircle(tx, tz, 0.45, "tree");
  }
  for (let x = 2; x <= W + 2; x += 10.5) {
    root.add(buildTree(THREE, natureAssets, mats, { x, y: -11.5, color: x % 2 ? "#2f855a" : "#3b8f4f", scale: 0.95 }, anim));
    regCircle(x + 1.0, -10.5, 0.45, "tree");
    addCityLamp(x + 4.5, -10.3);
  }
  for (const [bx, bz, isPalm] of [[-26, streetZ - 0.8, true], [-18, streetZ - 0.8, false], [-12.5, streetZ - 0.8, true]]) {
    root.add(buildTree(THREE, natureAssets, mats, {
      x: bx - 1.0, y: bz - 1.0, color: "#2d6a3e", palm: isPalm, scale: isPalm ? 1.22 : 1.1,
    }, anim));
    regCircle(bx, bz, 0.45, "tree");
  }
  for (const x of [9.0, 14.8, 25.0, 34.5, 42.5]) {
    addCityLamp(x, streetZ + 11.68);
  }
  for (const z of [-1.0, 8.5, 18.5]) {
    root.add(buildTree(THREE, natureAssets, mats, { x: -14.2, y: z, color: "#3b8f4f", scale: 0.96 }, anim));
    regCircle(-13.2, z + 1.0, 0.45, "tree");
    root.add(buildTree(THREE, natureAssets, mats, { x: eastRoadX + 6.0, y: z, color: "#2f855a", scale: 0.96 }, anim));
    regCircle(eastRoadX + 7.0, z + 1.0, 0.45, "tree");
    addCityLamp(-10.1, z + 4.2);
    addCityLamp(eastRoadX + 4.05, z + 4.2);
  }

  // Nội thất đường phố HD: bảng menu quán cà phê, thùng rác, trụ cứu hoả, tủ điện, cọc tiêu & cục nóng điều hoà
  const placeCityHD = (key, opt, x, y, z, ry = 0, colRad = 0) => {
    const parsed = hdAssets && hdAssets.get(key);
    if (!parsed) return;
    const inst = instantiateGLB(THREE, parsed, opt);
    inst.group.position.set(x, y, z);
    if (ry) inst.group.rotation.y = ry;
    root.add(inst.group);
    if (colRad > 0) regCircle(x, z, colRad, key);
  };
  for (const [cx, cz, ry] of [[5.6, streetZ + 12.2, 0.25], [26.0, streetZ + 12.2, -0.25]]) {
    placeCityHD("chalkboard", { targetHeight: 1.05 }, cx, 0, cz, ry, 0.38);
  }
  for (const [tx, tz] of [[22.2, streetZ + 11.6], [-9.6, streetZ + 2.05], [eastRoadX + 3.6, streetZ + 2.05]]) {
    placeCityHD("trash_can", { targetHeight: 0.88 }, tx, 0, tz, 0, 0.34);
  }
  for (const [fx, fz] of [[-1.8, streetZ + 2.05], [eastRoadX - 4.2, streetZ + 2.05], [25.8, streetZ + 9.75]]) {
    placeCityHD("fire_hydrant", { targetHeight: 0.78 }, fx, 0, fz, 0, 0.28);
  }
  for (const [ux, uz] of [[-13.0, -5.0], [eastRoadX + 6.8, streetZ + 12.0]]) {
    placeCityHD("utility_box", { targetHeight: 1.35 }, ux, 0, uz, 0, 0.48);
  }
  for (const [kx, kz] of [[eastRoadX - 4.8, streetZ + 9.6], [eastRoadX - 4.0, streetZ + 9.6]]) {
    placeCityHD("traffic_cone", { targetHeight: 0.68 }, kx, 0, kz, 0, 0.24);
  }
  for (const [sx, sz, h] of [
    [-13.5, streetZ + 13.4, 0.95],
    [-16.2, streetZ + 13.6, 1.05],
    [-20.5, streetZ + 13.5, 0.88],
    [8.2, streetZ + 12.4, 0.82],
    [14.8, streetZ + 12.4, 0.86],
    [34.0, streetZ + 12.5, 0.92],
  ]) {
    placeCityHD("shrub", { targetHeight: h }, sx, 0, sz, 0, 0.45);
  }
  for (const [fx, fz, h] of [[-12.2, streetZ + 12.9, 0.65], [-19.4, streetZ + 13.1, 0.7], [32.8, streetZ + 12.4, 0.62]]) {
    placeCityHD("fern", { targetHeight: h }, fx, 0, fz, 0, 0.36);
  }
  for (const [px, pz, h] of [[-11.8, streetZ + 13.8, 1.8], [6.4, streetZ + 12.6, 1.65]]) {
    placeCityHD("palm_plant", { targetHeight: h }, px, 0, pz, 0, 0.45);
  }

  for (const [ax, ay, az, ry] of [
    [11.8, 3.2, sfZ - 3.95, Math.PI],
    [36.2, 3.2, sfZ - 3.95, Math.PI],
    [w1X + 4.7, 3.4, 17.6, Math.PI / 2],
    [e1X - 3.85, 3.4, 17.0, -Math.PI / 2],
  ]) {
    placeCityHD("aircon", { targetLength: 0.85 }, ax, ay, az, ry);
  }

  // ---------------------------------------------------------------- 7. Đường chân trời thành phố xa (Skyline silhouette hòa sương mờ tự nhiên)
  const skyTowerMat = mats.standard("#8395aa", { roughness: 0.72, metalness: 0.18 });
  const skyTowerAlt = mats.standard("#6e8199", { roughness: 0.74, metalness: 0.2 });
  const cxMid = W / 2, czMid = streetZ / 2;
  const skylineCount = 28;
  for (let i = 0; i < skylineCount; i++) {
    const ang = (i / skylineCount) * Math.PI * 2 + 0.14;
    // Tránh đặt nhà quá cao chắn góc nhìn mặt Nam-Đông gần
    const frontFactor = Math.sin(ang) > 0.1 && Math.cos(ang) > 0.1 ? 0.52 : 1.0;
    const dist = 68 + rnd(i * 17.3) * 28;
    const sx = cxMid + Math.cos(ang) * dist;
    const sz = czMid + Math.sin(ang) * dist;
    if (Math.hypot(sx + 35, sz + 15.5) < 15 || Math.hypot(sx + 16.5, sz + 18.5) < 13) continue;
    const bw = 7.5 + rnd(i * 23.1) * 8.5;
    const bd = 7.5 + rnd(i * 29.7) * 7.5;
    const bh = (16 + rnd(i * 31.3) * 26) * frontFactor;
    putBox(THREE, root, g.unitBox, i % 2 ? skyTowerMat : skyTowerAlt, sx, bh / 2 - 0.1, sz, bw, bh, bd, false, false);
    // Dải cửa sổ phát sáng tinh tế trên đường chân trời khi hoàng hôn / đêm
    if (bh > 15) {
      for (let f = 2; f < Math.floor(bh / 4.2); f += 2) {
        pushWin(i % 3 === 0 ? "cool" : "warmA", sx, f * 4.2, sz + bd / 2 + 0.06, bw * 0.76, 0.85, 0.06);
        pushWin(i % 3 === 0 ? "warmB" : "cool", sx, f * 4.2, sz - bd / 2 - 0.06, bw * 0.76, 0.85, 0.06);
      }
    }
  }

  // Đóng gói toàn bộ cửa sổ thành đúng 4 InstancedMesh duy nhất -> giữ hiệu năng siêu nhẹ!
  const bucketDefs = [
    ["warmA", winWarmA],
    ["warmB", winWarmB],
    ["cool", winCool],
    ["dark", winDark],
  ];
  for (const [key, mat] of bucketDefs) {
    const arr = winBuckets[key];
    if (!arr.length) continue;
    const inst = new THREE.InstancedMesh(g.unitBox, mat, arr.length);
    for (let i = 0; i < arr.length; i++) {
      const [wx, wy, wz, sx, sy, sz] = arr[i];
      dummy.position.set(wx, wy, wz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    root.add(inst);
  }

  // Công trình biểu tượng Sài Gòn (Tháp Sen + sân đỗ trực thăng, Nhà thờ gạch đỏ hai tháp chuông, cờ Tổ quốc bay ven đại lộ)
  const saigon = sgAssets ? buildSaigonLandmarks(THREE, sgAssets, natureAssets, mats, plan, streetZ, anim) : null;
  if (saigon) root.add(saigon.root);

  return {
    root,
    setMood(mood) {
      const night = mood === "night";
      const sunset = mood === "sunset";
      winWarmA.emissiveIntensity = night ? 1.85 : sunset ? 0.95 : 0.08;
      winWarmB.emissiveIntensity = night ? 1.55 : sunset ? 0.75 : 0.06;
      winCool.emissiveIntensity = night ? 1.45 : sunset ? 0.55 : 0.06;
      shopGlow.emissiveIntensity = night ? 1.8 : sunset ? 1.1 : 0.28;
      lampGlobe.emissiveIntensity = night ? 2.4 : sunset ? 1.45 : 0.18;
      for (const sm of signMats) sm.emissiveIntensity = night ? 2.0 : sunset ? 1.2 : 0.42;
      if (saigon) saigon.setMood(mood);
    },
    animate(t, motion) {
      const pulse = motion ? (Math.sin(t * 3.2) > 0.2 ? 2.5 : 0.25) : 1.0;
      beaconMat.emissiveIntensity = pulse;
      fJet.scale.y = 0.78 + (motion ? Math.sin(t * 6.5) * 0.12 : 0);
      if (saigon) saigon.animate(t, motion);
    },
    dispose() {
      for (const eg of extraGeos) eg.dispose();
      if (saigon) saigon.dispose();
    },
  };
}
