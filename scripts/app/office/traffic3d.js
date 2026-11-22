// Hệ thống giao thông đô thị & cộng đồng NPC sống động quanh X-Office:
// - 12 loại phương tiện HD phủ sơn bóng clearcoat (SUV, sedan, hatchback, taxi, van, xe giao hàng, bán tải,
//   xe cảnh sát, siêu xe Ferrari, xe tải, xe buýt kéo điểm dừng & xe máy kèm người lái).
// - Đèn giao thông 2 pha đồng bộ 18 cột tại nút chính & 4 ngã tư; xe buýt tự ghé trạm đón khách trên đại lộ.
// - 13 công dân Ready Player Me có lịch trình có mục đích (giao hàng tới sảnh, chờ xe buýt, gọi cà phê vỉa hè,
//   dạo công viên đài phun nước, qua vạch đèn đỏ và tiếp tục hành trình qua các tuyến phố).
import { buildWalkerRig, buildHDHuman, buildMotoHDHuman, createScheduledNPC, stepScheduledNPC } from "./human3d.js";
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

// ---------------------------------------------------------------- Đổi màu sơn thân xe trên vân PBR 2K (giữ nguyên lốp đen, la-zăng chrome, kính & đèn)
const RECOLOR_MODES = {
  veh_sedan: "red",
  veh_pickup: "red",
  veh_bus: "red",
  veh_scooter: "cyan",
  veh_suv: "neutral",
  veh_delivery: "neutral",
  veh_van: "neutral",
  veh_moto: "moto",
};
const _recolorTexCache = new WeakMap();

