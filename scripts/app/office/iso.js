// Bộ vẽ isometric tối giản trên Canvas 2D (không thư viện, CSP `script-src 'self'`): khối hộp trục thẳng, mặt phẳng trên
// tường/sàn, nhãn chữ. Thế giới: x sang phải-xuống, y sang trái-xuống, z lên; người xem nhìn từ phía +x +y.
const C = Math.cos(Math.PI / 6);
const S = 0.5;

export function shade(hex, f) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))));
  return "#" + ch.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export class Iso {
  constructor(ctx, view) {
    this.ctx = ctx;
    this.view = view; // {scale, ox, oy}
    this.glow = true;
    this.glowBoxes = true;
  }

  p(x, y, z) {
    const v = this.view;
    return [v.ox + (x - y) * C * v.scale, v.oy + ((x + y) * S - z) * v.scale];
  }

  poly(points, fill, stroke) {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Hộp {x,y,z,w,d,h,color,glow?,top?,front?,side?}: vẽ 3 mặt nhìn thấy (trên, +x, +y).
  box(b) {
    const { x, y, z, w, d, h } = b;
    const P = (a, c, e) => this.p(a, c, e);
    const ctx = this.ctx;
    const lit = this.glow && this.glowBoxes && b.glow;
    if (lit) {
      ctx.save();
      ctx.shadowColor = b.glow;
      ctx.shadowBlur = 14;
    }
    this.poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], b.side || shade(b.color, -0.18));
    this.poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], b.front || shade(b.color, -0.32));
    this.poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], b.top || shade(b.color, 0.12));
    if (lit) ctx.restore();
  }

  // Mặt phẳng: plane "back" (y = c, trục x/z), "left" (x = c, trục y/z), "floor" (z = c, trục x/y).
  panel(f) {
    const { plane, c, a, b, w, h } = f;
    let pts;
    if (plane === "back") pts = [this.p(a, c, b), this.p(a + w, c, b), this.p(a + w, c, b + h), this.p(a, c, b + h)];
    else if (plane === "left") pts = [this.p(c, a, b), this.p(c, a + w, b), this.p(c, a + w, b + h), this.p(c, a, b + h)];
    else pts = [this.p(a, b, c), this.p(a + w, b, c), this.p(a + w, b + h, c), this.p(a, b + h, c)];
    const ctx = this.ctx;
    const lit = this.glow && f.glow;
    if (lit) {
      ctx.save();
      ctx.shadowColor = f.glow;
      ctx.shadowBlur = 16;
    }
    this.poly(pts, f.color, f.stroke);
    if (lit) ctx.restore();
  }

  // Nhãn bo góc ở điểm thế giới (x,y,z), neo đáy-giữa.
  // `kind` (agent/state/room) chỉ dùng cho bộ vẽ 3D (thuộc tính data-kind của nhãn HTML) — 2D bỏ qua.
  tag(x, y, z, text, bg, fg, border) {
    const ctx = this.ctx;
    const [sx, sy] = this.p(x, y, z);
    const size = Math.max(10, Math.round(this.view.scale * 0.42));
    ctx.font = "600 " + size + "px system-ui, sans-serif";
    const tw = ctx.measureText(text).width;
    const pw = tw + size, ph = size * 1.6;
    const left = sx - pw / 2, top = sy - ph;
    ctx.beginPath();
    ctx.roundRect(left, top, pw, ph, size * 0.5);
    ctx.fillStyle = bg;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, sx, top + ph / 2 + 1);
  }

  // Vòng elip (vành hành tinh) quanh điểm thế giới, bán kính r theo đơn vị thế giới.
  ring(x, y, z, r, tilt, color) {
    const [sx, sy] = this.p(x, y, z);
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * this.view.scale, r * 0.28 * this.view.scale, tilt, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  dot(x, y, z, r, color) {
    const [sx, sy] = this.p(x, y, z);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(0.6, r * this.view.scale), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// Thứ tự vẽ (painter): xa trước gần sau theo tâm x+y, rồi đáy z.
export function depth(b) {
  return (b.x + b.w / 2) + (b.y + b.d / 2) + b.z * 0.01 + (b.bias || 0);
}

// Tỉ lệ + gốc để mọi điểm thế giới `pts` ([x,y,z]) vừa khung cw×ch, rồi nhân `zoom` quanh tâm và dời `pan` (px).
export function fitPoints(pts, cw, ch, zoom = 1, pan) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y, z] of pts) {
    const sx = (x - y) * C, sy = (x + y) * S - z;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  const scale = Math.min((cw - 24) / Math.max(1, x1 - x0), (ch - 48) / Math.max(1, y1 - y0)) * zoom;
  const p = pan || { x: 0, y: 0 };
  return { scale, ox: cw / 2 - ((x0 + x1) / 2) * scale + p.x, oy: ch / 2 - ((y0 + y1) / 2) * scale + 14 + p.y };
}

// Tỉ lệ + gốc để phòng W×D×H vừa khung (cw×ch px), chừa lề trên cho nhãn.
export function fit(W, D, H, cw, ch, zoom = 1) {
  const spanX = (W + D) * C;
  const spanY = (W + D) * S + H;
  const scale = Math.min(cw / (spanX + 1), (ch - 24) / (spanY + 1.2)) * zoom;
  const ox = cw / 2 - ((W - D) * C * scale) / 2;
  const oy = (ch - (W + D) * S * scale - H * scale) / 2 + H * scale + 12;
  return { scale, ox, oy };
}
