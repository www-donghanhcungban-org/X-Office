// Bộ vẽ 3D tuỳ chọn của màn Văn phòng: cùng cảnh với bản 2D (scene.js `compose`) nhưng dựng bằng three.js (vendor,
// scripts/app/vendor/three/SOURCE) — hộp → mesh, mặt phẳng → plane, nhãn → lớp HTML phủ. Camera trực giao, kéo để
// xoay, nút +/− để phóng. Chỉ được import khi người dùng chọn "3D" (tải lười ~2 MB); không có WebGL → ném lỗi để màn
// quay về 2D. Toạ độ thế giới (x, y, z lên) → three (x, z, y).
import * as THREE from "../vendor/three/three.module.js";
import { compose, ROOM } from "./scene.js";

const FLOOR_LAYER = 0.0008; // tách lớp mặt phẳng chồng nhau theo thứ tự phát (thay cho thứ tự painter của 2D)
const AZ = [0.17, 1.4]; // giới hạn góc xoay ngang (rad): luôn nhìn từ phía hai bức tường mở
const EL = [0.35, 1.1];

function parseColor(str) {
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
  tag(x, y, z, text, bg, fg, border) { this.tags.push({ x, y, z, text, bg, fg, border }); }
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

export function createThreeView(stage) {
  const canvas = document.createElement("canvas");
  canvas.className = "office-canvas office-3d";
  canvas.setAttribute("role", "img");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, failIfMajorPerformanceCaveat: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const labels = document.createElement("div");
  labels.className = "office-labels";
  labels.setAttribute("aria-hidden", "true");
  stage.append(canvas, labels);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const target = new THREE.Vector3(ROOM.W / 2, ROOM.H / 3, ROOM.D / 2);
  const view = { az: Math.PI / 4, el: Math.atan(1 / Math.SQRT2), w: 800, h: 540 };
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a9a, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(ROOM.W + 6, 14, ROOM.D + 2);
  sun.target.position.copy(target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  scene.add(sun, sun.target);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const dotGeo = new THREE.SphereGeometry(1, 14, 10);
  const ringGeo = new THREE.TorusGeometry(1, 0.025, 6, 48);
  const lambert = () => new THREE.MeshLambertMaterial();
  const boxes = new Pool(scene, () => {
    const m = new THREE.Mesh(boxGeo, lambert());
    m.userData.single = m.material;
    m.userData.multi = Array.from({ length: 6 }, lambert);
    m.castShadow = m.receiveShadow = true;
    return m;
  });
  const panels = new Pool(scene, () => {
    const m = new THREE.Mesh(planeGeo, lambert());
    m.receiveShadow = true;
    return m;
  });
  const dots = new Pool(scene, () => new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial()));
  const rings = new Pool(scene, () => new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial()));
  const tagEls = [];

  function syncBox(b, glowOn) {
    const m = boxes.next();
    m.position.set(b.x + b.w / 2, b.z + b.h / 2, b.y + b.d / 2);
    m.scale.set(Math.max(b.w, 0.001), Math.max(b.h, 0.001), Math.max(b.d, 0.001));
    if (b.top || b.front || b.side) {
      // Thứ tự mặt của BoxGeometry: +x, −x, +y(trên), −y, +z(trước = +y thế giới), −z.
      const faces = [b.side || b.color, b.color, b.top || b.color, b.color, b.front || b.color, b.color];
      faces.forEach((c, i) => setMat(m.userData.multi[i], c, b.glow, glowOn));
      m.material = m.userData.multi;
    } else {
      setMat(m.userData.single, b.color, b.glow, glowOn);
      m.material = m.userData.single;
    }
  }

  function syncPanel(f, seq, glowOn) {
    const m = panels.next();
    const lift = (f.c > 0 ? f.c * 2 : 0) + (f.plane === "floor" && f.c === 0 ? 0 : seq * FLOOR_LAYER);
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

  function syncTags(list) {
    const rect = { w: view.w, h: view.h };
    list.forEach((t, i) => {
      let el = tagEls[i];
      if (!el) {
        el = document.createElement("span");
        el.className = "office-tag";
        labels.append(el);
        tagEls.push(el);
      }
      const p = new THREE.Vector3(t.x, t.z, t.y).project(camera);
      el.textContent = t.text;
      el.hidden = false;
      el.style.setProperty("left", ((p.x + 1) / 2) * rect.w + "px");
      el.style.setProperty("top", ((1 - p.y) / 2) * rect.h + "px");
      el.style.setProperty("background", t.bg);
      el.style.setProperty("color", t.fg);
      el.style.setProperty("border-color", t.border || t.bg);
    });
    for (let i = list.length; i < tagEls.length; i++) tagEls[i].hidden = true;
  }

  function place(zoom) {
    const span = (ROOM.W + ROOM.D) * 0.62;
    const aspect = view.w / view.h;
    camera.left = (-span * aspect) / 2;
    camera.right = (span * aspect) / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.zoom = zoom || 1;
    const r = 60;
    camera.position.set(
      target.x + Math.sin(view.az) * Math.cos(view.el) * r,
      target.y + Math.sin(view.el) * r,
      target.z + Math.cos(view.az) * Math.cos(view.el) * r,
    );
    camera.lookAt(target);
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
    const step = { ArrowLeft: [0.1, 0], ArrowRight: [-0.1, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
    if (!step) return;
    e.preventDefault();
    view.az = Math.min(AZ[1], Math.max(AZ[0], view.az + step[0]));
    view.el = Math.min(EL[1], Math.max(EL[0], view.el + step[1]));
    api.dirty = true;
  });

  const api = {
    canvas,
    dirty: true,
    resize(w, h, dpr) {
      view.w = w;
      view.h = h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      api.dirty = true;
    },
    draw(opts) {
      const glowOn = opts.quality !== "low";
      renderer.shadowMap.enabled = glowOn;
      sun.castShadow = glowOn;
      scene.background = parseColor(opts.theme.bg).color;
      const sink = new Collector();
      compose(sink, opts, false);
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
      place(opts.zoom);
      renderer.render(scene, camera);
      syncTags(sink.tags);
      api.dirty = false;
    },
    dispose() {
      renderer.dispose();
      renderer.forceContextLoss(); // trả ngữ cảnh WebGL ngay (trình duyệt giới hạn số ngữ cảnh sống)
      for (const g of [boxGeo, planeGeo, dotGeo, ringGeo]) g.dispose();
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