function recolorVehicleTexture(THREE, srcTex, hexColor, mode) {
  if (!srcTex || !srcTex.image || !hexColor || !mode || typeof document === "undefined") return srcTex;
  let byCol = _recolorTexCache.get(srcTex);
  if (!byCol) {
    byCol = new Map();
    _recolorTexCache.set(srcTex, byCol);
  }
  const cacheKey = `${mode}|${hexColor}`;
  if (byCol.has(cacheKey)) return byCol.get(cacheKey);

  const img = srcTex.image;
  const srcW = img.width || 512;
  const srcH = img.height || 512;
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const cw = Math.max(64, Math.round(srcW * scale));
  const ch = Math.max(64, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return srcTex;
  ctx.drawImage(img, 0, 0, cw, ch);

  const imgData = ctx.getImageData(0, 0, cw, ch);
  const d = imgData.data;
  const c = new THREE.Color(hexColor);
  const tr = c.r * 255;
  const tg = c.g * 255;
  const tb = c.b * 255;

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 16) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

    let weight = 0;
    if (mode === "red") {
      // Thân sơn đỏ gốc của sedan/pickup/bus: nhận diện chính xác điểm đỏ đậm, giữ nguyên lốp/kính/chrome
      const excess = r - Math.max(g, b);
      if (excess > 26 && r > 62) weight = Math.min(1, (excess - 22) / 52);
    } else if (mode === "cyan") {
      // Thân sơn xanh ngọc gốc của xe tay ga: nhận diện chính xác điểm cyan/mint, giữ nguyên yên/lốp/vành
      const excess = Math.min(g, b) - r;
      if (excess > 20 && maxC > 70) weight = Math.min(1, (excess - 16) / 48);
    } else if (mode === "neutral") {
      // Thân sơn bạc/trắng xám của SUV/van/xe tải: chỉ đổi dải sáng trung-cao ít bão hòa, giữ nguyên lốp tối & đèn sáng
      if (lum > 0.34 && lum < 0.89 && sat < 0.24) {
        const lowF = Math.min(1, (lum - 0.34) / 0.12);
        const hiF = Math.min(1, (0.89 - lum) / 0.1);
        weight = Math.min(lowF, hiF) * 0.84;
      }
    } else if (mode === "moto") {
      if (sat > 0.25 && lum > 0.15 && lum < 0.86) weight = 0.88;
    }

    if (weight > 0.01) {
      // Giữ nguyên sắc độ đổ bóng & nếp dập thân xe (luminance-preserving metallic paint)
      const shade = mode === "red"
        ? Math.min(1.38, Math.max(0.28, (r / 205) * 0.92 + lum * 0.22))
        : mode === "cyan"
          ? Math.min(1.35, Math.max(0.3, (maxC / 195) * 0.9 + lum * 0.2))
          : Math.min(1.28, Math.max(0.32, lum * 1.48));
      const nr = Math.min(255, tr * shade);
      const ng = Math.min(255, tg * shade);
      const nb = Math.min(255, tb * shade);
      d[i] = Math.round(r + (nr - r) * weight);
      d[i + 1] = Math.round(g + (ng - g) * weight);
      d[i + 2] = Math.round(b + (nb - b) * weight);
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = srcTex.flipY;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = srcTex.wrapS;
  tex.wrapT = srcTex.wrapT;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  byCol.set(cacheKey, tex);
  return tex;
}

// ---------------------------------------------------------------- Nâng cấp xe .glb lên chuẩn vật liệu sơn clearcoat & kính phản chiếu + đèn phanh HDR
export function upgradeVehicleGLB(THREE, natureAssets, mats, hdAssets, key, opts = {}) {
  const parsed = hdAssets && hdAssets.get(key);
  if (!parsed) return null;

  const targetLen = opts.targetLength || 4.55;
  const targetWidth = opts.targetWidth || 2.35;
  const halfLen = opts.halfLen || targetLen * 0.52;
  const root = new THREE.Group();
  addShadow(THREE, root, natureAssets, mats, targetLen * 1.08, targetWidth);

  const inst = instantiateGLB(THREE, parsed, { targetLength: targetLen });
  inst.group.rotation.y = opts.rotY !== undefined ? opts.rotY : 0;

  const paintMat = mats.physical(opts.color || "#475569", {
    roughness: 0.16,
    metalness: 0.34,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const whitePaintMat = opts.keepWhitePaint
    ? mats.physical("#f1f5f9", { roughness: 0.18, metalness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.08 })
    : null;
  const alloyMat = mats.standard("#cbd5e1", { roughness: 0.24, metalness: 0.85 });
  const glassMat = mats.physical("#0f172a", {
    roughness: 0.05,
    metalness: 0.28,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
  });
  const tireMat = mats.standard("#18181b", { roughness: 0.86, metalness: 0.04 });
  const trimMat = mats.standard("#27272a", { roughness: 0.42, metalness: 0.25 });
  const headMat = mats.standard("#fffbeb", {
    roughness: 0.08,
    emissive: "#fef3c7",
    emissiveIntensity: opts.parked ? 0.08 : 1.95,
  });
  const tailMat = mats.freshStandard("#ef4444", {
    roughness: 0.12,
    emissive: "#ef4444",
    emissiveIntensity: opts.parked ? 0.06 : 0.78,
  });
  const policeLightMat = key === "veh_police"
    ? mats.freshStandard("#38bdf8", { roughness: 0.12, emissive: "#38bdf8", emissiveIntensity: opts.parked ? 0.05 : 2.2 })
    : null;

  let hasTailMesh = false;
  let hasHeadMesh = false;
  let hasTexturedBody = false;
  const physCache = new Map();
  inst.group.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const srcMat = o.material;
    const mn = (srcMat && srcMat.name) || "";
    if (mn === "lightBack" || mn === "Taillight_Glass") {
      o.material = tailMat;
      hasTailMesh = true;
    } else if (mn === "lightFront" || mn === "Projector_Glass") {
      o.material = headMat;
      hasHeadMesh = true;
    } else if (mn === "lightBlue" && policeLightMat) {
      o.material = policeLightMat;
    } else if (mn === "window" || mn === "Glass_Gray") {
      o.material = glassMat;
    } else if (mn === "carTire" || mn === "Tires") {
      o.material = tireMat;
    } else if (mn === "_defaultMat") {
      o.material = alloyMat;
    } else if (mn === "plastic" || mn === "plastic_gray") {
      o.material = trimMat;
    } else if (mn === "paintWhite" && whitePaintMat) {
      o.material = whitePaintMat;
    } else if (mn.startsWith("paint") || mn === "Body_Color" || mn === "Paint 1 Carmine") {
      o.material = paintMat;
    } else if (srcMat && srcMat.map) {
      hasTexturedBody = true;
      // Bảo toàn toàn bộ texture PBR 2K (lưới tản nhiệt, logo, đèn, la-zăng), đổi màu sơn thân xe sắc nét & phủ bóng clearcoat
      if (!physCache.has(srcMat)) {
        const isGlass = Boolean(srcMat.transparent) && srcMat.alphaTest === 0;
        const recolorMode = !isGlass ? RECOLOR_MODES[key] : null;
        const paintMap = recolorMode && opts.color
          ? recolorVehicleTexture(THREE, srcMat.map, opts.color, recolorMode)
          : srcMat.map;
        const pm = new THREE.MeshPhysicalMaterial({
          color: srcMat.color ? srcMat.color.clone() : new THREE.Color("#ffffff"),
          map: paintMap,
          normalMap: srcMat.normalMap || null,
          roughnessMap: srcMat.roughnessMap || null,
          metalnessMap: srcMat.metalnessMap || null,
          roughness: isGlass ? 0.06 : Math.min(srcMat.roughness !== undefined ? srcMat.roughness : 0.36, 0.3),
          metalness: isGlass ? 0.25 : Math.max(srcMat.metalness !== undefined ? srcMat.metalness : 0.26, 0.26),
          clearcoat: isGlass ? 1.0 : 0.96,
          clearcoatRoughness: isGlass ? 0.03 : 0.055,
          envMapIntensity: isGlass ? 1.55 : 1.4,
          transparent: Boolean(srcMat.transparent),
          opacity: isGlass ? Math.max(srcMat.opacity !== undefined ? srcMat.opacity : 0.65, 0.72) : (srcMat.opacity !== undefined ? srcMat.opacity : 1),
          alphaTest: srcMat.alphaTest || 0,
          side: srcMat.side !== undefined ? srcMat.side : THREE.FrontSide,
        });
        physCache.set(srcMat, pm);
      }
      o.material = physCache.get(srcMat);
    }
  });
  root.add(inst.group);

  // Gắn đèn phanh HDR ôm sát đuôi xe (không gắn khối đèn trước lồi ra ngoài cản cho xe đã có texture 2K đầy đủ)
  if (!opts.parked && (!hasTailMesh || (!hasHeadMesh && !hasTexturedBody) || policeLightMat)) {
    inst.group.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(inst.group);
    const w = Math.max(0.4, bb.max.z - bb.min.z);
    const h = Math.max(0.6, bb.max.y - bb.min.y);
    const singleTrack = opts.singleTrack === true;
    const zOffs = singleTrack ? [0] : [-w * 0.28, w * 0.28];
    const lampW = singleTrack ? 0.11 : Math.min(0.24, w * 0.13);
    if (!hasHeadMesh && !hasTexturedBody) {
      const hy = bb.min.y + h * (singleTrack ? 0.62 : 0.41);
      for (const lz of zOffs) {
        const hl = new THREE.Mesh(natureAssets.geos.unitBox, headMat);
        hl.position.set(bb.max.x - 0.12, hy, lz);
        hl.scale.set(0.05, singleTrack ? 0.09 : 0.08, lampW);
        root.add(hl);
      }
    }
    if (!hasTailMesh) {
      const ty = bb.min.y + h * (singleTrack ? 0.56 : 0.48);
      for (const lz of zOffs) {
        const tl = new THREE.Mesh(natureAssets.geos.unitBox, tailMat);
        tl.position.set(bb.min.x + (hasTexturedBody ? 0.12 : 0.05), ty, lz);
        tl.scale.set(0.04, singleTrack ? 0.06 : 0.075, lampW);
        root.add(tl);
      }
    }
    if (policeLightMat) {
      const bar = new THREE.Mesh(natureAssets.geos.unitBox, policeLightMat);
      bar.position.set((bb.min.x + bb.max.x) * 0.5, bb.max.y + 0.02, 0);
      bar.scale.set(0.16, 0.08, Math.min(0.84, w * 0.44));
      root.add(bar);
    }
  }

  return {
    root,
    wheels: [],
    mixer: inst.mixer || null,
    tailMat,
    policeLightMat,
    halfLen,
    halfW: opts.halfW || 1.04,
    wheelR: opts.wheelR || 0.34,
  };
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
      const visor = new THREE.Mesh(g.unitBox, hood);
      visor.position.set(sx * 1.38, ly + 0.08, dirZ * 2.15);
      visor.scale.set(0.14, 0.04, 0.24);
      root.add(lm, visor);
    }
  }

  const pBox = new THREE.Mesh(g.unitBox, hood);
  pBox.position.set(-dirZ * 0.16, 2.35, 0);
  pBox.scale.set(0.26, 0.52, 0.28);
  root.add(pBox);

  for (const pz of [dirZ * 0.125, -dirZ * 0.125]) {
    const pRed = new THREE.Mesh(g.pedLamp, pedRedMat);
    pRed.position.set(-dirZ * 0.16, 2.48, pz);
    const pGrn = new THREE.Mesh(g.pedLamp, pedGrnMat);
    pGrn.position.set(-dirZ * 0.16, 2.22, pz);
    root.add(pRed, pGrn);
  }

  return { root, sigAxis, redMat, yelMat, grnMat, pedRedMat, pedGrnMat };
}

