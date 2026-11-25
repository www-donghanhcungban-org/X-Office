// Bộ sinh & nạp vân PBR đầy đủ: kết hợp 7 bộ vân chụp quét thật 512px (Poly Haven CC0: Diffuse + Normal OpenGL + Roughness)
// cùng 3 bản đồ ánh sáng 360° HDRI thật (day/sunset/night qua rgbe.js → PMREMGenerator), có lớp dự phòng thủ tục tức thì.
import { decodeRGBE } from "./rgbe.js";

const PHOTO_PBR = new Set(["wood", "tileFloor", "grass", "bark", "stone", "fabric", "road"]);
const ASSET_BASE = "/vendor/three/assets/";

function rnd(i) {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function makeCanvas(w = 512, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

// Chuyển đổi bản đồ độ cao/sắc độ thành Tangent-Space Normal Map (lọc Sobel 3×3)
function buildNormalCanvas(srcCanvas, strength = 2.2) {
  const w = Math.min(256, srcCanvas.width), h = Math.min(256, srcCanvas.height);
  const [tmp, tctx] = makeCanvas(w, h);
  tctx.drawImage(srcCanvas, 0, 0, w, h);
  const src = tctx.getImageData(0, 0, w, h).data;
  const [out, octx] = makeCanvas(w, h);
  const dst = octx.createImageData(w, h);
  const d = dst.data;
  const lum = (x, y) => {
    const ix = ((x % w) + w) % w, iy = ((y % h) + h) % h;
    const p = (iy * w + ix) * 4;
    return (src[p] * 0.299 + src[p + 1] * 0.587 + src[p + 2] * 0.114) / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = lum(x - 1, y - 1), tc = lum(x, y - 1), tr = lum(x + 1, y - 1);
      const ml = lum(x - 1, y), mr = lum(x + 1, y);
      const bl = lum(x - 1, y + 1), bc = lum(x, y + 1), br = lum(x + 1, y + 1);
      const dx = (tr + 2 * mr + br - tl - 2 * ml - bl) * strength;
      const dy = (bl + 2 * bc + br - tl - 2 * tc - tr) * strength;
      const dz = 1.0;
      const inv = 1 / Math.hypot(dx, dy, dz);
      const p = (y * w + x) * 4;
      d[p] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      d[p + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      d[p + 2] = Math.round((dz * inv * 0.5 + 0.5) * 255);
      d[p + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

function drawGrass(ctx, s) {
  ctx.fillStyle = "#cde0be";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 800; i++) {
    const x = rnd(i * 13) * s, y = rnd(i * 17) * s, r = 5 + rnd(i * 19) * 20;
    ctx.fillStyle = i % 3 === 0 ? "rgba(175,204,158,0.24)" : i % 2 ? "rgba(245,252,235,0.18)" : "rgba(130,168,118,0.18)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 3400; i++) {
    const x = rnd(i * 3) * s, y = rnd(i * 5 + 1) * s;
    const h = 5 + rnd(i * 7) * 13;
    const tilt = (rnd(i * 11) - 0.5) * 6;
    ctx.strokeStyle = i % 5 === 0 ? "rgba(255,255,244,0.45)" : i % 2 ? "rgba(132,172,118,0.46)" : "rgba(96,138,88,0.4)";
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + tilt * 0.5, y - h * 0.5, x + tilt, y - h);
    ctx.stroke();
  }
  for (let i = 0; i < 65; i++) {
    ctx.fillStyle = i % 3 ? "rgba(255,252,235,0.65)" : "rgba(254,240,138,0.58)";
    ctx.beginPath();
    ctx.arc(rnd(i * 29 + 7) * s, rnd(i * 31 + 3) * s, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWood(ctx, s) {
  ctx.fillStyle = "#f2e8dc";
  ctx.fillRect(0, 0, s, s);
  const plankH = 64;
  for (let y = 0; y < s; y += plankH) {
    const tone = (y / plankH) % 4;
    ctx.fillStyle = tone === 0 ? "rgba(226,208,186,0.38)" : tone === 1 ? "rgba(255,250,242,0.35)" : tone === 2 ? "rgba(212,192,168,0.32)" : "rgba(238,224,206,0.28)";
    ctx.fillRect(0, y, s, plankH);
    ctx.fillStyle = "rgba(115,88,64,0.52)";
    ctx.fillRect(0, y, s, 2.0);
    const joint = ((y / plankH) * 173 + 90) % s;
    ctx.fillRect(joint, y, 2.0, plankH);
  }
  for (let i = 0; i < 360; i++) {
    const y = rnd(i * 13) * s;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(136,102,72,0.25)" : i % 2 ? "rgba(168,136,104,0.2)" : "rgba(255,252,246,0.38)";
    ctx.lineWidth = 0.7 + rnd(i * 7) * 1.9;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(s * 0.33, y + (rnd(i + 1) - 0.5) * 10, s * 0.66, y + (rnd(i + 2) - 0.5) * 10, s, y);
    ctx.stroke();
  }
  for (let k = 0; k < 6; k++) {
    const kx = rnd(k * 41 + 5) * s, ky = rnd(k * 53 + 2) * s;
    ctx.strokeStyle = "rgba(118,86,58,0.3)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 15, 5.5, 0.1, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawWoodRough(ctx, s) {
  ctx.fillStyle = "#626262"; // độ nhám satin cho ván gỗ sơn bóng mờ (~0.38)
  ctx.fillRect(0, 0, s, s);
  const plankH = 64;
  for (let y = 0; y < s; y += plankH) {
    const v = 84 + Math.round(rnd(y * 7) * 28);
    ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
    ctx.fillRect(0, y + 2, s, plankH - 2);
    ctx.fillStyle = "#e0e0e0"; // rãnh ghép ván nhám mờ
    ctx.fillRect(0, y, s, 2.5);
    const joint = ((y / plankH) * 173 + 90) % s;
    ctx.fillRect(joint, y, 2.5, plankH);
  }
  for (let i = 0; i < 200; i++) {
    ctx.strokeStyle = i % 2 ? "rgba(150,150,150,0.25)" : "rgba(65,65,65,0.22)";
    ctx.lineWidth = 1.2;
    const y = rnd(i * 19) * s;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y + (rnd(i) - 0.5) * 6);
    ctx.stroke();
  }
}

function drawBark(ctx, s) {
  ctx.fillStyle = "#c4b8aa";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 340; i++) {
    const x = rnd(i * 7) * s;
    const w = 2 + rnd(i * 11) * 7;
    ctx.fillStyle = i % 4 === 0 ? "rgba(64,48,36,0.52)" : i % 2 ? "rgba(116,94,76,0.36)" : "rgba(255,248,238,0.3)";
    ctx.fillRect(x, 0, w, s);
  }
  for (let i = 0; i < 240; i++) {
    const x = rnd(i * 17) * s, y = rnd(i * 19) * s;
    ctx.fillStyle = i % 3 === 0 ? "rgba(58,44,32,0.42)" : "rgba(150,166,136,0.24)";
    ctx.fillRect(x, y, 5 + rnd(i) * 16, 3);
  }
}

function drawFoliage(ctx, s) {
  ctx.fillStyle = "#c4d8bc";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 1200; i++) {
    const x = rnd(i * 5) * s, y = rnd(i * 9 + 2) * s;
    const rx = 6 + rnd(i * 3) * 12, ry = 3 + rnd(i * 7) * 6.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd(i * 13) * Math.PI);
    ctx.fillStyle = i % 4 === 0 ? "rgba(255,255,242,0.55)" : i % 3 === 0 ? "rgba(142,178,132,0.48)" : "rgba(92,130,86,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(240,252,232,0.34)";
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.72, 0);
    ctx.lineTo(rx * 0.72, 0);
    ctx.stroke();
    ctx.restore();
  }
}

// Chùm lá tách nền (alpha cutout) cho tán cây tự nhiên, có gân lá và ánh sáng lọt khe
function drawLeafCluster(ctx, s) {
  ctx.clearRect(0, 0, s, s);
  const cx = s / 2, cy = s / 2;
  for (let i = 0; i < 34; i++) {
    const a = i * 2.39996;
    const rad = Math.sqrt(i / 34) * (s * 0.36);
    const lx = cx + Math.cos(a) * rad + (rnd(i * 7) - 0.5) * 10;
    const ly = cy + Math.sin(a) * rad + (rnd(i * 11) - 0.5) * 10;
    const len = 24 + rnd(i * 5) * 20;
    const wid = len * 0.44;
    const rot = a + (rnd(i * 13) - 0.5) * 0.7;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    const shadeVal = Math.round(188 + (i / 34) * 65 - rnd(i * 3) * 24);
    ctx.fillStyle = "rgb(" + Math.min(255, shadeVal - 8) + "," + Math.min(255, shadeVal + 4) + "," + Math.min(255, shadeVal - 14) + ")";
    ctx.beginPath();
    ctx.moveTo(-len * 0.45, 0);
    ctx.quadraticCurveTo(0, -wid, len * 0.55, 0);
    ctx.quadraticCurveTo(0, wid, -len * 0.45, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,245,0.42)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-len * 0.38, 0);
    ctx.lineTo(len * 0.46, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawStone(ctx, s) {
  ctx.fillStyle = "#e6e4de";
  ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 64) {
    for (let x = 0; x < s; x += 64) {
      const off = (y / 64) % 2 ? 32 : 0;
      const tone = rnd(x * 7 + y * 13);
      ctx.fillStyle = tone > 0.6 ? "rgba(255,254,250,0.3)" : tone > 0.3 ? "rgba(218,214,208,0.22)" : "rgba(182,178,170,0.26)";
      ctx.fillRect((x + off) % s, y, 62, 62);
      ctx.strokeStyle = "rgba(122,118,112,0.52)";
      ctx.lineWidth = 2.8;
      ctx.strokeRect((x + off) % s, y, 64, 64);
    }
  }
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.44)" : "rgba(120,118,114,0.32)";
    ctx.fillRect(rnd(i * 5) * s, rnd(i * 11) * s, 2.2, 2.2);
  }
}

function drawWater(ctx, s) {
  ctx.fillStyle = "#9ad8f0";
  ctx.fillRect(0, 0, s, s);
  // Trường sóng giao thoa mượt làm bản đồ độ cao + normal map mặt nước lấp lánh
  for (let i = 0; i < 150; i++) {
    const x = rnd(i * 7) * s, y = rnd(i * 13) * s;
    const rx = 20 + rnd(i * 5) * 48, ry = rx * (0.38 + rnd(i * 3) * 0.25);
    const g = ctx.createRadialGradient(x, y, 2, x, y, rx);
    g.addColorStop(0, "rgba(255,255,255,0.34)");
    g.addColorStop(0.55, "rgba(175,232,252,0.22)");
    g.addColorStop(1, "rgba(120,196,232,0)");
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd(i) * 1.2);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Ánh sáng tụ thủy (underwater caustics) lấp lánh dưới đáy hồ bơi
function drawCaustics(ctx, s) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 95; i++) {
    const x = rnd(i * 11) * s, y = rnd(i * 17) * s;
    const r = 16 + rnd(i * 5) * 32;
    ctx.strokeStyle = i % 2 ? "rgba(165,243,252,0.42)" : "rgba(224,242,254,0.35)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, rnd(i * 3) * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPoolTile(ctx, s) {
  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(0, 0, s, s);
  const step = 32;
  for (let y = 0; y < s; y += step) {
    for (let x = 0; x < s; x += step) {
      const shade = rnd(x * 3 + y * 11);
      ctx.fillStyle = shade > 0.7 ? "#7dd3fc" : shade > 0.35 ? "#38bdf8" : "#0284c7";
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.52)";
  ctx.lineWidth = 2.2;
  for (let i = 0; i <= s; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
  }
}

function drawFabric(ctx, s) {
  ctx.fillStyle = "#f0f1f4";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < s; i += 4) {
    ctx.fillStyle = i % 8 === 0 ? "rgba(162,168,180,0.32)" : "rgba(255,255,255,0.24)";
    ctx.fillRect(i, 0, 1.5, s);
    ctx.fillRect(0, i, s, 1.5);
  }
}

function drawTowel(ctx, s) {
  const stripes = 8;
  const w = s / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? "#ffffff" : "#0284c7";
    ctx.fillRect(i * w, 0, w + 1, s);
  }
  for (let i = 0; i < s; i += 6) {
    ctx.fillStyle = "rgba(200,210,220,0.16)";
    ctx.fillRect(0, i, s, 1.5);
  }
}

function drawPlaster(ctx, s) {
  ctx.fillStyle = "#f4f4f6";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.34)" : "rgba(174,178,188,0.18)";
    ctx.fillRect(rnd(i * 3) * s, rnd(i * 7) * s, 3, 3);
  }
}

