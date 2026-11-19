// Dựng + vẽ văn phòng từ (kiểu, mùa, dữ liệu /api/office). Không trạng thái toàn cục: gọi drawScene mỗi khung hình.
import { Iso, depth, fitPoints, shade } from "./iso.js";
import { planFor, viewBox } from "./plans.js";

export const ROOM = { W: 16, D: 12, H: 4 }; // phòng của quy mô "nhóm nhỏ" (giữ để tương thích)
const SKIN = ["#f2c6a0", "#e0ac69", "#c68642", "#f1c27d", "#8d5524", "#ffdbac", "#a1665e"];
const HAIR = ["#2d1b12", "#6b3e26", "#111827", "#b45309", "#4b5563", "#7c2d12", "#d6d3d1"];
const SHIRT = ["#2563eb", "#16a34a", "#9333ea", "#dc2626", "#0d9488", "#ea580c", "#db2777", "#4f46e5", "#0891b2"];
export const STATE_TEXT = { work: "đang làm", fail: "đang sửa (đỏ)", wait: "cần người", done: "xong", idle: "rảnh", untracked: "chưa có tín hiệu" };
const STATE_COLOR = { work: "#22c55e", fail: "#ef4444", wait: "#f59e0b", done: "#38bdf8", idle: "#94a3b8", untracked: "#94a3b8" };
const QUIET = new Set(["idle", "untracked", "npc"]); // không bong bóng; "npc" = nhân viên minh hoạ, không phải agent

// Số giả ngẫu nhiên ổn định theo chỉ số (cửa sổ toà nhà, sao) — khung hình nào cũng như nhau.
function rnd(i) {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function box(x, y, z, w, d, h, color, extra) {
  return { x, y, z, w, d, h, color, ...(extra || {}) };
}

// ---------------------------------------------------------------- phòng: tường, sàn, cửa sổ
function drawRoom(iso, th, plan) {
  const { W, D, H, tile } = plan;
  iso.box(box(-0.3, -0.3, 0, 0.3, D + 0.3, H, th.wall, { side: shade(th.wall, -0.08), top: shade(th.wall, -0.2) }));
  iso.box(box(0, -0.3, 0, W, 0.3, H, th.wall, { front: th.wall, top: shade(th.wall, -0.2) }));
  for (let i = 0; i < W; i += tile) {
    for (let j = 0; j < D; j += tile) {
      iso.panel({ plane: "floor", c: 0, a: i, b: j, w: Math.min(tile, W - i), h: Math.min(tile, D - j), color: th.floor[(i / tile + j / tile) % 2] });
    }
  }
  for (const r of plan.rooms) {
    if (r.floor) iso.panel({ plane: "floor", c: 0.005, a: r.x, b: r.y, w: r.w, h: r.d, color: r.floor });
  }
  iso.panel({ plane: "back", c: 0, a: 0, b: 0, w: W, h: 0.18, color: th.trim });
  iso.panel({ plane: "left", c: 0, a: 0, b: 0, w: D, h: 0.18, color: th.trim });
  iso.panel({ plane: "back", c: 0, a: 0, b: H - 0.12, w: W, h: 0.12, color: th.trim, glow: th.edge });
  iso.panel({ plane: "left", c: 0, a: 0, b: H - 0.12, w: D, h: 0.12, color: th.trim, glow: th.edge });
}

const WINDOW_SKY = {
  sky: ["#bfe3ff", "#8ecbff"], garden: ["#cdeffd", "#9bd88f"], dusk: ["#f6a35c", "#5b3a6e"],
  city: ["#0f1733", "#1c2550"], neon: ["#1a0b2e", "#2b0f45"], street: ["#d8ecf7", "#c9b79c"], stars: ["#000005", "#050818"],
};

function windowContent(iso, th, a, w, t, motion) {
  const [top, bottom] = WINDOW_SKY[th.window] || WINDOW_SKY.sky;
  const plane = "back", c = 0.01, b = 1.2, h = 2.2;
  iso.panel({ plane, c, a: a - 0.1, b: b - 0.1, w: w + 0.2, h: h + 0.2, color: th.trim, glow: th.edge });
  iso.panel({ plane, c, a, b, w, h, color: top });
  iso.panel({ plane, c, a, b, w, h: h * 0.35, color: bottom });
  const kind = th.window;
  if (kind === "city" || kind === "neon") {
    const n = Math.max(3, Math.round(w * 2));
    for (let k = 0; k < n; k++) {
      const bw = w / n, bh = 0.5 + rnd(a * 10 + k) * 1.3;
      const col = kind === "neon" ? "#130726" : "#0a0f24";
      iso.panel({ plane, c: 0.02, a: a + k * bw, b, w: bw * 0.9, h: bh, color: col });
      for (let r = 0; r < 4; r++) {
        if (rnd(a * 31 + k * 7 + r) > 0.45) {
          const lit = kind === "neon" ? (r % 2 ? "#ff2bd6" : "#00e5ff") : "#fcd34d";
          iso.panel({ plane, c: 0.03, a: a + k * bw + 0.08, b: b + 0.12 + r * 0.28, w: 0.1, h: 0.12, color: lit, glow: kind === "neon" ? lit : null });
        }
      }
    }
  } else if (kind === "stars") {
    for (let k = 0; k < 14; k++) {
      const tw = motion ? 0.5 + 0.5 * Math.sin(t * 2 + k) : 1;
      iso.dot(a + rnd(k + a) * w, c, b + rnd(k * 3 + a) * h, 0.03 * (0.6 + tw), "rgba(255,255,255," + (0.4 + 0.6 * tw).toFixed(2) + ")");
    }
    if (a < 3) iso.dot(a + w * 0.65, c, b + h * 0.6, Math.min(0.45, w * 0.16), "#f59e0b");
    if (a < 3) iso.dot(a + w * 0.6, c, b + h * 0.66, Math.min(0.36, w * 0.13), "#fbbf24");
  } else if (kind === "sky" || kind === "garden" || kind === "street") {
    const drift = motion ? (t * 0.05) % 1 : 0;
    iso.panel({ plane, c: 0.02, a: a + ((0.2 + drift) % 0.8) * w, b: b + h * 0.72, w: w * 0.22, h: 0.18, color: "#ffffff" });
    if (kind === "street") {
      for (let k = 0; k < 5; k++) iso.panel({ plane, c: 0.03, a: a + (k * w) / 5, b: b + h - 0.35, w: w / 10, h: 0.35, color: "#c2410c" });
    }
  }
  if (th.ambient === "rain" && motion) {
    for (let k = 0; k < 10; k++) {
      const y0 = b + h - ((t * 2.5 + rnd(k + a)) % 1) * h;
      iso.panel({ plane, c: 0.04, a: a + rnd(k * 5 + a) * w, b: Math.max(b, y0 - 0.3), w: 0.02, h: 0.3, color: "rgba(150,220,255,0.6)" });
    }
  }
}

function drawWindows(iso, th, plan, t, motion) {
  for (const [a, w] of plan.windows) windowContent(iso, th, a, w, t, motion);
  for (const [a, w] of plan.leftWindows) {
    iso.panel({ plane: "left", c: 0.01, a, b: 1.2, w, h: 2.2, color: th.trim, glow: th.edge });
    iso.panel({ plane: "left", c: 0.02, a: a + 0.1, b: 1.3, w: w - 0.2, h: 2.0, color: (WINDOW_SKY[th.window] || WINDOW_SKY.sky)[0] });
  }
}

// ---------------------------------------------------------------- đồ đạc (trả hộp để xếp thứ tự, hoặc vẽ ngay mặt phẳng)
function plant(p, out) {
  out.push(box(p.x, p.y, 0, 0.6, 0.6, 0.5, "#b45309"));
  out.push(box(p.x - 0.1, p.y - 0.1, 0.5, 0.8, 0.8, 0.7, p.color || "#16a34a"));
  out.push(box(p.x + 0.1, p.y + 0.1, 1.2, 0.4, 0.4, 0.4, shade(p.color || "#16a34a", 0.15)));
}

function shelf(p, out) {
  const left = p.side === "left";
  const w = left ? 0.6 : 1.4, d = left ? 1.4 : 0.6;
  out.push(box(p.x, p.y, 0, w, d, 2.6, p.color || "#8b5e3c"));
  const books = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed"];
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 4; k++) {
      const c = books[(r + k) % books.length];
      if (left) out.push(box(p.x + w, p.y + 0.12 + k * 0.3, 0.2 + r * 0.6, 0.02, 0.22, 0.42, c, { bias: 0.5 }));
      else out.push(box(p.x + 0.12 + k * 0.3, p.y + d, 0.2 + r * 0.6, 0.22, 0.02, 0.42, c, { bias: 0.5 }));
    }
  }
}

