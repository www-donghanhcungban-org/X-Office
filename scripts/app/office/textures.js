// Bộ sinh vân bề mặt (procedural CanvasTexture) cho 3D three.js — chỉ dùng Canvas 2D thuần, không tải ảnh ngoài.
// Mọi vân sinh ở dải sáng cao (0.72–1.0) để nhân với `mat.color` giữ đúng bảng màu của từng kiểu văn phòng.

function rnd(i) {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function makeCanvas(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")];
}

function drawGrass(ctx, s) {
  ctx.fillStyle = "#e8f0e2";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 950; i++) {
    const x = rnd(i * 3) * s, y = rnd(i * 5 + 1) * s;
    const h = 4 + rnd(i * 7) * 8;
    const tilt = (rnd(i * 11) - 0.5) * 3;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,255,255,0.45)" : i % 2 ? "rgba(170,195,155,0.42)" : "rgba(140,175,130,0.35)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tilt, y - h);
    ctx.stroke();
  }
  for (let i = 0; i < 45; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(rnd(i * 19 + 7) * s, rnd(i * 23 + 3) * s, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWood(ctx, s) {
  ctx.fillStyle = "#f2eae0";
  ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 32) {
    ctx.fillStyle = y % 64 === 0 ? "rgba(220,205,185,0.35)" : "rgba(255,250,242,0.28)";
    ctx.fillRect(0, y, s, 32);
    ctx.fillStyle = "rgba(145,120,95,0.35)";
    ctx.fillRect(0, y, s, 1.2);
  }
  for (let i = 0; i < 140; i++) {
    const y = rnd(i * 13) * s;
    ctx.strokeStyle = i % 2 ? "rgba(165,135,105,0.24)" : "rgba(255,252,246,0.32)";
    ctx.lineWidth = 0.8 + rnd(i * 7) * 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(s * 0.33, y + (rnd(i + 1) - 0.5) * 6, s * 0.66, y + (rnd(i + 2) - 0.5) * 6, s, y);
    ctx.stroke();
  }
}

function drawBark(ctx, s) {
  ctx.fillStyle = "#d8cfc6";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 160; i++) {
    const x = rnd(i * 7) * s;
    const w = 1.5 + rnd(i * 11) * 3.5;
    ctx.fillStyle = i % 3 === 0 ? "rgba(105,85,70,0.36)" : i % 2 ? "rgba(145,125,105,0.28)" : "rgba(255,248,240,0.25)";
    ctx.fillRect(x, 0, w, s);
  }
  for (let i = 0; i < 90; i++) {
    const x = rnd(i * 17) * s, y = rnd(i * 19) * s;
    ctx.fillStyle = "rgba(90,72,58,0.28)";
    ctx.fillRect(x, y, 3 + rnd(i) * 8, 2);
  }
}

function drawFoliage(ctx, s) {
  ctx.fillStyle = "#dce6d8";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 420; i++) {
    const x = rnd(i * 5) * s, y = rnd(i * 9 + 2) * s;
    const rx = 4 + rnd(i * 3) * 7, ry = 2.5 + rnd(i * 7) * 4.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd(i * 13) * Math.PI);
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.45)" : i % 2 ? "rgba(155,180,148,0.42)" : "rgba(120,150,115,0.36)";
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStone(ctx, s) {
  ctx.fillStyle = "#eae8e4";
  ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 64) {
    for (let x = 0; x < s; x += 64) {
      const off = (y / 64) % 2 ? 32 : 0;
      ctx.strokeStyle = "rgba(150,148,144,0.38)";
      ctx.lineWidth = 2;
      ctx.strokeRect((x + off) % s, y, 64, 64);
    }
  }
  for (let i = 0; i < 450; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.38)" : "rgba(150,148,144,0.26)";
    ctx.fillRect(rnd(i * 5) * s, rnd(i * 11) * s, 2, 2);
  }
}

function drawWater(ctx, s) {
  ctx.fillStyle = "#dff4fc";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 48; i++) {
    const x = rnd(i * 7) * s, y = rnd(i * 13) * s;
    const r = 14 + rnd(i * 5) * 26;
    ctx.strokeStyle = i % 2 ? "rgba(255,255,255,0.52)" : "rgba(165,220,245,0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.45, rnd(i) * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFabric(ctx, s) {
  ctx.fillStyle = "#f2f2f4";
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "rgba(180,184,194,0.24)";
  for (let i = 0; i < s; i += 4) {
    ctx.fillRect(i, 0, 1, s);
    ctx.fillRect(0, i, s, 1);
  }
}

function drawHair(ctx, s) {
  ctx.fillStyle = "#e6e2de";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 220; i++) {
    const x = rnd(i * 7) * s;
    ctx.strokeStyle = i % 2 ? "rgba(255,255,255,0.32)" : "rgba(120,110,100,0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rnd(i) - 0.5) * 8, s);
    ctx.stroke();
  }
}

function drawScreen(ctx, s) {
  ctx.fillStyle = "#b8c4d4";
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(0, 0, 42, s);
  ctx.fillRect(0, 0, s, 20);
  for (let i = 0; i < 18; i++) {
    const w = 36 + rnd(i * 7) * 140;
    ctx.fillStyle = i % 4 === 0 ? "#ffffff" : i % 3 === 0 ? "#e2e8f0" : "#cbd5e1";
    ctx.fillRect(54, 34 + i * 11, w, 5);
  }
}

const PAINTERS = {
  grass: [drawGrass, 6],
  wood: [drawWood, 2],
  bark: [drawBark, 2],
  foliage: [drawFoliage, 2],
  stone: [drawStone, 3],
  water: [drawWater, 2],
  fabric: [drawFabric, 3],
  hair: [drawHair, 2],
  screen: [drawScreen, 1],
};

export function createTextureBank(THREE) {
  const cache = new Map();
  const skies = new Map();
  function get(kind) {
    if (!kind || !PAINTERS[kind]) return null;
    if (cache.has(kind)) return cache.get(kind);
    const [paint, repeat] = PAINTERS[kind];
    const [canvas, ctx] = makeCanvas(256);
    paint(ctx, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    cache.set(kind, tex);
    return tex;
  }
  function sky(bgHex, glowHex, dark) {
    const key = (bgHex || "") + "|" + (glowHex || "") + "|" + (dark ? 1 : 0);
    if (skies.has(key)) return skies.get(key);
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bgHex || "#0b1020";
    ctx.fillRect(0, 0, 4, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    if (dark) {
      g.addColorStop(0, "rgba(0,0,0,0.35)");
      g.addColorStop(0.55, "rgba(0,0,0,0)");
      g.addColorStop(1, glowHex || "#3b82f6");
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(0, 0, 4, 256);
    } else {
      g.addColorStop(0, "#bcdaf7");
      g.addColorStop(0.55, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,0.28)");
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(0, 0, 4, 256);
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    skies.set(key, tex);
    return tex;
  }
  return {
    get,
    sky,
    animate(dt) {
      const w = cache.get("water");
      if (w) {
        w.offset.x = (w.offset.x + dt * 0.04) % 1;
        w.offset.y = (w.offset.y + dt * 0.025) % 1;
      }
    },
    dispose() {
      for (const tex of cache.values()) tex.dispose();
      for (const tex of skies.values()) tex.dispose();
      cache.clear();
      skies.clear();
    },
  };
}