function drawTileFloor(ctx, s) {
  ctx.fillStyle = "#eef1f5";
  ctx.fillRect(0, 0, s, s);
  const step = 128;
  for (let y = 0; y < s; y += step) {
    for (let x = 0; x < s; x += step) {
      ctx.fillStyle = ((x + y) / step) % 2 ? "rgba(255,255,255,0.26)" : "rgba(196,205,218,0.18)";
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      // Vân đá cẩm thạch mảnh nhẹ trên bề mặt gạch men
      ctx.strokeStyle = "rgba(170,180,196,0.16)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 20 + rnd(x + y) * 60);
      ctx.bezierCurveTo(x + 50, y + 40, x + 80, y + 90, x + step - 10, y + 70 + rnd(x * 3 + y) * 40);
      ctx.stroke();
      ctx.strokeStyle = "rgba(138,148,162,0.44)";
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x, y, step, step);
    }
  }
}

function drawTileRough(ctx, s) {
  ctx.fillStyle = "#484848"; // mặt gạch men bóng nhẹ (~0.28) phản xạ IBL
  ctx.fillRect(0, 0, s, s);
  const step = 128;
  ctx.strokeStyle = "#e6e6e6"; // đường ron gạch nhám mờ (~0.90)
  ctx.lineWidth = 4;
  for (let y = 0; y < s; y += step) {
    for (let x = 0; x < s; x += step) {
      const v = 58 + Math.round(rnd(x * 5 + y * 7) * 24);
      ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
      ctx.fillRect(x + 3, y + 3, step - 6, step - 6);
      ctx.strokeRect(x, y, step, step);
    }
  }
}

