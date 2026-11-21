// Bộ vẽ 3D siêu thực PBR + Hậu kỳ điện ảnh WebGL2 HDR (SSAO + Kawase Bloom + FXAA + ACES Filmic):
// - Đồ thị cảnh bền vững (scene3d.js + human3d.js + nature3d.js + water3d.js): chỉ dựng lại khi đổi cấu trúc.
// - Hai chế độ camera: Phối cảnh thật 3D (PerspectiveCamera 34° có chiều sâu & thu phóng bay cận cảnh) và Trực giao.
// - Kéo xoay 360° tự do (tự ẩn tường & đèn trần che góc nhìn), cuộn phóng/thu 30%–800%, Shift/chuột phải dời, bấm tới bàn/phòng.
import * as THREE from "../vendor/three/three.module.js";
import { viewCorners } from "./scene.js";
import { overlaps } from "./iso.js";
import { createTextureBank } from "./textures.js";
import { createHumanAssets } from "./human3d.js";
import { createNatureAssets } from "./nature3d.js";
import { buildOfficeScene, createSceneAssets } from "./scene3d.js";
import { createPostFX } from "./postfx.js";

const EL = [0.06, 1.48]; // xoay ngang 360° tự do; nghiêng dọc từ ngang mắt (~3.5°) tới nhìn thẳng xuống (~85°)
const FOV_DEG = 26; // tiêu cự kiến trúc chuẩn (~65 mm): phối cảnh thật đẹp tự nhiên, không méo góc rộng

