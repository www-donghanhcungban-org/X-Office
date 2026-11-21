// Bộ giải mã Radiance HDR (.hdr / 32-bit RGBE RLE) thuần JS không phụ thuộc ngoài → THREE.DataTexture (HalfFloatType).
// Dùng nạp trực tiếp bản đồ ánh sáng môi trường 360° HDRI thật (Poly Haven CC0) cho PMREMGenerator.

export function decodeRGBE(THREE, buffer) {
  const bytes = new Uint8Array(buffer);
  let pos = 0;
  const readLine = () => {
    const start = pos;
    while (pos < bytes.length && bytes[pos] !== 10) pos++;
    let end = pos;
    if (end > start && bytes[end - 1] === 13) end--;
    if (pos < bytes.length) pos++;
    let s = "";
    for (let i = start; i < end; i++) s += String.fromCharCode(bytes[i]);
    return s;
  };

  while (pos < bytes.length) {
    if (readLine() === "") break;
  }
  const res = readLine().trim().split(/\s+/);
  const h = parseInt(res[1], 10);
  const w = parseInt(res[3], 10);
  if (!w || !h || w > 4096 || h > 2048) throw new Error("HDRI kích thước không hợp lệ");

  const half = new Uint16Array(w * h * 4);
  const toHalf = THREE.DataUtils.toHalfFloat;
  const oneHalf = toHalf(1.0);
  const scan = new Uint8Array(w * 4);

  for (let y = 0; y < h; y++) {
    const dstRow = (h - 1 - y) * w * 4;
    if (bytes[pos] === 2 && bytes[pos + 1] === 2 && ((bytes[pos + 2] << 8) | bytes[pos + 3]) === w) {
      pos += 4;
      for (let ch = 0; ch < 4; ch++) {
        let x = 0;
        const base = ch * w;
        while (x < w) {
          const cnt = bytes[pos++];
          if (cnt > 128) {
            const run = cnt - 128;
            const val = bytes[pos++];
            scan.fill(val, base + x, base + x + run);
            x += run;
          } else {
            scan.set(bytes.subarray(pos, pos + cnt), base + x);
            pos += cnt;
            x += cnt;
          }
        }
      }
      for (let x = 0; x < w; x++) {
        const e = scan[3 * w + x];
        const di = dstRow + x * 4;
        if (e) {
          const f = Math.pow(2.0, e - 136);
          // Kẹp đỉnh mặt trời cực gắt (<= 24) để prefilter IBL mượt, không chấm sáng nhiễu
          half[di] = toHalf(Math.min(24.0, scan[x] * f));
          half[di + 1] = toHalf(Math.min(24.0, scan[w + x] * f));
          half[di + 2] = toHalf(Math.min(24.0, scan[2 * w + x] * f));
        }
        half[di + 3] = oneHalf;
      }
    } else {
      for (let x = 0; x < w; x++) {
        const r = bytes[pos++], g = bytes[pos++], b = bytes[pos++], e = bytes[pos++];
        const di = dstRow + x * 4;
        if (e) {
          const f = Math.pow(2.0, e - 136);
          half[di] = toHalf(Math.min(24.0, r * f));
          half[di + 1] = toHalf(Math.min(24.0, g * f));
          half[di + 2] = toHalf(Math.min(24.0, b * f));
        }
        half[di + 3] = oneHalf;
      }
    }
  }

  const tex = new THREE.DataTexture(half, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}