function sofa(p, out) {
  const c = p.color || "#475569";
  out.push(box(p.x, p.y, 0, 3.2, 1.2, 0.5, c));
  out.push(box(p.x, p.y, 0.5, 3.2, 0.35, 0.6, shade(c, -0.1)));
  out.push(box(p.x, p.y + 0.35, 0.5, 0.35, 0.85, 0.35, c));
  out.push(box(p.x + 2.85, p.y + 0.35, 0.5, 0.35, 0.85, 0.35, c));
}

function lamp(p, out) {
  out.push(box(p.x, p.y, 0, 0.12, 0.12, 2.0, "#6b7280"));
  out.push(box(p.x - 0.22, p.y - 0.22, 2.0, 0.56, 0.56, 0.5, p.color || "#fef3c7", { glow: p.color || "#fef3c7" }));
}

function rack(p, out, th, t, motion) {
  out.push(box(p.x, p.y, 0, 1.0, 1.0, 2.6, p.color || "#111827"));
  for (let r = 0; r < 6; r++) {
    const on = motion ? Math.sin(t * 6 + r * 1.7 + p.x) > 0 : r % 2 === 0;
    const c = on ? (r % 2 ? th.glow : th.trim) : "#1f2937";
    out.push(box(p.x + 0.15, p.y + 1.0, 0.3 + r * 0.38, 0.12, 0.02, 0.08, c, { glow: on ? c : null, bias: 0.4 }));
  }
}

function counter(p, out) {
  out.push(box(p.x, p.y, 0, 3.4, 1.0, 1.1, "#6f4e37", { top: "#e7d5bd" }));
  out.push(box(p.x + 0.3, p.y + 0.2, 1.1, 0.6, 0.5, 0.7, "#9ca3af"));
  out.push(box(p.x + 1.4, p.y + 0.3, 1.1, 0.25, 0.25, 0.25, "#ffffff"));
  out.push(box(p.x + 1.9, p.y + 0.3, 1.1, 0.25, 0.25, 0.25, "#ffffff"));
  out.push(box(p.x + 2.3, p.y + 0.15, 1.1, 0.9, 0.6, 0.35, "#fde68a"));
}

function cafetable(p, out, th, t, motion) {
  out.push(box(p.x + 0.35, p.y + 0.35, 0, 0.1, 0.1, 0.7, "#4b3621"));
  out.push(box(p.x, p.y, 0.7, 0.8, 0.8, 0.08, "#d9b38c"));
  out.push(box(p.x + 0.3, p.y + 0.3, 0.78, 0.2, 0.2, 0.2, "#ffffff"));
  out.push(box(p.x - 0.7, p.y + 0.15, 0, 0.5, 0.5, 0.45, th.chair));
  out.push(box(p.x + 1.0, p.y + 0.15, 0, 0.5, 0.5, 0.45, th.chair));
  if (motion) {
    for (let k = 0; k < 3; k++) {
      const z = 1.0 + ((t * 0.6 + k / 3) % 1) * 0.9;
      out.push({ kind: "puff", x: p.x + 0.4 + Math.sin(t * 2 + k) * 0.08, y: p.y + 0.4, z, w: 0, d: 0, h: 0, r: 0.07 + (z - 1) * 0.06 });
    }
  }
}

