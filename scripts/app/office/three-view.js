// Bộ vẽ 3D tuỳ chọn của màn Văn phòng: cùng cảnh với bản 2D (scene.js `compose`) nhưng dựng bằng three.js (vendor,
// scripts/app/vendor/three/SOURCE) — hộp → mesh, mặt phẳng → plane, nhãn → lớp HTML phủ. Camera trực giao, kéo để
// xoay, nút +/− để phóng. Chỉ được import khi người dùng chọn "3D" (tải lười ~2 MB); không có WebGL → ném lỗi để màn
// quay về 2D. Toạ độ thế giới (x, y, z lên) → three (x, z, y).
import * as THREE from "../vendor/three/three.module.js";
import { compose, viewCorners } from "./scene.js";
import { overlaps } from "./iso.js";

// Mặt phẳng chồng nhau (cửa sổ trên tường, thảm trên sàn) nằm đúng toạ độ; thứ tự phát (như painter của 2D) được giữ
// bằng polygonOffset — dịch độ sâu, không dịch hình — nên toạ độ lớn (mặt tiền toà nhà) không bị đẩy lệch.
const MAX_OFFSET_UNITS = 4000;
const AZ = [0.17, 1.4]; // giới hạn góc xoay ngang (rad): luôn nhìn từ phía hai bức tường mở
const EL = [0.35, 1.1];

// Màu đã phân tích, dùng lại giữa các khung hình (quy mô lớn có hàng nghìn lệnh mỗi khung — không cấp phát lại).
const COLORS = new Map();
function parseColor(str) {
  const key = str || "#ffffff";
  let hit = COLORS.get(key);
  if (!hit) {
    hit = parseColorNew(key);
    if (COLORS.size > 4096) COLORS.clear();
    COLORS.set(key, hit);
  }
  return hit;
}

function parseColorNew(str) {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(str || "");
  if (m) return { color: new THREE.Color(+m[1] / 255, +m[2] / 255, +m[3] / 255).convertSRGBToLinear(), alpha: m[4] === undefined ? 1 : +m[4] };
  return { color: new THREE.Color(str || "#ffffff"), alpha: 1 };
}

function setMat(mat, str, glow, glowOn) {
  const { color, alpha } = parseColor(str);
  mat.color.copy(color);
  if (mat.transparent !== alpha < 1) mat.needsUpdate = true; // three.js chỉ đổi chương trình shader (OPAQUE) khi được báo
  mat.transparent = alpha < 1;
  mat.opacity = alpha;
  if (mat.emissive) {
    if (glow && glowOn) mat.emissive.copy(parseColor(glow).color).multiplyScalar(0.55);
    else mat.emissive.setRGB(0, 0, 0);
  }
  if (mat.specular) {
    mat.shininess = alpha < 1 ? 90 : 24;
    mat.specular.setHex(alpha < 1 ? 0x94a3b8 : 0x222a36);
  }
}

// Bộ thu lệnh vẽ của compose(): giữ nguyên dữ liệu để đồng bộ vào các mesh dùng lại.
class Collector {
  constructor() {
    this.boxes = [];
    this.panels = [];
    this.dots = [];
    this.rings = [];
    this.tags = [];
  }
  box(b) { this.boxes.push(b); }
  panel(f) { this.panels.push(f); }
  dot(x, y, z, r, color) { this.dots.push({ x, y, z, r, color }); }
  ring(x, y, z, r, tilt, color) { this.rings.push({ x, y, z, r, tilt, color }); }
  tag(x, y, z, text, bg, fg, border, kind, id) {
    this.tags.push({ x, y, z, text, bg, fg, border, kind: kind || "", id: id || "" });
  }
}

class Pool {
  constructor(scene, make) {
    this.scene = scene;
    this.make = make;
    this.items = [];
    this.used = 0;
  }
  next() {
    if (this.used === this.items.length) {
      const m = this.make();
      this.scene.add(m);
      this.items.push(m);
    }
    const m = this.items[this.used++];
    m.visible = true;
    return m;
  }
  finish() {
    for (let i = this.used; i < this.items.length; i++) this.items[i].visible = false;
    this.used = 0;
  }
}

