// Bộ dựng cảnh văn phòng 3D PBR bền vững (persistent scene graph):
// - Kiến trúc: sàn gạch/gỗ, tường sơn vữa có phào chỉ & auto-cutaway, cửa sổ kính có khung nhôm & ngoại cảnh,
//   vách kính cường lực, toà nhà kính rèm nhiều tầng (Tập đoàn) + lan can kính tầng thượng.
// - Nội thất: bàn bo góc vát cạnh, 1–2 màn hình IDE độ phân giải cao, cốc gốm xoay Lathe, ghế & nhân vật điêu khắc
//   (human3d.js), sofa, kệ sách, tủ server đèn nháy, quầy bar cà phê, phòng họp 4K, giường ngủ trưa, hologram.
// - Cảnh quan: uỷ thác nature3d.js (cây thân cong, thông, dừa, hồ bơi mosaic nước vật lý, sàn teak, bồn hoa, đèn đường).
import { inkOn, shade } from "./iso.js";
import { planFor } from "./plans.js";
import { STATE_TEXT, roomLabelAt, wallSegments } from "./scene.js";
import {
  buildHumanRig, animateHumanRig, buildWalkerRig, animateWalkerRig,
  buildHDHuman, animateHDHuman, buildSeatedHDHuman, animateSeatedHDHuman,
  createScheduledNPC, stepScheduledNPC,
} from "./human3d.js";
import { buildStreetTraffic } from "./traffic3d.js";
import { buildSurroundingCity } from "./city3d.js";
import { instantiateGLB } from "./glb.js";
import { createWorldPhysics } from "./physics3d.js";
import {
  buildBench, buildBollard, buildFence, buildFlowerbed, buildInstancedLawn, buildPlant,
  buildPool, buildRock, buildSeasonTree, buildStreetlamp, buildTree, buildUmbrella,
} from "./nature3d.js";

const STATE_COLOR = { work: "#22c55e", fail: "#ef4444", wait: "#f59e0b", done: "#38bdf8", idle: "#94a3b8", untracked: "#94a3b8" };
const QUIET = new Set(["idle", "untracked", "npc"]);
const WINDOW_SKY = {
  sky: ["#bfe3ff", "#8ecbff"], garden: ["#cdeffd", "#8cd47e"], dusk: ["#f6a35c", "#5b3a6e"],
  city: ["#0f1733", "#1c2550"], neon: ["#1a0b2e", "#2b0f45"], street: ["#d8ecf7", "#c9b79c"], stars: ["#000005", "#050818"],
};