export function createThreeView(stage, onTagClick, onHover, onZoom) {
  const canvas = document.createElement("canvas");
  canvas.className = "office-canvas office-3d";
  canvas.setAttribute("role", "img");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, failIfMajorPerformanceCaveat: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  const labels = document.createElement("div");
  labels.className = "office-labels";
  labels.setAttribute("aria-hidden", "true");
  if (onTagClick) {
    labels.addEventListener("click", (e) => {
      const tag = e.target.closest(".office-tag");
      if (tag && tag.dataset.id && (tag.dataset.kind === "room" || tag.dataset.kind === "agent")) {
        onTagClick(tag.dataset.kind, tag.dataset.id);
      }
    });
  }
  stage.append(canvas, labels);

  const scene = new THREE.Scene();
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 240);
  const perspCam = new THREE.PerspectiveCamera(FOV_DEG, 800 / 540, 0.25, 280);
  const target = new THREE.Vector3(8, 1.3, 6);
  const view = { az: Math.PI / 4, el: Math.atan(1 / Math.SQRT2), panX: 0, panZ: 0, freeZoom: 1, perspective: true, w: 800, h: 540 };
  const activeCam = () => (view.perspective ? perspCam : orthoCam);

  // Hệ thống ánh sáng 3 điểm chuẩn kiến trúc ArchViz (nắng vàng ấm + bóng xanh mát + đèn điểm nội thất)
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x6b7280, 0.62);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xbae6fd, 0.42);
  fill.position.set(-18, 11, -14);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(0xfff0d4, 2.75);
  sun.position.set(22, 16, 14);
  sun.target.position.copy(target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 2.8;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.022;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 });
  scene.add(sun, sun.target);

  const accentA = new THREE.PointLight(0x60a5fa, 0, 36, 1.35);
  const accentB = new THREE.PointLight(0xfde68a, 0, 34, 1.35);
  scene.add(accentA, accentB);

  // Hệ hạt không gian 3D (tuyết / mưa neon / sao / bụi nắng)
  const P_COUNT = 180;
  const pPos = new Float32Array(P_COUNT * 3);
  const pSeed = Array.from({ length: P_COUNT }, (_, i) => [
    (Math.sin(i * 12.9898) * 43758.5453) % 1,
    (Math.sin(i * 78.233 + 1) * 43758.5453) % 1,
    (Math.sin(i * 39.425 + 2) * 43758.5453) % 1,
  ].map((v) => v - Math.floor(v)));
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.16, transparent: true, opacity: 0.85, depthWrite: false });
  const pCloud = new THREE.Points(pGeo, pMat);
  pCloud.visible = false;
  scene.add(pCloud);

  // Kho tài nguyên dùng chung & bộ hậu kỳ HDR WebGL2
  const textures = createTextureBank(THREE);
  const sceneAssets = createSceneAssets(THREE);
  const humanAssets = createHumanAssets(THREE);
  const natureAssets = createNatureAssets(THREE);
  const postfx = createPostFX(THREE, renderer);

  let officeObj = null;
  let structKey = "";
  let pickables = [];
  let lastPlan = null;
  let lastZb = 0;
  const tagEls = [];

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function onOwnRoom(left, top, rect, r, zb, H, camera) {
    ndc.set((left / rect.w) * 2 - 1, 1 - (top / rect.h) * 2);
    ray.setFromCamera(ndc, camera);
    const { origin: o, direction: d } = ray.ray;
    const at = (t) => (t > 0 ? { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t } : null);
    const inX = (q) => q.x >= r.x && q.x <= r.x + r.w, inY = (q) => q.z >= r.y && q.z <= r.y + r.d;
    const inH = (q) => q.y >= zb && q.y <= zb + H;
    const floor = d.y ? at((zb - o.y) / d.y) : null;
    if (floor && inX(floor) && inY(floor)) return true;
    const back = r.y === 0 && d.z ? at(-o.z / d.z) : null;
    if (back && inX(back) && inH(back)) return true;
    const side = r.x === 0 && d.x ? at(-o.x / d.x) : null;
    return Boolean(side && inY(side) && inH(side));
  }

  const lastSpot = new Map();
  function syncTags(list, focus, plan, camera) {
    const rect = { w: view.w, h: view.h };
    const rooms = new Map(plan.rooms.map((r) => [r.id, r]));
    const zb = plan.levels ? plan.levels * plan.levelH : 0;
    const placed = [];
    while (tagEls.length < list.length) {
      const el = document.createElement("span");
      el.className = "office-tag";
      labels.append(el);
      tagEls.push(el);
    }
    const order = list.map((_, i) => i).sort((a, b) => (list[a].kind === "room") - (list[b].kind === "room"));
    order.forEach((i) => {
      const t = list[i];
      const el = tagEls[i];
      const p = new THREE.Vector3(t.x, t.z, t.y).project(camera);
      el.textContent = t.text;
      el.dataset.kind = t.kind;
      el.dataset.id = t.id || "";
      el.hidden = false;
      el.dataset.why = "";
      let left = ((p.x + 1) / 2) * rect.w, top = ((1 - p.y) / 2) * rect.h;
      if (t.kind === "room") {
        const hw = el.offsetWidth / 2 + 2;
        const raw = [left, top];
        left = Math.min(rect.w - hw, Math.max(hw, left));
        top = Math.min(rect.h - 2, Math.max(el.offsetHeight + 2, top));
        el.dataset.clamped = Math.abs(left - raw[0]) > 1 || Math.abs(top - raw[1]) > 1 ? "1" : "";
        const room = rooms.get(t.id);
        const h = el.offsetHeight + 2;
        const own = (x, y) => Boolean(room && onOwnRoom(x, y, rect, room, zb, plan.H, camera));
        const boxAt = (x, y) => ({ l: x - hw + 2, r: x + hw - 2, t: y - el.offsetHeight, b: y });
        const fits = (x, y) => x >= hw && x <= rect.w - hw && y >= h && y <= rect.h - 2;
        const ok = (x, y, gap) =>
          fits(x, y) && !placed.some((o) => overlaps(o, boxAt(x, y), gap)) && (t.id === focus || own(x, y));
        const spots = [
          [left, top], [left, top - h * 0.65], [left, top + h * 0.65],
          [left, top - h], [left, top + h], [left - 18, top], [left + 18, top],
          [left, top - 1.5 * h], [left, top + 1.5 * h],
          [left, top - 2 * h], [left, top + 2 * h],
        ];
        if (room) {
          if (room.y === 0) {
            for (const zOff of [2.5, 3.3, 1.6]) {
              for (const u of [0.5, 0.3, 0.7]) {
                const q = new THREE.Vector3(room.x + u * room.w, zb + zOff, 0.2).project(camera);
                if (q.z < 1) spots.push([((q.x + 1) / 2) * rect.w, ((1 - q.y) / 2) * rect.h]);
              }
            }
          }
          for (const u of [0.5, 0.25, 0.75]) {
            for (const v of [0.5, 0.25, 0.75]) {
              const q = new THREE.Vector3(room.x + u * room.w, zb + 0.6, room.y + v * room.d).project(camera);
              if (q.z < 1) spots.push([((q.x + 1) / 2) * rect.w, ((1 - q.y) / 2) * rect.h]);
            }
          }
        }
        const prev = lastSpot.get(t.id);
        const keep = prev !== undefined && prev < spots.length && ok(...spots[prev], 1) ? prev : -1;
        const pick = keep >= 0 ? keep : spots.findIndex(([x, y]) => ok(x, y, 2));
        if (pick >= 0) {
          [left, top] = spots[pick];
          lastSpot.set(t.id, pick);
        } else if (t.id !== focus) {
          lastSpot.delete(t.id);
          el.hidden = true;
          el.dataset.why = own(left, top) ? "overlap" : "off-room";
          return;
        }
        placed.push(boxAt(left, top));
      }
      if (t.kind !== "room") {
        const w = el.offsetWidth / 2;
        placed.push({ l: left - w, r: left + w, t: top - el.offsetHeight, b: top });
      }
      el.style.setProperty("left", left + "px");
      el.style.setProperty("top", top + "px");
      el.style.setProperty("background", t.bg);
      el.style.setProperty("color", t.fg);
      el.style.setProperty("border-color", t.border || t.bg);
    });
    for (let i = list.length; i < tagEls.length; i++) tagEls[i].hidden = true;
  }

  function place(zoom, v, plan) {
    target.set((v.x0 + v.x1) / 2 + view.panX, (v.z0 + v.z1) / 2, (v.y0 + v.y1) / 2 + view.panZ);
    const sh = Math.max(plan.W, plan.D) * 0.78 + 5;
    Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, far: sh * 4.2 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.set(plan.W / 2, 0, plan.D / 2);
    sun.position.set(plan.W / 2 + sh * 0.92, sh * 1.05 + (v.z1 || 0), plan.D / 2 + sh * 0.62);

    const aspect = view.w / view.h;
    const dx = Math.sin(view.az) * Math.cos(view.el);
    const dy = Math.sin(view.el);
    const dz = Math.cos(view.az) * Math.cos(view.el);

    if (view.perspective) {
      // Đặt tạm PerspectiveCamera xa để lấy hệ trục camera chính xác, sau đó giải khoảng cách ôm gọn 8 góc viewBox
      const probeR = 120;
      perspCam.position.set(target.x + dx * probeR, target.y + dy * probeR, target.z + dz * probeR);
      perspCam.lookAt(target);
      perspCam.updateMatrixWorld();
      const tanY = Math.tan(THREE.MathUtils.degToRad(FOV_DEG / 2));
      const tanX = tanY * aspect;
      let need = 4.5;
      for (const x of [v.x0, v.x1]) for (const y of [v.y0, v.y1]) for (const z of [v.z0, v.z1]) {
        const p = new THREE.Vector3(x, z, y).applyMatrix4(perspCam.matrixWorldInverse);
        const closer = p.z + probeR;
        need = Math.max(need, closer + (Math.abs(p.y) * 1.05) / tanY, closer + (Math.abs(p.x) * 1.05) / tanX);
      }
      const dist = Math.max(3.0, need / Math.max(0.25, zoom || 1));
      perspCam.aspect = aspect;
      perspCam.near = Math.max(0.2, dist * 0.025);
      perspCam.far = dist + Math.max(plan.W, plan.D) * 3.5 + 90;
      perspCam.position.set(target.x + dx * dist, target.y + dy * dist, target.z + dz * dist);
      perspCam.lookAt(target);
      perspCam.updateProjectionMatrix();
      perspCam.updateMatrixWorld();
      return perspCam;
    }

    const r = 60 + Math.max(plan.W, plan.D);
    orthoCam.position.set(target.x + dx * r, target.y + dy * r, target.z + dz * r);
    orthoCam.lookAt(target);
    orthoCam.updateMatrixWorld();
    let hx = 0.5, hy = 0.5;
    for (const x of [v.x0, v.x1]) for (const y of [v.y0, v.y1]) for (const z of [v.z0, v.z1]) {
      const p = new THREE.Vector3(x, z, y).applyMatrix4(orthoCam.matrixWorldInverse);
      hx = Math.max(hx, Math.abs(p.x));
      hy = Math.max(hy, Math.abs(p.y));
    }
    const half = Math.max(hy, hx / aspect) * 1.06;
    orthoCam.left = -half * aspect;
    orthoCam.right = half * aspect;
    orthoCam.top = half;
    orthoCam.bottom = -half;
    orthoCam.near = 0.1;
    orthoCam.far = r * 2 + Math.max(plan.W, plan.D) * 2;
    orthoCam.zoom = zoom || 1;
    orthoCam.updateProjectionMatrix();
    return orthoCam;
  }

  function pickAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, 1 - ((clientY - r.top) / r.height) * 2);
    ray.setFromCamera(ndc, activeCam());
    if (pickables.length) {
      const hits = ray.intersectObjects(pickables, false);
      if (hits.length) return hits[0].object.userData.pick;
    }
    if (lastPlan && lastPlan.rooms && lastPlan.rooms.length && ray.ray.direction.y) {
      const t = (lastZb - ray.ray.origin.y) / ray.ray.direction.y;
      if (t > 0) {
        const wx = ray.ray.origin.x + ray.ray.direction.x * t;
        const wy = ray.ray.origin.z + ray.ray.direction.z * t;
        const rm = lastPlan.rooms.find((x) => wx >= x.x && wx <= x.x + x.w && wy >= x.y && wy <= x.y + x.d);
        if (rm) return { kind: "room", id: rm.id, label: rm.name };
      }
    }
    return null;
  }

  // Kéo xoay 360° tự do; Shift+kéo hoặc chuột phải để dời; cuộn chuột để zoom 30%–800%; bấm trực tiếp để tới.
  let drag = null;
  let moved = 0;
  let lastZoom = 1;
  let curBox = null;
  let curZoom = 1;
  let prevT = 0;

  canvas.tabIndex = 0;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("wheel", (e) => {
    if (e.ctrlKey) return;
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.12 : 0.89;
    const minF = 0.3 / Math.max(0.5, lastZoom);
    const maxF = 8 / Math.max(0.5, lastZoom);
    view.freeZoom = Math.min(maxF, Math.max(minF, view.freeZoom * f));
    api.dirty = true;
    if (onZoom) onZoom(Math.round(lastZoom * view.freeZoom * 100));
  }, { passive: false });
  canvas.addEventListener("pointerdown", (e) => {
    const pan = e.button === 2 || e.shiftKey;
    drag = { x: e.clientX, y: e.clientY, az: view.az, el: view.el, panX: view.panX, panZ: view.panZ, pan };
    moved = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      moved = Math.max(moved, Math.hypot(dx, dy));
      if (drag.pan) {
        const s = 0.025 / Math.max(0.3, curZoom || 1);
        const cosA = Math.cos(view.az), sinA = Math.sin(view.az);
        view.panX = drag.panX - (dx * cosA + dy * sinA) * s;
        view.panZ = drag.panZ - (-dx * sinA + dy * cosA) * s;
      } else {
        view.az = drag.az - dx * 0.008;
        view.el = Math.min(EL[1], Math.max(EL[0], drag.el + dy * 0.006));
      }
      api.dirty = true;
      if (onHover) onHover(null);
      canvas.dataset.hover = "";
      return;
    }
    const hit = pickAt(e.clientX, e.clientY);
    canvas.dataset.hover = hit ? "1" : "";
    if (onHover) onHover(hit);
  });
  canvas.addEventListener("pointerleave", () => {
    canvas.dataset.hover = "";
    if (onHover) onHover(null);
  });
  const stop = (e) => {
    if (drag && !drag.pan && moved < 5 && e.type === "pointerup" && onTagClick) {
      const hit = pickAt(e.clientX, e.clientY);
      if (hit) onTagClick(hit.kind, hit.id);
    }
    drag = null;
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const step = { ArrowLeft: [0.1, 0], ArrowRight: [-0.1, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
    if (!step) return;
    e.preventDefault();
    view.az = view.az + step[0];
    view.el = Math.min(EL[1], Math.max(EL[0], view.el + step[1]));
    api.dirty = true;
  });

  const api = {
    canvas,
    dirty: true,
    freeZoom() {
      return view.freeZoom;
    },
    perspective() {
      return view.perspective;
    },
    setPerspective(on) {
      view.perspective = Boolean(on);
      api.dirty = true;
    },
    resetFreeZoom() {
      view.freeZoom = 1;
      api.dirty = true;
    },
    resetPan() {
      view.panX = 0;
      view.panZ = 0;
      api.dirty = true;
    },
    resetView() {
      view.az = Math.PI / 4;
      view.el = Math.atan(1 / Math.SQRT2);
      view.panX = 0;
      view.panZ = 0;
      view.freeZoom = 1;
      api.dirty = true;
    },
    resize(w, h, dpr) {
      view.w = w;
      view.h = h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      api.dirty = true;
    },
    draw(opts) {
      const glowOn = opts.quality !== "low";
      const shadows = glowOn && (opts.scale || "team") !== "corp";
      renderer.shadowMap.enabled = shadows;
      sun.castShadow = shadows;

      const dark = Boolean(opts.theme.edge || opts.theme.id === "night" || opts.theme.id === "library");
      renderer.toneMappingExposure = dark ? 1.18 : 1.05;
      hemi.color.set(dark ? 0x64748b : 0xdbeafe);
      hemi.groundColor.set(dark ? 0x0f172a : 0x6b7280);
      hemi.intensity = dark ? 0.5 : 0.62;
      sun.color.set(dark ? 0xc7d2fe : 0xfff0d4);
      sun.intensity = dark ? 1.38 : 2.75;
      fill.intensity = dark ? 0.36 : 0.42;
      scene.background = textures.sky(opts.theme.bg, opts.theme.glow, dark);
      scene.environment = glowOn ? textures.envMap(renderer, opts.theme, dark) : null;
      if ("environmentIntensity" in scene) scene.environmentIntensity = dark ? 0.68 : 0.6;

      const nextKey = [
        opts.scale || "team",
        opts.layout || "open",
        opts.theme.id,
        opts.season || "off",
        opts.npc !== false ? 1 : 0,
        opts.quality || "high",
        (opts.seats || []).map((s) => (s && s.label ? 1 : 0)).join(""),
      ].join("|");

      if (nextKey !== structKey || !officeObj) {
        if (officeObj) {
          scene.remove(officeObj.root);
          officeObj.dispose();
        }
        officeObj = buildOfficeScene(THREE, textures, sceneAssets, humanAssets, natureAssets, opts);
        scene.add(officeObj.root);
        pickables = [];
        officeObj.root.traverse((o) => { if (o.isMesh && o.userData.pick) pickables.push(o); });
        structKey = nextKey;
      } else {
        officeObj.updateSeats(opts.seats);
      }

      const { plan, zb } = officeObj;
      lastPlan = plan;
      lastZb = zb;

      // Tự động ẩn tường chắn & đèn trần khi xoay góc nhìn ra phía sau hoặc nhìn thẳng từ trên xuống
      officeObj.cutaway.left.visible = Math.sin(view.az) >= -0.05;
      officeObj.cutaway.back.visible = Math.cos(view.az) >= -0.05;
      if (officeObj.cutaway.ceiling) {
        officeObj.cutaway.ceiling.visible = view.el < 0.92 && Math.cos(view.az) >= -0.2;
      }

      // Nguồn sáng nhấn nội thất tạo ánh sáng ấm & tương phản chiều sâu không gian
      accentA.color.set(opts.theme.glow || "#60a5fa");
      accentA.position.set(plan.W * 0.35, zb + 3.0, plan.D * 0.45);
      accentA.intensity = glowOn ? (dark ? 28 : 5.5) : 0;
      accentB.color.set(dark ? "#fde68a" : "#fff1d6");
      accentB.position.set(plan.W * 0.78, zb + 3.2, plan.D * 0.72);
      accentB.intensity = glowOn ? (dark ? 22 : 4.5) : 0;

      // Chuyển động nhân vật, cây cối, sóng nước GLSL, đồng hồ, LED
      const tNow = opts.t || 0;
      if (opts.motion && prevT) textures.animate(Math.min(0.1, Math.max(0, tNow - prevT)));
      prevT = tNow;
      officeObj.animate(tNow, opts.motion);

      // Hệ hạt 3D (tuyết / mưa neon / sao / bụi nắng)
      const pKind = opts.season === "noel" ? "snow" : opts.theme.ambient;
      if (opts.motion && pKind && pKind !== "none" && pKind !== "steam" && glowOn) {
        pCloud.visible = true;
        pMat.color.set(pKind === "rain" ? "#00e5ff" : pKind === "snow" ? "#ffffff" : pKind === "stars" ? "#e0f2fe" : "#fde68a");
        pMat.size = pKind === "snow" || pKind === "rain" ? 0.22 : pKind === "stars" ? 0.2 : 0.14;
        pMat.opacity = pKind === "dust" ? 0.5 : 0.85;
        const spanX = plan.W + 8, spanY = plan.D + 8;
        for (let k = 0; k < P_COUNT; k++) {
          const [rx, ry, rz] = pSeed[k];
          const px = -4 + ((rx + (pKind === "rain" ? tNow * 0.15 : 0)) % 1) * spanX + (pKind === "snow" ? Math.sin(tNow * 0.9 + k) * 0.45 : 0);
          const pz = -4 + ry * spanY;
          let py;
          if (pKind === "stars") py = zb + 1.5 + rz * 8;
          else if (pKind === "dust") py = zb + 0.4 + ((rz + tNow * 0.04) % 1) * 4.5;
          else py = zb + (1 - ((rz + tNow * (pKind === "rain" ? 0.55 : 0.12)) % 1)) * 7.5;
          pPos[k * 3] = px;
          pPos[k * 3 + 1] = py;
          pPos[k * 3 + 2] = pz;
        }
        pGeo.attributes.position.needsUpdate = true;
      } else {
        pCloud.visible = false;
      }

      const dstBox = viewCorners(opts).box;
      lastZoom = opts.zoom || 1;
      const dstZoom = lastZoom * view.freeZoom;
      let moving = false;
      if (!curBox || !opts.motion) {
        curBox = { ...dstBox };
        curZoom = dstZoom;
      } else {
        const k = 0.22;
        for (const key of ["x0", "y0", "z0", "x1", "y1", "z1"]) {
          const diff = dstBox[key] - curBox[key];
          if (Math.abs(diff) > 0.02) {
            curBox[key] += diff * k;
            moving = true;
          } else curBox[key] = dstBox[key];
        }
        const zdiff = dstZoom - curZoom;
        if (Math.abs(zdiff) > 0.005) {
          curZoom += zdiff * k;
          moving = true;
        } else curZoom = dstZoom;
      }
      const camera = place(curZoom, curBox, plan);
      if (glowOn && postfx) {
        postfx.render(scene, camera, {
          dark,
          exposure: dark ? 1.18 : 1.06,
          aoStrength: dark ? 0.48 : 0.56,
          aoRadius: (opts.scale || "team") === "team" ? 0.9 : 1.5,
        });
      } else {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }
      syncTags(officeObj.getTags(opts), opts.focus, plan, camera);
      api.dirty = moving;
    },
    dispose() {
      if (officeObj) {
        scene.remove(officeObj.root);
        officeObj.dispose();
        officeObj = null;
      }
      if (postfx) postfx.dispose();
      sceneAssets.dispose();
      humanAssets.dispose();
      natureAssets.dispose();
      textures.dispose();
      pGeo.dispose();
      pMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      labels.remove();
    },
  };
  return api;
}