function consoleDesk(p, out, th, t, motion) {
  out.push(box(p.x, p.y, 0, 1.6, 0.9, 0.9, "#334155", { top: "#1e293b" }));
  for (let k = 0; k < 4; k++) {
    const on = motion ? Math.sin(t * 4 + k * 2 + p.x) > -0.2 : true;
    const c = k % 2 ? "#f97316" : th.glow;
    out.push(box(p.x + 0.15 + k * 0.35, p.y + 0.2, 0.9, 0.2, 0.2, 0.04, on ? c : "#475569", { glow: on ? c : null }));
  }
  out.push(box(p.x + 0.1, p.y, 0.9, 1.4, 0.06, 0.9, "#0f172a", { front: shade(th.glow, -0.55), glow: th.glow }));
}

function holo(p, out, th, t, motion) {
  out.push(box(p.x, p.y, 0, 1.4, 1.4, 0.6, "#1f2937", { top: shade(p.color, -0.5) }));
  const spin = motion ? t : 0;
  if (p.planet) {
    out.push({ kind: "orb", x: p.x + 0.7, y: p.y + 0.7, z: 1.5, w: 0, d: 0, h: 0, r: 0.42, color: p.color, ring: spin });
  } else {
    for (let k = 0; k < 3; k++) {
      const hgt = 0.4 + 0.3 * Math.abs(Math.sin(spin * 1.5 + k));
      out.push(box(p.x + 0.25 + k * 0.35, p.y + 0.6, 0.6, 0.2, 0.2, hgt, p.color, { glow: p.color, bias: 0.3 }));
    }
  }
}

function cooler(p, out) {
  out.push(box(p.x, p.y, 0, 0.6, 0.6, 1.1, "#e5e7eb"));
  out.push(box(p.x + 0.08, p.y + 0.08, 1.1, 0.44, 0.44, 0.6, "#7dd3fc", { top: "#bae6fd" }));
}

function bed(p, out, th) {
  out.push(box(p.x, p.y, 0, 2.4, 1.0, 0.45, "#cbd5e1"));
  out.push(box(p.x + 0.05, p.y + 0.05, 0.45, 2.3, 0.9, 0.18, "#bfdbfe", { top: "#dbeafe" }));
  out.push(box(p.x + 1.7, p.y + 0.15, 0.63, 0.5, 0.7, 0.14, "#ffffff"));
  out.push(box(p.x + 0.1, p.y + 0.08, 0.63, 1.5, 0.84, 0.1, th.trim, { bias: 0.01 }));
  out.push(box(p.x + 2.3, p.y, 0.45, 0.1, 1.0, 0.6, "#94a3b8"));
  if (p.iv === false) return;
  out.push(box(p.x - 0.35, p.y + 0.2, 0, 0.08, 0.08, 1.9, "#9ca3af"));
  out.push(box(p.x - 0.45, p.y + 0.12, 1.55, 0.26, 0.2, 0.32, "#e0f2fe", { glow: th.glow }));
}

// ---------------------------------------------------------------- đồ đạc của quy mô công ty
function bigdesk(p, out, th) {
  const wood = "#5b3a29";
  out.push(box(p.x, p.y, 0.74, 3.2, 1.3, 0.12, wood, { top: "#7c4a32" }));
  out.push(box(p.x, p.y, 0, 0.2, 1.3, 0.74, shade(wood, -0.1)));
  out.push(box(p.x + 3.0, p.y, 0, 0.2, 1.3, 0.74, shade(wood, -0.1)));
  out.push(box(p.x + 2.4, p.y + 1.3, 0.74, 0.8, 1.2, 0.12, wood, { top: "#7c4a32" }));
  out.push(box(p.x + 1.0, p.y + 0.15, 0.86, 1.3, 0.08, 0.8, "#111827", { front: shade(th.glow, -0.45), glow: th.glow }));
  out.push(box(p.x + 0.4, p.y + 0.6, 0.86, 0.5, 0.18, 0.12, "#fbbf24"));
  out.push(box(p.x + 1.0, p.y + 1.7, 0, 1.0, 0.9, 0.5, "#1f2937"));
  out.push(box(p.x + 1.0, p.y + 2.4, 0.5, 1.0, 0.22, 1.3, "#111827", { bias: 0.2 }));
}

function meeting(p, out, th) {
  const L = 6.8, D = 1.8;
  out.push(box(p.x, p.y, 0.74, L, D, 0.1, "#e7e5e4", { top: "#f5f5f4" }));
  out.push(box(p.x + 0.6, p.y + 0.7, 0, 0.3, 0.4, 0.74, "#a8a29e"));
  out.push(box(p.x + L - 0.9, p.y + 0.7, 0, 0.3, 0.4, 0.74, "#a8a29e"));
  const n = p.seats || 6;
  for (let k = 0; k < n / 2; k++) {
    const cx = p.x + 0.5 + k * (L - 1.0) / (n / 2 - 1) - 0.3;
    out.push(box(cx, p.y - 0.9, 0, 0.6, 0.6, 0.45, th.chair));
    out.push(box(cx, p.y - 1.05, 0.45, 0.6, 0.15, 0.6, shade(th.chair, -0.1)));
    out.push(box(cx, p.y + D + 0.3, 0, 0.6, 0.6, 0.45, th.chair));
    out.push(box(cx, p.y + D + 0.75, 0.45, 0.6, 0.15, 0.6, shade(th.chair, -0.1), { bias: 0.2 }));
  }
  out.push(box(p.x + L / 2 - 0.3, p.y + D / 2 - 0.2, 0.84, 0.6, 0.4, 0.06, "#334155"));
}