function rnd(i) {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function npcAt(k) {
  return rnd(k * 7 + 3) > 0.15;
}

// Gộp các đoạn tường liền kề từ wallSegments() để tạo tấm kính nguyên khối mượt mà trong 3D
function mergeSegments(segs) {
  const out = [];
  for (const [u, v] of segs) {
    if (out.length && Math.abs(out[out.length - 1][1] - u) < 1e-4) out[out.length - 1][1] = v;
    else out.push([u, v]);
  }
  return out;
}

function roundedRectShape(THREE, w, d, r) {
  const s = new THREE.Shape();
  const hw = w / 2, hd = d / 2;
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  return s;
}

export function createSceneAssets(THREE) {
  const deskGeo = new THREE.ExtrudeGeometry(roundedRectShape(THREE, 2.78, 1.08, 0.08), {
    depth: 0.065, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2,
  });
  deskGeo.rotateX(Math.PI / 2);

  const meetGeo = new THREE.ExtrudeGeometry(roundedRectShape(THREE, 6.76, 1.76, 0.24), {
    depth: 0.07, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 3,
  });
  meetGeo.rotateX(Math.PI / 2);

  const cushionGeo = new THREE.ExtrudeGeometry(roundedRectShape(THREE, 0.92, 0.72, 0.1), {
    depth: 0.14, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2,
  });
  cushionGeo.rotateX(Math.PI / 2);

  const mugPts = [
    [0.0, 0.0], [0.062, 0.0], [0.068, 0.02], [0.072, 0.155], [0.064, 0.165], [0.056, 0.155], [0.054, 0.03], [0.0, 0.03],
  ].map(([r, y]) => new THREE.Vector2(r, y));

  const jugPts = [
    [0.0, 0.0], [0.19, 0.0], [0.2, 0.36], [0.18, 0.44], [0.08, 0.54], [0.075, 0.62], [0.0, 0.62],
  ].map(([r, y]) => new THREE.Vector2(r, y));

  const geos = {
    unitBox: new THREE.BoxGeometry(1, 1, 1),
    unitPlane: new THREE.PlaneGeometry(1, 1),
    unitCyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    unitSphere: new THREE.SphereGeometry(0.5, 16, 12),
    unitIco: new THREE.IcosahedronGeometry(0.5, 1),
    deskTop: deskGeo,
    meetTop: meetGeo,
    cushion: cushionGeo,
    mug: new THREE.LatheGeometry(mugPts, 16),
    mugHandle: new THREE.TorusGeometry(0.044, 0.011, 6, 12),
    mouse: new THREE.CapsuleGeometry(0.034, 0.055, 4, 10),
    orb: new THREE.SphereGeometry(0.095, 16, 12),
    lampShade: new THREE.ConeGeometry(0.32, 0.42, 18, 1, true),
    bulb: new THREE.SphereGeometry(0.07, 10, 8),
    pillow: new THREE.CapsuleGeometry(0.09, 0.24, 6, 10),
    bedPillow: new THREE.CapsuleGeometry(0.105, 0.42, 6, 12),
    cafeTop: new THREE.CylinderGeometry(0.49, 0.49, 0.06, 22),
    stoolSeat: new THREE.CylinderGeometry(0.24, 0.22, 0.07, 16),
    bottle: new THREE.LatheGeometry(jugPts, 16),
    pastryDome: new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    holoRing: new THREE.TorusGeometry(0.66, 0.025, 8, 36),
    shadowDisc: new THREE.PlaneGeometry(1, 1),
    pipe: new THREE.CylinderGeometry(0.055, 0.055, 1, 10),
  };

  return {
    geos,
    dispose() {
      for (const g of Object.values(geos)) g.dispose();
    },
  };
}

export function createMaterialBank(THREE, textures, glowOn) {
  const cache = new Map();
  const owned = [];
  let shadowMat = null;
  let causticsMat = null;

  function applyTex(params, opts) {
    if (!opts.tex) return;
    const t = textures.get(opts.tex);
    if (!t) return;
    params.map = t;
    if (glowOn && opts.normal) {
      const nm = textures.normal(opts.tex);
      if (nm) {
        params.normalMap = nm;
        params.normalScale = new THREE.Vector2(opts.normal, opts.normal);
      }
    } else if (opts.bump && opts.bump !== 0 && !opts.tex.startsWith("screen") && opts.tex !== "beachball") {
      params.bumpMap = t;
      params.bumpScale = opts.bump;
    }
    if (glowOn && opts.roughMap) {
      const rm = textures.roughness(opts.tex);
      if (rm) params.roughnessMap = rm;
    }
  }

  function makeParams(color, opts = {}) {
    const params = {
      color: new THREE.Color(color || "#ffffff"),
      roughness: opts.roughness !== undefined ? opts.roughness : 0.68,
      metalness: opts.metalness !== undefined ? opts.metalness : 0.05,
    };
    if (opts.transparent) {
      params.transparent = true;
      params.opacity = opts.opacity !== undefined ? opts.opacity : 0.5;
      if (opts.depthWrite !== undefined) params.depthWrite = opts.depthWrite;
    }
    if (opts.alphaTest !== undefined) params.alphaTest = opts.alphaTest;
    if (opts.side !== undefined) params.side = opts.side;
    if (opts.polygonOffset) {
      params.polygonOffset = true;
      params.polygonOffsetFactor = opts.offsetFactor || -1;
      params.polygonOffsetUnits = opts.offsetUnits || -1;
    }
    if (opts.emissive && glowOn) {
      params.emissive = new THREE.Color(opts.emissive);
      params.emissiveIntensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.6;
    }
    if (opts.clearcoat !== undefined) {
      params.clearcoat = opts.clearcoat;
      params.clearcoatRoughness = opts.clearcoatRoughness !== undefined ? opts.clearcoatRoughness : 0.1;
    }
    if (opts.sheen !== undefined) {
      params.sheen = opts.sheen;
      params.sheenRoughness = opts.sheenRoughness !== undefined ? opts.sheenRoughness : 0.72;
      if (opts.sheenColor) params.sheenColor = new THREE.Color(opts.sheenColor);
    }
    applyTex(params, opts);
    return params;
  }

  function keyOf(kind, color, opts) {
    return kind + "|" + color + "|" + (opts.tex || "") + "|" + (opts.normal || 0) + "|" + (opts.roughMap ? 1 : 0) +
      "|" + (opts.roughness ?? "") + "|" + (opts.metalness ?? "") + "|" + (opts.opacity ?? 1) +
      "|" + (opts.alphaTest ?? 0) + "|" + (opts.emissive || "") + "|" + (opts.emissiveIntensity ?? "") +
      "|" + (opts.clearcoat ?? "") + "|" + (opts.sheen ?? "") + "|" + (opts.sheenColor || "") +
      "|" + (opts.side ?? "") + "|" + (opts.offsetUnits ?? "");
  }

  function standard(color, opts = {}) {
    const k = keyOf("s", color, opts);
    let m = cache.get(k);
    if (!m) {
      m = new THREE.MeshStandardMaterial(makeParams(color, opts));
      cache.set(k, m);
      owned.push(m);
    }
    return m;
  }

  function freshStandard(color, opts = {}) {
    const m = new THREE.MeshStandardMaterial(makeParams(color, opts));
    owned.push(m);
    return m;
  }

  function physical(color, opts = {}) {
    const k = keyOf("p", color, opts);
    let m = cache.get(k);
    if (!m) {
      m = new THREE.MeshPhysicalMaterial(makeParams(color, opts));
      cache.set(k, m);
      owned.push(m);
    }
    return m;
  }

  function freshPhysical(color, opts = {}) {
    const m = new THREE.MeshPhysicalMaterial(makeParams(color, opts));
    owned.push(m);
    return m;
  }

  function shadow() {
    if (!shadowMat) {
      shadowMat = new THREE.MeshBasicMaterial({
        map: textures.get("shadow"),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      });
      owned.push(shadowMat);
    }
    return shadowMat;
  }

  function caustics() {
    if (!causticsMat) {
      causticsMat = new THREE.MeshBasicMaterial({
        map: textures.get("caustics"),
        transparent: true,
        opacity: glowOn ? 0.32 : 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      owned.push(causticsMat);
    }
    return causticsMat;
  }

  function sunbeam(color, opacity = 0.28) {
    const k = "sunbeam|" + color + "|" + opacity;
    let m = cache.get(k);
    if (!m) {
      m = new THREE.MeshBasicMaterial({
        map: textures.get("sunbeam"),
        color: new THREE.Color(color),
        transparent: true,
        opacity: glowOn ? opacity : 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      cache.set(k, m);
      owned.push(m);
    }
    return m;
  }

  return {
    standard,
    freshStandard,
    physical,
    freshPhysical,
    shadow,
    caustics,
    sunbeam,
    own(m) {
      owned.push(m);
      return m;
    },
    dispose() {
      for (const m of owned) m.dispose();
      owned.length = 0;
      cache.clear();
      shadowMat = null;
      causticsMat = null;
    },
  };
}

function addBox(THREE, parent, geo, mat, x, y, z, sx, sy, sz, cast = true, recv = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = cast;
  m.receiveShadow = recv;
  parent.add(m);
  return m;
}

function putHD(THREE, hdAssets, key, instOpts, x, y, z, rotY = 0) {
  const parsed = hdAssets && hdAssets.get(key);
  if (!parsed) return null;
  const inst = instantiateGLB(THREE, parsed, instOpts);
  inst.group.position.set(x, y, z);
  if (rotY) inst.group.rotation.y = rotY;
  return inst.group;
}

// ---------------------------------------------------------------- Ngoại cảnh: sân cỏ, lối vào, cây cối, bồn hoa, đèn đường
function buildOutdoor(THREE, sceneAssets, natureAssets, humanAssets, trafficAssets, cityAssets, sgAssets, hdAssets, mats, plan, anim, physics) {
  const group = new THREE.Group();
  const g = sceneAssets.geos;
  const pad = plan.levels ? 6 : 4;
  if (physics) {
    // Khối toà nhà X-Office tầng trệt + hàng rào cây xanh bao quanh (chừa mở lối đi đá sảnh x = 3..7)
    physics.addBox("outdoor", -0.2, -0.2, plan.W + 0.2, plan.D + 0.2, "xoffice_bldg");
    physics.addBox("outdoor", 7.35, plan.D + pad - 1.35, plan.W + pad - 0.65, plan.D + pad - 0.65, "yard_fence");
    physics.addBox("outdoor", plan.W + pad - 1.35, -1.0, plan.W + pad - 0.65, plan.D + pad - 0.65, "yard_fence");
    physics.addBox("outdoor", -1.0, plan.D + pad - 1.35, 2.85, plan.D + pad - 0.65, "yard_fence");
  }
  const grassA = mats.standard("#78ab62", { roughness: 0.94, tex: "grass", bump: 0.03 });
  const grassB = mats.standard("#8cc074", { roughness: 0.92, tex: "grass", bump: 0.025, polygonOffset: true, offsetUnits: -1 });
  const curbMat = mats.standard("#a8a29e", { roughness: 0.85, tex: "stone", bump: 0.03, polygonOffset: true, offsetUnits: -2 });
  const pathMat = mats.standard("#e7e5e4", { roughness: 0.78, tex: "stone", bump: 0.025, polygonOffset: true, offsetUnits: -3 });

  const lawn = new THREE.Mesh(g.unitPlane, grassA);
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set((plan.W + pad - 1.5) / 2, -0.025, (plan.D + pad - 1.5) / 2);
  lawn.scale.set(plan.W + pad + 1.5, plan.D + pad + 1.5, 1);
  lawn.receiveShadow = true;
  group.add(lawn);

  const innerLawn = new THREE.Mesh(g.unitPlane, grassB);
  innerLawn.rotation.x = -Math.PI / 2;
  innerLawn.position.set((plan.W + pad - 1.6) / 2, -0.015, (plan.D + pad - 1.6) / 2);
  innerLawn.scale.set(plan.W + pad - 0.4, plan.D + pad - 0.4, 1);
  innerLawn.receiveShadow = true;
  group.add(innerLawn);

  // Lối đi đá tự nhiên phía trước sảnh
  const curb = new THREE.Mesh(g.unitPlane, curbMat);
  curb.rotation.x = -Math.PI / 2;
  curb.position.set(5.0, -0.008, plan.D + pad / 2);
  curb.scale.set(4.5, pad, 1);
  curb.receiveShadow = true;
  const walk = new THREE.Mesh(g.unitPlane, pathMat);
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(5.0, -0.004, plan.D + pad / 2);
  walk.scale.set(3.9, pad, 1);
  walk.receiveShadow = true;
  group.add(curb, walk);

  // Hàng rào cây xanh & hoa bao quanh
  group.add(buildFence(THREE, natureAssets, mats, { axis: "x", x: 7.4, y: plan.D + pad - 1.0, len: plan.W - 7.4 + pad - 1 }));
  group.add(buildFence(THREE, natureAssets, mats, { axis: "y", x: plan.W + pad - 1.0, y: -1.0, len: plan.D + pad - 1 }));
  group.add(buildFence(THREE, natureAssets, mats, { axis: "x", x: -1.0, y: plan.D + pad - 1.0, len: 3.8 }));

  // Cây tán rộng, thông và dừa dọc khuôn viên
  for (let x = 9; x < plan.W; x += 7) {
    group.add(buildTree(THREE, natureAssets, mats, {
      x, y: plan.D + 1.0, color: x % 2 ? "#2f855a" : "#3b8f4f", pine: x % 14 === 9, palm: x >= 30,
    }, anim));
    if (physics) physics.addCircle("outdoor", x + 1.0, plan.D + 2.0, 0.48, "yard_tree");
  }
  for (let y = 2; y < plan.D; y += 7) {
    group.add(buildTree(THREE, natureAssets, mats, {
      x: plan.W + 1.0, y, color: y % 2 ? "#2f855a" : "#40916c",
    }, anim));
    if (physics) physics.addCircle("outdoor", plan.W + 2.0, y + 1.0, 0.48, "yard_tree");
  }

  // Lối đá bước dạo & đèn trụ sân vườn
  const stepMat = mats.standard("#d6d3d1", { roughness: 0.82, tex: "stone", bump: 0.03 });
  for (let sx = 8.4; sx < 31.5; sx += 2.2) {
    addBox(THREE, group, g.unitBox, stepMat, sx + 0.55, 0.025, plan.D + 0.72, 1.1, 0.05, 0.75, false, true);
    if (Math.round(sx) % 4 === 0) {
      group.add(buildBollard(THREE, natureAssets, mats, sx + 0.5, plan.D + 1.25));
      if (physics) physics.addCircle("outdoor", sx + 0.5, plan.D + 1.25, 0.22, "bollard");
    }
  }

  group.add(buildFlowerbed(THREE, natureAssets, mats, 1.5, plan.D + 0.35, "#f43f5e"));
  group.add(buildFlowerbed(THREE, natureAssets, mats, 7.4, plan.D + 0.35, "#facc15"));
  for (const px of [1.4, 7.5]) {
    const pb = putHD(THREE, hdAssets, "planter_box", { targetLength: 1.35 }, px, 0, plan.D + 0.55);
    if (pb) group.add(pb);
    if (physics) physics.addBox("outdoor", px - 0.7, plan.D + 0.15, px + 0.7, plan.D + 0.95, "planter");
  }
  group.add(buildRock(THREE, natureAssets, mats, 31.2, 20.4, 0.85));
  group.add(buildRock(THREE, natureAssets, mats, 42.2, 18.8, 0.75));
  for (const lx of [2.5, 7.4]) {
    const sl = putHD(THREE, hdAssets, "streetlamp", { targetHeight: 3.8 }, lx, 0, plan.D + 1.4);
    group.add(sl || buildStreetlamp(THREE, natureAssets, mats, { x: lx, y: plan.D + 1.4 }));
    if (physics) physics.addCircle("outdoor", lx, plan.D + 1.4, 0.26, "lamp");
  }

  // Cỏ 3D & hoa dại thật quanh khuôn viên sân vườn (InstancedMesh)
  group.add(buildInstancedLawn(THREE, natureAssets, mats, {
    x0: -1.0, x1: plan.W + pad - 1.2, y0: plan.D + 0.2, y1: plan.D + pad - 1.2, count: 280, flowers: 38,
  }, [[2.4, plan.D - 0.5, 7.6, plan.D + pad + 1], [8.0, plan.D, 32.0, plan.D + 1.5]]));

  // Vỉa hè bê tông + đại lộ nhựa + vạch qua đường + 2 xe ô tô điện bóng clearcoat đỗ gọn trước văn phòng
  const streetZ = plan.D + pad;
  const swMat = mats.standard("#dedad2", { roughness: 0.85, tex: "sidewalk", normal: 0.55 });
  const roadMat = mats.standard("#8a919c", { roughness: 0.88, tex: "road", normal: 0.65, roughMap: true });
  const curbCol = mats.standard("#a8a29e", { roughness: 0.82, tex: "stone", normal: 0.5, roughMap: true });
  const swW = plan.W + pad + 2.6;
  const swX = (plan.W + pad - 1.5) / 2;

  const sidewalk = new THREE.Mesh(g.unitPlane, swMat);
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.set(swX, -0.008, streetZ + 1.15);
  sidewalk.scale.set(swW, 2.3, 1);
  sidewalk.receiveShadow = true;
  group.add(sidewalk);
  addBox(THREE, group, g.unitBox, curbCol, swX, 0.05, streetZ + 2.32, swW, 0.14, 0.18, false, true);

  const road = new THREE.Mesh(g.unitPlane, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(swX, -0.028, streetZ + 5.9);
  road.scale.set(swW + 10, 7.2, 1);
  road.receiveShadow = true;
  group.add(road);

  // Vỉa hè phía Nam đối diện đại lộ (cho người đi bộ qua đường & dạo phố)
  addBox(THREE, group, g.unitBox, curbCol, swX, 0.05, streetZ + 9.52, swW, 0.14, 0.18, false, true);
  const southWalk = new THREE.Mesh(g.unitPlane, swMat);
  southWalk.rotation.x = -Math.PI / 2;
  southWalk.position.set(swX, -0.008, streetZ + 10.65);
  southWalk.scale.set(swW, 2.2, 1);
  southWalk.receiveShadow = true;
  group.add(southWalk);

  // Vạch phân làn đứt nét màu vàng + vạch trắng dừng đèn đỏ & qua đường
  const stripeMat = mats.standard("#f1f5f9", { roughness: 0.72, polygonOffset: true, offsetUnits: -2 });
  const centerLineMat = mats.standard("#e5a93c", { roughness: 0.72, polygonOffset: true, offsetUnits: -2 });
  for (let dx = -2.2; dx < plan.W + pad + 0.5; dx += 4.2) {
    if (dx > 1.8 && dx < 8.4) continue;
    const ln = new THREE.Mesh(g.unitPlane, centerLineMat);
    ln.rotation.x = -Math.PI / 2;
    ln.position.set(dx, -0.016, streetZ + 5.9);
    ln.scale.set(2.1, 0.16, 1);
    group.add(ln);
  }
  for (let k = 0; k < 5; k++) {
    const st = new THREE.Mesh(g.unitPlane, stripeMat);
    st.rotation.x = -Math.PI / 2;
    st.position.set(3.4 + k * 0.8, -0.015, streetZ + 5.9);
    st.scale.set(0.42, 6.2, 1);
    group.add(st);
  }
  // Vạch trắng dừng đèn đỏ trước vạch qua đường ở cả hai làn
  for (const [sx, sz] of [[1.95, streetZ + 7.65], [8.15, streetZ + 4.15]]) {
    const stopLn = new THREE.Mesh(g.unitPlane, stripeMat);
    stopLn.rotation.x = -Math.PI / 2;
    stopLn.position.set(sx, -0.015, sz);
    stopLn.scale.set(0.32, 3.1, 1);
    group.add(stopLn);
  }

  // Hệ thống giao thông chạy thật: đèn tín hiệu Đỏ/Vàng/Xanh, ô tô, xe máy kèm người lái và người đi bộ (có va chạm vật lý)
  if (trafficAssets) {
    const traffic = buildStreetTraffic(THREE, trafficAssets, natureAssets, humanAssets, mats, plan, streetZ, hdAssets, physics);
    group.add(traffic.root);
    anim.traffics.push(traffic);
  }

  // Khu phố đô thị hoàn chỉnh bao quanh 4 phía (nhà phố, quán cà phê, cao ốc kính, công viên, trạm buýt, skyline)
  if (cityAssets) {
    const city = buildSurroundingCity(THREE, cityAssets, natureAssets, sgAssets, hdAssets, mats, plan, streetZ, anim, physics);
    group.add(city.root);
    anim.cities.push(city);
  }
  return group;
}

// ---------------------------------------------------------------- Toà nhà kính rèm nhiều tầng (quy mô Tập đoàn)
function buildBuilding(THREE, sceneAssets, mats, plan, th) {
  const group = new THREE.Group();
  const g = sceneAssets.geos;
  const { W, D, levels, levelH } = plan;
  const slabMat = mats.standard("#cbd5e1", { roughness: 0.55, metalness: 0.25 });
  const mullionMat = mats.standard("#94a3b8", { roughness: 0.32, metalness: 0.78 });
  const glassFront = mats.physical(th.edge ? "#1e293b" : "#5b86b0", { roughness: 0.1, metalness: 0.18, clearcoat: 1.0, clearcoatRoughness: 0.08 });
  const glassSide = mats.physical(th.edge ? "#162033" : "#4b7299", { roughness: 0.12, metalness: 0.18, clearcoat: 1.0, clearcoatRoughness: 0.08 });
  const litMat = mats.standard("#fef08a", { roughness: 0.3, emissive: "#fde047", emissiveIntensity: 0.65 });
  const dimMat = mats.standard(th.edge ? "#1e293b" : "#7ca8cf", { roughness: 0.25, metalness: 0.2 });

  // Khối lõi toà nhà
  addBox(THREE, group, g.unitBox, glassFront, W / 2, (levels * levelH) / 2, D / 2, W - 0.08, levels * levelH, D - 0.08, false, true);

  for (let i = 0; i < levels; i++) {
    const z0 = i * levelH;
    // Bản sàn bê tông vươn mép
    addBox(THREE, group, g.unitBox, slabMat, W / 2, z0 + 0.18, D / 2, W + 0.24, 0.36, D + 0.24, false, true);
    // Cửa kính & đố nhôm mặt trước (z = D)
    for (let a = 0; a < W; a += 2) {
      const lit = rnd(i * 97 + a) > 0.55;
      addBox(THREE, group, g.unitBox, lit ? litMat : dimMat, a + 1.0, z0 + levelH * 0.54, D + 0.01, 1.62, levelH - 1.25, 0.04, false, false);
      addBox(THREE, group, g.unitBox, mullionMat, a + 0.06, z0 + levelH * 0.54, D + 0.05, 0.12, levelH - 0.36, 0.1, false, false);
    }
    // Mặt phải (x = W)
    for (let a = 0; a < D; a += 2) {
      const lit = rnd(i * 53 + a + 7) > 0.6;
      addBox(THREE, group, g.unitBox, lit ? litMat : glassSide, W + 0.01, z0 + levelH * 0.54, a + 1.0, 0.04, levelH - 1.25, 1.62, false, false);
      addBox(THREE, group, g.unitBox, mullionMat, W + 0.05, z0 + levelH * 0.54, a + 0.06, 0.1, levelH - 0.36, 0.12, false, false);
    }
  }

  // Sảnh tầng trệt: mái đón vươn ra + cửa kính lớn sang trọng
  const canopyMat = mats.standard("#334155", { roughness: 0.35, metalness: 0.7 });
  addBox(THREE, group, g.unitBox, canopyMat, 5.0, 2.85, D + 0.75, 4.8, 0.16, 1.5, true, true);
  addBox(THREE, group, g.unitBox, mats.standard("#0f172a", { roughness: 0.4, metalness: 0.5 }), 5.0, 1.35, D + 0.06, 4.2, 2.7, 0.12, false, false);
  const doorGlass = mats.physical("#38bdf8", { roughness: 0.08, clearcoat: 1, emissive: "#0ea5e9", emissiveIntensity: 0.25 });
  addBox(THREE, group, g.unitBox, doorGlass, 4.05, 1.25, D + 0.11, 1.75, 2.45, 0.06, false, false);
  addBox(THREE, group, g.unitBox, doorGlass, 5.95, 1.25, D + 0.11, 1.75, 2.45, 0.06, false, false);
  return group;
}

// ---------------------------------------------------------------- Kiến trúc phòng: sàn, tường ngoài auto-cutaway, cửa sổ
function buildArchitecture(THREE, sceneAssets, mats, hdAssets, plan, th, cutaway, anim) {
  const g = sceneAssets.geos;
  const { W, D, H, tile } = plan;
  const floorGroup = new THREE.Group();

  // Sàn chính: gạch men bóng nhẹ phản xạ IBL (roughnessMap + normalMap) hoặc sàn gỗ ván sơn mờ
  const woodFloor = th.id === "studio" || th.id === "library" || th.id === "cafe";
  const floorTex = woodFloor ? "wood" : "tileFloor";
  const floorMatA = mats.physical(th.floor[0], {
    roughness: woodFloor ? 0.72 : 0.74, metalness: 0.03, clearcoat: woodFloor ? 0.2 : 0.12, clearcoatRoughness: woodFloor ? 0.32 : 0.45,
    tex: floorTex, normal: 0.45, roughMap: true,
  });
  const floorMatB = mats.physical(th.floor[1], {
    roughness: woodFloor ? 0.76 : 0.78, metalness: 0.03, clearcoat: woodFloor ? 0.18 : 0.1, clearcoatRoughness: woodFloor ? 0.34 : 0.48,
    tex: floorTex, normal: 0.45, roughMap: true,
  });

  // Sàn nền đồng khối + kẻ caro nhẹ theo plan.tile (không quá nhỏ để giữ draw-call tối ưu)
  const step = Math.max(tile, plan.W > 24 ? 4 : 2);
  for (let i = 0; i < W; i += step) {
    for (let j = 0; j < D; j += step) {
      const tw = Math.min(step, W - i), td = Math.min(step, D - j);
      const m = new THREE.Mesh(g.unitPlane, ((Math.round(i / step) + Math.round(j / step)) % 2) ? floorMatB : floorMatA);
      m.rotation.x = -Math.PI / 2;
      m.position.set(i + tw / 2, 0, j + td / 2);
      m.scale.set(tw, td, 1);
      m.receiveShadow = true;
      floorGroup.add(m);
    }
  }

  // Sàn khu vực phòng riêng trong quy mô Công ty / Tập đoàn
  for (const r of plan.rooms) {
    if (!r.floor) continue;
    const isGarden = r.id === "garden";
    const isWood = r.id === "director" || r.id === "reception";
    const rMat = isGarden
      ? mats.standard(r.floor, { roughness: 0.94, tex: "grass", normal: 0.55, polygonOffset: true, offsetUnits: -2 })
      : mats.physical(r.floor, {
        roughness: isWood ? 0.7 : 0.64, clearcoat: isWood ? 0.28 : 0.32, clearcoatRoughness: 0.28,
        tex: isWood ? "wood" : "tileFloor", normal: 0.42, roughMap: true, polygonOffset: true, offsetUnits: -2,
      });
    const m = new THREE.Mesh(g.unitPlane, rMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(r.x + r.w / 2, 0.006, r.y + r.d / 2);
    m.scale.set(r.w, r.d, 1);
    m.receiveShadow = true;
    floorGroup.add(m);
  }

  // Tấm đế sàn mỏng giúp toà nhà / phòng có bề dày kiến trúc thật (hạ thấp -0.03 tránh Z-fighting với sàn và cỏ)
  addBox(THREE, floorGroup, g.unitBox, mats.standard(shade(th.wall, -0.25), { roughness: 0.7 }), W / 2, -0.17, D / 2, W + 0.6, 0.28, D + 0.6, false, true);

  // Lan can kính tầng thượng cho Tập đoàn
  if (plan.levels) {
    const railGlass = mats.physical("#bae6fd", { roughness: 0.06, clearcoat: 1, transparent: true, opacity: 0.26, depthWrite: false });
    const railMetal = mats.standard("#94a3b8", { roughness: 0.25, metalness: 0.85 });
    addBox(THREE, floorGroup, g.unitBox, railGlass, W / 2, 0.52, D + 0.02, W, 1.0, 0.05, false, false);
    addBox(THREE, floorGroup, g.unitBox, railMetal, W / 2, 1.04, D + 0.02, W + 0.1, 0.06, 0.08, false, false);
    addBox(THREE, floorGroup, g.unitBox, railGlass, W + 0.02, 0.52, D / 2, 0.05, 1.0, D, false, false);
    addBox(THREE, floorGroup, g.unitBox, railMetal, W + 0.02, 1.04, D / 2, 0.08, 0.06, D + 0.1, false, false);
  }

  // Tường ngoài dày sơn vữa + phào chân tường + viền trần (chia nhóm cutaway.left và cutaway.back)
  const wallMat = mats.standard(th.wall, { roughness: 0.82, tex: "plaster", bump: 0.014 });
  const trimMat = mats.standard(th.trim, { roughness: 0.45, metalness: 0.18 });
  const crownMat = mats.standard(th.trim, { roughness: 0.35, metalness: 0.25, emissive: th.edge || null, emissiveIntensity: 0.75 });

  addBox(THREE, cutaway.left, g.unitBox, wallMat, -0.15, H / 2, (D - 0.3) / 2, 0.3, H, D + 0.3, true, true);
  addBox(THREE, cutaway.left, g.unitBox, trimMat, 0.025, 0.09, D / 2, 0.05, 0.18, D, false, true);
  addBox(THREE, cutaway.left, g.unitBox, crownMat, 0.025, H - 0.06, D / 2, 0.05, 0.12, D, false, false);

  addBox(THREE, cutaway.back, g.unitBox, wallMat, W / 2, H / 2, -0.15, W, H, 0.3, true, true);
  addBox(THREE, cutaway.back, g.unitBox, trimMat, W / 2, 0.09, 0.025, W, 0.18, 0.05, false, true);
  addBox(THREE, cutaway.back, g.unitBox, crownMat, W / 2, H - 0.06, 0.025, W, 0.12, 0.05, false, false);

  // Cửa sổ kính khung nhôm có quang cảnh ngoài trời
  const frameMat = mats.standard(th.edge ? th.trim : "#334155", { roughness: 0.3, metalness: 0.72, emissive: th.edge || null, emissiveIntensity: 0.4 });
  const paneGlass = mats.physical("#e0f2fe", { roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false });
  const [skyTop, skyBot] = WINDOW_SKY[th.window] || WINDOW_SKY.sky;

  for (const [a, w] of plan.windows) {
    const b = 1.2, h = 2.2;
    const wg = new THREE.Group();
    wg.position.set(a + w / 2, b + h / 2, 0.02);
    // Khung nhôm 4 cạnh + đố đứng giữa
    addBox(THREE, wg, g.unitBox, frameMat, 0, h / 2 + 0.04, 0.02, w + 0.16, 0.08, 0.1, false, false);
    addBox(THREE, wg, g.unitBox, frameMat, 0, -h / 2 - 0.04, 0.04, w + 0.2, 0.09, 0.14, false, false); // bậu cửa sổ
    addBox(THREE, wg, g.unitBox, frameMat, -w / 2 - 0.04, 0, 0.02, 0.08, h + 0.08, 0.1, false, false);
    addBox(THREE, wg, g.unitBox, frameMat, w / 2 + 0.04, 0, 0.02, 0.08, h + 0.08, 0.1, false, false);
    addBox(THREE, wg, g.unitBox, frameMat, 0, 0, 0.03, 0.045, h, 0.06, false, false);
    // Khung cảnh bầu trời + đường chân trời
    const bgTop = new THREE.Mesh(g.unitPlane, mats.standard(skyTop, { roughness: 0.4, emissive: skyTop, emissiveIntensity: 0.35 }));
    bgTop.scale.set(w, h, 1);
    const bgBot = new THREE.Mesh(g.unitPlane, mats.standard(skyBot, { roughness: 0.5, emissive: skyBot, emissiveIntensity: 0.22 }));
    bgBot.position.set(0, -h * 0.32, 0.005);
    bgBot.scale.set(w, h * 0.36, 1);
    wg.add(bgTop, bgBot);

    if (th.window === "city" || th.window === "neon") {
      const n = Math.max(4, Math.round(w * 2));
      const bw = w / n;
      for (let k = 0; k < n; k++) {
        const bh = 0.45 + rnd(a * 10 + k) * 1.25;
        const bx = -w / 2 + (k + 0.5) * bw;
        const bldg = new THREE.Mesh(g.unitPlane, mats.standard(th.window === "neon" ? "#130726" : "#0b1124", { roughness: 0.8 }));
        bldg.position.set(bx, -h / 2 + bh / 2, 0.01);
        bldg.scale.set(bw * 0.86, bh, 1);
        wg.add(bldg);
        for (let r = 0; r < 3; r++) {
          if (rnd(a * 31 + k * 7 + r) > 0.48) {
            const lit = th.window === "neon" ? (r % 2 ? "#ff2bd6" : "#00e5ff") : "#fde047";
            const wp = new THREE.Mesh(g.unitPlane, mats.standard(lit, { roughness: 0.2, emissive: lit, emissiveIntensity: 0.9 }));
            wp.position.set(bx, -h / 2 + 0.22 + r * 0.34, 0.014);
            wp.scale.set(0.11, 0.13, 1);
            wg.add(wp);
          }
        }
      }
    } else if (th.window === "stars") {
      for (let k = 0; k < 10; k++) {
        const st = new THREE.Mesh(g.unitSphere, mats.standard("#ffffff", { roughness: 0.2, emissive: "#e0f2fe", emissiveIntensity: 0.95 }));
        st.position.set((rnd(k + a) - 0.5) * (w - 0.2), (rnd(k * 3 + a) - 0.5) * (h - 0.2), 0.015);
        st.scale.setScalar(0.055);
        wg.add(st);
      }
    } else if (th.window === "sky" || th.window === "garden" || th.window === "street") {
      const cloud = new THREE.Mesh(g.unitPlane, mats.standard("#ffffff", { roughness: 0.7, emissive: "#ffffff", emissiveIntensity: 0.25 }));
      cloud.position.set(-w * 0.12, h * 0.24, 0.012);
      cloud.scale.set(w * 0.28, 0.2, 1);
      wg.add(cloud);
      if (th.window === "street") {
        for (let k = 0; k < 5; k++) {
          const aw = new THREE.Mesh(g.unitPlane, mats.standard("#c2410c", { roughness: 0.7 }));
          aw.position.set(-w / 2 + (k + 0.25) * (w / 5), h / 2 - 0.18, 0.016);
          aw.scale.set(w / 10, 0.34, 1);
          wg.add(aw);
        }
      }
    }
    const gl = new THREE.Mesh(g.unitPlane, paneGlass);
    gl.position.z = 0.035;
    gl.scale.set(w, h, 1);
    wg.add(gl);
    cutaway.back.add(wg);

    // Vệt nắng tự nhiên trên sàn + tia nắng khối (volumetric light shaft) xiên qua cửa sổ
    if (th.window === "sky" || th.window === "garden" || th.window === "street" || th.window === "dusk") {
      const beamCol = th.window === "dusk" ? "#fdba74" : "#fff7dc";
      const beam = new THREE.Mesh(g.unitPlane, mats.sunbeam(beamCol, th.window === "dusk" ? 0.24 : 0.3));
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(a + w / 2 + 0.45, 0.013, 1.85);
      beam.scale.set(w * 1.04, 3.2, 1);
      floorGroup.add(beam);

      const shaft = new THREE.Mesh(g.unitPlane, mats.sunbeam(beamCol, 0.1));
      shaft.position.set(a + w / 2 + 0.35, 1.55, 1.25);
      shaft.rotation.set(-0.62, 0.12, 0);
      shaft.scale.set(w * 0.96, 3.3, 1);
      cutaway.back.add(shaft);
    }
  }

  // Hệ đèn LED thanh treo trần kiến trúc (tự ẩn khi nhìn góc thẳng đứng từ trên xuống)
  if (cutaway.ceiling) {
    const darkTheme = Boolean(th.edge || th.id === "night" || th.id === "library");
    const fixMat = mats.standard("#18181b", { roughness: 0.35, metalness: 0.72 });
    const wireMat = mats.standard("#475569", { roughness: 0.4, metalness: 0.8 });
    const ledCol = th.edge ? th.glow : (darkTheme ? "#fef08a" : "#fffbeb");
    const ledMat = mats.standard(ledCol, { roughness: 0.1, emissive: ledCol, emissiveIntensity: darkTheme ? 1.55 : 1.15 });
    const bars = plan.W <= 20
      ? [[4.5, 2.0, 7.2], [4.5, 7.0, 5.2]]
      : [[10.0, 12.2, 12.0], [22.0, 12.2, 10.0], [19.0, 3.7, 6.2]];
    for (const [bx, bz, blen] of bars) {
      addBox(THREE, cutaway.ceiling, g.unitBox, fixMat, bx, H - 0.52, bz, blen, 0.065, 0.14, false, false);
      addBox(THREE, cutaway.ceiling, g.unitBox, ledMat, bx, H - 0.56, bz, blen - 0.1, 0.025, 0.1, false, false);
      for (const sx of [-blen * 0.38, blen * 0.38]) {
        addBox(THREE, cutaway.ceiling, g.unitCyl, wireMat, bx + sx, H - 0.25, bz, 0.015, 0.5, 0.015, false, false);
      }
    }
  }

  // Tranh nghệ thuật hiện đại & đồng hồ kim chạy thật gắn tường
  const artFrame = mats.standard("#1e293b", { roughness: 0.35, metalness: 0.5 });
  const addArt = (parent, x, y, z, ry, idx, w = 1.05, h = 0.85) => {
    const ag = new THREE.Group();
    ag.position.set(x, y, z);
    ag.rotation.y = ry;
    addBox(THREE, ag, g.unitBox, artFrame, 0, 0, 0, w + 0.09, h + 0.09, 0.04, false, true);
    const canvas = new THREE.Mesh(g.unitPlane, mats.standard("#ffffff", { roughness: 0.36, tex: "art:" + idx }));
    canvas.position.z = 0.024;
    canvas.scale.set(w, h, 1);
    ag.add(canvas);
    parent.add(ag);
  };
  if (plan.W <= 20) {
    // Nhóm nhỏ: đồng hồ treo tường + tranh tường bên trái
    const hdClk = putHD(THREE, hdAssets, "wall_clock", { targetHeight: 0.62, groundY: false }, 4.5, 2.7, 0.06);
    if (hdClk) {
      cutaway.back.add(hdClk);
    } else {
      const clk = new THREE.Group();
      clk.position.set(4.5, 2.7, 0.04);
      const rim = new THREE.Mesh(g.unitCyl, mats.standard("#334155", { roughness: 0.22, metalness: 0.85 }));
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(0.54, 0.05, 0.54);
      const face = new THREE.Mesh(g.unitCyl, mats.standard("#ffffff", { roughness: 0.28, tex: "clock" }));
      face.rotation.x = Math.PI / 2;
      face.position.z = 0.022;
      face.scale.set(0.48, 0.02, 0.48);
      const secPivot = new THREE.Group();
      secPivot.position.z = 0.036;
      addBox(THREE, secPivot, g.unitBox, mats.standard("#ef4444", { roughness: 0.3 }), 0, 0.08, 0, 0.012, 0.18, 0.008, false, false);
      if (anim && anim.clockHands) anim.clockHands.push(secPivot);
      clk.add(rim, face, secPivot);
      cutaway.back.add(clk);
    }
    addArt(cutaway.left, 0.04, 2.35, 6.4, Math.PI / 2, 0, 1.15, 0.88);
    addArt(cutaway.left, 0.04, 2.35, 7.9, Math.PI / 2, 1, 1.15, 0.88);
  } else {
    // Công ty / Tập đoàn: tranh nghệ thuật, đồng hồ treo tường, camera an ninh & lam gỗ
    const hdClk = putHD(THREE, hdAssets, "wall_clock", { targetHeight: 0.62, groundY: false }, 31.2, 2.65, 0.06);
    if (hdClk) cutaway.back.add(hdClk);
    const cam = putHD(THREE, hdAssets, "security_cam", { targetLength: 0.36, groundY: false }, 1.2, 3.05, 0.12, -0.35);
    if (cam) cutaway.back.add(cam);
    addArt(cutaway.back, 8.6, 2.35, 0.04, 0, 0, 0.95, 0.82);
    addArt(cutaway.back, 33.8, 2.35, 0.04, 0, 1, 1.05, 0.82);
    addArt(cutaway.left, 0.04, 2.35, 7.2, Math.PI / 2, 2, 1.25, 0.92);
    const slatMat = mats.standard("#784820", { roughness: 0.52, tex: "wood", normal: 0.45 });
    for (let s = 0; s < 6; s++) addBox(THREE, cutaway.back, g.unitBox, slatMat, 12.6 + s * 0.18, 1.95, 0.04, 0.07, 3.6, 0.05, false, true);
  }

  for (const [a, w] of plan.leftWindows) {
    const b = 1.2, h = 2.2;
    const wg = new THREE.Group();
    wg.position.set(0.02, b + h / 2, a + w / 2);
    wg.rotation.y = Math.PI / 2;
    addBox(THREE, wg, g.unitBox, frameMat, 0, h / 2 + 0.04, 0.02, w + 0.16, 0.08, 0.1, false, false);
    addBox(THREE, wg, g.unitBox, frameMat, 0, -h / 2 - 0.04, 0.04, w + 0.2, 0.09, 0.14, false, false);
    addBox(THREE, wg, g.unitBox, frameMat, -w / 2 - 0.04, 0, 0.02, 0.08, h + 0.08, 0.1, false, false);
    addBox(THREE, wg, g.unitBox, frameMat, w / 2 + 0.04, 0, 0.02, 0.08, h + 0.08, 0.1, false, false);
    const bg = new THREE.Mesh(g.unitPlane, mats.standard(skyTop, { roughness: 0.4, emissive: skyTop, emissiveIntensity: 0.35 }));
    bg.scale.set(w, h, 1);
    const gl = new THREE.Mesh(g.unitPlane, paneGlass);
    gl.position.z = 0.03;
    gl.scale.set(w, h, 1);
    wg.add(bg, gl);
    cutaway.left.add(wg);
  }

  // Vách kính cường lực nội thất (theo bố cục: open / connected / private)
  if (plan.walls && plan.walls.length) {
    const baseMat = mats.standard(th.wall, { roughness: 0.78, tex: "plaster", bump: 0.01 });
    const railMat = mats.standard(th.edge ? th.trim : "#94a3b8", { roughness: 0.26, metalness: 0.8, emissive: th.edge || null, emissiveIntensity: 0.65 });
    const glassMat = mats.physical(th.edge ? "#38bdf8" : "#d8eefc", {
      roughness: 0.05, metalness: 0.05, clearcoat: 1.0, transparent: true, opacity: th.edge ? 0.22 : 0.26, depthWrite: false,
    });
    for (const [axis, at, from, to, doors] of plan.walls) {
      const spans = mergeSegments(wallSegments(from, to, doors));
      for (const [u, v] of spans) {
        const len = v - u;
        const mid = (u + v) / 2;
        const isX = axis === "x";
        const px = isX ? mid : at, pz = isX ? at : mid;
        const sx = isX ? len : 0.14, sz = isX ? 0.14 : len;
        addBox(THREE, floorGroup, g.unitBox, baseMat, px, 0.48, pz, sx, 0.96, sz, true, true);
        addBox(THREE, floorGroup, g.unitBox, railMat, px, 0.98, pz, isX ? len : 0.17, 0.05, isX ? 0.17 : len, false, true);
        addBox(THREE, floorGroup, g.unitBox, glassMat, px, 1.6, pz, isX ? len : 0.045, 1.18, isX ? 0.045 : len, false, false);
        addBox(THREE, floorGroup, g.unitBox, railMat, px, 2.21, pz, isX ? len : 0.12, 0.07, isX ? 0.12 : len, false, false);
        // Trụ nhôm đứng chia tấm kính mỗi ~2.5m
        const posts = Math.max(2, Math.round(len / 2.6) + 1);
        for (let k = 0; k < posts; k++) {
          const pu = u + (k / (posts - 1)) * len;
          addBox(THREE, floorGroup, g.unitBox, railMat, isX ? pu : at, 1.6, isX ? at : pu, 0.07, 1.24, 0.07, false, false);
        }
      }
    }
  }

  return floorGroup;
}

// ---------------------------------------------------------------- Nội thất văn phòng cao cấp (đọc dữ liệu plans/themes)
function buildProp(THREE, sceneAssets, natureAssets, hdAssets, mats, p, th, plan, cutaway, anim) {
  const g = sceneAssets.geos;
  if (p.kind === "plant") {
    const plantVars = [
      ["potted_plant", 1.35],
      ["potted_plant_2", 1.25],
      ["potted_plant_3", 0.65],
      ["palm_plant", 1.65],
      ["calathea", 0.85],
    ];
    const [pk, ph] = plantVars[Math.abs(Math.round(p.x * 3 + p.y * 5)) % plantVars.length];
    const parsed = (hdAssets && (hdAssets.get(pk) || hdAssets.get("potted_plant"))) || null;
    if (parsed) {
      const inst = instantiateGLB(THREE, parsed, { targetHeight: ph });
      inst.group.position.set(p.x + 0.35, 0, p.y + 0.35);
      return inst.group;
    }
    return buildPlant(THREE, natureAssets, mats, p, anim);
  }
  if (p.kind === "tree") return buildTree(THREE, natureAssets, mats, p, anim);
  if (p.kind === "pool") return buildPool(THREE, natureAssets, mats, p, anim);
  if (p.kind === "umbrella") return buildUmbrella(THREE, natureAssets, mats, p);
  if (p.kind === "bench") {
    return putHD(THREE, hdAssets, "bench", { targetLength: 1.75 }, p.x + 0.8, 0, p.y + 0.4) ||
      buildBench(THREE, natureAssets, mats, p);
  }
  if (p.kind === "fence") return buildFence(THREE, natureAssets, mats, p);
  if (p.kind === "streetlamp") {
    return putHD(THREE, hdAssets, "streetlamp", { targetHeight: 3.6 }, p.x + 0.25, 0, p.y + 0.25) ||
      buildStreetlamp(THREE, natureAssets, mats, p);
  }

  const root = new THREE.Group();

  if (p.kind === "rug") {
    const rugMat = mats.standard(p.color, { roughness: 0.92, tex: "fabric", bump: 0.025, polygonOffset: true, offsetUnits: -3 });
    const m = new THREE.Mesh(g.unitPlane, rugMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(p.x + p.w / 2, 0.008, p.y + p.d / 2);
    m.scale.set(p.w, p.d, 1);
    m.receiveShadow = true;
    root.add(m);
    return root;
  }

  if (p.kind === "shelf") {
    const left = p.side === "left";
    const shelfParsed = hdAssets && hdAssets.get("shelf");
    if (shelfParsed) {
      const inst = instantiateGLB(THREE, shelfParsed, { targetHeight: 2.3 });
      const sz = new THREE.Box3().setFromObject(inst.group).getSize(new THREE.Vector3());
      const wideAlongZ = sz.z > sz.x;
      inst.group.position.set(p.x + (left ? 0.35 : 0.7), 0, p.y + (left ? 0.7 : 0.35));
      inst.group.rotation.y = left ? (wideAlongZ ? 0 : Math.PI / 2) : (wideAlongZ ? Math.PI / 2 : 0);
      root.add(inst.group);
      return root;
    }
    const woodMat = mats.standard(p.color || "#8b5e3c", { roughness: 0.65, tex: "wood", bump: 0.02 });
    const sg = new THREE.Group();
    sg.position.set(p.x + (left ? 0.3 : 0.7), 0, p.y + (left ? 0.7 : 0.3));
    if (left) sg.rotation.y = Math.PI / 2;
    addBox(THREE, sg, g.unitBox, woodMat, 0, 1.3, -0.25, 1.4, 2.6, 0.08, true, true);
    addBox(THREE, sg, g.unitBox, woodMat, -0.66, 1.3, 0, 0.08, 2.6, 0.56, true, true);
    addBox(THREE, sg, g.unitBox, woodMat, 0.66, 1.3, 0, 0.08, 2.6, 0.56, true, true);
    const books = ["#dc2626", "#2563eb", "#15803d", "#d97706", "#7c3aed", "#0891b2", "#be123c"];
    for (let r = 0; r < 5; r++) {
      addBox(THREE, sg, g.unitBox, woodMat, 0, 0.14 + r * 0.58, 0, 1.32, 0.06, 0.54, true, true);
      if (r < 4) {
        for (let k = 0; k < 6; k++) {
          const bh = 0.3 + rnd(p.x * 7 + r * 11 + k) * 0.14;
          const bk = addBox(THREE, sg, g.unitBox, mats.standard(books[(r * 3 + k) % books.length], { roughness: 0.65 }),
            -0.5 + k * 0.2, 0.17 + r * 0.58 + bh / 2, 0.04, 0.13, bh, 0.32, true, false);
          if (k === 5 && r % 2) bk.rotation.z = 0.22;
        }
      }
    }
    root.add(sg);
    return root;
  }

  if (p.kind === "sofa") {
    const sofaParsed = hdAssets && hdAssets.get("sofa");
    if (sofaParsed) {
      const inst = instantiateGLB(THREE, sofaParsed, { targetLength: 2.9 });
      const sz = new THREE.Box3().setFromObject(inst.group).getSize(new THREE.Vector3());
      if (sz.z > sz.x) inst.group.rotation.y = Math.PI / 2;
      inst.group.position.set(p.x + 1.6, 0, p.y + 0.6);
      root.add(inst.group);
      const ctParsed = p.y > 4 && hdAssets.get("coffee_table");
      if (ctParsed) {
        const ct = instantiateGLB(THREE, ctParsed, { targetLength: 1.15 });
        const cSz = new THREE.Box3().setFromObject(ct.group).getSize(new THREE.Vector3());
        if (cSz.z > cSz.x) ct.group.rotation.y = Math.PI / 2;
        ct.group.position.set(p.x + 1.6, 0, p.y + 1.55);
        root.add(ct.group);
      }
      if (p.x < 10) {
        const arm = putHD(THREE, hdAssets, "armchair", { targetHeight: 0.88 }, p.x - 0.55, 0, p.y + 0.8, Math.PI / 3);
        if (arm) root.add(arm);
      }
      return root;
    }
    const col = p.color || "#475569";
    const fabMat = mats.standard(col, { roughness: 0.85, tex: "fabric", bump: 0.02 });
    const legMat = mats.standard("#5c3a21", { roughness: 0.65, tex: "wood" });
    const sg = new THREE.Group();
    sg.position.set(p.x + 1.6, 0, p.y + 0.6);
    const sh = new THREE.Mesh(g.shadowDisc, mats.shadow());
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.008;
    sh.scale.set(3.5, 1.5, 1);
    sg.add(sh);
    for (const [lx, lz] of [[-1.4, -0.45], [1.4, -0.45], [-1.4, 0.45], [1.4, 0.45]]) {
      addBox(THREE, sg, g.unitCyl, legMat, lx, 0.08, lz, 0.08, 0.16, 0.08, true, false);
    }
    addBox(THREE, sg, g.unitBox, fabMat, 0, 0.26, 0, 3.16, 0.22, 1.14, true, true);
    for (let k = -1; k <= 1; k++) {
      const cu = new THREE.Mesh(g.cushion, fabMat);
      cu.position.set(k * 0.96, 0.49, 0.08);
      cu.castShadow = cu.receiveShadow = true;
      sg.add(cu);
    }
    addBox(THREE, sg, g.unitBox, mats.standard(shade(col, -0.08), { roughness: 0.86, tex: "fabric" }), 0, 0.72, -0.42, 3.16, 0.68, 0.28, true, true);
    for (const side of [-1, 1]) {
      addBox(THREE, sg, g.unitBox, fabMat, side * 1.46, 0.56, 0.04, 0.24, 0.44, 1.06, true, true);
    }
    const p1 = new THREE.Mesh(g.pillow, mats.standard("#f8fafc", { roughness: 0.88, tex: "fabric" }));
    p1.position.set(-1.08, 0.64, -0.15);
    p1.rotation.set(0.2, 0.25, 0.22);
    const p2 = new THREE.Mesh(g.pillow, mats.standard("#fde68a", { roughness: 0.88, tex: "fabric" }));
    p2.position.set(1.08, 0.64, -0.15);
    p2.rotation.set(0.2, -0.25, -0.22);
    sg.add(p1, p2);
    root.add(sg);
    return root;
  }

  if (p.kind === "lamp") {
    const lg = new THREE.Group();
    lg.position.set(p.x + 0.06, 0, p.y + 0.06);
    const brass = mats.standard("#b45309", { roughness: 0.28, metalness: 0.85 });
    const base = addBox(THREE, lg, g.unitCyl, mats.standard("#374151", { roughness: 0.5, metalness: 0.4 }), 0, 0.04, 0, 0.42, 0.08, 0.42, true, true);
    addBox(THREE, lg, g.unitCyl, brass, 0, 1.02, 0, 0.06, 1.92, 0.06, true, false);
    const shadeCol = p.color || "#fef3c7";
    const shadeMesh = new THREE.Mesh(g.lampShade, mats.standard(shadeCol, {
      roughness: 0.75, emissive: shadeCol, emissiveIntensity: 0.5, side: THREE.DoubleSide,
    }));
    shadeMesh.position.y = 2.04;
    shadeMesh.castShadow = true;
    const bulb = new THREE.Mesh(g.bulb, mats.standard("#ffffff", { roughness: 0.1, emissive: "#fef3c7", emissiveIntensity: 1.0 }));
    bulb.position.y = 1.96;
    lg.add(base, shadeMesh, bulb);
    root.add(lg);
    return root;
  }

  if (p.kind === "rack") {
    if (p.x < 25 && p.y < 2) {
      const ms = putHD(THREE, hdAssets, "metal_shelf", { targetHeight: 2.1 }, p.x + 3.65, 0, p.y + 1.2);
      if (ms) root.add(ms);
    }
    const rg = new THREE.Group();
    rg.position.set(p.x + 0.5, 0, p.y + 0.5);
    const bodyMat = mats.standard(p.color || "#111827", { roughness: 0.42, metalness: 0.55 });
    const doorMat = mats.physical("#1e293b", { roughness: 0.1, clearcoat: 0.9, transparent: true, opacity: 0.35 });
    addBox(THREE, rg, g.unitBox, bodyMat, 0, 1.3, 0, 0.96, 2.6, 0.96, true, true);
    addBox(THREE, rg, g.unitBox, doorMat, 0, 1.3, 0.5, 0.88, 2.44, 0.04, false, false);
    for (let r = 0; r < 7; r++) {
      addBox(THREE, rg, g.unitBox, mats.standard("#1f2937", { roughness: 0.4, metalness: 0.6 }), 0, 0.32 + r * 0.33, 0.46, 0.82, 0.24, 0.06, false, false);
      const col = r % 3 === 0 ? "#22c55e" : r % 2 ? th.glow : "#38bdf8";
      const ledMat = mats.freshStandard(col, { roughness: 0.2, emissive: col, emissiveIntensity: 0.85 });
      addBox(THREE, rg, g.unitBox, ledMat, -0.26, 0.32 + r * 0.33, 0.5, 0.12, 0.05, 0.03, false, false);
      anim.blinkers.push({ mat: ledMat, phase: r * 1.4 + p.x * 0.7, high: 0.95, low: 0.08 });
    }
    root.add(rg);
    return root;
  }

  if (p.kind === "counter") {
    const cartParsed = p.x > 20 && hdAssets && hdAssets.get("coffee_cart");
    if (cartParsed) {
      const inst = instantiateGLB(THREE, cartParsed, { targetLength: 2.35 });
      const sz = new THREE.Box3().setFromObject(inst.group).getSize(new THREE.Vector3());
      if (sz.z > sz.x) inst.group.rotation.y = Math.PI / 2;
      inst.group.position.set(p.x + 1.35, 0, p.y + 0.55);
      root.add(inst.group);
      const cab = mats.standard("#6f4e37", { roughness: 0.62, tex: "wood", bump: 0.02 });
      const top = mats.physical("#f5f0e8", { roughness: 0.18, clearcoat: 0.6, tex: "stone", bump: 0.01 });
      addBox(THREE, root, g.unitBox, cab, p.x + 3.8, 0.42, p.y + 0.55, 1.7, 0.84, 0.84, true, true);
      addBox(THREE, root, g.unitBox, top, p.x + 3.8, 0.86, p.y + 0.55, 1.76, 0.05, 0.9, true, true);
      const kt = putHD(THREE, hdAssets, "kettle", { targetHeight: 0.28 }, p.x + 3.35, 0.885, p.y + 0.55);
      if (kt) root.add(kt);
      const mw = putHD(THREE, hdAssets, "microwave", { targetLength: 0.52 }, p.x + 4.12, 0.885, p.y + 0.52);
      if (mw) root.add(mw);
      const pm = putHD(THREE, hdAssets, "mug", { targetHeight: 0.11 }, p.x + 3.05, 0.885, p.y + 0.62);
      if (pm) root.add(pm);
      const wf = putHD(THREE, hdAssets, "wet_floor_sign", { targetHeight: 0.62 }, p.x + 0.2, 0, p.y + 6.4, 0.35);
      if (wf) root.add(wf);
      return root;
    }
    const cg = new THREE.Group();
    cg.position.set(p.x + 1.7, 0, p.y + 0.5);
    const wood = mats.standard("#6f4e37", { roughness: 0.62, tex: "wood", bump: 0.02 });
    const marble = mats.physical("#f5f0e8", { roughness: 0.18, clearcoat: 0.6, tex: "stone", bump: 0.01 });
    const chrome = mats.standard("#e2e8f0", { roughness: 0.16, metalness: 0.92 });
    addBox(THREE, cg, g.unitBox, wood, 0, 0.52, 0, 3.36, 1.04, 0.94, true, true);
    addBox(THREE, cg, g.unitBox, marble, 0, 1.08, 0, 3.44, 0.08, 1.04, true, true);
    // Máy pha espresso inox
    addBox(THREE, cg, g.unitBox, chrome, -1.1, 1.44, -0.1, 0.66, 0.64, 0.48, true, true);
    addBox(THREE, cg, g.unitBox, mats.standard("#1f2937", { roughness: 0.35, metalness: 0.5 }), -1.1, 1.24, 0.16, 0.52, 0.12, 0.16, false, false);
    // Tách sứ
    const cupMat = mats.physical("#ffffff", { roughness: 0.16, clearcoat: 0.7 });
    for (const cx of [-0.15, 0.25]) {
      const m = new THREE.Mesh(g.mug, cupMat);
      m.position.set(cx, 1.12, 0.05);
      m.scale.setScalar(1.3);
      cg.add(m);
    }
    // Tủ kính tròn đựng bánh ngọt
    addBox(THREE, cg, g.unitCyl, wood, 1.05, 1.14, 0, 0.68, 0.05, 0.68, true, true);
    addBox(THREE, cg, g.unitSphere, mats.standard("#d97706", { roughness: 0.75 }), 0.94, 1.24, 0.05, 0.22, 0.14, 0.16, true, false);
    addBox(THREE, cg, g.unitSphere, mats.standard("#f59e0b", { roughness: 0.75 }), 1.16, 1.24, -0.04, 0.22, 0.14, 0.16, true, false);
    const dome = new THREE.Mesh(g.pastryDome, mats.physical("#ffffff", { roughness: 0.06, clearcoat: 1, transparent: true, opacity: 0.28, depthWrite: false }));
    dome.position.set(1.05, 1.16, 0);
    cg.add(dome);
    const fl = putHD(THREE, hdAssets, "vase_flowers", { targetHeight: 0.48 }, -1.05, 1.12, 0.08);
    if (fl) cg.add(fl);
    const lap = putHD(THREE, hdAssets, "laptop", { targetLength: 0.38 }, 0.35, 1.12, 0.05, Math.PI);
    if (lap) cg.add(lap);
    root.add(cg);
    return root;
  }

  if (p.kind === "cafetable") {
    const ctHD = hdAssets && hdAssets.get("cafetable");
    const chHD = hdAssets && hdAssets.get("chair");
    if (ctHD) {
      const tg = new THREE.Group();
      tg.position.set(p.x + 0.4, 0, p.y + 0.4);
      const tbl = instantiateGLB(THREE, ctHD, { targetHeight: 0.74 });
      tg.add(tbl.group);
      for (const sx of [-0.76, 0.76]) {
        if (chHD) {
          const ch = instantiateGLB(THREE, chHD, { targetHeight: 0.84 });
          ch.group.position.set(sx, 0, 0);
          ch.group.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
          tg.add(ch.group);
        }
      }
      const cm = putHD(THREE, hdAssets, "mug", { targetHeight: 0.11 }, 0.08, 0.74, 0.04);
      if (cm) tg.add(cm);
      root.add(tg);
      return root;
    }
    const tg = new THREE.Group();
    tg.position.set(p.x + 0.4, 0, p.y + 0.4);
    const iron = mats.standard("#1f2937", { roughness: 0.4, metalness: 0.75 });
    const wood = mats.standard("#c99d70", { roughness: 0.5, tex: "wood" });
    addBox(THREE, tg, g.unitCyl, iron, 0, 0.03, 0, 0.44, 0.06, 0.44, true, true);
    addBox(THREE, tg, g.unitCyl, iron, 0, 0.36, 0, 0.09, 0.66, 0.09, true, false);
    const top = new THREE.Mesh(g.cafeTop, wood);
    top.position.y = 0.72;
    top.castShadow = top.receiveShadow = true;
    tg.add(top);
    const mug = new THREE.Mesh(g.mug, mats.physical("#ffffff", { roughness: 0.18, clearcoat: 0.7 }));
    mug.position.set(0.08, 0.75, 0.04);
    mug.scale.setScalar(1.2);
    tg.add(mug);
    // Hai ghế bistro
    const seatMat = mats.standard(th.chair, { roughness: 0.76, tex: "fabric" });
    for (const sx of [-0.76, 0.76]) {
      addBox(THREE, tg, g.unitCyl, iron, sx, 0.22, 0, 0.07, 0.44, 0.07, true, false);
      addBox(THREE, tg, g.unitCyl, iron, sx, 0.02, 0, 0.34, 0.04, 0.34, false, true);
      const st = new THREE.Mesh(g.stoolSeat, seatMat);
      st.position.set(sx, 0.46, 0);
      st.castShadow = true;
      tg.add(st);
    }
    // Hơi cà phê bốc nhẹ
    const steamMat = mats.standard("#ffffff", { roughness: 0.9, transparent: true, opacity: 0.35, depthWrite: false });
    for (let k = 0; k < 3; k++) {
      const puff = new THREE.Mesh(g.unitSphere, steamMat);
      puff.position.set(0.08, 1.0 + k * 0.28, 0.04);
      puff.scale.setScalar(0.11);
      tg.add(puff);
      anim.steam.push({ mesh: puff, baseX: 0.08, baseZ: 0.04, phase: k / 3 + p.x * 0.3 });
    }
    root.add(tg);
    return root;
  }

  if (p.kind === "console") {
    const cg = new THREE.Group();
    cg.position.set(p.x + 0.8, 0, p.y + 0.45);
    addBox(THREE, cg, g.unitBox, mats.standard("#334155", { roughness: 0.42, metalness: 0.55 }), 0, 0.45, 0, 1.56, 0.9, 0.86, true, true);
    for (let k = 0; k < 4; k++) {
      const col = k % 2 ? "#f97316" : th.glow;
      const bMat = mats.freshStandard(col, { roughness: 0.2, emissive: col, emissiveIntensity: 0.85 });
      addBox(THREE, cg, g.unitBox, bMat, -0.48 + k * 0.32, 0.92, 0.1, 0.2, 0.04, 0.18, false, false);
      anim.blinkers.push({ mat: bMat, phase: k * 1.5 + p.x, high: 0.95, low: 0.18 });
    }
    const scr = addBox(THREE, cg, g.unitBox, mats.standard("#0f172a", { roughness: 0.2, metalness: 0.5 }), 0, 1.32, -0.34, 1.44, 0.84, 0.06, true, false);
    scr.rotation.x = 0.12;
    const face = addBox(THREE, cg, g.unitPlane, mats.standard("#ffffff", { roughness: 0.2, tex: "screen:work", emissive: th.glow, emissiveIntensity: 0.45 }), 0, 1.32, -0.305, 1.34, 0.74, 1, false, false);
    face.rotation.x = 0.12;
    root.add(cg);
    return root;
  }

  if (p.kind === "holo") {
    const hg = new THREE.Group();
    hg.position.set(p.x + 0.7, 0, p.y + 0.7);
    addBox(THREE, hg, g.unitCyl, mats.standard("#1e293b", { roughness: 0.35, metalness: 0.72 }), 0, 0.28, 0, 1.32, 0.56, 1.32, true, true);
    addBox(THREE, hg, g.unitCyl, mats.standard(p.color, { roughness: 0.15, emissive: p.color, emissiveIntensity: 0.8 }), 0, 0.58, 0, 0.92, 0.04, 0.92, false, false);
    const spin = new THREE.Group();
    spin.position.y = 1.42;
    hg.add(spin);
    if (p.planet) {
      const orb = new THREE.Mesh(g.unitSphere, mats.physical(p.color, { roughness: 0.22, clearcoat: 0.9, emissive: p.color, emissiveIntensity: 0.45 }));
      orb.scale.setScalar(0.76);
      const ring = new THREE.Mesh(g.holoRing, mats.standard("#e0f2fe", { roughness: 0.2, emissive: "#7dd3fc", emissiveIntensity: 0.75 }));
      ring.rotation.x = Math.PI / 2 - 0.32;
      spin.add(orb, ring);
    } else {
      const cry = new THREE.Mesh(g.unitIco, mats.physical(p.color, {
        roughness: 0.12, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.85, emissive: p.color, emissiveIntensity: 0.75,
      }));
      cry.scale.setScalar(0.72);
      spin.add(cry);
    }
    anim.spinners.push({ group: spin, baseY: 1.42, phase: p.x });
    root.add(hg);
    return root;
  }

  if (p.kind === "cooler") {
    const cg = new THREE.Group();
    cg.position.set(p.x + 0.3, 0, p.y + 0.3);
    addBox(THREE, cg, g.unitCyl, mats.standard("#e5e7eb", { roughness: 0.38, metalness: 0.15 }), 0, 0.54, 0, 0.5, 1.08, 0.5, true, true);
    addBox(THREE, cg, g.unitBox, mats.standard("#dc2626", { roughness: 0.3 }), -0.08, 0.84, 0.24, 0.04, 0.06, 0.06, false, false);
    addBox(THREE, cg, g.unitBox, mats.standard("#2563eb", { roughness: 0.3 }), 0.08, 0.84, 0.24, 0.04, 0.06, 0.06, false, false);
    const jug = new THREE.Mesh(g.bottle, mats.physical("#7dd3fc", { roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.65 }));
    jug.position.y = 1.08;
    jug.castShadow = true;
    cg.add(jug);
    root.add(cg);
    return root;
  }

  if (p.kind === "bed") {
    const bg = new THREE.Group();
    bg.position.set(p.x + 1.2, 0, p.y + 0.5);
    const bedHD = hdAssets && hdAssets.get("bed");
    if (bedHD) {
      const inst = instantiateGLB(THREE, bedHD, { targetLength: 2.25 });
      const sz = new THREE.Box3().setFromObject(inst.group).getSize(new THREE.Vector3());
      if (sz.z > sz.x) inst.group.rotation.y = Math.PI / 2;
      bg.add(inst.group);
    } else {
      const frameMat = mats.standard("#94a3b8", { roughness: 0.42, metalness: 0.45 });
      addBox(THREE, bg, g.unitBox, frameMat, 0, 0.22, 0, 2.38, 0.44, 0.98, true, true);
      addBox(THREE, bg, g.unitBox, mats.standard("#e0f2fe", { roughness: 0.88, tex: "fabric" }), 0, 0.52, 0, 2.28, 0.18, 0.9, true, true);
      addBox(THREE, bg, g.unitBox, mats.standard(th.trim, { roughness: 0.88, tex: "fabric" }), -0.35, 0.62, 0, 1.5, 0.1, 0.92, true, true);
      const pil = new THREE.Mesh(g.bedPillow, mats.standard("#ffffff", { roughness: 0.9, tex: "fabric" }));
      pil.position.set(0.75, 0.66, 0);
      pil.rotation.x = Math.PI / 2;
      pil.castShadow = true;
      bg.add(pil);
      addBox(THREE, bg, g.unitBox, frameMat, 1.15, 0.68, 0, 0.1, 0.68, 1.0, true, true);
    }
    if (p.iv !== false) {
      const chrome = mats.standard("#cbd5e1", { roughness: 0.2, metalness: 0.88 });
      addBox(THREE, bg, g.unitCyl, chrome, -1.48, 0.95, -0.25, 0.05, 1.9, 0.05, true, false);
      addBox(THREE, bg, g.unitBox, mats.physical("#e0f2fe", { roughness: 0.1, transparent: true, opacity: 0.72, emissive: th.glow, emissiveIntensity: 0.3 }), -1.52, 1.66, -0.25, 0.2, 0.3, 0.14, false, false);
    }
    root.add(bg);
    return root;
  }

  if (p.kind === "bigdesk") {
    const dg = new THREE.Group();
    dg.position.set(p.x, 0, p.y);
    const walnut = mats.standard("#5b3a29", { roughness: 0.42, metalness: 0.06, tex: "wood", bump: 0.02 });
    const legMat = mats.standard("#3f271b", { roughness: 0.52, tex: "wood" });
    addBox(THREE, dg, g.unitBox, walnut, 1.6, 0.78, 0.65, 3.2, 0.1, 1.3, true, true);
    addBox(THREE, dg, g.unitBox, legMat, 0.1, 0.37, 0.65, 0.18, 0.74, 1.24, true, true);
    addBox(THREE, dg, g.unitBox, legMat, 3.1, 0.37, 0.65, 0.18, 0.74, 1.24, true, true);
    addBox(THREE, dg, g.unitBox, walnut, 2.8, 0.78, 1.9, 0.82, 0.1, 1.2, true, true);
    addBox(THREE, dg, g.unitBox, legMat, 2.8, 0.37, 2.42, 0.78, 0.74, 0.14, true, true);
    // Màn hình siêu rộng + biển tên đồng + đèn bàn đồng
    addBox(THREE, dg, g.unitBox, mats.standard("#111827", { roughness: 0.3, metalness: 0.4 }), 1.65, 1.24, 0.22, 1.38, 0.78, 0.06, true, false);
    addBox(THREE, dg, g.unitPlane, mats.standard("#ffffff", { roughness: 0.2, tex: "screen:work", emissive: "#ffffff", emissiveIntensity: 0.25 }), 1.65, 1.24, 0.255, 1.3, 0.7, 1, false, false);
    addBox(THREE, dg, g.unitBox, mats.standard("#d97706", { roughness: 0.28, metalness: 0.85 }), 0.65, 0.89, 0.7, 0.52, 0.12, 0.14, true, false);
    const hdLamp = putHD(THREE, hdAssets, "desk_lamp", { targetHeight: 0.48 }, 2.7, 0.83, 0.32, -0.55);
    if (hdLamp) {
      dg.add(hdLamp);
    } else {
      addBox(THREE, dg, g.unitCyl, mats.standard("#b45309", { roughness: 0.25, metalness: 0.88 }), 2.7, 1.04, 0.32, 0.06, 0.42, 0.06, true, false);
      const sh = new THREE.Mesh(g.lampShade, mats.standard("#fef3c7", { roughness: 0.65, emissive: "#fde68a", emissiveIntensity: 0.65, side: THREE.DoubleSide }));
      sh.position.set(2.7, 1.3, 0.32);
      sh.scale.setScalar(0.65);
      dg.add(sh);
    }
    const vase = putHD(THREE, hdAssets, "vase_flowers", { targetHeight: 0.42 }, 0.45, 0.83, 0.35);
    if (vase) dg.add(vase);
    const dm = putHD(THREE, hdAssets, "mug", { targetHeight: 0.11 }, 2.25, 0.83, 0.92);
    if (dm) dg.add(dm);
    const guestArm = putHD(THREE, hdAssets, "armchair", { targetHeight: 0.88 }, 1.5, 0, -0.8);
    if (guestArm) dg.add(guestArm);
    // Ghế giám đốc da đen lưng cao
    const leather = mats.physical("#111827", { roughness: 0.38, clearcoat: 0.28 });
    addBox(THREE, dg, g.unitCyl, leather, 1.5, 0.26, 2.15, 0.92, 0.44, 0.86, true, true);
    addBox(THREE, dg, g.unitBox, leather, 1.5, 1.02, 2.52, 0.9, 1.18, 0.18, true, true);
    root.add(dg);
    return root;
  }

  if (p.kind === "meeting") {
    const L = 6.8, D = 1.8;
    const mg = new THREE.Group();
    mg.position.set(p.x + L / 2, 0, p.y + D / 2);
    const top = new THREE.Mesh(g.meetTop, mats.standard("#e7e2da", { roughness: 0.44, tex: "wood", bump: 0.014 }));
    top.position.y = 0.8;
    top.castShadow = top.receiveShadow = true;
    mg.add(top);
    const legMat = mats.standard("#94a3b8", { roughness: 0.24, metalness: 0.85 });
    for (const lx of [-2.4, 2.4]) addBox(THREE, mg, g.unitCyl, legMat, lx, 0.37, 0, 0.26, 0.74, 0.26, true, true);
    const chairMat = mats.standard(th.chair, { roughness: 0.74, tex: "fabric" });
    const lapMat = mats.standard("#cbd5e1", { roughness: 0.28, metalness: 0.72 });
    const lapParsed = hdAssets && hdAssets.get("laptop");
    const n = p.seats || 6;
    for (let k = 0; k < n / 2; k++) {
      const cx = -L / 2 + 0.9 + k * (L - 1.8) / Math.max(1, n / 2 - 1);
      for (const side of [-1, 1]) {
        addBox(THREE, mg, g.unitCyl, chairMat, cx, 0.25, side * 1.18, 0.56, 0.42, 0.56, true, true);
        addBox(THREE, mg, g.unitBox, chairMat, cx, 0.72, side * 1.44, 0.54, 0.58, 0.12, true, true);
        if (lapParsed) {
          const lap = instantiateGLB(THREE, lapParsed, { targetLength: 0.38 });
          lap.group.position.set(cx, 0.83, side * 0.46);
          if (side < 0) lap.group.rotation.y = Math.PI;
          mg.add(lap.group);
        } else {
          // Laptop mở
          addBox(THREE, mg, g.unitBox, lapMat, cx, 0.83, side * 0.48, 0.42, 0.025, 0.3, true, false);
          const lid = addBox(THREE, mg, g.unitBox, lapMat, cx, 0.96, side * 0.34, 0.42, 0.26, 0.025, true, false);
          lid.rotation.x = side * -0.25;
        }
      }
    }
    addBox(THREE, mg, g.unitCyl, mats.standard("#1f2937", { roughness: 0.35, metalness: 0.5 }), 0, 0.85, 0, 0.42, 0.07, 0.42, true, false);
    root.add(mg);
    return root;
  }

  // Các hạng mục gắn tường ngoài → đặt trực tiếp vào cutaway.left / cutaway.back để ẩn sạch khi xoay ngược!
  if (p.kind === "board") {
    const col = p.color || "#f8fafc";
    const bg = new THREE.Group();
    if (p.side === "left") {
      bg.position.set(0.04, 2.15, p.y + 1.2);
      bg.rotation.y = Math.PI / 2;
      cutaway.left.add(bg);
    } else {
      bg.position.set(p.x + 1.2, 2.15, 0.04);
      cutaway.back.add(bg);
    }
    addBox(THREE, bg, g.unitBox, mats.standard("#94a3b8", { roughness: 0.3, metalness: 0.75 }), 0, 0, 0, 2.44, 1.54, 0.05, false, true);
    addBox(THREE, bg, g.unitBox, mats.standard(col, { roughness: p.chalk ? 0.9 : 0.22 }), 0, 0, 0.03, 2.26, 1.36, 0.02, false, true);
    const notes = p.chalk ? ["#f8fafc", "#fde68a", "#f8fafc"] : ["#fde047", "#f9a8d4", "#86efac", "#93c5fd"];
    notes.forEach((c, k) => addBox(THREE, bg, g.unitBox, mats.standard(c, { roughness: 0.75 }), -0.75 + k * 0.5, 0.1 + (k % 2) * 0.25, 0.045, 0.32, p.chalk ? 0.06 : 0.28, 0.01, false, false));
    return null;
  }

  if (p.kind === "neon") {
    const ng = new THREE.Group();
    if (p.side === "left") {
      ng.position.set(0.05, 3.25, p.y + p.w / 2);
      ng.rotation.y = Math.PI / 2;
      cutaway.left.add(ng);
    } else {
      ng.position.set(p.x + p.w / 2, 3.25, 0.05);
      cutaway.back.add(ng);
    }
    addBox(THREE, ng, g.unitBox, mats.standard("#0b0414", { roughness: 0.5 }), 0, 0, 0, p.w, 0.52, 0.06, false, false);
    addBox(THREE, ng, g.unitBox, mats.standard(p.color, { roughness: 0.15, emissive: p.color, emissiveIntensity: 1.0 }), 0, -0.07, 0.045, p.w - 0.3, 0.07, 0.04, false, false);
    addBox(THREE, ng, g.unitBox, mats.standard(th.glow, { roughness: 0.15, emissive: th.glow, emissiveIntensity: 1.0 }), -p.w * 0.12, 0.1, 0.045, (p.w - 0.3) * 0.65, 0.07, 0.04, false, false);
    return null;
  }

  if (p.kind === "cross") {
    const cg = new THREE.Group();
    if (p.side === "left") {
      cg.position.set(0.05, 3.0, p.y + 0.6);
      cg.rotation.y = Math.PI / 2;
      cutaway.left.add(cg);
    } else {
      cg.position.set(p.x + 0.6, 3.0, 0.05);
      cutaway.back.add(cg);
    }
    addBox(THREE, cg, g.unitBox, mats.standard("#ffffff", { roughness: 0.3 }), 0, 0, 0, 1.18, 1.18, 0.05, false, false);
    const cm = mats.standard(p.color, { roughness: 0.25, emissive: p.color, emissiveIntensity: 0.45 });
    addBox(THREE, cg, g.unitBox, cm, 0, 0, 0.04, 0.28, 0.86, 0.04, false, false);
    addBox(THREE, cg, g.unitBox, cm, 0, 0, 0.04, 0.86, 0.28, 0.04, false, false);
    return null;
  }

  if (p.kind === "pipe") {
    const pm = mats.standard(shade(th.wall, 0.28), { roughness: 0.3, metalness: 0.82 });
    const pb = new THREE.Mesh(g.pipe, pm);
    pb.rotation.z = Math.PI / 2;
    pb.position.set(plan.W / 2, 3.58, 0.08);
    pb.scale.set(1, plan.W, 1);
    cutaway.back.add(pb);
    const pl = new THREE.Mesh(g.pipe, pm);
    pl.rotation.x = Math.PI / 2;
    pl.position.set(0.08, 3.58, plan.D / 2);
    pl.scale.set(1, plan.D, 1);
    cutaway.left.add(pl);
    return null;
  }

  if (p.kind === "logo") {
    const lg = new THREE.Group();
    lg.position.set(p.x + p.w / 2, 2.9, 0.05);
    addBox(THREE, lg, g.unitBox, mats.standard(th.trim, { roughness: 0.32, metalness: 0.25, emissive: th.edge || null, emissiveIntensity: 0.5 }), 0, 0, 0, p.w, 1.2, 0.06, false, false);
    const wm = mats.standard("#ffffff", { roughness: 0.2, emissive: "#ffffff", emissiveIntensity: 0.35 });
    addBox(THREE, lg, g.unitBox, wm, -p.w / 2 + 0.65, 0, 0.05, 0.68, 0.68, 0.04, false, false);
    addBox(THREE, lg, g.unitBox, wm, 0.45, 0.14, 0.05, p.w - 1.7, 0.2, 0.04, false, false);
    addBox(THREE, lg, g.unitBox, mats.standard(shade(th.trim, 0.6), { roughness: 0.3 }), 0.05, -0.16, 0.05, (p.w - 1.7) * 0.6, 0.13, 0.04, false, false);
    cutaway.back.add(lg);
    return null;
  }

  if (p.kind === "screen") {
    const sg = new THREE.Group();
    sg.position.set(p.x + p.w / 2, 2.4, 0.05);
    addBox(THREE, sg, g.unitBox, mats.standard("#0f172a", { roughness: 0.28, metalness: 0.5 }), 0, 0, 0, p.w, 2.0, 0.08, false, false);
    addBox(THREE, sg, g.unitPlane, mats.standard("#0c182c", { roughness: 0.2, emissive: th.glow, emissiveIntensity: 0.2 }), 0, 0, 0.045, p.w - 0.26, 1.72, 1, false, false);
    const barMat = mats.standard(th.glow, { roughness: 0.2, emissive: th.glow, emissiveIntensity: 0.85 });
    for (let k = 0; k < 4; k++) {
      const bar = new THREE.Mesh(g.unitBox, barMat);
      bar.position.set(-p.w / 2 + 0.72 + k * 0.85, -0.5, 0.06);
      bar.scale.set(0.46, 0.6, 0.03);
      sg.add(bar);
      anim.bars.push({ mesh: bar, baseY: -0.78, phase: k * 1.1 });
    }
    cutaway.back.add(sg);
    return null;
  }

  return null;
}

// ---------------------------------------------------------------- Trang trí tường theo mùa (đèn Noel / đèn lồng & câu đối Tết)
function buildSeasonWall(THREE, sceneAssets, mats, season, plan, cutaway, anim) {
  const g = sceneAssets.geos;
  if (season === "noel") {
    const cols = ["#ef4444", "#22c55e", "#facc15", "#3b82f6"];
    const nx = Math.min(28, Math.round(plan.W * 0.85));
    const ny = Math.min(18, Math.round(plan.D * 0.85));
    for (let k = 0; k < nx; k++) {
      const col = cols[k % 4];
      const m = mats.freshStandard(col, { roughness: 0.2, emissive: col, emissiveIntensity: 0.85 });
      const b = addBox(THREE, cutaway.back, g.unitSphere, m, (k + 0.5) * (plan.W / nx), 3.68 - Math.abs(Math.sin(k * 0.9)) * 0.16, 0.06, 0.11, 0.11, 0.11, false, false);
      anim.blinkers.push({ mat: m, phase: k * 0.7, high: 0.95, low: 0.12 });
      void b;
    }
    for (let k = 0; k < ny; k++) {
      const col = cols[(k + 2) % 4];
      const m = mats.freshStandard(col, { roughness: 0.2, emissive: col, emissiveIntensity: 0.85 });
      addBox(THREE, cutaway.left, g.unitSphere, m, 0.06, 3.68 - Math.abs(Math.sin(k * 0.9)) * 0.16, (k + 0.5) * (plan.D / ny), 0.11, 0.11, 0.11, false, false);
      anim.blinkers.push({ mat: m, phase: (k + nx) * 0.7, high: 0.95, low: 0.12 });
    }
  } else if (season === "tet") {
    const redMat = mats.standard("#dc2626", { roughness: 0.45, emissive: "#b91c1c", emissiveIntensity: 0.45 });
    const goldMat = mats.standard("#facc15", { roughness: 0.28, metalness: 0.75 });
    for (let a = 0.8; a < plan.W - 1; a += 4.5) {
      addBox(THREE, cutaway.back, g.unitCyl, goldMat, a + 0.4, 3.55, 0.22, 0.03, 0.55, 0.03, false, false);
      addBox(THREE, cutaway.back, g.unitSphere, redMat, a + 0.4, 3.12, 0.22, 0.44, 0.38, 0.44, false, false);
      addBox(THREE, cutaway.back, g.unitCyl, goldMat, a + 0.4, 2.86, 0.22, 0.05, 0.18, 0.05, false, false);
    }
    addBox(THREE, cutaway.left, g.unitBox, redMat, 0.04, 2.1, 6.2, 0.03, 2.3, 0.48, false, false);
    addBox(THREE, cutaway.left, g.unitBox, redMat, 0.04, 2.1, 7.8, 0.03, 2.3, 0.48, false, false);
  }
}

// ---------------------------------------------------------------- Bàn làm việc hiện đại + 1–2 màn hình IDE + cốc gốm + nhân vật
function buildWorkstation(THREE, sceneAssets, humanAssets, hdAssets, mats, textures, opts) {
  const { x, y, index, seat, theme, season, isAgent } = opts;
  const g = sceneAssets.geos;
  const root = new THREE.Group();
  root.position.set(x, 0, y);

  const pick = isAgent ? { kind: "agent", id: String(index), label: seat.label, state: seat.state, task: seat.task ? seat.task.id : "" } : null;

  // Bóng tiếp xúc mềm dưới bàn
  const sh = new THREE.Mesh(g.shadowDisc, mats.shadow());
  sh.rotation.x = -Math.PI / 2;
  sh.position.set(1.4, 0.015, 0.55);
  sh.scale.set(3.05, 1.35, 1);
  root.add(sh);

  // Mặt bàn bo góc vát cạnh (có normalMap + roughnessMap gỗ bóng mờ tự nhiên)
  const deskMat = mats.physical(theme.desk, {
    roughness: theme.edge ? 0.32 : 0.62,
    metalness: theme.edge ? 0.25 : 0.04,
    clearcoat: theme.edge ? 0.45 : 0.28,
    clearcoatRoughness: 0.26,
    tex: theme.edge ? null : "wood",
    normal: theme.edge ? 0 : 0.4,
    roughMap: !theme.edge,
  });
  const top = new THREE.Mesh(g.deskTop, deskMat);
  top.position.set(1.4, 0.805, 0.55);
  top.castShadow = top.receiveShadow = true;
  root.add(top);

  if (theme.edge) {
    addBox(THREE, root, g.unitBox, mats.standard(theme.edge, { roughness: 0.2, emissive: theme.edge, emissiveIntensity: 0.85 }), 1.4, 0.72, 1.07, 2.68, 0.024, 0.03, false, false);
  }

  // 4 chân bàn kim loại phay xước
  const legMat = mats.standard(theme.leg, { roughness: 0.24, metalness: 0.84 });
  for (const [lx, lz] of [[0.14, 0.14], [2.66, 0.14], [0.14, 0.96], [2.66, 0.96]]) {
    addBox(THREE, root, g.unitCyl, legMat, lx, 0.365, lz, 0.072, 0.73, 0.072, true, true);
  }

  // Màn hình (kép có tay đỡ VESA nhôm phay cho Điều phối & Thực thi, đơn rộng cho các bàn còn lại)
  const bezelMat = mats.standard("#111827", { roughness: 0.3, metalness: 0.48 });
  const standMat = mats.standard("#94a3b8", { roughness: 0.2, metalness: 0.88 });
  const mode = seat.state === "fail" ? "fail" : seat.state === "wait" ? "wait" : seat.state === "done" ? "done" : "work";
  const active = !QUIET.has(seat.state) || seat.state === "npc";
  const screenTex = textures.get("screen:" + mode);
  const screenMat = mats.freshStandard(active ? "#ffffff" : "#334155", {
    roughness: 0.14,
    metalness: 0.08,
    emissive: active ? "#ffffff" : "#000000",
    emissiveIntensity: active ? 0.36 : 0,
  });
  screenMat.map = screenTex;
  if (active) screenMat.emissiveMap = screenTex;

  const dual = isAgent && (index === 0 || index === 2);
  if (dual) {
    for (const [mx, ry] of [[0.86, 0.22], [1.94, -0.22]]) {
      const mon = new THREE.Group();
      mon.position.set(mx, 1.24, 0.24);
      mon.rotation.y = ry;
      addBox(THREE, mon, g.unitBox, bezelMat, 0, 0, 0, 1.0, 0.64, 0.042, true, false);
      // Logo nhôm nhỏ & thanh tản nhiệt mặt sau màn hình (nhìn sắc nét khi xoay 180° từ phía sau)
      addBox(THREE, mon, g.unitBox, standMat, 0, 0.04, -0.024, 0.18, 0.14, 0.012, false, false);
      const face = new THREE.Mesh(g.unitPlane, screenMat);
      face.position.z = 0.024;
      face.scale.set(0.94, 0.58, 1);
      mon.add(face);
      root.add(mon);
    }
    // Tay đòn VESA nhôm nối liền hai màn hình với trụ chính (lùi sau lưng màn hình cong)
    addBox(THREE, root, g.unitBox, standMat, 1.4, 1.12, 0.11, 1.06, 0.042, 0.042, true, false);
    addBox(THREE, root, g.unitCyl, standMat, 1.4, 0.98, 0.13, 0.075, 0.34, 0.075, true, false);
    // Mini-PC tower + đèn nguồn + khe gió mặt trước
    addBox(THREE, root, g.unitBox, mats.standard("#1e293b", { roughness: 0.34, metalness: 0.52 }), 0.18, 1.05, 0.48, 0.22, 0.46, 0.48, true, true);
    addBox(THREE, root, g.unitBox, mats.standard(theme.glow, { roughness: 0.2, emissive: theme.glow, emissiveIntensity: 0.9 }), 0.18, 1.18, 0.73, 0.07, 0.03, 0.02, false, false);
  } else {
    addBox(THREE, root, g.unitBox, bezelMat, 1.4, 1.25, 0.22, 1.38, 0.72, 0.048, true, false);
    addBox(THREE, root, g.unitBox, standMat, 1.4, 1.26, 0.19, 0.22, 0.16, 0.015, false, false);
    const face = new THREE.Mesh(g.unitPlane, screenMat);
    face.position.set(1.4, 1.25, 0.248);
    face.scale.set(1.3, 0.64, 1);
    root.add(face);
    addBox(THREE, root, g.unitCyl, standMat, 1.4, 0.96, 0.18, 0.075, 0.28, 0.075, true, false);
  }
  addBox(THREE, root, g.unitBox, standMat, 1.4, 0.83, 0.22, 0.44, 0.026, 0.24, false, true);

  // Tấm lót bàn da tối màu, bàn phím cơ chi tiết từng phím, chuột không dây, điện thoại & sổ tay
  addBox(THREE, root, g.unitBox, mats.physical("#1e293b", { roughness: 0.82, sheen: 0.35 }), 1.48, 0.825, 0.74, 1.48, 0.008, 0.44, false, true);
  addBox(THREE, root, g.unitBox, mats.standard("#1f2937", { roughness: 0.5, metalness: 0.2 }), 1.32, 0.838, 0.74, 0.94, 0.022, 0.29, true, true);
  const kbTop = new THREE.Mesh(g.unitPlane, mats.standard("#ffffff", { roughness: 0.45, tex: "keyboard" }));
  kbTop.rotation.x = -Math.PI / 2;
  kbTop.position.set(1.32, 0.851, 0.74);
  kbTop.scale.set(0.92, 0.28, 1);
  root.add(kbTop);

  const mouse = new THREE.Mesh(g.mouse, mats.physical("#475569", { roughness: 0.22, clearcoat: 0.65 }));
  mouse.position.set(1.98, 0.85, 0.76);
  mouse.rotation.x = Math.PI / 2;
  root.add(mouse);

  // Điện thoại thông minh trên bàn (có màn hình sáng nhẹ)
  addBox(THREE, root, g.unitBox, mats.standard("#0f172a", { roughness: 0.2, metalness: 0.7 }), 0.62, 0.834, 0.78, 0.13, 0.014, 0.24, true, false);
  addBox(THREE, root, g.unitBox, mats.standard("#38bdf8", { roughness: 0.15, emissive: "#38bdf8", emissiveIntensity: 0.35 }), 0.62, 0.842, 0.78, 0.11, 0.004, 0.21, false, false);

  // Sổ tay ghi chú hoặc chậu sen đá mini trên từng bàn tạo cảm giác sống động như thật
  if (index % 2 === 0) {
    const nb = addBox(THREE, root, g.unitBox, mats.standard("#f8fafc", { roughness: 0.78 }), 0.44, 0.838, 0.56, 0.32, 0.026, 0.42, true, true);
    nb.rotation.y = 0.16;
    const pen = addBox(THREE, root, g.unitCyl, mats.standard("#1d4ed8", { roughness: 0.3, metalness: 0.4 }), 0.52, 0.86, 0.56, 0.018, 0.28, 0.018, false, false);
    pen.rotation.set(Math.PI / 2, 0, -0.35);
  } else {
    const miniPlant = putHD(THREE, hdAssets, "potted_plant_3", { targetHeight: 0.24 }, 0.44, 0.82, 0.46);
    if (miniPlant) {
      root.add(miniPlant);
    } else {
      addBox(THREE, root, g.unitCyl, mats.standard("#c26a3b", { roughness: 0.75 }), 0.44, 0.88, 0.46, 0.18, 0.12, 0.18, true, true);
      addBox(THREE, root, g.unitIco, mats.standard("#16a34a", { roughness: 0.55 }), 0.44, 0.99, 0.46, 0.2, 0.16, 0.2, true, false);
    }
  }

  const hdMug = putHD(THREE, hdAssets, "mug", { targetHeight: 0.12 }, 2.34, 0.82, 0.56);
  if (hdMug) {
    root.add(hdMug);
  } else {
    const mugGroup = new THREE.Group();
    mugGroup.position.set(2.34, 0.82, 0.56);
    const mug = new THREE.Mesh(g.mug, mats.physical("#f8fafc", { roughness: 0.12, clearcoat: 0.9 }));
    mug.castShadow = true;
    const handle = new THREE.Mesh(g.mugHandle, mats.physical("#f8fafc", { roughness: 0.12, clearcoat: 0.9 }));
    handle.position.set(0.068, 0.085, 0);
    const coffee = addBox(THREE, mugGroup, g.unitCyl, mats.physical("#2e1609", { roughness: 0.08, clearcoat: 1 }), 0, 0.135, 0, 0.105, 0.01, 0.105, false, false);
    mugGroup.add(mug, handle, coffee);
    root.add(mugGroup);
  }

  // Quả cầu trạng thái phát sáng góc bàn
  const orbCol = STATE_COLOR[seat.state] || "#94a3b8";
  const orbMat = mats.freshPhysical(orbCol, { roughness: 0.14, clearcoat: 0.9, emissive: orbCol, emissiveIntensity: 0.85 });
  const orb = new THREE.Mesh(g.orb, orbMat);
  orb.position.set(2.54, 0.915, 0.24);
  orb.visible = !QUIET.has(seat.state);
  root.add(orb);

  if (pick) root.traverse((o) => { if (o.isMesh) o.userData.pick = pick; });

  // Nhân vật ngồi làm việc (ưu tiên Ready Player Me sắc nét, tự fallback khi chưa có gói .xoffice-hd)
  let rig = null;
  if (isAgent || seat.state === "npc") {
    rig = buildSeatedHDHuman(THREE, humanAssets, hdAssets, mats, { index, theme, seat, season, pick })
      || buildHumanRig(THREE, humanAssets, mats, { index, theme, seat, season, pick });
    rig.root.position.set(1.4, 0, 1.32);
    root.add(rig.root);
  }

  return {
    root,
    rig,
    screenMat,
    orb,
    orbMat,
    pick,
    index,
    isAgent,
    update(nextSeat) {
      if (!nextSeat) return;
      const st = nextSeat.state || "idle";
      if (pick) {
        pick.label = nextSeat.label;
        pick.state = st;
        pick.task = nextSeat.task ? nextSeat.task.id : "";
      }
      if (rig) rig.state = st;
      const nextMode = st === "fail" ? "fail" : st === "wait" ? "wait" : st === "done" ? "done" : "work";
      const isActive = !QUIET.has(st) || st === "npc";
      const nextTex = textures.get("screen:" + nextMode);
      screenMat.color.set(isActive ? "#ffffff" : "#334155");
      screenMat.map = nextTex;
      screenMat.emissiveMap = isActive ? nextTex : null;
      screenMat.emissive.set(isActive ? "#ffffff" : "#000000");
      screenMat.emissiveIntensity = isActive ? 0.32 : 0;
      screenMat.needsUpdate = true;
      const col = STATE_COLOR[st] || "#94a3b8";
      orb.visible = !QUIET.has(st);
      orbMat.color.set(col);
      orbMat.emissive.set(col);
    },
  };
}

function registerIndoorProp(physics, p) {
  if (!physics || !p) return;
  if (p.kind === "pool") physics.addBox("indoor", p.x - 0.3, p.y - 0.3, p.x + p.w + 0.3, p.y + p.d + 0.3, "pool");
  else if (p.kind === "sofa") physics.addBox("indoor", p.x - 0.1, p.y, p.x + 3.25, p.y + 1.85, "sofa");
  else if (p.kind === "counter") physics.addBox("indoor", p.x, p.y, p.x + (p.x > 20 ? 4.65 : 3.45), p.y + 1.05, "counter");
  else if (p.kind === "cafetable") physics.addCircle("indoor", p.x + 0.4, p.y + 0.4, 1.02, "cafetable");
  else if (p.kind === "rack") physics.addBox("indoor", p.x, p.y, p.x + 1.0, p.y + 1.0, "rack");
  else if (p.kind === "bed") physics.addBox("indoor", p.x, p.y, p.x + 2.4, p.y + 1.0, "bed");
  else if (p.kind === "bigdesk") {
    physics.addBox("indoor", p.x, p.y, p.x + 3.2, p.y + 1.35, "bigdesk");
    physics.addBox("indoor", p.x + 2.35, p.y + 1.3, p.x + 3.2, p.y + 2.55, "bigdesk");
    physics.addBox("indoor", p.x + 1.0, p.y + 1.65, p.x + 2.0, p.y + 2.65, "dir_chair");
  } else if (p.kind === "meeting") physics.addBox("indoor", p.x, p.y - 0.65, p.x + 6.8, p.y + 2.45, "meeting");
  else if (p.kind === "tree") physics.addCircle("indoor", p.x + 1.0, p.y + 1.0, 0.52, "in_tree");
  else if (p.kind === "bench") physics.addBox("indoor", p.x, p.y, p.x + 1.7, p.y + 0.72, "in_bench");
  else if (p.kind === "umbrella") physics.addCircle("indoor", p.x, p.y, 1.02, "in_umb");
  else if (p.kind === "plant" || p.kind === "cooler") physics.addCircle("indoor", p.x + 0.3, p.y + 0.3, 0.4, p.kind);
  else if (p.kind === "shelf") physics.addBox("indoor", p.x, p.y, p.x + (p.side === "left" ? 0.65 : 1.45), p.y + (p.side === "left" ? 1.45 : 0.65), "shelf");
  else if (p.kind === "console") physics.addBox("indoor", p.x, p.y, p.x + 1.6, p.y + 0.9, "console");
  else if (p.kind === "holo") physics.addCircle("indoor", p.x + 0.7, p.y + 0.7, 0.72, "holo");
}

// ---------------------------------------------------------------- Dựng trọn cảnh 3D bền vững
export function buildOfficeScene(THREE, textures, sceneAssets, humanAssets, natureAssets, trafficAssets, cityAssets, sgAssets, hdAssets, opts) {
  const th = opts.theme;
  const glowOn = opts.quality !== "low";
  const plan = planFor(opts.scale || "team", opts.layout || "open");
  const zb = plan.levels ? plan.levels * plan.levelH : 0;
  const mats = createMaterialBank(THREE, textures, glowOn);
  const physics = createWorldPhysics();

  const dark = Boolean(th.edge || th.id === "night" || th.id === "library");
  const root = new THREE.Group();
  const cutaway = { left: new THREE.Group(), back: new THREE.Group(), ceiling: new THREE.Group() };
  const anim = { trees: [], floaters: [], blinkers: [], steam: [], spinners: [], bars: [], waters: [], clockHands: [], traffics: [], cities: [] };
  const rigs = [];
  const agentStations = [];

  if (plan.outdoor) root.add(buildOutdoor(THREE, sceneAssets, natureAssets, humanAssets, trafficAssets, cityAssets, sgAssets, hdAssets, mats, plan, anim, physics));
  if (plan.levels) root.add(buildBuilding(THREE, sceneAssets, mats, plan, th));

  const floorRoot = new THREE.Group();
  floorRoot.position.y = zb;
  root.add(floorRoot);
  floorRoot.add(cutaway.left, cutaway.back, cutaway.ceiling);
  floorRoot.add(buildArchitecture(THREE, sceneAssets, mats, hdAssets, plan, th, cutaway, anim));

  // Đăng ký tường ngoài & tường vách nội thất vào vật lý trong phòng (tự chừa đúng khoảng cửa đi!)
  physics.addBox("indoor", -0.5, -0.5, plan.W + 0.5, 0.2, "wall_n");
  physics.addBox("indoor", -0.5, plan.D - 0.2, plan.W + 0.5, plan.D + 0.5, "wall_s");
  physics.addBox("indoor", -0.5, -0.5, 0.2, plan.D + 0.5, "wall_w");
  physics.addBox("indoor", plan.W - 0.2, -0.5, plan.W + 0.5, plan.D + 0.5, "wall_e");
  if (plan.walls && plan.walls.length) {
    for (const [axis, at, from, to, doors] of plan.walls) {
      for (const [u, v] of mergeSegments(wallSegments(from, to, doors))) {
        if (axis === "x") physics.addBox("indoor", u, at - 0.12, v, at + 0.12, "in_wall");
        else physics.addBox("indoor", at - 0.12, u, at + 0.12, v, "in_wall");
      }
    }
  }

  const props = plan.props || th.props;
  for (const p of props) {
    registerIndoorProp(physics, p);
    const obj = buildProp(THREE, sceneAssets, natureAssets, hdAssets, mats, {
      ...p, dark, glowOn, iv: p.kind === "bed" && plan.props ? false : p.iv,
    }, th, plan, cutaway, anim);
    if (obj) floorRoot.add(obj);
  }
  // Bồn hoa rực rỡ + đèn trụ + thảm cỏ 3D + cây bụi HD & bàn dã ngoại ngay trong khu Vườn & hồ bơi
  if (plan.rooms && plan.rooms.some((r) => r.id === "garden")) {
    floorRoot.add(buildFlowerbed(THREE, natureAssets, mats, 30.8, 9.2, "#f43f5e"));
    floorRoot.add(buildFlowerbed(THREE, natureAssets, mats, 31.2, 13.0, "#facc15"));
    floorRoot.add(buildFlowerbed(THREE, natureAssets, mats, 40.4, 18.8, "#a855f7"));
    floorRoot.add(buildBollard(THREE, natureAssets, mats, 32.1, 14.4));
    floorRoot.add(buildBollard(THREE, natureAssets, mats, 41.2, 14.4));
    physics.addCircle("indoor", 32.1, 14.4, 0.22, "bollard");
    physics.addCircle("indoor", 41.2, 14.4, 0.22, "bollard");
    for (const [key, opt, gx, gz, ry] of [
      ["shrub", { targetHeight: 0.95 }, 30.8, 10.6, 0.3],
      ["shrub", { targetHeight: 0.9 }, 42.8, 13.8, -0.5],
      ["fern", { targetHeight: 0.65 }, 31.2, 14.2, 0.8],
      ["fern", { targetHeight: 0.6 }, 41.6, 15.2, -0.4],
      ["calathea", { targetHeight: 0.78 }, 34.5, 20.2, 0],
      ["picnic_table", { targetLength: 1.75 }, 35.6, 16.6, 0],
    ]) {
      const gh = putHD(THREE, hdAssets, key, opt, gx, 0, gz, ry);
      if (gh) floorRoot.add(gh);
      if (key === "picnic_table") physics.addBox("indoor", gx - 0.92, gz - 0.68, gx + 0.92, gz + 0.68, "picnic");
      else physics.addCircle("indoor", gx, gz, 0.38, key);
    }
    floorRoot.add(buildInstancedLawn(THREE, natureAssets, mats, {
      x0: 30.4, x1: 43.6, y0: 8.4, y1: 21.6, count: 360, flowers: 44,
    }, [
      [32.3, 8.9, 41.7, 14.7], [40.8, 10.6, 43.8, 13.8],
      [31.1, 15.5, 32.9, 17.3], [41.9, 15.1, 43.7, 16.9], [36.3, 19.5, 38.1, 21.3],
    ]));
  }

  // 5 bàn agent thật
  const seats = opts.seats || [];
  plan.desks.forEach(([x, y], i) => {
    physics.addBox("indoor", x, y, x + 2.8, y + 1.55, "desk");
    const seat = seats[i] || { label: "", state: "idle" };
    const st = buildWorkstation(THREE, sceneAssets, humanAssets, hdAssets, mats, textures, {
      x, y, index: i, seat, theme: th, season: opts.season, isAgent: Boolean(seat.label),
    });
    floorRoot.add(st.root);
    if (st.rig) rigs.push(st.rig);
    agentStations.push(st);
  });

  // Bàn nhân viên minh hoạ & đồng nghiệp đi dạo / trò chuyện (Công ty / Tập đoàn)
  const walkers = [];
  if (opts.npc !== false) {
    plan.extraDesks.forEach(([x, y], k) => {
      physics.addBox("indoor", x, y, x + 2.8, y + 1.55, "desk");
      const seated = npcAt(k);
      const st = buildWorkstation(THREE, sceneAssets, humanAssets, hdAssets, mats, textures, {
        x, y, index: k + 5, seat: { state: seated ? "npc" : "idle", label: "" }, theme: th, season: opts.season, isAgent: false,
      });
      floorRoot.add(st.root);
      if (st.rig) rigs.push(st.rig);
    });
    if (plan.rooms && plan.rooms.length) {
      // Nhân viên nội bộ hành động có mục tiêu rõ ràng, giữ khoảng cách vật lý với đồng nghiệp & đồ đạc
      const OFFICE_SHIRTS = ["#2563eb", "#0f766e", "#6d28d9", "#be123c", "#15803d", "#0369a1"];
      const scheduledIndoor = [
        {
          index: 31,
          holdCup: true,
          steps: [
            { act: "wait", pos: [32.0, 3.6], yaw: 0, dur: 3.6, mode: "talk" },
            { act: "walk", from: [32.0, 3.6], to: [32.6, 8.2], speed: 0.85 },
            { act: "walk", from: [32.6, 8.2], to: [31.5, 8.9], speed: 0.85 },
            { act: "walk", from: [31.5, 8.9], to: [31.5, 14.9], speed: 0.85 },
            { act: "walk", from: [31.5, 14.9], to: [35.8, 15.1], speed: 0.82 },
            { act: "wait", pos: [35.8, 15.1], yaw: 0.25, dur: 4.5, mode: "idle" },
            { act: "walk", from: [35.8, 15.1], to: [31.5, 14.9], speed: 0.82 },
            { act: "walk", from: [31.5, 14.9], to: [31.5, 8.9], speed: 0.85 },
            { act: "walk", from: [31.5, 8.9], to: [32.6, 8.2], speed: 0.85 },
            { act: "walk", from: [32.6, 8.2], to: [32.0, 3.6], speed: 0.85 },
          ],
          initIdx: 5,
        },
        {
          index: 32,
          holdCup: false,
          steps: [
            { act: "wait", pos: [5.1, 4.35], yaw: 0.45, dur: 4.2, mode: "talk" },
            { act: "walk", from: [5.1, 4.35], to: [5.8, 4.8], speed: 0.86 },
            { act: "walk", from: [5.8, 4.8], to: [5.8, 7.0], speed: 0.86 },
            { act: "walk", from: [5.8, 7.0], to: [3.8, 7.0], speed: 0.84 },
            { act: "walk", from: [3.8, 7.0], to: [3.8, 8.6], speed: 0.84 },
            { act: "walk", from: [3.8, 8.6], to: [2.2, 8.6], speed: 0.82 },
            { act: "wait", pos: [2.2, 8.6], yaw: Math.PI / 2, dur: 3.4, mode: "idle" },
            { act: "walk", from: [2.2, 8.6], to: [3.8, 8.6], speed: 0.82 },
            { act: "walk", from: [3.8, 8.6], to: [3.8, 7.0], speed: 0.84 },
            { act: "walk", from: [3.8, 7.0], to: [5.8, 7.0], speed: 0.84 },
            { act: "walk", from: [5.8, 7.0], to: [5.8, 4.8], speed: 0.86 },
            { act: "walk", from: [5.8, 4.8], to: [5.1, 4.35], speed: 0.86 },
          ],
          initIdx: 0,
        },
      ];
      for (const spec of scheduledIndoor) {
        const rig = buildHDHuman(THREE, hdAssets, mats, {
          index: spec.index,
          mode: "idle",
          femaleWalk: spec.index % 2 === 1,
          topColor: OFFICE_SHIRTS[spec.index % OFFICE_SHIRTS.length],
        }) || buildWalkerRig(THREE, humanAssets, mats, { index: spec.index, holdCup: spec.holdCup });
        floorRoot.add(rig.root);
        const npc = createScheduledNPC(rig, spec.steps, spec.initIdx, 0, `in_${spec.index}`);
        npc.isScheduled = true;
        walkers.push(npc);
      }

      const ambientStaff = [
        // Nhân viên lễ tân đứng sau quầy hướng mặt về khách (+Z = rotY PI) & khách hướng về quầy (-Z = rotY 0)
        { index: 35, x: 3.7, z: 2.05, rotY: Math.PI, holdCup: false },
        { index: 36, x: 3.9, z: 4.35, rotY: 0, holdCup: false },
        // Hai đồng nghiệp trò chuyện đối diện nhau tại quầy Pantry
        { index: 33, x: 31.4, z: 2.55, rotY: -1.35, holdCup: true },
        { index: 34, x: 32.6, z: 2.65, rotY: 1.55, holdCup: false },
      ];
      for (const spec of ambientStaff) {
        physics.setHuman("indoor", `static_${spec.index}`, spec.x, spec.z, 0.38);
        const w = buildHDHuman(THREE, hdAssets, mats, {
          ...spec,
          mode: "talk",
          femaleWalk: spec.index % 2 === 1,
          topColor: OFFICE_SHIRTS[spec.index % OFFICE_SHIRTS.length],
        }) || buildWalkerRig(THREE, humanAssets, mats, spec);
        floorRoot.add(w.root);
        walkers.push(w);
      }

      // Giám đốc ngồi ghế da sau bàn lớn + 6 thành viên đang họp trong Phòng họp
      const seatedRoles = [
        { index: 37, x: 10.9, z: 4.55, rotY: 0, state: "work" }, // Giám đốc
        { index: 38, x: 16.5, z: 2.52, rotY: Math.PI, state: "work" },
        { index: 39, x: 19.0, z: 2.52, rotY: Math.PI, state: "work" },
        { index: 40, x: 21.5, z: 2.52, rotY: Math.PI, state: "wait" },
        { index: 41, x: 16.5, z: 4.88, rotY: 0, state: "work" },
        { index: 42, x: 19.0, z: 4.88, rotY: 0, state: "wait" },
        { index: 43, x: 21.5, z: 4.88, rotY: 0, state: "work" },
      ];
      for (const r of seatedRoles) {
        const rig = buildSeatedHDHuman(THREE, humanAssets, hdAssets, mats, {
          index: r.index, theme: th, seat: { state: r.state }, season: opts.season, noChair: true,
        }) || buildHumanRig(THREE, humanAssets, mats, {
          index: r.index, theme: th, seat: { state: r.state }, season: opts.season, noChair: true,
        });
        rig.root.position.set(r.x, 0, r.z);
        rig.root.rotation.y = r.rotY;
        floorRoot.add(rig.root);
        rigs.push(rig);
      }
    }
  }

  // Đồ trang trí mùa Noel / Tết
  if (opts.season === "noel" || opts.season === "tet") {
    floorRoot.add(buildSeasonTree(THREE, natureAssets, mats, opts.season, plan.season, anim));
    buildSeasonWall(THREE, sceneAssets, mats, opts.season, plan, cutaway, anim);
  }

  // Nhân vật dạo phố (chế độ Dạo phố ngang mắt người thứ ba) — ưu tiên mô hình Ready Player Me áo đen sắc nét + mocap thật
  let hero = null;
  let heroPrevT = 0;
  let scenePrevT = 0;
  if (plan.outdoor) {
    hero = buildHDHuman(THREE, hdAssets, mats, {
      index: 99,
      variant: "rpm_a",
      height: 1.76,
      mode: "idle",
      topColor: "#181b22",
    }) || buildWalkerRig(THREE, humanAssets, mats, {
      index: 99,
      hair: "#111827",
      outfit: { top: "#16181d", inner: "#e2e8f0", pants: "#18181b" },
    });
    hero.root.visible = false;
    root.add(hero.root);
  }

  return {
    root,
    plan,
    zb,
    cutaway,
    physics,
    setHero(visible, x, z, rotY, walkPhase, moving, t) {
      if (!hero) return;
      hero.root.visible = Boolean(visible);
      if (!visible) return;
      hero.root.position.set(x, 0, z);
      hero.root.rotation.y = rotY;
      if (hero.isHD) {
        const dt = heroPrevT ? Math.min(0.06, Math.max(0.001, (t || 0) - heroPrevT)) : 0.016;
        heroPrevT = t || 0;
        animateHDHuman(hero, t || 0, dt, true, moving ? "walk" : "idle");
        return;
      }
      if (moving) {
        const stride = Math.sin(walkPhase);
        hero.body.position.y = 0.835 + Math.abs(Math.cos(walkPhase)) * 0.032;
        hero.leftLeg.rotation.x = stride * 0.44;
        hero.rightLeg.rotation.x = -stride * 0.44;
        hero.leftArm.rotation.x = -stride * 0.34;
        hero.rightArm.rotation.x = stride * 0.34;
      } else {
        hero.body.position.y = 0.835;
        hero.leftLeg.rotation.x = hero.rightLeg.rotation.x = 0;
        hero.leftArm.rotation.x = hero.rightArm.rotation.x = 0.06;
        hero.chest.scale.y = 1 + Math.sin((t || 0) * 2.1) * 0.015;
      }
    },
    updateSeats(nextSeats) {
      (nextSeats || []).slice(0, agentStations.length).forEach((s, i) => agentStations[i].update(s));
    },
    setMood(mood) {
      for (const wm of anim.waters) {
        if (!wm.uniforms) continue;
        if (wm.uniforms.uSkyTop) {
          wm.uniforms.uDark.value = mood === "night" ? 1 : 0;
          if (mood === "sunset") {
            wm.uniforms.uSkyTop.value.set("#1e3a8a");
            wm.uniforms.uSkyHorizon.value.set("#fb923c");
            wm.uniforms.uSunDir.value.set(0.85, 0.36, 0.38).normalize();
          } else if (mood === "night") {
            wm.uniforms.uSkyTop.value.set("#0c1938");
            wm.uniforms.uSkyHorizon.value.set("#1e3a5f");
            wm.uniforms.uSunDir.value.set(0.45, 0.65, 0.52).normalize();
          } else {
            wm.uniforms.uSkyTop.value.set("#2563eb");
            wm.uniforms.uSkyHorizon.value.set("#bae6fd");
            wm.uniforms.uSunDir.value.set(0.65, 0.72, 0.44).normalize();
          }
        }
        if (wm.uniforms.uIntensity) {
          wm.uniforms.uIntensity.value = mood === "night" ? 0.34 : mood === "sunset" ? 0.56 : 0.64;
        }
      }
      for (const ct of anim.cities) ct.setMood(mood);
    },
    getTags(curOpts) {
      const tags = [];
      const [bg, fg, border] = curOpts.theme.label;
      if (curOpts.names !== false) {
        const order = [...plan.rooms].sort((a, b) => (b.id === curOpts.focus) - (a.id === curOpts.focus));
        for (const r of order) {
          const [rx, ry, rz] = roomLabelAt(r);
          tags.push({ x: rx, y: ry, z: rz + zb, text: "▸ " + r.name, bg: curOpts.theme.trim, fg: inkOn(curOpts.theme.trim), border: null, kind: "room", id: r.id });
        }
      }
      const headZ = zb + 2.02 + (curOpts.season === "noel" ? 0.34 : 0.08);
      (curOpts.seats || []).slice(0, plan.desks.length).forEach((seat, i) => {
        const [dx, dy] = plan.desks[i];
        const ax = dx + 1.4, ay = dy + 1.32;
        if (curOpts.names !== false) {
          tags.push({ x: ax, y: ay, z: headZ, text: seat.label, bg, fg, border, kind: "agent", id: String(i) });
        }
        if (!QUIET.has(seat.state)) {
          const what = seat.task && seat.task.id ? seat.task.id + " · " : "";
          tags.push({ x: ax, y: ay, z: headZ + 0.68, text: what + STATE_TEXT[seat.state], bg: STATE_COLOR[seat.state], fg: "#0b0f19", border: null, kind: "state", id: "" });
        }
      });
      return tags;
    },
    animate(t, motion) {
      const dt = scenePrevT ? Math.min(0.06, Math.max(0.001, t - scenePrevT)) : 0.016;
      scenePrevT = t;
      for (const rig of rigs) {
        if (rig.isHDSeated) animateSeatedHDHuman(rig, t, motion);
        else animateHumanRig(rig, t, motion);
      }
      for (const w of walkers) {
        if (w.isScheduled) stepScheduledNPC(w, t, dt, motion, { physics, layer: "indoor" });
        else if (w.isHD) animateHDHuman(w, t, dt, motion, w.curMode || "idle");
        else animateWalkerRig(w, t, motion);
      }
      for (const st of agentStations) {
        if (st.orb.visible) {
          const sc = motion ? 1 + Math.sin(t * 4.5 + st.index) * 0.14 : 1;
          st.orb.scale.setScalar(sc);
        }
      }
      for (const tr of anim.trees) {
        tr.group.rotation.z = motion ? Math.sin(t * 1.25 + tr.phase) * tr.amp : 0;
        tr.group.rotation.x = motion ? Math.cos(t * 0.95 + tr.phase * 0.7) * tr.amp * 0.7 : 0;
      }
      for (const fl of anim.floaters) {
        fl.mesh.position.y = fl.baseY + (motion ? Math.sin(t * 1.8 + fl.phase) * 0.035 : 0);
        if (fl.spin && motion) fl.mesh.rotation.y = t * 0.35 + fl.phase;
      }
      for (const bl of anim.blinkers) {
        bl.mat.emissiveIntensity = glowOn ? (!motion || Math.sin(t * 3.8 + bl.phase) > -0.1 ? bl.high : bl.low) : 0;
      }
      for (const sp of anim.spinners) {
        sp.group.rotation.y = motion ? t * 0.85 + sp.phase : 0;
        sp.group.position.y = sp.baseY + (motion ? Math.sin(t * 2.0 + sp.phase) * 0.1 : 0);
      }
      for (const sm of anim.steam) {
        const u = motion ? (t * 0.45 + sm.phase) % 1 : sm.phase % 1;
        sm.mesh.position.set(sm.baseX + Math.sin(t * 2 + sm.phase * 6) * 0.05, 0.98 + u * 0.75, sm.baseZ);
        sm.mesh.scale.setScalar(0.08 + u * 0.09);
        sm.mesh.visible = motion;
      }
      for (const br of anim.bars) {
        const h = 0.35 + 0.65 * (motion ? Math.abs(Math.sin(t * 0.9 + br.phase)) : ((br.phase % 3) / 3));
        br.mesh.scale.y = h;
        br.mesh.position.y = br.baseY + h / 2;
      }
      for (const wm of anim.waters) {
        wm.uniforms.uTime.value = motion ? t : 1.4;
      }
      for (const ch of anim.clockHands) {
        ch.rotation.z = -(motion ? t * (Math.PI * 2 / 60) : 0.85);
      }
      for (const tr of anim.traffics) {
        tr.animate(t, motion);
      }
      for (const ct of anim.cities) {
        ct.animate(t, motion);
      }
    },
    dispose() {
      for (const ct of anim.cities) if (ct.dispose) ct.dispose();
      mats.dispose();
    },
  };
}