export function createThreeView(stage, onTagClick) {
  const canvas = document.createElement("canvas");
  canvas.className = "office-canvas office-3d";
  canvas.setAttribute("role", "img");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, failIfMajorPerformanceCaveat: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
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
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const target = new THREE.Vector3(8, 1.3, 6);
  const view = { az: Math.PI / 4, el: Math.atan(1 / Math.SQRT2), w: 800, h: 540 };
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8a9a, 1.6);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xcbd5e1, 0.42);
  fill.position.set(-16, 10, -12);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(0xffffff, 1.55);
  sun.position.set(22, 14, 14);
  sun.target.position.copy(target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.025;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  scene.add(sun, sun.target);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const SHAPES = {
    box: boxGeo,
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
    taper: new THREE.CylinderGeometry(0.32, 0.5, 1, 14),
    cone: new THREE.ConeGeometry(0.5, 1, 14),
    sphere: new THREE.SphereGeometry(0.5, 16, 12),
    ico: new THREE.IcosahedronGeometry(0.5, 1),
  };
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const dotGeo = new THREE.SphereGeometry(1, 14, 10);
  const ringGeo = new THREE.TorusGeometry(1, 0.025, 6, 48);
  const phong = () => new THREE.MeshPhongMaterial({ shininess: 24, specular: 0x222a36 });
  const boxes = new Pool(scene, () => {
    const m = new THREE.Mesh(boxGeo, phong());
    m.userData.single = m.material;
    m.userData.multi = Array.from({ length: 6 }, phong);
    m.castShadow = m.receiveShadow = true;
    return m;
  });
  const panels = new Pool(scene, () => {
    const m = new THREE.Mesh(planeGeo, phong());
    m.receiveShadow = true;
    return m;
  });
  const dots = new Pool(scene, () => new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial()));
  const rings = new Pool(scene, () => new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial()));
  const tagEls = [];

  function syncBox(b, glowOn) {
    const m = boxes.next();
    const shape = b.shape && SHAPES[b.shape] ? b.shape : "box";
    if (m.geometry !== SHAPES[shape]) m.geometry = SHAPES[shape];
    m.position.set(b.x + b.w / 2, b.z + b.h / 2, b.y + b.d / 2);
    m.rotation.set(b.rx || 0, b.rz || 0, b.ry || 0);
    m.scale.set(Math.max(b.w, 0.001), Math.max(b.h, 0.001), Math.max(b.d, 0.001));
    if (shape === "box" && (b.top || b.front || b.side)) {
      // Thứ tự mặt của BoxGeometry: +x, −x, +y(trên), −y, +z(trước = +y thế giới), −z.
      const faces = [b.side || b.color, b.color, b.top || b.color, b.color, b.front || b.color, b.color];
      faces.forEach((c, i) => setMat(m.userData.multi[i], c, b.glow, glowOn));
      m.material = m.userData.multi;
    } else {
      setMat(m.userData.single, b.top || b.color, b.glow, glowOn);
      m.material = m.userData.single;
    }
  }

  function syncPanel(f, seq, glowOn) {
    const m = panels.next();
    const lift = 0;
    m.material.polygonOffset = true;
    m.material.polygonOffsetFactor = -1;
    m.material.polygonOffsetUnits = -Math.min(seq, MAX_OFFSET_UNITS);
    m.rotation.set(0, 0, 0);
    if (f.plane === "back") m.position.set(f.a + f.w / 2, f.b + f.h / 2, f.c + lift);
    else if (f.plane === "left") {
      m.position.set(f.c + lift, f.b + f.h / 2, f.a + f.w / 2);
      m.rotation.y = Math.PI / 2;
    } else {
      m.position.set(f.a + f.w / 2, f.c + lift, f.b + f.h / 2);
      m.rotation.x = -Math.PI / 2;
    }
    m.scale.set(f.w, f.h, 1);
    setMat(m.material, f.color, f.glow, glowOn);
  }

  // Điểm màn (px trong khung) có nằm trên sàn hay tường neo của CHÍNH phòng `r` không: tia từ camera qua điểm đó cắt
  // sàn tầng (y = zb) trong mặt bằng phòng, hoặc tường ngoài nơi nhãn neo (sau: z = 0; trái: x = 0) trong bề rộng phòng.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function onOwnRoom(left, top, rect, r, zb, H) {
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

  const lastSpot = new Map(); // phòng → chỉ số chỗ đặt nhãn ở khung trước (trễ chống nhảy)
  function syncTags(list, focus, plan) {
    const rect = { w: view.w, h: view.h };
    const rooms = new Map(plan.rooms.map((r) => [r.id, r]));
    const zb = plan.levels ? plan.levels * plan.levelH : 0;
    // Hộp các nhãn đã đặt: nhãn agent/trạng thái (bám người) đặt trước, nhãn phòng chồng lên chúng hay lên nhãn phòng đặt
    // trước thì nhường (compose phát phòng đang xem trước).
    const placed = [];
    // Đủ phần tử TRƯỚC khi xử lý theo thứ tự đổi chỗ: phần tử thứ i luôn là nhãn thứ i của danh sách (tạo lười trong vòng
    // lặp sẽ đẩy phần tử của nhãn agent vào chỉ mục của nhãn phòng ở khung hình đầu).
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
      el.dataset.kind = t.kind; // agent | state | room — test và CSS phân biệt nhãn agent với nhãn phòng
      el.dataset.id = t.id || "";
      el.hidden = false;
      el.dataset.why = "";
      let left = ((p.x + 1) / 2) * rect.w, top = ((1 - p.y) / 2) * rect.h;
      if (t.kind === "room") {
        // Nhãn phòng là biển chỉ dẫn: kẹp trọn vào khung (khung hẹp, xoay sát biên không cắt chữ), rồi chỉ giữ khi chỗ
        // nhãn đứng là sàn/tường của CHÍNH phòng đó và không đè nhãn đã đặt. Thử lần lượt: điểm neo đã kẹp, dịch lên/xuống
        // ±0.65, ±1, ±2 chiều cao nhãn và dịch ngang nhẹ; rồi các điểm trên sàn phòng (lưới 3×3, ưu tiên giữa).
        const hw = el.offsetWidth / 2 + 2;
        const raw = [left, top];
        left = Math.min(rect.w - hw, Math.max(hw, left));
        top = Math.min(rect.h - 2, Math.max(el.offsetHeight + 2, top));
        el.dataset.clamped = Math.abs(left - raw[0]) > 1 || Math.abs(top - raw[1]) > 1 ? "1" : ""; // điểm neo ngoài khung
        const room = rooms.get(t.id);
        const h = el.offsetHeight + 2;
        const own = (x, y) => Boolean(room && onOwnRoom(x, y, rect, room, zb, plan.H));
        const boxAt = (x, y) => ({ l: x - hw + 2, r: x + hw - 2, t: y - el.offsetHeight, b: y });
        const fits = (x, y) => x >= hw && x <= rect.w - hw && y >= h && y <= rect.h - 2;
        const ok = (x, y, gap) =>
          fits(x, y) && !placed.some((o) => overlaps(o, boxAt(x, y), gap)) && (t.id === focus || own(x, y));
        const spots = [
          [left, top], [left, top - h * 0.65], [left, top + h * 0.65],
          [left, top - h], [left, top + h], [left - 18, top], [left + 18, top],
          [left, top - 2 * h], [left, top + 2 * h],
        ];
        if (room) {
          for (const u of [0.5, 0.25, 0.75]) {
            for (const v of [0.5, 0.25, 0.75]) {
              const q = new THREE.Vector3(room.x + u * room.w, zb + 0.6, room.y + v * room.d).project(camera);
              if (q.z < 1) spots.push([((q.x + 1) / 2) * rect.w, ((1 - q.y) / 2) * rect.h]);
            }
          }
        }
        // Trễ chống nhảy: nhân vật nhún (chuyển động bật) làm nhãn bám người xê dịch từng khung — giữ chỗ đã chọn ở khung
        // trước khi nó còn dùng được (khe 1 px); chỉ đổi sang chỗ khác hay hiện lại sau khi ẩn khi có khe (2 px).
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

  // Camera nhìn hộp `v` (thế giới x,y,z → three x,z,y); mặt trời + vùng bóng đổ phủ cả mặt bằng `plan`.
  function place(zoom, v, plan) {
    // Tâm ở giữa hộp nhìn (kể cả cao độ sàn tầng thượng z0 của toà nhà); khung chiếu khớp đúng 8 góc hộp trong không gian
    // camera — "Tới phòng/tới bàn" luôn nằm trọn trong khung ở mọi góc xoay.
    target.set((v.x0 + v.x1) / 2, (v.z0 + v.z1) / 2, (v.y0 + v.y1) / 2);
    const sh = Math.max(plan.W, plan.D) * 0.75 + 4;
    Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, far: sh * 4 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.position.set(plan.W / 2, 0, plan.D / 2);
    sun.position.set(plan.W / 2 + sh * 0.8, sh * 1.1 + (v.z1 || 0), plan.D / 2 + sh * 0.5);
    const aspect = view.w / view.h;
    const r = 60 + Math.max(plan.W, plan.D);
    camera.position.set(
      target.x + Math.sin(view.az) * Math.cos(view.el) * r,
      target.y + Math.sin(view.el) * r,
      target.z + Math.cos(view.az) * Math.cos(view.el) * r,
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
    let hx = 0.5, hy = 0.5;
    for (const x of [v.x0, v.x1]) for (const y of [v.y0, v.y1]) for (const z of [v.z0, v.z1]) {
      const p = new THREE.Vector3(x, z, y).applyMatrix4(camera.matrixWorldInverse);
      hx = Math.max(hx, Math.abs(p.x));
      hy = Math.max(hy, Math.abs(p.y));
    }
    const half = Math.max(hy, hx / aspect) * 1.06;
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.near = 0.1;
    camera.far = r * 2 + Math.max(plan.W, plan.D) * 2;
    camera.zoom = zoom || 1;
    camera.updateProjectionMatrix();
  }

  // Kéo để xoay (chuột/chạm); mũi tên trái/phải/lên/xuống khi canvas có focus.
  let drag = null;
  canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, az: view.az, el: view.el };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    view.az = Math.min(AZ[1], Math.max(AZ[0], drag.az - (e.clientX - drag.x) * 0.008));
    view.el = Math.min(EL[1], Math.max(EL[0], drag.el + (e.clientY - drag.y) * 0.006));
    api.dirty = true;
  });
  const stop = () => { drag = null; };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // tổ hợp của trình duyệt/hệ điều hành (Ctrl+−, Alt+←) giữ nguyên
    const step = { ArrowLeft: [0.1, 0], ArrowRight: [-0.1, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
    if (!step) return;
    e.preventDefault();
    view.az = Math.min(AZ[1], Math.max(AZ[0], view.az + step[0]));
    view.el = Math.min(EL[1], Math.max(EL[0], view.el + step[1]));
    api.dirty = true;
  });

  let curBox = null;
  let curZoom = 1;

  const api = {
    canvas,
    dirty: true,
    resetView() {
      view.az = Math.PI / 4;
      view.el = Math.atan(1 / Math.SQRT2);
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
      // Bóng đổ nhân đôi draw call; bật cho nhóm nhỏ và công ty (tắt ở toà nhà tập đoàn để giữ khung hình).
      const shadows = glowOn && (opts.scale || "team") !== "corp";
      renderer.shadowMap.enabled = shadows;
      sun.castShadow = shadows;
      const dark = Boolean(opts.theme.edge || opts.theme.id === "night" || opts.theme.id === "library");
      hemi.intensity = dark ? 1.25 : 1.8;
      sun.intensity = dark ? 1.45 : 1.55;
      scene.background = parseColor(opts.theme.bg).color;
      const sink = new Collector();
      const { plan } = compose(sink, opts, false);
      sink.boxes.forEach((b) => syncBox(b, glowOn));
      sink.panels.forEach((f, i) => syncPanel(f, i + 1, glowOn));
      sink.dots.forEach((d) => {
        const m = dots.next();
        m.position.set(d.x, d.z, d.y);
        m.scale.setScalar(Math.max(d.r, 0.01));
        setMat(m.material, d.color);
      });
      sink.rings.forEach((r) => {
        const m = rings.next();
        m.position.set(r.x, r.z, r.y);
        m.rotation.set(Math.PI / 2 - 0.25, 0, r.tilt);
        m.scale.setScalar(r.r);
        setMat(m.material, r.color);
      });
      for (const p of [boxes, panels, dots, rings]) p.finish();
      const dstBox = viewCorners(opts).box;
      const dstZoom = opts.zoom || 1;
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
      place(curZoom, curBox, plan);
      renderer.render(scene, camera);
      syncTags(sink.tags, opts.focus, plan);
      api.dirty = moving;
    },
    dispose() {
      renderer.dispose();
      renderer.forceContextLoss(); // trả ngữ cảnh WebGL ngay (trình duyệt giới hạn số ngữ cảnh sống)
      for (const g of [...Object.values(SHAPES), planeGeo, dotGeo, ringGeo]) g.dispose();
      scene.traverse((o) => {
        if (!o.material) return;
        for (const mat of [o.material, ...(o.userData.multi || [])].flat()) mat.dispose();
      });
      canvas.remove();
      labels.remove();
    },
  };
  return api;
}