function tree(p, out) {
  const leaf = p.color || "#2f855a";
  out.push(box(p.x + 0.85, p.y + 0.85, 0, 0.3, 0.3, 1.4, "#7c4a32"));
  out.push(box(p.x, p.y, 1.3, 2.0, 2.0, 1.0, leaf));
  out.push(box(p.x + 0.3, p.y + 0.3, 2.3, 1.4, 1.4, 0.8, shade(leaf, 0.12)));
  out.push(box(p.x + 0.6, p.y + 0.6, 3.1, 0.8, 0.8, 0.5, shade(leaf, 0.22)));
}

function bench(p, out) {
  out.push(box(p.x, p.y, 0.4, 2.0, 0.6, 0.12, "#a16207", { top: "#ca8a04" }));
  out.push(box(p.x, p.y, 0.52, 2.0, 0.12, 0.5, "#a16207"));
  out.push(box(p.x + 0.15, p.y + 0.15, 0, 0.15, 0.3, 0.4, "#57534e"));
  out.push(box(p.x + 1.7, p.y + 0.15, 0, 0.15, 0.3, 0.4, "#57534e"));
}

function umbrella(p, out) {
  out.push(box(p.x + 0.45, p.y + 0.45, 0, 0.1, 0.1, 2.2, "#e5e7eb"));
  out.push(box(p.x - 0.4, p.y - 0.4, 2.2, 1.8, 1.8, 0.18, "#38bdf8", { top: "#7dd3fc" }));
  out.push(box(p.x - 1.6, p.y + 1.4, 0.25, 1.6, 0.6, 0.12, "#f8fafc"));
  out.push(box(p.x + 0.4, p.y + 1.4, 0.25, 1.6, 0.6, 0.12, "#fde68a"));
}

function fence(p, out) {
  // Hàng rào cây/bồn cây ngoài trời, chia đoạn 2 ô để xếp painter đúng.
  const step = 2;
  for (let u = 0; u < p.len; u += step) {
    const l = Math.min(step, p.len - u);
    if (p.axis === "x") out.push(box(p.x + u, p.y, 0, l - 0.1, 0.7, 0.6, "#3f7d3a", { top: "#4d9443" }));
    else out.push(box(p.x, p.y + u, 0, 0.7, l - 0.1, 0.6, "#3f7d3a", { top: "#4d9443" }));
  }
}

function streetlamp(p, out) {
  out.push(box(p.x, p.y, 0, 0.12, 0.12, 2.6, "#374151"));
  out.push(box(p.x - 0.15, p.y - 0.15, 2.6, 0.42, 0.42, 0.25, "#fef3c7", { glow: "#fde68a" }));
}

const BOX_PROPS = {
  plant, shelf, sofa, lamp, rack, counter, cafetable, console: consoleDesk, holo, cooler, bed,
  bigdesk, meeting, tree, bench, umbrella, fence, streetlamp,
};

function flatProp(iso, p, th, plan, t, motion) {
  if (p.kind === "rug") iso.panel({ plane: "floor", c: 0.01, a: p.x, b: p.y, w: p.w, h: p.d, color: p.color });
  if (p.kind === "board") {
    const col = p.color || "#f8fafc";
    const f = p.side === "left" ? { plane: "left", c: 0.02, a: p.y, b: 1.4 } : { plane: "back", c: 0.02, a: p.x, b: 1.4 };
    iso.panel({ ...f, w: 2.4, h: 1.5, color: shade(col, -0.25) });
    iso.panel({ ...f, a: f.a + 0.1, b: 1.5, w: 2.2, h: 1.3, color: col });
    const notes = p.chalk ? ["#f8fafc", "#fde68a", "#f8fafc"] : ["#fde047", "#f9a8d4", "#86efac", "#93c5fd"];
    notes.forEach((c, k) => iso.panel({ ...f, a: f.a + 0.25 + k * 0.5, b: 1.9 + (k % 2) * 0.4, w: 0.35, h: p.chalk ? 0.06 : 0.3, color: c }));
  }
  if (p.kind === "neon") {
    const f = p.side === "left" ? { plane: "left", c: 0.03, a: p.y } : { plane: "back", c: 0.03, a: p.x };
    iso.panel({ ...f, b: 3.0, w: p.w, h: 0.5, color: "#0b0414" });
    iso.panel({ ...f, a: f.a + 0.15, b: 3.12, w: p.w - 0.3, h: 0.08, color: p.color, glow: p.color });
    iso.panel({ ...f, a: f.a + 0.15, b: 3.3, w: (p.w - 0.3) * 0.6, h: 0.08, color: th.glow, glow: th.glow });
  }
  if (p.kind === "cross") {
    const f = p.side === "left" ? { plane: "left", c: 0.03, a: p.y } : { plane: "back", c: 0.03, a: p.x };
    iso.panel({ ...f, b: 2.4, w: 1.2, h: 1.2, color: "#ffffff", stroke: th.trim });
    iso.panel({ ...f, a: f.a + 0.45, b: 2.55, w: 0.3, h: 0.9, color: p.color, glow: p.color });
    iso.panel({ ...f, a: f.a + 0.15, b: 2.85, w: 0.9, h: 0.3, color: p.color, glow: p.color });
  }
  if (p.kind === "pipe") {
    iso.panel({ plane: "back", c: 0.02, a: 0, b: 3.55, w: plan.W, h: 0.14, color: shade(th.wall, 0.25) });
    iso.panel({ plane: "left", c: 0.02, a: 0, b: 3.55, w: plan.D, h: 0.14, color: shade(th.wall, 0.25) });
  }
  if (p.kind === "logo") {
    iso.panel({ plane: "back", c: 0.02, a: p.x, b: 2.3, w: p.w, h: 1.2, color: th.trim, glow: th.edge });
    iso.panel({ plane: "back", c: 0.03, a: p.x + 0.3, b: 2.55, w: 0.7, h: 0.7, color: "#ffffff" });
    iso.panel({ plane: "back", c: 0.03, a: p.x + 1.3, b: 2.85, w: p.w - 1.7, h: 0.22, color: "#ffffff" });
    iso.panel({ plane: "back", c: 0.03, a: p.x + 1.3, b: 2.55, w: (p.w - 1.7) * 0.6, h: 0.14, color: shade(th.trim, 0.6) });
  }
  if (p.kind === "screen") {
    iso.panel({ plane: "back", c: 0.02, a: p.x, b: 1.4, w: p.w, h: 2.0, color: "#0f172a" });
    iso.panel({ plane: "back", c: 0.03, a: p.x + 0.15, b: 1.55, w: p.w - 0.3, h: 1.7, color: shade(th.glow, -0.55), glow: th.glow });
    for (let k = 0; k < 4; k++) {
      const hgt = 0.3 + 0.25 * (motion ? Math.abs(Math.sin(t * 0.8 + k)) : (k % 3) / 2);
      iso.panel({ plane: "back", c: 0.04, a: p.x + 0.5 + k * 0.7, b: 1.75, w: 0.45, h: hgt + 0.3, color: th.glow });
    }
  }
  if (p.kind === "pool") {
    iso.panel({ plane: "floor", c: 0.01, a: p.x - 0.4, b: p.y - 0.4, w: p.w + 0.8, h: p.d + 0.8, color: "#e7e5e4" });
    iso.panel({ plane: "floor", c: 0.02, a: p.x, b: p.y, w: p.w, h: p.d, color: "#38bdf8" });
    iso.panel({ plane: "floor", c: 0.025, a: p.x + 0.3, b: p.y + 0.3, w: p.w - 0.6, h: p.d * 0.45, color: "#7dd3fc" });
    for (let k = 0; k < 5; k++) {
      const off = motion ? (t * 0.4 + k / 5) % 1 : k / 5;
      iso.panel({ plane: "floor", c: 0.03, a: p.x + 0.4 + off * (p.w - 1.6), b: p.y + 0.6 + (k % 3) * 1.2, w: 0.8, h: 0.06, color: "rgba(255,255,255,0.7)" });
    }
    iso.ring(p.x + p.w * 0.7, p.y + p.d * 0.6, 0.05, 0.35, 0.6, "#f43f5e");
  }
}