// ---------------------------------------------------------------- Ô tô dự phòng khi chưa cài gói .xoffice-hd
function buildFallbackCar(THREE, natureAssets, mats, color) {
  const g = natureAssets.geos;
  const root = new THREE.Group();
  addShadow(THREE, root, natureAssets, mats, 4.9, 2.35);

  const paintMat = mats.physical(color, { roughness: 0.15, metalness: 0.72, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const glassMat = mats.physical("#0f172a", { roughness: 0.06, metalness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.04 });
  const tireMat = mats.standard("#18181b", { roughness: 0.85, metalness: 0.05 });
  const rimMat = mats.standard("#e2e8f0", { roughness: 0.14, metalness: 0.94 });
  const tailMat = mats.freshStandard("#ef4444", { roughness: 0.12, emissive: "#ef4444", emissiveIntensity: 0.75 });

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
  return { root, wheels, mixer: null, tailMat, policeLightMat: null, halfLen: 2.35, halfW: 1.04, wheelR: 0.32 };
}

// ---------------------------------------------------------------- Xe buýt đô thị Sài Gòn (8.2m, kính toàn cảnh, bảng LED tuyến & 4 bánh quay)
function buildCityBus(THREE, natureAssets, mats, color) {
  const g = natureAssets.geos;
  const root = new THREE.Group();
  addShadow(THREE, root, natureAssets, mats, 8.8, 2.75);

  const paintMat = mats.physical(color || "#059669", { roughness: 0.18, metalness: 0.42, clearcoat: 0.95, clearcoatRoughness: 0.06 });
  const upperMat = mats.physical("#f1f5f9", { roughness: 0.22, metalness: 0.15, clearcoat: 0.85 });
  const darkMat = mats.standard("#18181b", { roughness: 0.72, metalness: 0.18 });
  const glassMat = mats.physical("#0f172a", { roughness: 0.05, metalness: 0.3, clearcoat: 1.0, clearcoatRoughness: 0.03 });
  const roofMat = mats.standard("#cbd5e1", { roughness: 0.45, metalness: 0.25 });
  const rimMat = mats.standard("#e2e8f0", { roughness: 0.16, metalness: 0.92 });
  const headMat = mats.standard("#fffbeb", { roughness: 0.1, emissive: "#fef3c7", emissiveIntensity: 1.75 });
  const tailMat = mats.freshStandard("#ef4444", { roughness: 0.12, emissive: "#ef4444", emissiveIntensity: 0.75 });

  const add = (geo, mat, x, y, z, sx, sy, sz, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = cast;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };

  add(g.unitBox, darkMat, 0, 0.44, 0, 8.15, 0.24, 2.26);         // Cản gầm tối
  add(g.unitBox, paintMat, 0, 0.95, 0, 8.2, 0.82, 2.28);         // Thân dưới sơn xanh
  add(g.unitBox, upperMat, 0, 1.98, 0, 8.16, 1.28, 2.24);        // Thân trên trắng ngọc
  add(g.unitBox, glassMat, 0.06, 1.88, 0, 7.75, 0.86, 2.27, false); // Dải kính toàn cảnh
  for (let px = -3.1; px <= 3.1; px += 1.55) {
    add(g.unitBox, upperMat, px, 1.88, 0, 0.16, 0.88, 2.29, false); // Trụ chia khoang cửa sổ
  }
  add(g.unitBox, glassMat, 4.08, 1.78, 0, 0.08, 1.12, 2.04, false); // Kính chắn gió trước
  add(g.unitBox, mats.standard("#f59e0b", { roughness: 0.2, emissive: "#f59e0b", emissiveIntensity: 1.5 }), 4.1, 2.48, 0, 0.05, 0.2, 1.32, false);
  for (const ax of [-1.25, 1.55]) add(g.unitBox, roofMat, ax, 2.74, 0, 1.75, 0.24, 1.48); // Cụm điều hòa nóc
  for (const mz of [-1.22, 1.22]) add(g.unitBox, darkMat, 4.04, 1.75, mz, 0.14, 0.22, 0.08); // Gương chiếu hậu
  for (const lz of [-0.78, 0.78]) {
    add(g.unitBox, headMat, 4.11, 0.72, lz, 0.06, 0.14, 0.28, false);
    add(g.unitBox, tailMat, -4.11, 0.82, lz, 0.06, 0.22, 0.22, false);
  }

  const wheels = [];
  for (const [wx, wz] of [[2.55, 1.06], [2.55, -1.06], [-2.45, 1.06], [-2.45, -1.06]]) {
    const wg = new THREE.Group();
    wg.position.set(wx, 0.42, wz);
    const tire = new THREE.Mesh(g.carWheel, darkMat);
    tire.rotation.x = Math.PI / 2;
    tire.scale.set(1.3, 1.1, 1.3);
    tire.castShadow = true;
    const rim = new THREE.Mesh(g.carRim, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1.25, 1.15, 1.25);
    wg.add(tire, rim);
    root.add(wg);
    wheels.push(wg);
  }
  return { root, wheels, mixer: null, tailMat, policeLightMat: null, halfLen: 4.25, halfW: 1.18, wheelR: 0.42 };
}

// ---------------------------------------------------------------- Xe máy / tay ga kèm người lái đội mũ bảo hiểm
function buildMotorbike(THREE, tAssets, natureAssets, mats, bodyColor, jacketColor, helmetColor) {
  const g = tAssets.geos;
  const root = new THREE.Group();
  addShadow(THREE, root, natureAssets, mats, 2.05, 0.95);

  const paintMat = mats.physical(bodyColor, { roughness: 0.16, metalness: 0.6, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const darkMat = mats.standard("#18181b", { roughness: 0.55, metalness: 0.25 });
  const chromeMat = mats.standard("#e2e8f0", { roughness: 0.14, metalness: 0.94 });
  const seatMat = mats.physical("#1e293b", { roughness: 0.58, clearcoat: 0.2 });
  const shieldGlass = mats.physical("#0f172a", { roughness: 0.06, clearcoat: 1.0, transparent: true, opacity: 0.68 });

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
  body.scale.set(0.78, 0.32, 0.4);
  body.castShadow = true;
  const shield = new THREE.Mesh(g.unitBox, paintMat);
  shield.position.set(0.46, 0.64, 0);
  shield.rotation.z = 0.26;
  shield.scale.set(0.24, 0.62, 0.38);
  shield.castShadow = true;
  const wind = new THREE.Mesh(g.unitBox, shieldGlass);
  wind.position.set(0.46, 1.05, 0);
  wind.rotation.z = 0.35;
  wind.scale.set(0.04, 0.24, 0.26);
  const fender = new THREE.Mesh(g.unitBox, paintMat);
  fender.position.set(0.62, 0.48, 0);
  fender.scale.set(0.32, 0.06, 0.18);
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
  root.add(deck, body, shield, wind, fender, seat, fork, handle, exhaust, headLamp, tailLamp);
  for (const ms of [-0.3, 0.3]) {
    const mir = new THREE.Mesh(g.unitBox, chromeMat);
    mir.position.set(0.42, 1.05, ms);
    mir.scale.set(0.04, 0.07, 0.1);
    root.add(mir);
  }

  const rider = new THREE.Group();
  root.add(rider);
  const jacketMat = mats.physical(jacketColor, { roughness: 0.82, sheen: 0.12 });
  const pantsMat = mats.standard("#1e293b", { roughness: 0.86 });
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

  return { root, wheels, mixer: null, tailMat, policeLightMat: null, halfLen: 1.05, halfW: 0.42, wheelR: 0.24 };
}

function attachMotoRider(THREE, tAssets, hdAssets, mats, root, jacketColor, helmetColor, scooter = false) {
  const g = tAssets.geos;
  const hdRider = buildMotoHDHuman(THREE, hdAssets, mats, {
    jacketColor,
    helmetColor,
    scooter,
    helmetGeo: g.helmet,
    visorGeo: g.visor,
  });
  if (hdRider) {
    root.add(hdRider);
    return;
  }
  const rider = new THREE.Group();
  rider.position.set(scooter ? -0.18 : -0.12, scooter ? 0.08 : 0.02, 0);
  root.add(rider);

  const jacketMat = mats.physical(jacketColor || "#1d4ed8", { roughness: 0.82, sheen: 0.12 });
  const pantsMat = mats.standard("#1e293b", { roughness: 0.86 });
  const helmetMat = mats.physical(helmetColor || "#f8fafc", { roughness: 0.14, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const visorMat = mats.physical("#0f172a", { roughness: 0.08, clearcoat: 1.0 });

  const torso = new THREE.Mesh(g.riderTorso, jacketMat);
  torso.position.set(-0.08, 1.08, 0);
  torso.rotation.z = scooter ? -0.08 : -0.26;
  torso.castShadow = true;
  rider.add(torso);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(g.riderLimb, pantsMat);
    leg.position.set(0.12, 0.56, side * 0.2);
    leg.rotation.z = scooter ? -0.22 : -0.34;
    const arm = new THREE.Mesh(g.riderArm, jacketMat);
    arm.position.set(0.2, 1.04, side * 0.24);
    arm.rotation.set(0, side * -0.15, -1.02);
    arm.castShadow = true;
    rider.add(leg, arm);
  }

  const helm = new THREE.Mesh(g.helmet, helmetMat);
  helm.position.set(scooter ? -0.04 : 0.04, 1.48, 0);
  helm.castShadow = true;
  const visor = new THREE.Mesh(g.visor, visorMat);
  visor.position.set(scooter ? -0.02 : 0.06, 1.48, 0);
  visor.rotation.y = Math.PI / 2;
  rider.add(helm, visor);
}

const VEHICLE_GLB_TABLE = {
  suv: ["veh_suv", 4.78, 2.48, Math.PI / 2, false, 0.36, 1.08],
  sedan: ["veh_sedan", 4.68, 2.44, Math.PI / 2, false, 0.33, 1.04],
  sedan_classic: ["veh_sedan_classic", 4.55, 2.38, Math.PI / 2, false, 0.32, 1.02],
  hatchback: ["veh_hatchback", 4.42, 2.3, Math.PI / 2, false, 0.32, 1.0],
  sports: ["veh_sports", 4.56, 2.38, Math.PI / 2, false, 0.33, 1.04],
  rancher: ["veh_rancher", 4.82, 2.52, Math.PI / 2, false, 0.36, 1.08],
  taxi: ["veh_taxi", 4.62, 2.4, Math.PI / 2, false, 0.33, 1.04],
  van: ["veh_van", 5.35, 2.76, Math.PI / 2, true, 0.36, 1.12],
  delivery: ["veh_delivery", 5.95, 3.08, Math.PI / 2, true, 0.38, 1.14],
  pickup: ["veh_pickup", 5.05, 2.62, Math.PI / 2, false, 0.37, 1.08],
  police: ["veh_police", 4.72, 2.45, Math.PI / 2, true, 0.33, 1.04],
  bus: ["veh_bus", 8.65, 4.42, Math.PI / 2, false, 0.42, 1.18],
  ferrari: ["veh_ferrari", 4.52, 2.36, -Math.PI / 2, false, 0.33, 1.04],
  car: ["car", 4.55, 2.35, Math.PI / 2, false, 0.32, 1.04],
  truck: ["truck", 5.2, 2.75, Math.PI / 2, false, 0.4, 1.14],
};

function buildTrafficVehicle(THREE, tAssets, natureAssets, mats, s, hdAssets) {
  if (s.kind === "moto" || s.kind === "scooter") {
    const isScooter = s.kind === "scooter";
    const hdBike = upgradeVehicleGLB(THREE, natureAssets, mats, hdAssets, isScooter ? "veh_scooter" : "veh_moto", {
      targetLength: isScooter ? 1.98 : 2.18,
      targetWidth: 0.92,
      halfLen: isScooter ? 1.02 : 1.12,
      halfW: 0.44,
      rotY: Math.PI / 2,
      color: s.col,
      singleTrack: true,
      wheelR: 0.28,
    });
    if (hdBike) {
      attachMotoRider(THREE, tAssets, hdAssets, mats, hdBike.root, s.j, s.h, isScooter);
      return hdBike;
    }
    return buildMotorbike(THREE, tAssets, natureAssets, mats, s.col, s.j, s.h);
  }
  if (s.kind === "bus") {
    const cfg = VEHICLE_GLB_TABLE.bus;
    const hdBus = upgradeVehicleGLB(THREE, natureAssets, mats, hdAssets, cfg[0], {
      targetLength: cfg[1],
      targetWidth: 2.75,
      halfLen: cfg[2],
      rotY: cfg[3],
      color: s.col,
      wheelR: cfg[5],
      halfW: cfg[6],
    });
    if (hdBus) return hdBus;
    return buildCityBus(THREE, natureAssets, mats, s.col);
  }

  const cfg = VEHICLE_GLB_TABLE[s.kind];
  if (cfg) {
    const [key, targetLength, halfLen, rotY, keepWhitePaint, wheelR, halfW] = cfg;
    const col = s.kind === "taxi" ? (s.col || "#eab308") : (s.kind === "police" ? "#1e3a8a" : s.col);
    const v = upgradeVehicleGLB(THREE, natureAssets, mats, hdAssets, key, {
      targetLength,
      halfLen,
      rotY,
      color: col,
      keepWhitePaint,
      wheelR,
      halfW,
    });
    if (v) return v;
  }
  return upgradeVehicleGLB(THREE, natureAssets, mats, hdAssets, "car", {
    targetLength: 4.55,
    halfLen: 2.35,
    rotY: Math.PI / 2,
    color: s.col,
  }) || buildFallbackCar(THREE, natureAssets, mats, s.col);
}

// ---------------------------------------------------------------- Hệ thống giao thông & công dân đô thị hoàn chỉnh (va chạm cứng + né xe)
export function buildStreetTraffic(THREE, tAssets, natureAssets, humanAssets, mats, plan, streetZ, hdAssets, physics) {
  const root = new THREE.Group();
  const pad = plan.levels ? 6 : 4;
  const W = plan.W;
  const westRoadX = -6.6;
  const eastRoadX = W + pad + 5.2;
  const northRoadZ = -6.4;
  const mainRoadZ = streetZ + 5.9;

  const ewMin = -64.0, ewMax = eastRoadX + 58.0;
  const nsMin = -52.0, nsMax = streetZ + 50.0;

  // 1. Hệ thống 18 cột đèn tín hiệu đủ 4 góc tại cả 4 ngã tư & nút qua đường chính
  const lightSpecs = [
    [8.2, streetZ + 2.12, 1, 0, "ew"],
    [1.9, streetZ + 9.68, -1, 0, "ew"],
  ];
  for (const [ix, iz] of [
    [westRoadX, mainRoadZ],
    [eastRoadX, mainRoadZ],
    [westRoadX, northRoadZ],
    [eastRoadX, northRoadZ],
  ]) {
    const hw = 3.75;
    const hd = iz === mainRoadZ ? 3.85 : 3.55;
    lightSpecs.push(
      [ix - hw, iz - hd, 1, Math.PI / 2, "ns"],
      [ix + hw, iz + hd, -1, Math.PI / 2, "ns"],
      [ix + hw, iz - hd, 1, 0, "ew"],
      [ix - hw, iz + hd, -1, 0, "ew"],
    );
  }
  const lights = lightSpecs.map(([lx, lz, dirZ, rotY, sigAxis]) => {
    if (physics) physics.addCircle("outdoor", lx, lz, 0.28, "traffic_pole");
    const l = buildTrafficLight(THREE, tAssets, mats, lx, lz, dirZ, rotY, sigAxis);
    root.add(l.root);
    return l;
  });

  // 2. Đội 32 phương tiện đa dạng chạy dọc cả 4 tuyến đại lộ (+ xe buýt tự ghé trạm dừng)
  const mainEastStop = [westRoadX - 5.9, 1.85, eastRoadX - 5.9];
  const mainWestStop = [eastRoadX + 5.9, 8.25, westRoadX + 5.9];
  const northEastStop = [westRoadX - 5.9, eastRoadX - 5.9];
  const northWestStop = [eastRoadX + 5.9, westRoadX + 5.9];
  const nsSouthStop = [northRoadZ - 6.0, mainRoadZ - 6.0];
  const nsNorthStop = [mainRoadZ + 6.0, northRoadZ + 6.0];

  const vehicleSpecs = [
    // Đại lộ chính Nam (Eastbound +X) — phối đa dạng màu sơn kim loại nổi bật
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.75, pos: -48.0, maxV: 4.4, kind: "delivery", col: "#0284c7", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.75, pos: -32.0, maxV: 4.8, kind: "pickup", col: "#ea580c", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.2, pos: -18.0, maxV: 4.6, kind: "scooter", col: "#dc2626", j: "#1d4ed8", h: "#f8fafc", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.75, pos: -2.5, maxV: 4.3, kind: "bus", col: "#059669", busStopX: 16.8, stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 2.25, pos: 13.0, maxV: 4.7, kind: "moto", col: "#10b981", j: "#334155", h: "#facc15", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.75, pos: 29.0, maxV: 5.0, kind: "ferrari", col: "#dc2626", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.75, pos: 46.0, maxV: 4.9, kind: "suv", col: "#2563eb", stopLines: mainEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: mainRoadZ + 1.2, pos: eastRoadX + 26.0, maxV: 4.7, kind: "scooter", col: "#eab308", j: "#1e293b", h: "#f8fafc", stopLines: mainEastStop },
    // Đại lộ chính Nam (Westbound -X)
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.75, pos: eastRoadX + 36.0, maxV: 4.9, kind: "police", col: "#1e3a8a", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.75, pos: eastRoadX + 18.0, maxV: 4.9, kind: "taxi", col: "#eab308", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 2.25, pos: 40.0, maxV: 4.5, kind: "scooter", col: "#06b6d4", j: "#15803d", h: "#dc2626", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.75, pos: 26.0, maxV: 4.8, kind: "sedan", col: "#1d4ed8", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.25, pos: 14.0, maxV: 4.6, kind: "moto", col: "#e11d48", j: "#c2410c", h: "#f8fafc", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.75, pos: -2.0, maxV: 4.9, kind: "ferrari", col: "#eab308", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.75, pos: -24.0, maxV: 5.0, kind: "hatchback", col: "#ea580c", stopLines: mainWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: mainRoadZ - 1.25, pos: -46.0, maxV: 4.5, kind: "scooter", col: "#7c3aed", j: "#6d28d9", h: "#e2e8f0", stopLines: mainWestStop },
    // Đại lộ phía Bắc (sau lưng văn phòng, chạy suốt tuyến)
    { axis: "x", sigAxis: "ew", dir: 1, lane: northRoadZ + 1.55, pos: -32.0, maxV: 4.8, kind: "sedan", col: "#0f766e", stopLines: northEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: northRoadZ + 1.55, pos: 14.0, maxV: 4.7, kind: "moto", col: "#0284c7", j: "#0f172a", h: "#f8fafc", stopLines: northEastStop },
    { axis: "x", sigAxis: "ew", dir: 1, lane: northRoadZ + 1.55, pos: eastRoadX + 18.0, maxV: 4.9, kind: "rancher", col: "#1d4ed8", stopLines: northEastStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: northRoadZ - 1.55, pos: eastRoadX + 24.0, maxV: 4.5, kind: "delivery", col: "#15803d", stopLines: northWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: northRoadZ - 1.55, pos: 22.0, maxV: 4.6, kind: "scooter", col: "#f97316", j: "#1e293b", h: "#facc15", stopLines: northWestStop },
    { axis: "x", sigAxis: "ew", dir: -1, lane: northRoadZ - 1.55, pos: -26.0, maxV: 4.8, kind: "taxi", col: "#eab308", stopLines: northWestStop },
    // Đại lộ nhánh Tây (Bắc-Nam)
    { axis: "z", sigAxis: "ns", dir: 1, lane: westRoadX - 1.65, pos: -34.0, maxV: 4.8, kind: "car", col: "#f8fafc", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: 1, lane: westRoadX - 1.2, pos: 6.0, maxV: 4.5, kind: "moto", col: "#dc2626", j: "#1d4ed8", h: "#f8fafc", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: 1, lane: westRoadX - 1.65, pos: mainRoadZ + 18.0, maxV: 4.9, kind: "pickup", col: "#0284c7", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: westRoadX + 1.65, pos: mainRoadZ + 28.0, maxV: 4.8, kind: "sedan", col: "#be123c", stopLines: nsNorthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: westRoadX + 1.2, pos: 14.0, maxV: 4.4, kind: "scooter", col: "#10b981", j: "#c2410c", h: "#f8fafc", stopLines: nsNorthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: westRoadX + 1.65, pos: -24.0, maxV: 4.9, kind: "sports", col: "#b91c1c", stopLines: nsNorthStop },
    // Đại lộ nhánh Đông (Bắc-Nam)
    { axis: "z", sigAxis: "ns", dir: 1, lane: eastRoadX - 1.65, pos: -28.0, maxV: 4.3, kind: "bus", col: "#0284c7", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: 1, lane: eastRoadX - 1.2, pos: 9.0, maxV: 4.5, kind: "moto", col: "#2563eb", j: "#334155", h: "#facc15", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: 1, lane: eastRoadX - 1.65, pos: mainRoadZ + 20.0, maxV: 4.7, kind: "suv", col: "#15803d", stopLines: nsSouthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: eastRoadX + 1.65, pos: mainRoadZ + 32.0, maxV: 4.8, kind: "suv", col: "#d97706", stopLines: nsNorthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: eastRoadX + 1.2, pos: 17.0, maxV: 4.4, kind: "scooter", col: "#ec4899", j: "#1d4ed8", h: "#f8fafc", stopLines: nsNorthStop },
    { axis: "z", sigAxis: "ns", dir: -1, lane: eastRoadX + 1.65, pos: -22.0, maxV: 4.8, kind: "sedan_classic", col: "#0284c7", stopLines: nsNorthStop },
  ];

  const vehicles = vehicleSpecs.map((s) => {
    const v = buildTrafficVehicle(THREE, tAssets, natureAssets, mats, s, hdAssets);
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
      busStopX: s.busStopX,
      stopTimer: 0,
      stopCooldown: 0,
    };
  });

  // 3. 13 công dân Ready Player Me có lịch trình mục đích rõ ràng (giao hàng, đón xe buýt, cà phê vỉa hè, công viên, dạo liên tuyến phố)
  const STREET_SHIRTS = ["#2563eb", "#be123c", "#15803d", "#0f766e", "#c2410c", "#6d28d9", "#0369a1", "#b45309", "#1e3a8a"];
  const zN = streetZ + 1.35;
  const zS = streetZ + 10.65;
  const xMainL = 4.35;
  const xMainR = 5.65;
  const xWW = westRoadX - 4.75;
  const xWE = westRoadX + 4.25;
  const xEW = eastRoadX - 4.35;
  const xEE = eastRoadX + 4.65;
  const zNN = northRoadZ - 4.05;
  const zNS = northRoadZ + 4.0;
  const xPark = 20.6;

  function mkRig(idx, opts = {}) {
    const r = buildHDHuman(THREE, hdAssets, mats, {
      index: idx,
      variant: idx % 2 === 0 ? "rpm_a" : "rpm_b",
      mode: "idle",
      femaleWalk: idx % 2 === 1,
      topColor: opts.topColor || STREET_SHIRTS[idx % STREET_SHIRTS.length],
      parcel: Boolean(opts.parcel),
    }) || buildWalkerRig(THREE, humanAssets, mats, { index: idx, parcel: Boolean(opts.parcel) });
    root.add(r.root);
    return r;
  }

  const citizensSpec = [
    // Nhân viên giao hàng ôm kiện carton: từ xe tải đỗ ven đường → qua vạch đèn đỏ → quầy sảnh X-Office → quay về xe
    {
      index: 41,
      parcel: true,
      topColor: "#b45309",
      steps: [
        { act: "wait", pos: [10.6, streetZ + 11.4], yaw: Math.PI, dur: 2.8, mode: "idle" },
        { act: "walk", from: [10.6, streetZ + 11.4], to: [10.6, zS], speed: 1.25 },
        { act: "walk", from: [10.6, zS], to: [xMainR, zS], speed: 1.32 },
        { act: "walk", from: [xMainR, zS], to: [xMainR, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xMainR, zN], to: [5.0, streetZ - 0.8], speed: 1.28 },
        { act: "wait", pos: [5.0, streetZ - 0.8], yaw: Math.PI, dur: 4.5, mode: "talk" },
        { act: "walk", from: [5.0, streetZ - 0.8], to: [xMainL, zN], speed: 1.28 },
        { act: "walk", from: [xMainL, zN], to: [xMainL, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xMainL, zS], to: [10.6, zS], speed: 1.32 },
        { act: "walk", from: [10.6, zS], to: [10.6, streetZ + 11.4], speed: 1.25 },
      ],
      initIdx: 3,
    },
    // Hành khách trạm xe buýt → đợi xe tại nhà chờ (x = 15.8..17.8) → sang đường qua lối đá tới sảnh văn phòng / tiếp tục qua ngã tư Đông
    {
      index: 42,
      steps: [
        { act: "wait", pos: [15.8, streetZ + 10.95], yaw: 0, dur: 5.0, mode: "idle" },
        { act: "walk", from: [15.8, zS], to: [xMainR, zS], speed: 1.36 },
        { act: "walk", from: [xMainR, zS], to: [xMainR, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xMainR, zN], to: [5.2, streetZ - 0.6], speed: 1.28 },
        { act: "wait", pos: [5.2, streetZ - 0.6], yaw: 0, dur: 3.4, mode: "talk" },
        { act: "walk", from: [5.2, streetZ - 0.6], to: [xMainR, zN], speed: 1.3 },
        { act: "walk", from: [xMainR, zN], to: [xEW, zN], speed: 1.38 },
        { act: "walk", from: [xEW, zN], to: [xEW, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zS], to: [15.8, zS], speed: 1.35 },
      ],
      initIdx: 0,
    },
    {
      index: 43,
      steps: [
        { act: "wait", pos: [16.9, streetZ + 10.95], yaw: 0.4, dur: 4.5, mode: "talk" },
        { act: "walk", from: [16.9, zS], to: [xEW, zS], speed: 1.34 },
        { act: "walk", from: [xEW, zS], to: [xEE, zS], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xEE, zS], to: [xEE, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEE, zN], to: [xEE, 17.0], speed: 1.3 },
        { act: "wait", pos: [xEE, 17.0], yaw: Math.PI / 2, dur: 4.0, mode: "talk" },
        { act: "walk", from: [xEE, 17.0], to: [xEE, zN], speed: 1.32 },
        { act: "walk", from: [xEE, zN], to: [xEW, zN], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xEW, zN], to: [xEW, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zS], to: [16.9, zS], speed: 1.34 },
      ],
      initIdx: 2,
    },
    {
      index: 44,
      steps: [
        { act: "wait", pos: [17.9, streetZ + 11.05], yaw: -0.35, dur: 5.2, mode: "talk" },
        { act: "walk", from: [17.9, zS], to: [xWE, zS], speed: 1.38 },
        { act: "walk", from: [xWE, zS], to: [xWW, zS], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xWW, zS], to: [xWW, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xWW, zN], to: [xWE, zN], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xWE, zN], to: [xMainL, zN], speed: 1.36 },
        { act: "walk", from: [xMainL, zN], to: [xMainL, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xMainL, zS], to: [17.9, zS], speed: 1.35 },
      ],
      initIdx: 5,
    },
    // Khách cà phê vỉa hè Tây: gọi đồ trước hiên → ngồi/đứng bàn dù → vòng ra vỉa hè → sang vạch đèn đỏ → dạo tiếp sang Đông
    {
      index: 45,
      steps: [
        { act: "wait", pos: [3.2, streetZ + 12.1], yaw: Math.PI, dur: 3.8, mode: "talk" },
        { act: "walk", from: [3.2, streetZ + 12.1], to: [2.2, streetZ + 12.2], speed: 1.15 },
        { act: "wait", pos: [2.2, streetZ + 12.2], yaw: Math.PI / 2, dur: 4.8, mode: "idle" },
        { act: "walk", from: [2.2, streetZ + 12.2], to: [2.2, zS], speed: 1.25 },
        { act: "walk", from: [2.2, zS], to: [xMainL, zS], speed: 1.25 },
        { act: "walk", from: [xMainL, zS], to: [xMainL, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xMainL, zN], to: [xEW, zN], speed: 1.38 },
        { act: "walk", from: [xEW, zN], to: [xEE, zN], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xEE, zN], to: [xEE, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEE, zS], to: [xEW, zS], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xEW, zS], to: [3.2, zS], speed: 1.38 },
        { act: "walk", from: [3.2, zS], to: [3.2, streetZ + 12.1], speed: 1.15 },
      ],
      initIdx: 4,
    },
    // Khách cà phê vỉa hè Đông → dạo tới vạch chính → sang đường tiếp tục hành trình
    {
      index: 46,
      steps: [
        { act: "wait", pos: [28.4, streetZ + 12.1], yaw: Math.PI, dur: 4.2, mode: "talk" },
        { act: "walk", from: [28.4, streetZ + 12.1], to: [27.9, streetZ + 12.4], speed: 1.1 },
        { act: "wait", pos: [27.9, streetZ + 12.4], yaw: 0, dur: 4.0, mode: "idle" },
        { act: "walk", from: [27.9, zS], to: [xMainR, zS], speed: 1.36 },
        { act: "walk", from: [xMainR, zS], to: [xMainR, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xMainR, zN], to: [xEW, zN], speed: 1.36 },
        { act: "walk", from: [xEW, zN], to: [xEW, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zS], to: [28.4, zS], speed: 1.34 },
      ],
      initIdx: 4,
    },
    // Khách dạo phố Tây ↔ quán cà phê góc Tây
    {
      index: 47,
      steps: [
        { act: "wait", pos: [xWW, 24.0], yaw: Math.PI / 2, dur: 4.5, mode: "talk" },
        { act: "walk", from: [xWW, 24.0], to: [xWW, zN], speed: 1.32 },
        { act: "walk", from: [xWW, zN], to: [xWW, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xWW, zS], to: [xWE, zS], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xWE, zS], to: [xWE, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xWE, zN], to: [xWW, zN], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xWW, zN], to: [xWW, 24.0], speed: 1.32 },
      ],
      initIdx: 2,
    },
    // Nhân viên quán cà phê đứng đón khách bên bảng menu
    {
      index: 48,
      steps: [{ act: "wait", pos: [4.9, streetZ + 12.5], yaw: 0.35, dur: 12.0, mode: "talk" }],
      initIdx: 0,
    },
    // Khách tham quan công viên & đài phun nước Nam
    {
      index: 49,
      steps: [
        { act: "wait", pos: [19.4, streetZ + 16.8], yaw: -0.65, dur: 5.0, mode: "talk" },
        { act: "walk", from: [19.4, streetZ + 16.8], to: [18.4, streetZ + 15.2], speed: 1.15 },
        { act: "wait", pos: [18.4, streetZ + 15.2], yaw: Math.PI / 2, dur: 4.5, mode: "idle" },
        { act: "walk", from: [18.4, streetZ + 15.2], to: [xPark, zS], speed: 1.25 },
        { act: "walk", from: [xPark, zS], to: [xMainL, zS], speed: 1.38 },
        { act: "walk", from: [xMainL, zS], to: [xMainL, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xMainL, zN], to: [xMainR, zN], speed: 1.25 },
        { act: "walk", from: [xMainR, zN], to: [xMainR, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xMainR, zS], to: [xPark, zS], speed: 1.38 },
        { act: "walk", from: [xPark, zS], to: [19.4, streetZ + 16.8], speed: 1.22 },
      ],
      initIdx: 0,
    },
    {
      index: 50,
      steps: [
        { act: "wait", pos: [21.6, streetZ + 17.5], yaw: 1.2, dur: 4.8, mode: "idle" },
        { act: "walk", from: [21.6, streetZ + 17.5], to: [xPark, zS], speed: 1.25 },
        { act: "walk", from: [xPark, zS], to: [xEW, zS], speed: 1.38 },
        { act: "walk", from: [xEW, zS], to: [xEW, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zN], to: [xEW, zNS], speed: 1.35 },
        { act: "walk", from: [xEW, zNS], to: [xEW, zNN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zNN], to: [15.2, zNN], speed: 1.35 },
        { act: "wait", pos: [15.2, zNN], yaw: 0, dur: 3.8, mode: "talk" },
        { act: "walk", from: [15.2, zNN], to: [xEW, zNN], speed: 1.35 },
        { act: "walk", from: [xEW, zNN], to: [xEW, zNS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zNS], to: [xEW, zN], speed: 1.35 },
        { act: "walk", from: [xEW, zN], to: [xEW, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zS], to: [xPark, zS], speed: 1.36 },
        { act: "walk", from: [xPark, zS], to: [21.6, streetZ + 17.5], speed: 1.22 },
      ],
      initIdx: 3,
    },
    // Người đi bộ dạo trọn 4 khối phố (Tây-Nam → Tây-Bắc → Đông-Bắc → Đông-Nam) luôn qua vạch rồi đi tiếp
    {
      index: 51,
      steps: [
        { act: "walk", from: [xWW, zN], to: [xWW, zNS], speed: 1.42 },
        { act: "walk", from: [xWW, zNS], to: [xWW, zNN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xWW, zNN], to: [xWE, zNN], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xWE, zNN], to: [xEW, zNN], speed: 1.42 },
        { act: "walk", from: [xEW, zNN], to: [xEE, zNN], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xEE, zNN], to: [xEE, zNS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEE, zNS], to: [xEE, zN], speed: 1.42 },
        { act: "walk", from: [xEE, zN], to: [xEE, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEE, zS], to: [xEW, zS], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xEW, zS], to: [xWE, zS], speed: 1.42 },
        { act: "walk", from: [xWE, zS], to: [xWW, zS], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xWW, zS], to: [xWW, zN], cross: "ns", speed: 2.35 },
      ],
      initIdx: 7,
    },
    {
      index: 52,
      steps: [
        { act: "walk", from: [xMainR, zN], to: [xWE, zN], speed: 1.38 },
        { act: "walk", from: [xWE, zN], to: [xWW, zN], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xWW, zN], to: [xWW, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xWW, zS], to: [xWE, zS], cross: "ew", speed: 2.35 },
        { act: "walk", from: [xWE, zS], to: [xMainR, zS], speed: 1.38 },
        { act: "walk", from: [xMainR, zS], to: [xMainR, zN], cross: "ns", speed: 2.35 },
      ],
      initIdx: 1,
    },
    {
      index: 53,
      steps: [
        { act: "walk", from: [xWE, zNN], to: [xWE, zNS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xWE, zNS], to: [xWE, zN], speed: 1.36 },
        { act: "walk", from: [xWE, zN], to: [xWE, zS], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xWE, zS], to: [xEW, zS], speed: 1.38 },
        { act: "walk", from: [xEW, zS], to: [xEW, zN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zN], to: [xEW, zNS], speed: 1.36 },
        { act: "walk", from: [xEW, zNS], to: [xEW, zNN], cross: "ns", speed: 2.35 },
        { act: "walk", from: [xEW, zNN], to: [xWE, zNN], speed: 1.38 },
      ],
      initIdx: 3,
    },
  ];

  const urbanNPCs = citizensSpec.map((spec) =>
    createScheduledNPC(
      mkRig(spec.index, { parcel: spec.parcel, topColor: spec.topColor }),
      spec.steps,
      spec.initIdx || 0,
      0,
      `cit_${spec.index}`,
    ));

  const intersections = [
    [westRoadX, mainRoadZ],
    [eastRoadX, mainRoadZ],
    [westRoadX, northRoadZ],
    [eastRoadX, northRoadZ],
  ];

  const syncVehiclePhysics = (v, idx) => {
    if (!physics) return;
    const vx = v.axis === "x" ? v.pos : v.lane;
    const vz = v.axis === "x" ? v.lane : v.pos;
    const halfX = v.axis === "x" ? v.halfLen : v.halfW;
    const halfZ = v.axis === "x" ? v.halfW : v.halfLen;
    const dirX = v.axis === "x" ? v.dir : 0;
    const dirZ = v.axis === "x" ? 0 : v.dir;
    physics.setVehicle(`veh_${idx}`, vx, vz, halfX, halfZ, dirX, dirZ, v.speed, v.halfLen, v.halfW);
  };
  vehicles.forEach((v, idx) => syncVehiclePhysics(v, idx));

  let prevT = 0;

  return {
    root,
    animate(t, motion) {
      const phase = (motion ? t : 3.0) % CYCLE;
      const ewSig = phase < 8.5 ? "green" : phase < 10.5 ? "yellow" : "red";
      const nsSig = phase < 10.5 ? "red" : phase < 16.5 ? "green" : "yellow";
      const pedGoNS = phase >= 10.8 && phase <= 16.2;
      const pedGoEW = phase >= 0.6 && phase <= 8.0;
      const pedStartNS = phase >= 10.8 && phase <= 12.9;
      const pedStartEW = phase >= 0.6 && phase <= 4.8;

      for (const l of lights) {
        const sig = l.sigAxis === "ew" ? ewSig : nsSig;
        const pGo = l.sigAxis === "ew" ? pedGoNS : pedGoEW;
        l.redMat.color.set(sig === "red" ? "#ef4444" : "#181c24");
        l.redMat.emissiveIntensity = sig === "red" ? 2.8 : 0.02;
        l.yelMat.color.set(sig === "yellow" ? "#f59e0b" : "#181c24");
        l.yelMat.emissiveIntensity = sig === "yellow" ? 2.6 : 0.02;
        l.grnMat.color.set(sig === "green" ? "#22c55e" : "#181c24");
        l.grnMat.emissiveIntensity = sig === "green" ? 2.5 : 0.02;
        l.pedGrnMat.color.set(pGo ? "#22c55e" : "#181c24");
        l.pedGrnMat.emissiveIntensity = pGo ? 2.3 : 0.02;
        l.pedRedMat.color.set(pGo ? "#181c24" : "#ef4444");
        l.pedRedMat.emissiveIntensity = pGo ? 0.02 : 2.3;
      }

      if (!motion) {
        vehicles.forEach((v, idx) => {
          v.pos = v.initPos;
          v.stopTimer = 0;
          v.stopCooldown = 0;
          if (v.axis === "x") v.root.position.x = v.pos;
          else v.root.position.z = v.pos;
          v.tailMat.emissiveIntensity = 0.75;
          if (v.policeLightMat) v.policeLightMat.emissiveIntensity = 0.9;
          syncVehiclePhysics(v, idx);
        });
        for (const npc of urbanNPCs) stepScheduledNPC(npc, 0, 0, false, { physics, layer: "outdoor" });
        prevT = t;
        return;
      }

      const dt = prevT ? Math.min(0.06, Math.max(0.001, t - prevT)) : 0.016;
      prevT = t;

      // Động học phương tiện (dừng đèn đỏ, giữ khoảng cách, nhường giao lộ chéo, phanh khẩn cấp tránh người & Hero)
      vehicles.forEach((v, idx) => {
        let desired = v.maxV;
        const sig = v.sigAxis === "ew" ? ewSig : nsSig;
        let redHold = false;

        if (v.stopCooldown > 0) v.stopCooldown = Math.max(0, v.stopCooldown - dt);
        if (v.stopTimer > 0) {
          v.stopTimer = Math.max(0, v.stopTimer - dt);
          desired = 0;
          redHold = true;
          if (v.stopTimer === 0) v.stopCooldown = 14.0;
        } else if (v.busStopX !== undefined && v.stopCooldown <= 0) {
          const distStop = (v.busStopX - v.pos) * v.dir;
          if (distStop > -0.6 && distStop < 8.5) {
            if (distStop <= 0.65) {
              v.stopTimer = 3.8;
              desired = 0;
              redHold = true;
            } else {
              desired = Math.min(desired, (distStop / 5.5) * v.maxV);
            }
          }
        }

        if (sig !== "green") {
          for (const sl of v.stopLines) {
            const distToLine = (sl - v.pos) * v.dir - v.halfLen;
            if (distToLine > -0.55 && distToLine < 9.5) {
              if (distToLine <= 0.45) {
                desired = 0;
                if (sig === "red" && distToLine > -0.25) redHold = true;
              } else {
                desired = Math.min(desired, (distToLine / 5.5) * v.maxV);
              }
            }
          }
        }

        // Tránh đâm xe cùng chiều (tính theo bề rộng hai xe nên xe máy song song ô tô không chạm sườn!)
        for (const o of vehicles) {
          if (o === v || o.axis !== v.axis || o.dir !== v.dir || Math.abs(o.lane - v.lane) >= v.halfW + o.halfW + 0.18) continue;
          let gap = (o.pos - v.pos) * v.dir;
          if (gap < 0) gap += v.span;
          const clear = gap - v.halfLen - o.halfLen;
          if (clear < 5.8) {
            if (clear <= 1.25) {
              desired = 0;
              if (clear <= 0.85) redHold = true;
            } else {
              desired = Math.min(desired, ((clear - 1.25) / 4.55) * v.maxV);
            }
          }
        }

        // Nhường giao lộ nếu còn xe trục vuông góc chưa thoát khỏi nút giao
        for (const [ix, iz] of intersections) {
          const ic = v.axis === "x" ? ix : iz;
          const enterEdge = ic - v.dir * 4.3;
          const edgeDist = (enterEdge - v.pos) * v.dir - v.halfLen;
          if (edgeDist > -0.35 && edgeDist < 6.5) {
            const blocked = vehicles.some((o) => {
              if (o.axis === v.axis) return false;
              const oOnCrossingLine = Math.abs(o.lane - ic) < 4.5 + o.halfW;
              const oCrossCoord = o.axis === "x" ? ix : iz;
              return oOnCrossingLine && Math.abs(o.pos - oCrossCoord) < 4.4 + o.halfLen;
            });
            if (blocked) {
              if (edgeDist <= 0.65) {
                desired = 0;
                redHold = true;
              } else {
                desired = Math.min(desired, (edgeDist / 6.5) * v.maxV);
              }
            }
          }
        }

        // Phanh gấp nhường người đi bộ & Hero trên đường
        if (physics) {
          const vx = v.axis === "x" ? v.pos : v.lane;
          const vz = v.axis === "x" ? v.lane : v.pos;
          const fdx = v.axis === "x" ? v.dir : 0;
          const fdz = v.axis === "x" ? 0 : v.dir;
          for (const h of physics.getHumans("outdoor")) {
            const dx = h.x - vx;
            const dz = h.z - vz;
            const fwd = dx * fdx + dz * fdz;
            const lat = Math.abs(-dx * fdz + dz * fdx);
            if (lat < v.halfW + h.r + 0.48 && fwd > -v.halfLen * 0.25 && fwd < v.halfLen + 9.0) {
              const clear = fwd - v.halfLen - h.r;
              if (clear <= 1.85) {
                desired = 0;
                redHold = true;
              } else {
                desired = Math.min(desired, ((clear - 1.85) / 7.15) * v.maxV);
              }
            }
          }
        }

        const braking = desired < v.speed - 0.15 || desired < 0.25;
        const accel = braking ? 12.5 : 3.6;
        v.speed += Math.sign(desired - v.speed) * Math.min(Math.abs(desired - v.speed), accel * dt);
        v.speed = redHold ? 0 : Math.max(0, v.speed);
        let nextPos = v.pos + v.dir * v.speed * dt;
        if ((v.dir > 0 && nextPos > v.max) || (v.dir < 0 && nextPos < v.min)) {
          const wrapPos = v.dir > 0 ? v.min : v.max;
          const spawnBusy = vehicles.some((o) =>
            o !== v && o.axis === v.axis && Math.abs(o.lane - v.lane) < v.halfW + o.halfW + 0.2 &&
            Math.abs(o.pos - wrapPos) < v.halfLen + o.halfLen + 2.5);
          if (spawnBusy) {
            nextPos = v.pos;
            v.speed = 0;
          } else {
            nextPos = wrapPos;
          }
        }
        v.pos = nextPos;

        if (v.axis === "x") v.root.position.x = v.pos;
        else v.root.position.z = v.pos;
        syncVehiclePhysics(v, idx);
        const dSpin = (v.speed * dt) / v.wheelR;
        for (const w of v.wheels) w.rotation.z -= dSpin;
        if (v.mixer && v.speed > 0.05) v.mixer.update(dt * (v.speed / 3.8));
        v.tailMat.emissiveIntensity = braking ? 2.8 : 0.75;
        if (v.policeLightMat) v.policeLightMat.emissiveIntensity = Math.sin(t * 14) > 0 ? 3.2 : 0.25;
      });

      const gateCheck = (crossAxis) => (crossAxis === "ns" ? pedStartNS : pedStartEW);
      for (const npc of urbanNPCs) stepScheduledNPC(npc, t, dt, true, { gateCheck, physics, layer: "outdoor" });
    },
  };
}