function drawHair(ctx, s) {
  ctx.fillStyle = "#e4dfda";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 650; i++) {
    const x = rnd(i * 7) * s;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(255,252,248,0.4)" : "rgba(102,90,80,0.32)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (rnd(i) - 0.5) * 14, s * 0.4, x + (rnd(i + 5) - 0.5) * 14, s * 0.7, x + (rnd(i + 9) - 0.5) * 10, s);
    ctx.stroke();
  }
}

// Bàn phím cơ chi tiết từng hàng phím + phím ESC nhấn màu
function drawKeyboard(ctx, w, h) {
  ctx.fillStyle = "#181c24";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  const rows = 5, cols = 15;
  const kw = (w - 22) / cols, kh = (h - 22) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 4 && c >= 4 && c <= 9) {
        if (c === 4) {
          ctx.fillStyle = "#2d3544";
          ctx.fillRect(11 + c * kw, 11 + r * kh, kw * 6 - 3, kh - 4);
        }
        continue;
      }
      ctx.fillStyle = r === 0 && c === 0 ? "#ef4444" : r === 2 && c === cols - 1 ? "#3b82f6" : "#2d3544";
      ctx.fillRect(11 + c * kw, 11 + r * kh, kw - 3, kh - 4);
      ctx.fillStyle = "rgba(226,232,240,0.35)";
      ctx.fillRect(13 + c * kw, 13 + r * kh, 4, 2);
    }
  }
}

// Vệt nắng cửa sổ hắt chéo lên sàn (ArchViz daylight realism)
function drawSunbeam(ctx, s) {
  ctx.clearRect(0, 0, s, s);
  const g = ctx.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, "rgba(255,244,214,0.42)");
  g.addColorStop(0.55, "rgba(255,240,204,0.2)");
  g.addColorStop(1, "rgba(255,240,204,0)");
  ctx.fillStyle = g;
  ctx.fillRect(18, 0, s - 36, s);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(s / 2 - 5, 0, 10, s);
}

// Tranh nghệ thuật treo tường hiện đại (3 phong cách khác nhau)
function drawArt(ctx, s, idx) {
  if (idx === 0) {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "#fef3c7");
    g.addColorStop(0.55, "#fb923c");
    g.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#fffbeb";
    ctx.beginPath(); ctx.arc(s * 0.65, s * 0.36, s * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.beginPath(); ctx.moveTo(0, s * 0.78); ctx.lineTo(s * 0.35, s * 0.46); ctx.lineTo(s * 0.72, s * 0.75); ctx.lineTo(s, s * 0.56); ctx.lineTo(s, s); ctx.lineTo(0, s); ctx.fill();
  } else if (idx === 1) {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#0ea5e9";
    ctx.beginPath(); ctx.arc(s * 0.38, s * 0.48, s * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(s * 0.48, s * 0.22, s * 0.32, s * 0.48);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(s * 0.16, s * 0.7, s * 0.68, s * 0.1);
  } else {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, "#0f172a");
    g.addColorStop(0.5, "#0d9488");
    g.addColorStop(1, "#a7f3d0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 4;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath(); ctx.arc(s * 0.5, s * 0.5, 24 + k * 22, 0, Math.PI * 1.4); ctx.stroke();
    }
  }
}

function drawClock(ctx, s) {
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.strokeStyle = i % 3 === 0 ? "#0f172a" : "#64748b";
    ctx.lineWidth = i % 3 === 0 ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(s / 2 + Math.cos(a) * s * 0.34, s / 2 + Math.sin(a) * s * 0.34);
    ctx.lineTo(s / 2 + Math.cos(a) * s * 0.42, s / 2 + Math.sin(a) * s * 0.42);
    ctx.stroke();
  }
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.lineTo(s * 0.34, s * 0.36); ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.lineTo(s * 0.68, s * 0.28); ctx.stroke();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.lineTo(s * 0.52, s * 0.8); ctx.stroke();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath(); ctx.arc(s / 2, s / 2, 7, 0, Math.PI * 2); ctx.fill();
}