// ---------------------------------------------------------------- ngoại cảnh + toà nhà
function drawGround(iso, plan) {
  const g = plan.levels ? 6 : 4;
  iso.panel({ plane: "floor", c: -0.01, a: -1.5, b: -1.5, w: plan.W + g + 1.5, h: plan.D + g + 1.5, color: "#a7c48a" });
  iso.panel({ plane: "floor", c: -0.005, a: 3.0, b: plan.D, w: 4.0, h: g, color: "#d6d3d1" }); // lối vào
}

function outdoorProps(plan, out) {
  const g = plan.levels ? 6 : 4;
  fence({ axis: "x", x: 7.4, y: plan.D + g - 1.0, len: plan.W - 7.4 + g - 1 }, out);
  fence({ axis: "y", x: plan.W + g - 1.0, y: -1.0, len: plan.D + g - 1 }, out);
  fence({ axis: "x", x: -1.0, y: plan.D + g - 1.0, len: 3.8 }, out);
  for (let x = 9; x < plan.W; x += 7) tree({ x, y: plan.D + 1.0, color: x % 2 ? "#2f855a" : "#3b8f4f" }, out);
  for (let y = 2; y < plan.D; y += 7) tree({ x: plan.W + 1.0, y, color: "#2f855a" }, out);
  streetlamp({ x: 2.6, y: plan.D + 1.4 }, out);
  streetlamp({ x: 7.4, y: plan.D + 1.4 }, out);
}

function drawBuilding(iso, plan, th) {
  const { W, D, levels, levelH } = plan;
  for (let i = 0; i < levels; i++) {
    const z0 = i * levelH;
    iso.box(box(0, 0, z0, W, D, 0.35, "#94a3b8", { top: "#cbd5e1" }));
    iso.panel({ plane: "back", c: D, a: 0, b: z0 + 0.35, w: W, h: levelH - 0.35, color: th.edge ? "#1e293b" : "#5b7fa6" });
    iso.panel({ plane: "left", c: W, a: 0, b: z0 + 0.35, w: D, h: levelH - 0.35, color: th.edge ? "#172033" : "#4a6c91" });
    for (let a = 0; a < W; a += 2) {
      const lit = rnd(i * 97 + a) > 0.55;
      iso.panel({ plane: "back", c: D + 0.01, a: a + 0.25, b: z0 + 0.9, w: 1.5, h: levelH - 1.6, color: lit ? "#fde68a" : (th.edge ? "#273449" : "#7aa2c8") });
      iso.panel({ plane: "back", c: D + 0.02, a, b: z0 + 0.35, w: 0.12, h: levelH - 0.35, color: "#e2e8f0" });
    }
    for (let a = 0; a < D; a += 2) {
      const lit = rnd(i * 53 + a + 7) > 0.6;
      iso.panel({ plane: "left", c: W + 0.01, a: a + 0.25, b: z0 + 0.9, w: 1.5, h: levelH - 1.6, color: lit ? "#fde68a" : (th.edge ? "#1e2a3d" : "#6b93ba") });
      iso.panel({ plane: "left", c: W + 0.02, a, b: z0 + 0.35, w: 0.12, h: levelH - 0.35, color: "#e2e8f0" });
    }
  }
  // Sảnh tầng trệt: cửa kính + mái đón.
  iso.panel({ plane: "back", c: D + 0.03, a: 3.0, b: 0, w: 4.0, h: 2.6, color: "#0f172a" });
  iso.panel({ plane: "back", c: D + 0.04, a: 3.2, b: 0, w: 1.7, h: 2.4, color: "#38bdf8" });
  iso.panel({ plane: "back", c: D + 0.04, a: 5.1, b: 0, w: 1.7, h: 2.4, color: "#38bdf8" });
}

