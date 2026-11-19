// Dựng + vẽ văn phòng từ (kiểu, mùa, dữ liệu /api/office). Không trạng thái toàn cục: gọi drawScene mỗi khung hình.
import { Iso, depth, fit, shade } from "./iso.js";

export const ROOM = { W: 16, D: 12, H: 4 };
const DESKS = [[1.2, 1.2], [5.2, 1.2], [9.2, 1.2], [1.2, 6.2], [5.2, 6.2]];
const SKIN = ["#f2c6a0", "#e0ac69", "#c68642", "#f1c27d", "#8d5524"];
const HAIR = ["#2d1b12", "#6b3e26", "#111827", "#b45309", "#4b5563"];
const SHIRT = ["#2563eb", "#16a34a", "#9333ea", "#dc2626", "#0d9488"];
export const STATE_TEXT = { work: "đang làm", fail: "đang sửa (đỏ)", wait: "cần người", done: "xong", idle: "rảnh", untracked: "chưa có tín hiệu" };
const STATE_COLOR = { work: "#22c55e", fail: "#ef4444", wait: "#f59e0b", done: "#38bdf8", idle: "#94a3b8", untracked: "#94a3b8" };
const QUIET = new Set(["idle", "untracked"]); // không bong bóng, màn hình tắt

// Số giả ngẫu nhiên ổn định theo chỉ số (cửa sổ toà nhà, sao) — khung hình nào cũng như nhau.
function rnd(i) {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function box(x, y, z, w, d, h, color, extra) {
  return { x, y, z, w, d, h, color, ...(extra || {}) };
}

// ---------------------------------------------------------------- phòng: tường, sàn, cửa sổ
function drawRoom(iso, th) {
  const { W, D, H } = ROOM;
  iso.box(box(-0.3, -0.3, 0, 0.3, D + 0.3, H, th.wall, { side: shade(th.wall, -0.08), top: shade(th.wall, -0.2) }));
  iso.box(box(0, -0.3, 0, W, 0.3, H, th.wall, { front: th.wall, top: shade(th.wall, -0.2) }));
  for (let i = 0; i < W; i++) {
    for (let j = 0; j < D; j++) {
      iso.panel({ plane: "floor", c: 0, a: i, b: j, w: 1, h: 1, color: th.floor[(i + j) % 2] });
    }
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
    for (let k = 0; k < 6; k++) {
      const bw = w / 6, bh = 0.5 + rnd(a * 10 + k) * 1.3;
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
    if (a < 3) iso.dot(a + w * 0.65, c, b + h * 0.6, 0.45, "#f59e0b");
    if (a < 3) iso.dot(a + w * 0.6, c, b + h * 0.66, 0.36, "#fbbf24");
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

function drawWindows(iso, th, t, motion) {
  for (const a of [1.2, 5.2, 9.2]) windowContent(iso, th, a, 2.8, t, motion);
  iso.panel({ plane: "left", c: 0.01, a: 2.2, b: 1.2, w: 2.6, h: 2.2, color: th.trim, glow: th.edge });
  iso.panel({ plane: "left", c: 0.02, a: 2.3, b: 1.3, w: 2.4, h: 2.0, color: (WINDOW_SKY[th.window] || WINDOW_SKY.sky)[0] });
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
  out.push(box(p.x - 0.35, p.y + 0.2, 0, 0.08, 0.08, 1.9, "#9ca3af"));
  out.push(box(p.x - 0.45, p.y + 0.12, 1.55, 0.26, 0.2, 0.32, "#e0f2fe", { glow: th.glow }));
}

const BOX_PROPS = { plant, shelf, sofa, lamp, rack, counter, cafetable, console: consoleDesk, holo, cooler, bed };

function flatProp(iso, p, th) {
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
    iso.panel({ plane: "back", c: 0.02, a: 0, b: 3.55, w: ROOM.W, h: 0.14, color: shade(th.wall, 0.25) });
    iso.panel({ plane: "left", c: 0.02, a: 0, b: 3.55, w: ROOM.D, h: 0.14, color: shade(th.wall, 0.25) });
  }
}

// ---------------------------------------------------------------- bàn + nhân vật
function deskBoxes(th, x, y, seat, out, t, motion) {
  out.push(box(x, y, 0.72, 2.8, 1.1, 0.1, th.desk, { glow: th.edge ? th.edge : null }));
  for (const [dx, dy] of [[0.1, 0.1], [2.6, 0.1], [0.1, 0.9], [2.6, 0.9]]) out.push(box(x + dx, y + dy, 0, 0.1, 0.1, 0.72, th.leg));
  const lit = QUIET.has(seat.state) ? shade(th.screen, 0.1) : STATE_COLOR[seat.state];
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
  const bob = motion && seat.state === "work" ? Math.sin(t * 6 + i) * 0.03 : 0;
  out.push(box(cx - 0.1, cy - 0.05, 0.42, 1.1, 0.9, 0.1, th.chair));
  const bx = cx + shake, bz = 0.52 + jump;
  out.push(box(bx, cy, bz, 0.9, 0.6, 0.65, SHIRT[i % 5], { bias: 0.02 }));
  out.push(box(bx + 0.1, cy + 0.05, bz + 0.65 + bob, 0.7, 0.55, 0.55, SKIN[i % 5], { bias: 0.03 }));
  out.push(box(bx + 0.08, cy + 0.1, bz + 1.05 + bob, 0.74, 0.55, 0.2, HAIR[i % 5], { bias: 0.04 }));
  if (seat.state === "wait") {
    out.push(box(bx + 0.78, cy + 0.2, bz + 0.6, 0.18, 0.18, 1.0 + (motion ? Math.sin(t * 5) * 0.08 : 0), SKIN[i % 5], { bias: 0.05 }));
  } else {
    const arm = motion && seat.state === "work" ? Math.sin(t * 12 + i) * 0.04 : 0;
    out.push(box(bx - 0.15, cy - 0.15, bz + 0.25 + arm, 0.16, 0.5, 0.16, SHIRT[i % 5], { bias: 0.01 }));
    out.push(box(bx + 0.89, cy - 0.15, bz + 0.25 - arm, 0.16, 0.5, 0.16, SHIRT[i % 5], { bias: 0.01 }));
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
// [trục, vị trí, từ, đến, [cửa: [từ, đến]…]] — trục "x": vách chạy dọc x tại y = vị trí; "y": chạy dọc y tại x = vị trí.
const WALLS = {
  open: [],
  connected: [
    ["x", 5.2, 0, ROOM.W, [[1.8, 3.6], [10.2, 12.0]]],
    ["y", 8.6, 0, ROOM.D, [[2.2, 3.8], [8.2, 9.8]]],
  ],
  private: [
    ["x", 5.2, 0, 12.6, [[0.6, 1.4], [6.8, 7.6], [10.8, 11.6]]],
    ["y", 4.6, 0, 11.0, [[5.6, 6.0]]],
    ["y", 8.6, 0, 11.0, [[5.6, 6.0]]],
    ["y", 12.6, 0, 5.2, []],
  ],
};

function layoutWalls(layout, th, out) {
  const glass = th.edge ? "rgba(120,200,255,0.18)" : "rgba(190,225,245,0.32)";
  for (const [axis, at, from, to, doors] of WALLS[layout] || []) {
    for (let u = from; u < to - 1e-6; u = Math.min(to, u + 1)) {
      const v = Math.min(to, u + 1);
      const mid = (u + v) / 2;
      if (doors.some(([a, b]) => mid > a && mid < b)) continue;
      const seg = (z, h, color, extra) =>
        out.push(axis === "x" ? box(u, at - T / 2, z, v - u, T, h, color, extra) : box(at - T / 2, u, z, T, v - u, h, color, extra));
      seg(0, 1.0, th.wall, { top: th.trim });
      seg(1.0, 1.15, glass, { top: glass, front: glass, side: glass });
      seg(2.15, 0.08, th.trim, { glow: th.edge || null });
    }
  }
}

// ---------------------------------------------------------------- mùa
function seasonProps(season, out, t, motion) {
  if (season === "noel") {
    const x = 9.0, y = 7.6;
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
    const x = 9.0, y = 7.6;
    out.push(box(x + 0.3, y + 0.3, 0, 0.9, 0.9, 0.6, "#b91c1c", { top: "#7f1d1d" }));
    out.push(box(x + 0.68, y + 0.68, 0.6, 0.14, 0.14, 1.6, "#5b3a1e"));
    for (let k = 0; k < 16; k++) {
      out.push({ kind: "puff", x: x + 0.75 + (rnd(k) - 0.5) * 1.6, y: y + 0.75 + (rnd(k + 9) - 0.5) * 1.2, z: 1.6 + rnd(k + 3) * 0.9, w: 0, d: 0, h: 0, r: 0.08, color: k % 5 ? "#facc15" : "#f97316" });
    }
  }
}

function seasonWall(iso, season, t, motion) {
  if (season === "noel") {
    for (let k = 0; k < 30; k++) {
      const on = !motion || Math.sin(t * 3 + k) > -0.3;
      const c = ["#ef4444", "#22c55e", "#facc15", "#3b82f6"][k % 4];
      if (k < 18) iso.dot((k + 0.5) * (ROOM.W / 18), 0.02, 3.7 - Math.abs(Math.sin(k * 0.9)) * 0.15, 0.06, on ? c : "#334155");
      else iso.dot(0.02, (k - 17.5) * (ROOM.D / 12), 3.7 - Math.abs(Math.sin(k * 0.9)) * 0.15, 0.06, on ? c : "#334155");
    }
  } else if (season === "tet") {
    for (const a of [0.6, 4.6, 8.6, 12.6]) {
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
// opts: {theme, season ("noel"|"tet"|"off"), layout (LAYOUTS), seats: [{key,label,state,task}], names, motion, t, zoom, quality}
// Dựng cảnh lên một "sink" có box/panel/dot/ring/tag — Iso (Canvas 2D) hoặc bộ thu của three-view.js (3D).
// Trả về số hộp đã phát (để test/đo). `sorted`: xếp painter (chỉ 2D cần).
export function compose(sink, opts, sorted = true) {
  const th = opts.theme;
  const { t = 0, motion = false, season = "off" } = opts;
  drawRoom(sink, th);
  drawWindows(sink, th, t, motion);
  for (const p of th.props) flatProp(sink, p, th);
  seasonWall(sink, season, t, motion);

  const items = [];
  for (const p of th.props) if (BOX_PROPS[p.kind]) BOX_PROPS[p.kind](p, items, th, t, motion);
  const heads = [];
  (opts.seats || []).slice(0, DESKS.length).forEach((seat, i) => {
    const [x, y] = DESKS[i];
    deskBoxes(th, x, y, seat, items, t, motion);
    heads.push({ seat, at: person(th, x, y, i, seat, items, t, motion, season) });
  });
  seasonProps(season, items, t, motion);
  layoutWalls(opts.layout || "open", th, items);
  if (sorted) items.sort((a, b) => depth(a) - depth(b));
  for (const b of items) (b.kind ? drawSpecial(sink, b) : sink.box(b));

  const [bg, fg, border] = th.label;
  for (const { seat, at } of heads) {
    if (opts.names !== false) sink.tag(at.x, at.y, at.z, seat.label, bg, fg, border);
    if (!QUIET.has(seat.state)) {
      const what = seat.task && seat.task.id ? seat.task.id + " · " : "";
      sink.tag(at.x, at.y, at.z + 0.75, what + STATE_TEXT[seat.state], STATE_COLOR[seat.state], "#0b0f19");
    }
  }
  return items.length;
}

// opts: {theme, season ("noel"|"tet"|"off"), layout (LAYOUTS), seats: [{key,label,state,task}], names, motion, t, zoom, quality}
export function drawScene(ctx, cw, ch, opts) {
  const th = opts.theme;
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, cw, ch);
  const iso = new Iso(ctx, fit(ROOM.W, ROOM.D, ROOM.H, cw, ch, opts.zoom || 1));
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
export function describe(seats, themeName) {
  const busy = seats.filter((s) => !QUIET.has(s.state)).map((s) => s.label + " " + STATE_TEXT[s.state] + (s.task ? " " + s.task.id : ""));
  return "Văn phòng kiểu " + themeName + ". " + (busy.length ? busy.join("; ") + "." : "Mọi người đang rảnh.");
}