function drawScreen(ctx, s, mode) {
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "#111b2e";
  ctx.fillRect(0, 0, 96, s);
  ctx.fillStyle = "#17233a";
  ctx.fillRect(0, 0, s, 32);
  const accent = mode === "fail" ? "#ef4444" : mode === "wait" ? "#f59e0b" : mode === "done" ? "#22c55e" : "#38bdf8";
  ["#ef4444", "#f59e0b", "#22c55e"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(20 + i * 18, 16, 5, 0, Math.PI * 2); ctx.fill();
  });
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i === 2 ? accent : "#475569";
    ctx.fillRect(14, 52 + i * 24, 52 + (i % 3) * 10, 8);
  }
  const palette = mode === "fail" ? ["#fca5a5", "#ef4444", "#cbd5e1", "#fb923c"]
    : mode === "wait" ? ["#fde68a", "#f59e0b", "#cbd5e1", "#93c5fd"]
      : mode === "done" ? ["#86efac", "#22c55e", "#cbd5e1", "#38bdf8"]
        : ["#7dd3fc", "#c4b5fd", "#86efac", "#fde68a", "#e2e8f0"];
  for (let r = 0; r < 18; r++) {
    const indent = (r % 4) * 16;
    let cx = 114 + indent;
    for (let tok = 0; tok < 3; tok++) {
      const tw = 34 + rnd(r * 11 + tok * 7) * 90;
      if (cx + tw > s - 18) break;
      ctx.fillStyle = palette[(r + tok) % palette.length];
      ctx.fillRect(cx, 50 + r * 20, tw, 7);
      cx += tw + 12;
    }
  }
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(96, s - 96, s - 96, 96);
  ctx.fillStyle = accent;
  ctx.fillRect(96, s - 96, s - 96, 3);
  ctx.fillRect(114, s - 74, 210, 10);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(114, s - 52, 280, 8);
  ctx.fillRect(114, s - 34, 190, 8);
}

function drawBeachBall(ctx, s) {
  const cols = ["#f43f5e", "#ffffff", "#38bdf8", "#ffffff", "#facc15", "#ffffff"];
  const w = s / cols.length;
  cols.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * w, 0, w + 1, s);
  });
}

function drawContactShadow(ctx, s) {
  const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.04, s / 2, s / 2, s * 0.5);
  g.addColorStop(0, "rgba(8,12,22,0.52)");
  g.addColorStop(0.52, "rgba(8,12,22,0.24)");
  g.addColorStop(1, "rgba(8,12,22,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}

// Vân mặt giải phẫu 512×256 phủ quanh đầu cầu (tâm mặt tại u = 0.75 → -Z):
// sắc da tự nhiên, ửng hồng má, bóng hốc mắt, sống mũi sáng, chân mũi & cằm đổ bóng mềm, vi kết cấu da.
function drawFaceSkin(ctx, w, h, baseHex) {
  ctx.fillStyle = baseHex || "#f1c29b";
  ctx.fillRect(0, 0, w, h);

  // Vi kết cấu lỗ chân lông / sắc độ da tự nhiên (tránh bề mặt nhựa phẳng)
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,244,232,0.06)" : "rgba(110,60,38,0.05)";
    ctx.fillRect(rnd(i * 5) * w, rnd(i * 11) * h, 2.2, 2.2);
  }

  const fx = w * 0.75; // chính diện -Z
  // Bóng hốc mắt mềm (Ambient Occlusion hốc mắt dưới cung mày)
  for (const side of [-1, 1]) {
    const ex = fx + side * w * 0.058, ey = h * 0.465;
    const eg = ctx.createRadialGradient(ex, ey, 2, ex, ey, w * 0.046);
    eg.addColorStop(0, "rgba(88,46,32,0.28)");
    eg.addColorStop(0.65, "rgba(105,58,42,0.12)");
    eg.addColorStop(1, "rgba(105,58,42,0)");
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.ellipse(ex, ey, w * 0.046, h * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ửng hồng gò má ấm áp (subsurface warmth)
    const cx = fx + side * w * 0.078, cy = h * 0.565;
    const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.058);
    cg.addColorStop(0, "rgba(226,104,92,0.22)");
    cg.addColorStop(0.6, "rgba(226,114,98,0.09)");
    cg.addColorStop(1, "rgba(226,114,98,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.058, h * 0.068, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sống mũi & trán bắt sáng ấm nhẹ
  const ng = ctx.createRadialGradient(fx, h * 0.515, 2, fx, h * 0.515, w * 0.026);
  ng.addColorStop(0, "rgba(255,248,238,0.26)");
  ng.addColorStop(1, "rgba(255,248,238,0)");
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.ellipse(fx, h * 0.515, w * 0.018, h * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bóng chân mũi & bóng nhẹ dưới môi dưới
  const un = ctx.createRadialGradient(fx, h * 0.602, 1, fx, h * 0.602, w * 0.028);
  un.addColorStop(0, "rgba(84,44,30,0.24)");
  un.addColorStop(1, "rgba(84,44,30,0)");
  ctx.fillStyle = un;
  ctx.beginPath();
  ctx.ellipse(fx, h * 0.602, w * 0.028, h * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();

  const ul = ctx.createRadialGradient(fx, h * 0.715, 1, fx, h * 0.715, w * 0.032);
  ul.addColorStop(0, "rgba(86,46,32,0.18)");
  ul.addColorStop(1, "rgba(86,46,32,0)");
  ctx.fillStyle = ul;
  ctx.beginPath();
  ctx.ellipse(fx, h * 0.715, w * 0.032, h * 0.022, 0, 0, Math.PI * 2);
  ctx.fill();

  // Đường bóng cổ & gáy mềm dưới hàm
  const jaw = ctx.createLinearGradient(0, h * 0.82, 0, h);
  jaw.addColorStop(0, "rgba(70,38,24,0)");
  jaw.addColorStop(1, "rgba(70,38,24,0.22)");
  ctx.fillStyle = jaw;
  ctx.fillRect(0, h * 0.82, w, h * 0.18);
}

// Mống mắt chi tiết có viền limbal tối, tia sợi mống mắt tỏa tròn và con ngươi sâu
function drawIris(ctx, s, colHex) {
  const cx = s / 2, cy = s / 2, r = s * 0.48;
  ctx.fillStyle = "#111827";
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

  const g = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r * 0.92);
  g.addColorStop(0, "#d97706");
  g.addColorStop(0.28, colHex || "#3d2817");
  g.addColorStop(0.84, colHex || "#3d2817");
  g.addColorStop(1, "#090d16");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2); ctx.fill();

  for (let i = 0; i < 42; i++) {
    const a = (i * Math.PI * 2) / 42;
    ctx.strokeStyle = i % 2 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.36, cy + Math.sin(a) * r * 0.36);
    ctx.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
    ctx.stroke();
  }
  ctx.fillStyle = "#05070c";
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath(); ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.arc(cx + r * 0.2, cy + r * 0.18, r * 0.07, 0, Math.PI * 2); ctx.fill();
}