// Sink dời cao độ z (tầng trên cùng của toà nhà nằm trên các tầng dưới).
function lift(sink, dz) {
  if (!dz) return sink;
  return {
    box: (b) => sink.box({ ...b, z: b.z + dz }),
    panel: (f) => sink.panel(f.plane === "floor" ? { ...f, c: f.c + dz } : { ...f, b: f.b + dz }),
    dot: (x, y, z, r, c) => sink.dot(x, y, z + dz, r, c),
    ring: (x, y, z, r, tilt, c) => sink.ring(x, y, z + dz, r, tilt, c),
    tag: (x, y, z, ...rest) => sink.tag(x, y, z + dz, ...rest),
  };
}

// ---------------------------------------------------------------- bàn + nhân vật
function deskBoxes(th, x, y, seat, out, t, motion) {
  out.push(box(x, y, 0.72, 2.8, 1.1, 0.1, th.desk, { glow: th.edge ? th.edge : null }));
  for (const [dx, dy] of [[0.1, 0.1], [2.6, 0.1], [0.1, 0.9], [2.6, 0.9]]) out.push(box(x + dx, y + dy, 0, 0.1, 0.1, 0.72, th.leg));
  const lit = seat.state === "npc" ? shade(th.glow, -0.35) : QUIET.has(seat.state) ? shade(th.screen, 0.1) : STATE_COLOR[seat.state];
  const flick = motion && seat.state === "work" ? 0.1 * Math.sin(t * 9) : 0;
  out.push(box(x + 0.7, y + 0.15, 0.82, 1.4, 0.08, 0.8, "#111827", { front: shade(lit, -0.35 + flick), glow: QUIET.has(seat.state) ? null : lit }));
  out.push(box(x + 1.25, y + 0.25, 0.82, 0.3, 0.2, 0.06, "#374151"));
  out.push(box(x + 0.8, y + 0.55, 0.82, 1.1, 0.35, 0.03, "#4b5563"));
  out.push(box(x + 2.2, y + 0.5, 0.82, 0.18, 0.18, 0.22, "#ffffff"));
}

function person(th, x, y, i, seat, out, t, motion, season) {
  const cx = x + 0.95, cy = y + 1.55;
  const shake = motion && seat.state === "fail" ? Math.sin(t * 30) * 0.04 : 0;
  const jump = motion && seat.state === "done" ? Math.abs(Math.sin(t * 4)) * 0.25 : 0;
  const busy = seat.state === "work" || seat.state === "npc";
  const bob = motion && busy ? Math.sin(t * 6 + i) * 0.03 : 0;
  out.push(box(cx - 0.1, cy - 0.05, 0.42, 1.1, 0.9, 0.1, th.chair));
  const bx = cx + shake, bz = 0.52 + jump;
  out.push(box(bx, cy, bz, 0.9, 0.6, 0.65, SHIRT[i % SHIRT.length], { bias: 0.02 }));
  out.push(box(bx + 0.1, cy + 0.05, bz + 0.65 + bob, 0.7, 0.55, 0.55, SKIN[i % SKIN.length], { bias: 0.03 }));
  out.push(box(bx + 0.08, cy + 0.1, bz + 1.05 + bob, 0.74, 0.55, 0.2, HAIR[(i * 3) % HAIR.length], { bias: 0.04 }));
  if (seat.state === "wait") {
    out.push(box(bx + 0.78, cy + 0.2, bz + 0.6, 0.18, 0.18, 1.0 + (motion ? Math.sin(t * 5) * 0.08 : 0), SKIN[i % SKIN.length], { bias: 0.05 }));
  } else {
    const arm = motion && busy ? Math.sin(t * 12 + i * 1.7) * 0.04 : 0;
    out.push(box(bx - 0.15, cy - 0.15, bz + 0.25 + arm, 0.16, 0.5, 0.16, SHIRT[i % SHIRT.length], { bias: 0.01 }));
    out.push(box(bx + 0.89, cy - 0.15, bz + 0.25 - arm, 0.16, 0.5, 0.16, SHIRT[i % SHIRT.length], { bias: 0.01 }));
  }
  if (season === "noel") {
    out.push(box(bx + 0.12, cy + 0.12, bz + 1.25 + bob, 0.66, 0.5, 0.12, "#f8fafc", { bias: 0.06 }));
    out.push(box(bx + 0.22, cy + 0.2, bz + 1.37 + bob, 0.46, 0.34, 0.28, "#dc2626", { bias: 0.07 }));
    out.push(box(bx + 0.38, cy + 0.3, bz + 1.65 + bob, 0.14, 0.14, 0.14, "#f8fafc", { bias: 0.08 }));
  } else if (season === "tet") {
    out.push(box(bx + 0.15, cy + 0.1, bz + 1.25 + bob, 0.6, 0.45, 0.1, "#dc2626", { bias: 0.06 }));
  }
  out.push(box(cx - 0.1, cy + 0.75, 0.42, 1.1, 0.18, 0.95, shade(th.chair, -0.1), { bias: 0.2 }));
  return { x: bx + 0.45, y: cy + 0.3, z: bz + 1.55 + (season === "noel" ? 0.4 : 0.15) };
}

// ---------------------------------------------------------------- bố cục: vách ngăn (chia đoạn 1 ô để xếp painter đúng)
export const LAYOUTS = [
  { id: "open", name: "Mở chung" },
  { id: "connected", name: "Nhiều phòng liên thông" },
  { id: "private", name: "Mỗi người một phòng" },
];
const T = 0.16; // độ dày vách

// Đoạn vách [u, v] của [from, to] trừ các khoảng cửa — cắt ĐÚNG tại mép cửa (cửa hẹp hơn 1 ô vẫn mở), rồi chia ≤ 1 ô
// để thứ tự painter của 2D đúng.
export function wallSegments(from, to, doors) {
  const cuts = [from, to, ...doors.flat().filter((x) => x > from && x < to)].sort((a, b) => a - b);
  const out = [];
  for (let k = 0; k + 1 < cuts.length; k++) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    if (b - a < 1e-6 || doors.some(([d0, d1]) => (a + b) / 2 > d0 && (a + b) / 2 < d1)) continue;
    for (let u = a; u < b - 1e-6; u = Math.min(b, u + 1)) out.push([u, Math.min(b, u + 1)]);
  }
  return out;
}