// Mặt đường nhựa đại lộ đô thị (hạt đá nhựa + vạch phân làn đứt nét)
function drawRoad(ctx, s) {
  ctx.fillStyle = "#333942";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 4200; i++) {
    const v = 42 + Math.round(rnd(i * 7) * 34);
    ctx.fillStyle = "rgb(" + v + "," + (v + 3) + "," + (v + 7) + ")";
    ctx.fillRect(rnd(i * 3) * s, rnd(i * 11) * s, 2.2, 2.2);
  }
  // Vệt bánh xe hơi sẫm nhẹ trên hai làn
  ctx.fillStyle = "rgba(20,24,30,0.18)";
  ctx.fillRect(0, s * 0.18, s, s * 0.14);
  ctx.fillRect(0, s * 0.68, s, s * 0.14);
  // Vạch kẻ đường đứt nét giữa đường
  ctx.fillStyle = "rgba(241,245,249,0.84)";
  for (let x = 24; x < s; x += 128) ctx.fillRect(x, s * 0.485, 72, s * 0.03);
}

// Biển tên tòa nhà, tháp cao tầng & sảnh lễ tân: "ĐỒNG HÀNH CÙNG BẠN" · "www.donghanhcungban.org"
function drawBrandSign(ctx, w, h, variant = "portal") {
  const tower = variant === "tower";
  const lobby = variant === "lobby";
  const bg = ctx.createLinearGradient(0, 0, w, h);
  if (tower) {
    bg.addColorStop(0, "#050f22");
    bg.addColorStop(0.42, "#0d2346");
    bg.addColorStop(0.76, "#0b1c3a");
    bg.addColorStop(1, "#050d1e");
  } else if (lobby) {
    bg.addColorStop(0, "#0c1b33");
    bg.addColorStop(0.55, "#12294b");
    bg.addColorStop(1, "#0a1628");
  } else {
    bg.addColorStop(0, "#091529");
    bg.addColorStop(0.5, "#102442");
    bg.addColorStop(1, "#0b1a33");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Vệt phản chiếu kính kiến trúc chéo nhẹ tạo chiều sâu sang trọng
  const sheen = ctx.createLinearGradient(w * 0.15, 0, w * 0.65, h);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.45, "rgba(186,230,253,0.08)");
  sheen.addColorStop(0.55, "rgba(254,240,138,0.06)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.15, h * 0.5, 8, w * 0.15, h * 0.5, w * 0.34);
  glow.addColorStop(0, "rgba(56,189,248,0.32)");
  glow.addColorStop(0.55, "rgba(250,204,21,0.12)");
  glow.addColorStop(1, "rgba(15,23,42,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const pad = tower ? 20 : 12;
  const padIn = tower ? 36 : 22;
  ctx.strokeStyle = "#e0b65a";
  ctx.lineWidth = tower ? 9 : 6;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
  ctx.strokeStyle = "rgba(147,197,253,0.34)";
  ctx.lineWidth = tower ? 3 : 2;
  ctx.strokeRect(padIn, padIn, w - padIn * 2, h - padIn * 2);

  // Điểm nhấn kim cương vàng ở 4 góc viền bảng tháp
  if (tower) {
    ctx.fillStyle = "#f5cf76";
    for (const [dx, dy] of [[padIn, padIn], [w - padIn, padIn], [padIn, h - padIn], [w - padIn, h - padIn]]) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();
    }
  }

  // Biểu trưng hình học bên trái (hai vòng tròn đồng hành lồng nhau tỏa sáng)
  const sc = tower ? 1.65 : 1.0;
  const cx = tower ? 255 : 130;
  const cy = h * 0.5;
  ctx.save();
  ctx.shadowColor = "rgba(245,196,81,0.45)";
  ctx.shadowBlur = 16 * sc;
  ctx.lineWidth = 10 * sc;
  ctx.strokeStyle = "#f6c959";
  ctx.beginPath();
  ctx.arc(cx - 18 * sc, cy, 48 * sc, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowColor = "rgba(56,189,248,0.5)";
  ctx.strokeStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(cx + 22 * sc, cy, 48 * sc, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx + 2 * sc, cy, 13 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const divX = tower ? 430 : 222;
  ctx.fillStyle = "rgba(224,182,90,0.65)";
  ctx.fillRect(divX, tower ? 84 : 56, tower ? 5 : 3, h - (tower ? 168 : 112));

  // Dòng chữ chính "ĐỒNG HÀNH CÙNG BẠN" + đường kẻ trang trí + "www.donghanhcungban.org"
  const tx = tower ? 486 : 252;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = tower ? 18 : 10;
  ctx.shadowOffsetY = tower ? 5 : 3;
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${tower ? 114 : 56}px 'Segoe UI', system-ui, -apple-system, sans-serif`;
  ctx.fillText("ĐỒNG HÀNH CÙNG BẠN", tx, h * (tower ? 0.37 : 0.39));

  if (tower) {
    const lineGrad = ctx.createLinearGradient(tx, 0, w - 120, 0);
    lineGrad.addColorStop(0, "#f5cf76");
    lineGrad.addColorStop(0.55, "#38bdf8");
    lineGrad.addColorStop(1, "rgba(56,189,248,0)");
    ctx.shadowBlur = 0;
    ctx.fillStyle = lineGrad;
    ctx.fillRect(tx, h * 0.565, w - tx - 120, 4);
  }

  ctx.shadowBlur = tower ? 8 : 4;
  ctx.fillStyle = "#fde08d";
  ctx.font = `600 ${tower ? 66 : 36}px 'Segoe UI', system-ui, -apple-system, sans-serif`;
  ctx.fillText("www.donghanhcungban.org", tx + 2, h * (tower ? 0.725 : 0.71));
  ctx.restore();
}

// Biển tên nóc từng khối kính Tổ hợp BIM (nền xanh navy đậm, viền vàng kim, chữ trắng in hoa sắc nét)
function drawPodSign(ctx, w, h, label) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#0b172d");
  bg.addColorStop(0.5, "#14294b");
  bg.addColorStop(1, "#0b162a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#e0b65a";
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.strokeStyle = "rgba(125,211,252,0.34)";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px 'Segoe UI', system-ui, -apple-system, sans-serif";
  ctx.fillText(label || "BIM POD", w / 2, h * 0.52);
  ctx.restore();
}

// Màn hình lớn chuyên ngành BIM trên vách kính (CDE · Kiến trúc · Kết cấu · MEP)
function drawBimWallScreen(ctx, w, h, mode) {
  ctx.fillStyle = "#091224";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#122038";
  ctx.fillRect(0, 0, w, 46);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  // Lưới toạ độ kỹ thuật mảnh
  ctx.strokeStyle = "rgba(148,163,184,0.13)";
  ctx.lineWidth = 1.5;
  for (let x = 48; x < w; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 46); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 86; y < h; y += 44) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const title = mode === "arch" ? "BIM ARCHITECTURE · MẶT BẰNG & MẶT ĐỨNG 12F"
    : mode === "struct" ? "BIM STRUCTURE · LƯỚI CỘT & NỘI LỰC KHUNG"
      : mode === "mep" ? "BIM MEP · SƠ ĐỒ HVAC · CẤP THOÁT NƯỚC · PCCC"
        : "BIM CDE · KIỂM TRA XUNG ĐỘT & PHỐI HỢP MÔ HÌNH";
  const accent = mode === "arch" ? "#38bdf8" : mode === "struct" ? "#f97316" : mode === "mep" ? "#34d399" : "#60a5fa";
  ctx.fillStyle = accent;
  ctx.fillRect(18, 14, 18, 18);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(title, 48, 31);

  if (mode === "arch") {
    // Bản vẽ mặt bằng & mặt đứng kiến trúc CAD xanh cyan
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3.5;
    ctx.strokeRect(54, 78, 390, 260);
    ctx.strokeRect(110, 120, 140, 175);
    ctx.strokeRect(275, 120, 145, 95);
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(160 + i * 52, 235, 22, 0, Math.PI * 0.5); ctx.stroke();
    }
    // Mặt đứng tháp 12 tầng bên phải
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 3;
    ctx.strokeRect(510, 68, 200, 285);
    for (let f = 1; f < 12; f++) {
      const fy = 68 + f * (285 / 12);
      ctx.beginPath(); ctx.moveTo(510, fy); ctx.lineTo(710, fy); ctx.stroke();
    }
  } else if (mode === "struct") {
    // Lưới kết cấu khung chịu lực & biểu đồ ứng suất đỏ/cam/vàng
    const cols = 8, rows = 5;
    const gx0 = 60, gy0 = 76, gw = 640, gh = 268;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hot = (r + c) % 3 === 0 ? "rgba(239,68,68,0.42)" : (r + c) % 2 ? "rgba(249,115,22,0.34)" : "rgba(250,204,21,0.22)";
        ctx.fillStyle = hot;
        ctx.fillRect(gx0 + c * (gw / cols) + 3, gy0 + r * (gh / rows) + 3, gw / cols - 6, gh / rows - 6);
      }
    }
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 3.5;
    for (let c = 0; c <= cols; c++) {
      const x = gx0 + c * (gw / cols);
      ctx.beginPath(); ctx.moveTo(x, gy0); ctx.lineTo(x, gy0 + gh); ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = gy0 + r * (gh / rows);
      ctx.beginPath(); ctx.moveTo(gx0, y); ctx.lineTo(gx0 + gw, y); ctx.stroke();
    }
  } else if (mode === "mep") {
    // Tuyến ống gió HVAC xanh ngọc, cấp thoát nước xanh dương, PCCC đỏ
    const pipes = [
      ["#34d399", 110, [60, 110, 310, 110, 310, 195, 700, 195]],
      ["#38bdf8", 180, [60, 235, 220, 235, 220, 145, 560, 145, 560, 290, 710, 290]],
      ["#f59e0b", 260, [60, 315, 420, 315, 420, 240, 710, 240]],
      ["#ef4444", 90, [140, 82, 660, 82]],
    ];
    for (const [col, , pts] of pipes) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < pts.length; i += 2) {
        ctx.beginPath(); ctx.arc(pts[i], pts[i + 1], 6, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else {
    // Dashboard CDE & Clash Detection của BIM Manager
    ctx.fillStyle = "#172554";
    ctx.fillRect(42, 74, 290, 270);
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 3;
    ctx.strokeRect(115, 102, 140, 215);
    for (let f = 1; f < 10; f++) {
      ctx.beginPath(); ctx.moveTo(115, 102 + f * 21.5); ctx.lineTo(255, 102 + f * 21.5); ctx.stroke();
    }
    const bars = [["#38bdf8", 0.92], ["#f97316", 0.84], ["#34d399", 0.78], ["#facc15", 0.96]];
    bars.forEach(([col, u], idx) => {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(370, 88 + idx * 62, 340, 32);
      ctx.fillStyle = col;
      ctx.fillRect(370, 88 + idx * 62, Math.round(340 * u), 32);
    });
  }
}

// Vỉa hè bê tông cắt khe giãn nở
function drawSidewalk(ctx, s) {
  ctx.fillStyle = "#d9d6cf";
  ctx.fillRect(0, 0, s, s);
  const step = 128;
  for (let y = 0; y < s; y += step) {
    for (let x = 0; x < s; x += step) {
      const t = rnd(x * 3 + y * 9);
      ctx.fillStyle = t > 0.5 ? "rgba(255,253,248,0.22)" : "rgba(176,172,164,0.18)";
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
      ctx.strokeStyle = "rgba(110,106,98,0.52)";
      ctx.lineWidth = 2.6;
      ctx.strokeRect(x, y, step, step);
    }
  }
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.3)" : "rgba(110,108,104,0.24)";
    ctx.fillRect(rnd(i * 5) * s, rnd(i * 13) * s, 2, 2);
  }
}

// Bản đồ toàn cảnh Equirectangular HDR-feel (bầu trời, đĩa mặt trời, mây, đường chân trời, ánh đèn đêm)
function drawEquirectSky(ctx, w, h, theme, dark) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (dark) {
    g.addColorStop(0, "#040814");
    g.addColorStop(0.35, "#0d1630");
    g.addColorStop(0.49, theme.glow || "#3b82f6");
    g.addColorStop(0.54, "#1e293b");
    g.addColorStop(1, "#090d16");
  } else {
    g.addColorStop(0, "#2563eb");
    g.addColorStop(0.28, "#7dd3fc");
    g.addColorStop(0.47, "#fef3c7");
    g.addColorStop(0.51, "#e2e8f0");
    g.addColorStop(1, "#64748b");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (dark) {
    // Dải đèn đô thị phản chiếu trên kính/kim loại ban đêm
    for (let i = 0; i < 65; i++) {
      ctx.fillStyle = i % 3 === 0 ? (theme.glow || "#60a5fa") : "#fde68a";
      ctx.globalAlpha = 0.4 + rnd(i * 11) * 0.5;
      ctx.fillRect(rnd(i * 7) * w, h * 0.45 + rnd(i * 5) * h * 0.08, 4 + rnd(i) * 14, 3 + rnd(i + 2) * 8);
    }
    ctx.globalAlpha = 1;
  } else {
    // Đĩa mặt trời chói rực tạo điểm lóe phản chiếu sắc nét trên nước, kính và inox
    const sx = w * 0.22, sy = h * 0.24;
    const sun = ctx.createRadialGradient(sx, sy, 4, sx, sy, 85);
    sun.addColorStop(0, "rgba(255,255,255,1)");
    sun.addColorStop(0.2, "rgba(255,248,220,0.92)");
    sun.addColorStop(0.6, "rgba(254,240,190,0.28)");
    sun.addColorStop(1, "rgba(254,240,190,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h * 0.55);

    // Mây tích trắng phản chiếu trên vách kính & mặt hồ
    for (let i = 0; i < 24; i++) {
      const cx = rnd(i * 19) * w, cy = h * 0.14 + rnd(i * 23) * h * 0.28;
      const rx = 28 + rnd(i * 7) * 58, ry = 8 + rnd(i * 3) * 16;
      const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
      cg.addColorStop(0, "rgba(255,255,255,0.72)");
      cg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

const PAINTERS = {
  grass: [drawGrass, 8, 2.2],
  wood: [drawWood, 2, 1.8],
  bark: [drawBark, 2, 3.2],
  foliage: [drawFoliage, 2, 2.4],
  stone: [drawStone, 3, 2.8],
  water: [drawWater, 2, 3.0],
  caustics: [drawCaustics, 2, 0],
  poolTile: [drawPoolTile, 4, 2.0],
  fabric: [drawFabric, 4, 1.4],
  towel: [drawTowel, 1, 1.2],
  plaster: [drawPlaster, 3, 1.0],
  tileFloor: [drawTileFloor, 3, 1.6],
  hair: [drawHair, 2, 1.6],
  beachball: [drawBeachBall, 1, 0],
  shadow: [drawContactShadow, 1, 0],
  leafCluster: [drawLeafCluster, 1, 0],
  sunbeam: [drawSunbeam, 1, 0],
  clock: [drawClock, 1, 0],
  road: [drawRoad, 3, 2.4],
  sidewalk: [drawSidewalk, 4, 2.0],
};

const ROUGH_PAINTERS = {
  wood: [drawWoodRough, 2],
  tileFloor: [drawTileRough, 3],
  grass: [drawWoodRough, 8],
  bark: [drawWoodRough, 2],
  stone: [drawTileRough, 3],
  fabric: [drawWoodRough, 4],
  road: [drawTileRough, 3],
};

const NO_REPEAT = new Set(["shadow", "beachball", "leafCluster", "sunbeam", "clock", "towel"]);

export function createTextureBank(THREE, onReady) {
  const cache = new Map();
  const canvases = new Map();
  const normals = new Map();
  const roughs = new Map();
  const skies = new Map();
  const envs = new Map();
  const hdriEnvs = new Map();
  const hdriPending = new Set();
  let disposed = false;

  // Nạp ảnh PBR chụp quét thật (Poly Haven CC0) đè mượt tại chỗ lên Texture đang dùng (không nhấp nháy, không dựng lại cảnh)
  function upgradePhoto(tex, relPath, isLinear = false) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (disposed) return;
      tex.image = img;
      if (isLinear) tex.colorSpace = THREE.NoColorSpace;
      tex.needsUpdate = true;
      if (onReady) onReady();
    };
    img.onerror = () => {};
    img.src = ASSET_BASE + relPath;
  }

  function get(kind) {
    if (!kind) return null;
    if (cache.has(kind)) return cache.get(kind);
    if (kind.startsWith("screen")) {
      const mode = kind.split(":")[1] || "work";
      const [canvas, ctx] = makeCanvas(512, 320);
      drawScreen(ctx, 512, mode);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      cache.set(kind, tex);
      return tex;
    }
    if (kind === "keyboard") {
      const [canvas, ctx] = makeCanvas(256, 128);
      drawKeyboard(ctx, 256, 128);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      cache.set(kind, tex);
      return tex;
    }
    if (kind.startsWith("art:")) {
      const idx = Number(kind.split(":")[1]) || 0;
      const [canvas, ctx] = makeCanvas(256, 256);
      drawArt(ctx, 256, idx);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      cache.set(kind, tex);
      return tex;
    }
    if (kind.startsWith("face:")) {
      const hex = kind.slice(5) || "#f1c29b";
      const [canvas, ctx] = makeCanvas(512, 256);
      drawFaceSkin(ctx, 512, 256, hex);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      cache.set(kind, tex);
      return tex;
    }
    if (kind.startsWith("iris:")) {
      const hex = kind.slice(5) || "#3d2817";
      const [canvas, ctx] = makeCanvas(128, 128);
      drawIris(ctx, 128, hex);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      cache.set(kind, tex);
      return tex;
    }
    if (kind === "brandSign" || kind === "brandSign:lobby" || kind === "brandSign:tower") {
      const isTower = kind === "brandSign:tower";
      const cw = isTower ? 2048 : 1024;
      const ch = isTower ? 480 : 320;
      const [canvas, ctx] = makeCanvas(cw, ch);
      drawBrandSign(ctx, cw, ch, isTower ? "tower" : (kind === "brandSign:lobby" ? "lobby" : "portal"));
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = isTower ? 16 : 8;
      tex.needsUpdate = true;
      cache.set(kind, tex);
      return tex;
    }
    if (kind.startsWith("podSign:")) {
      const label = kind.slice(8);
      const [canvas, ctx] = makeCanvas(1024, 224);
      drawPodSign(ctx, 1024, 224, label);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      cache.set(kind, tex);
      return tex;
    }
    if (kind.startsWith("bimScreen:")) {
      const mode = kind.slice(10) || "cde";
      const [canvas, ctx] = makeCanvas(768, 384);
      drawBimWallScreen(ctx, 768, 384, mode);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      cache.set(kind, tex);
      return tex;
    }
    if (!PAINTERS[kind]) return null;
    const [paint, repeat] = PAINTERS[kind];
    const size = kind === "shadow" ? 128 : (kind === "leafCluster" || kind === "caustics" || kind === "sunbeam" || kind === "clock") ? 256 : 512;
    const [canvas, ctx] = makeCanvas(size);
    paint(ctx, size);
    canvases.set(kind, canvas);
    const tex = new THREE.CanvasTexture(canvas);
    if (!NO_REPEAT.has(kind)) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    cache.set(kind, tex);
    if (PHOTO_PBR.has(kind)) upgradePhoto(tex, "pbr/" + kind + "_diff.jpg", false);
    return tex;
  }

  function normal(kind) {
    if (!kind || !PAINTERS[kind] || !PAINTERS[kind][2]) return null;
    if (normals.has(kind)) return normals.get(kind);
    if (!canvases.has(kind)) get(kind);
    const src = canvases.get(kind);
    if (!src) return null;
    const [, repeat, strength] = PAINTERS[kind];
    const nCanvas = buildNormalCanvas(src, strength);
    const tex = new THREE.CanvasTexture(nCanvas);
    if (!NO_REPEAT.has(kind)) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat, repeat);
    }
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    normals.set(kind, tex);
    if (PHOTO_PBR.has(kind)) upgradePhoto(tex, "pbr/" + kind + "_nor.jpg", true);
    return tex;
  }

  function roughness(kind) {
    if (!kind || !ROUGH_PAINTERS[kind]) return null;
    if (roughs.has(kind)) return roughs.get(kind);
    const [paint, repeat] = ROUGH_PAINTERS[kind];
    const [canvas, ctx] = makeCanvas(256);
    paint(ctx, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    roughs.set(kind, tex);
    if (PHOTO_PBR.has(kind)) upgradePhoto(tex, "pbr/" + kind + "_rough.jpg", true);
    return tex;
  }

  function sky(bgHex, glowHex, dark, mood) {
    const key = (bgHex || "") + "|" + (glowHex || "") + "|" + (dark ? 1 : 0) + "|" + (mood || "");
    if (skies.has(key)) return skies.get(key);
    const [c, ctx] = makeCanvas(4, 256);
    ctx.fillStyle = bgHex || "#0b1020";
    ctx.fillRect(0, 0, 4, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    if (mood === "sunset") {
      g.addColorStop(0, "#1e3a8a");
      g.addColorStop(0.45, "#f97316");
      g.addColorStop(0.85, "#fde68a");
      g.addColorStop(1, "#fef3c7");
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 0, 4, 256);
    } else if (dark || mood === "night") {
      g.addColorStop(0, "rgba(3,6,16,0.68)");
      g.addColorStop(0.55, "rgba(10,16,38,0.22)");
      g.addColorStop(1, glowHex || "#3b82f6");
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.34;
      ctx.fillRect(0, 0, 4, 256);
    } else {
      g.addColorStop(0, "#5eb2f5");
      g.addColorStop(0.46, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,244,220,0.46)");
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.78;
      ctx.fillRect(0, 0, 4, 256);
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    skies.set(key, tex);
    return tex;
  }

  // Nạp bản đồ ánh sáng 360° HDRI chụp thật (Poly Haven CC0: day / sunset / night) qua rgbe.js → PMREMGenerator
  function envMap(renderer, theme, dark, mood) {
    const pickMood = mood || (dark ? "night" : (theme.window === "dusk" || theme.id === "cafe" || theme.id === "studio") ? "sunset" : "day");
    if (hdriEnvs.has(pickMood)) return hdriEnvs.get(pickMood).texture;
    if (!hdriPending.has(pickMood)) {
      hdriPending.add(pickMood);
      fetch(ASSET_BASE + "hdri/" + pickMood + ".hdr")
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => {
          if (!buf || disposed) return;
          const hdrTex = decodeRGBE(THREE, buf);
          const pmrem = new THREE.PMREMGenerator(renderer);
          pmrem.compileEquirectangularShader();
          const rt = pmrem.fromEquirectangular(hdrTex);
          hdrTex.dispose();
          pmrem.dispose();
          hdriEnvs.set(pickMood, rt);
          if (onReady) onReady();
        })
        .catch(() => {});
    }
    const key = (dark ? "dark:" : "day:") + (theme.glow || "");
    if (envs.has(key)) return envs.get(key).texture;
    const [c, ctx] = makeCanvas(512, 256);
    drawEquirectSky(ctx, 512, 256, theme, dark);
    const eqTex = new THREE.CanvasTexture(c);
    eqTex.mapping = THREE.EquirectangularReflectionMapping;
    eqTex.colorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const rt = pmrem.fromEquirectangular(eqTex);
    eqTex.dispose();
    pmrem.dispose();
    envs.set(key, rt);
    return rt.texture;
  }

  return {
    get,
    normal,
    roughness,
    sky,
    envMap,
    animate(dt) {
      const w = cache.get("water");
      if (w) {
        w.offset.x = (w.offset.x + dt * 0.048) % 1;
        w.offset.y = (w.offset.y + dt * 0.03) % 1;
      }
      const wn = normals.get("water");
      if (wn) {
        wn.offset.x = (wn.offset.x + dt * 0.048) % 1;
        wn.offset.y = (wn.offset.y + dt * 0.03) % 1;
      }
      const ca = cache.get("caustics");
      if (ca) {
        ca.offset.x = (ca.offset.x - dt * 0.035 + 1) % 1;
        ca.offset.y = (ca.offset.y + dt * 0.042) % 1;
      }
    },
    dispose() {
      disposed = true;
      for (const tex of cache.values()) tex.dispose();
      for (const tex of normals.values()) tex.dispose();
      for (const tex of roughs.values()) tex.dispose();
      for (const tex of skies.values()) tex.dispose();
      for (const rt of envs.values()) rt.dispose();
      for (const rt of hdriEnvs.values()) rt.dispose();
      cache.clear();
      canvases.clear();
      normals.clear();
      roughs.clear();
      skies.clear();
      envs.clear();
      hdriEnvs.clear();
      hdriPending.clear();
    },
  };
}