function layoutWalls(walls, th, out) {
  const glass = th.edge ? "rgba(120,200,255,0.18)" : "rgba(190,225,245,0.32)";
  for (const [axis, at, from, to, doors] of walls) {
    for (const [u, v] of wallSegments(from, to, doors)) {
      const seg = (z, h, color, extra) =>
        out.push(axis === "x" ? box(u, at - T / 2, z, v - u, T, h, color, extra) : box(at - T / 2, u, z, T, v - u, h, color, extra));
      seg(0, 1.0, th.wall, { top: th.trim });
      seg(1.0, 1.15, glass, { top: glass, front: glass, side: glass });
      seg(2.15, 0.08, th.trim, { glow: th.edge || null });
    }
  }
}

// ---------------------------------------------------------------- mùa
function seasonProps(season, out, t, motion, [x, y]) {
  if (season === "noel") {
    out.push(box(x + 0.6, y + 0.6, 0, 0.3, 0.3, 0.4, "#78350f"));
    [[1.5, 0.4], [1.2, 1.0], [0.9, 1.6], [0.6, 2.1]].forEach(([s, z], k) =>
      out.push(box(x + 0.75 - s / 2, y + 0.75 - s / 2, z, s, s, 0.55, k % 2 ? "#15803d" : "#16a34a", { bias: 0.01 * k })));
    out.push(box(x + 0.6, y + 0.6, 2.65, 0.3, 0.3, 0.3, "#facc15", { glow: "#facc15", bias: 0.1 }));
    ["#dc2626", "#2563eb", "#f59e0b", "#db2777"].forEach((c, k) =>
      out.push(box(x - 0.6 + k * 0.7, y + 1.8 + (k % 2) * 0.3, 0, 0.45, 0.45, 0.4, c, { top: "#fde68a" })));
    for (let k = 0; k < 8; k++) {
      const on = !motion || Math.sin(t * 3 + k) > 0;
      const s = [[1.5, 0.4], [1.2, 1.0], [0.9, 1.6]][k % 3];
      out.push({ kind: "puff", x: x + 0.75 + Math.cos(k * 2.4) * s[0] * 0.5, y: y + 0.75 + Math.sin(k * 2.4) * s[0] * 0.5 + 0.2, z: s[1] + 0.3, w: 0, d: 0, h: 0, r: 0.06, color: on ? ["#fde047", "#f43f5e", "#38bdf8"][k % 3] : "#14532d" });
    }
  } else if (season === "tet") {
    out.push(box(x + 0.3, y + 0.3, 0, 0.9, 0.9, 0.6, "#b91c1c", { top: "#7f1d1d" }));
    out.push(box(x + 0.68, y + 0.68, 0.6, 0.14, 0.14, 1.6, "#5b3a1e"));
    for (let k = 0; k < 16; k++) {
      out.push({ kind: "puff", x: x + 0.75 + (rnd(k) - 0.5) * 1.6, y: y + 0.75 + (rnd(k + 9) - 0.5) * 1.2, z: 1.6 + rnd(k + 3) * 0.9, w: 0, d: 0, h: 0, r: 0.08, color: k % 5 ? "#facc15" : "#f97316" });
    }
  }
}

function seasonWall(iso, season, t, motion, plan) {
  if (season === "noel") {
    const nx = Math.round(plan.W * 1.1), ny = Math.round(plan.D);
    for (let k = 0; k < nx + ny; k++) {
      const on = !motion || Math.sin(t * 3 + k) > -0.3;
      const c = ["#ef4444", "#22c55e", "#facc15", "#3b82f6"][k % 4];
      const z = 3.7 - Math.abs(Math.sin(k * 0.9)) * 0.15;
      if (k < nx) iso.dot((k + 0.5) * (plan.W / nx), 0.02, z, 0.06, on ? c : "#334155");
      else iso.dot(0.02, (k - nx + 0.5) * (plan.D / ny), z, 0.06, on ? c : "#334155");
    }
  } else if (season === "tet") {
    for (let a = 0.6; a < plan.W - 1; a += 4) {
      iso.panel({ plane: "back", c: 0.02, a: a + 0.45, b: 3.25, w: 0.03, h: 0.6, color: "#facc15" });
      iso.dot(a + 0.47, 0.3, 3.0, 0.24, "#dc2626");
    }
    iso.panel({ plane: "left", c: 0.02, a: 6.0, b: 0.9, w: 0.5, h: 2.4, color: "#dc2626" });
    iso.panel({ plane: "left", c: 0.02, a: 7.6, b: 0.9, w: 0.5, h: 2.4, color: "#dc2626" });
  }
}

// ---------------------------------------------------------------- hạt nền (mưa/bụi/tuyết) theo toạ độ màn hình
function particles(ctx, kind, cw, ch, t) {
  const n = kind === "rain" ? 0 : kind === "snow" ? 60 : kind === "dust" ? 24 : 0;
  for (let k = 0; k < n; k++) {
    const px = rnd(k) * cw + Math.sin(t * 0.7 + k) * 12;
    const speed = kind === "snow" ? 30 : 6;
    const py = (rnd(k + 50) * ch + t * speed * (0.6 + rnd(k + 9))) % ch;
    ctx.beginPath();
    ctx.arc(px, py, kind === "snow" ? 1.5 + rnd(k + 3) * 1.5 : 1, 0, Math.PI * 2);
    ctx.fillStyle = kind === "snow" ? "rgba(255,255,255,0.85)" : "rgba(255,236,200,0.35)";
    ctx.fill();
  }
}

function drawSpecial(sink, b) {
  if (b.kind === "orb") {
    sink.dot(b.x, b.y, b.z, b.r, b.color);
    sink.dot(b.x - 0.12, b.y, b.z + 0.12, b.r * 0.35, "rgba(255,255,255,0.35)");
    sink.ring(b.x, b.y, b.z, b.r * 1.8, 0.3 + Math.sin(b.ring) * 0.1, "#e0f2fe");
  } else {
    sink.dot(b.x, b.y, b.z, b.r, b.color || "rgba(255,255,255,0.55)");
  }
}

// ---------------------------------------------------------------- vào
// opts: {theme, season ("noel"|"tet"|"off"), scale (SCALES), layout (LAYOUTS), seats: [{key,label,state,task}], names,
//        npc (nhân viên minh hoạ), motion, t, zoom, pan {x,y}, focus (id phòng), focusSeat (chỉ số bàn), quality}
export function sceneOpts(opts) {
  return planFor(opts.scale || "team", opts.layout || "open");
}

// Dựng cảnh lên một "sink" có box/panel/dot/ring/tag — Iso (Canvas 2D) hoặc bộ thu của three-view.js (3D).
// Trả về {items, plan}. `sorted`: xếp painter (chỉ 2D cần).
export function compose(sink, opts, sorted = true) {
  const th = opts.theme;
  const { t = 0, motion = false, season = "off" } = opts;
  const plan = sceneOpts(opts);
  const zb = plan.levels ? plan.levels * plan.levelH : 0;
  const props = plan.props || th.props;
  if (plan.outdoor) drawGround(sink, plan);
  if (plan.levels) drawBuilding(sink, plan, th);
  const top = lift(sink, zb);
  drawRoom(top, th, plan);
  drawWindows(top, th, plan, t, motion);
  for (const p of props) flatProp(top, p, th, plan, t, motion);
  seasonWall(top, season, t, motion, plan);

  const items = [];
  const floorItems = [];
  for (const p of props) if (BOX_PROPS[p.kind]) BOX_PROPS[p.kind]({ ...p, iv: p.kind === "bed" && plan.props ? false : p.iv }, floorItems, th, t, motion);
  const heads = [];
  (opts.seats || []).slice(0, plan.desks.length).forEach((seat, i) => {
    const [x, y] = plan.desks[i];
    deskBoxes(th, x, y, seat, floorItems, t, motion);
    heads.push({ seat, at: person(th, x, y, i, seat, floorItems, t, motion, season) });
  });
  if (opts.npc !== false) {
    plan.extraDesks.forEach(([x, y], k) => {
      const npc = { state: "npc", label: "" };
      if (rnd(k * 7 + 3) > 0.15) { // cùng quy tắc với npcSeated
        deskBoxes(th, x, y, npc, floorItems, t, motion);
        person(th, x, y, k + 5, npc, floorItems, t, motion, season);
      } else deskBoxes(th, x, y, { state: "idle" }, floorItems, t, motion);
    });
  }
  seasonProps(season, floorItems, t, motion, plan.season);
  layoutWalls(plan.walls, th, floorItems);
  for (const b of floorItems) items.push({ ...b, z: b.z + zb });
  if (plan.outdoor) outdoorProps(plan, items);
  if (sorted) items.sort((a, b) => depth(a) - depth(b));
  for (const b of items) (b.kind ? drawSpecial(sink, b) : sink.box(b));

  const [bg, fg, border] = th.label;
  if (opts.names !== false) {
    for (const r of plan.rooms) top.tag(r.x + r.w / 2, r.y + r.d / 2, 3.4, r.name, "rgba(255,255,255,0.88)", "#1f2937", th.trim);
  }
  for (const { seat, at } of heads) {
    if (opts.names !== false) top.tag(at.x, at.y, at.z, seat.label, bg, fg, border);
    if (!QUIET.has(seat.state)) {
      const what = seat.task && seat.task.id ? seat.task.id + " · " : "";
      top.tag(at.x, at.y, at.z + 0.75, what + STATE_TEXT[seat.state], STATE_COLOR[seat.state], "#0b0f19");
    }
  }
  return { items: items.length, plan };
}

// Bàn phụ có nhân viên minh hoạ (cùng quy tắc với compose) — để bộ đếm của màn khớp đúng cảnh.
export function npcSeated(plan) {
  return plan.extraDesks.filter((_, k) => rnd(k * 7 + 3) > 0.15).length;
}

// Điểm góc của hộp nhìn (cho fitPoints 2D và camera 3D).
export function viewCorners(opts) {
  const plan = sceneOpts(opts);
  const v = viewBox(plan, opts.focus, opts.focusSeat);
  const pts = [];
  for (const x of [v.x0, v.x1]) for (const y of [v.y0, v.y1]) for (const z of [v.z0, v.z1]) pts.push([x, y, z]);
  return { pts, box: v, plan };
}

export function drawScene(ctx, cw, ch, opts) {
  const th = opts.theme;
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, cw, ch);
  const iso = new Iso(ctx, fitPoints(viewCorners(opts).pts, cw, ch, opts.zoom || 1, opts.pan));
  iso.glow = opts.quality !== "low";
  // Nhãn vẽ sau hạt nền (tuyết không che chữ): hoãn tag tới cuối.
  const tags = [];
  const tag = iso.tag.bind(iso);
  iso.tag = (...a) => tags.push(a);
  compose(iso, opts);
  if (opts.motion) particles(ctx, opts.season === "noel" ? "snow" : th.ambient, cw, ch, opts.t || 0);
  for (const a of tags) tag(...a);
}

// Mô tả văn bản của cảnh cho trình đọc màn hình (canvas role="img").
export function describe(seats, themeName, scaleName) {
  const busy = seats.filter((s) => !QUIET.has(s.state)).map((s) => s.label + " " + STATE_TEXT[s.state] + (s.task ? " " + s.task.id : ""));
  const unknown = seats.filter((s) => s.state === "untracked").map((s) => s.label);
  const tail = unknown.length ? " " + unknown.join(", ") + ": " + STATE_TEXT.untracked + "." : "";
  return "Văn phòng kiểu " + themeName + (scaleName ? ", quy mô " + scaleName : "") + ". " +
    (busy.length ? busy.join("; ") + "." : "Không agent nào đang làm.") + tail;
}
