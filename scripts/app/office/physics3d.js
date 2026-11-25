// Động cơ vật lý va chạm 2D & né tránh phương tiện dự báo cho Văn phòng & Đường phố 3D (thuần JS, không DOM).

function pushOutAABB(cx, cz, r, b, seed) {
  const qx = Math.max(b.minX, Math.min(b.maxX, cx));
  const qz = Math.max(b.minZ, Math.min(b.maxZ, cz));
  let dx = cx - qx;
  let dz = cz - qz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    const k = (r - d) / d;
    return [cx + dx * k, cz + dz * k];
  }
  const left = cx - b.minX;
  const right = b.maxX - cx;
  const top = cz - b.minZ;
  const bot = b.maxZ - cz;
  const m = Math.min(left, right, top, bot);
  if (m === left) return [b.minX - r - 1e-3, cz];
  if (m === right) return [b.maxX + r + 1e-3, cz];
  if (m === top) return [cx, b.minZ - r - 1e-3];
  void seed;
  return [cx, b.maxZ + r + 1e-3];
}

function pushOutOBB(cx, cz, r, o) {
  const vx = cx - o.cx;
  const vz = cz - o.cz;
  const lx = vx * o.c - vz * o.s;
  const lz = vx * o.s + vz * o.c;
  const qlx = Math.max(-o.hl, Math.min(o.hl, lx));
  const qlz = Math.max(-o.hw, Math.min(o.hw, lz));
  let dlx = lx - qlx;
  let dlz = lz - qlz;
  const d2 = dlx * dlx + dlz * dlz;
  if (d2 >= r * r) return null;
  let pushLx = 0;
  let pushLz = 0;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    const k = (r - d) / d;
    pushLx = dlx * k;
    pushLz = dlz * k;
  } else {
    const ox = o.hl - Math.abs(lx);
    const oz = o.hw - Math.abs(lz);
    if (ox < oz) pushLx = (lx >= 0 ? ox + r : -(ox + r));
    else pushLz = (lz >= 0 ? oz + r : -(oz + r));
  }
  const wx = pushLx * o.c + pushLz * o.s;
  const wz = -pushLx * o.s + pushLz * o.c;
  return [cx + wx, cz + wz];
}

function pushOutCircle(cx, cz, r, tx, tz, tr, fallbackAngle) {
  let dx = cx - tx;
  let dz = cz - tz;
  const minD = r + tr;
  const d2 = dx * dx + dz * dz;
  if (d2 >= minD * minD) return null;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    const k = (minD - d) / d;
    return [cx + dx * k, cz + dz * k];
  }
  return [cx + Math.cos(fallbackAngle) * minD, cz + Math.sin(fallbackAngle) * minD];
}

function distToAABB(px, pz, b) {
  const qx = Math.max(b.minX, Math.min(b.maxX, px));
  const qz = Math.max(b.minZ, Math.min(b.maxZ, pz));
  const dx = px - qx;
  const dz = pz - qz;
  const d = Math.hypot(dx, dz);
  if (d > 1e-6) return d;
  return -Math.min(px - b.minX, b.maxX - px, pz - b.minZ, b.maxZ - pz);
}

function distToOBB(px, pz, o) {
  const vx = px - o.cx;
  const vz = pz - o.cz;
  const lx = vx * o.c - vz * o.s;
  const lz = vx * o.s + vz * o.c;
  const qlx = Math.max(-o.hl, Math.min(o.hl, lx));
  const qlz = Math.max(-o.hw, Math.min(o.hw, lz));
  const d = Math.hypot(lx - qlx, lz - qlz);
  if (d > 1e-6) return d;
  return -Math.min(o.hl - Math.abs(lx), o.hw - Math.abs(lz));
}

// Góc né quạt phía trước tối đa ±60° (tuyệt đối không bẻ 85°–140° lao xuống lòng đường hay quay ngược!)
const FAN_ANGLES = [0, 0.24, -0.24, 0.48, -0.48, 0.76, -0.76, 1.05, -1.05];
const FAN_PROBES = [0.48, 0.96, 1.48];

export function createWorldPhysics() {
  const layers = {
    outdoor: { boxes: [], obbs: [], circles: [], humans: new Map() },
    indoor: { boxes: [], obbs: [], circles: [], humans: new Map() },
  };
  const vehicles = new Map();

  function layerOf(name) {
    return layers[name] || layers.outdoor;
  }

  return {
    addBox(layer, minX, minZ, maxX, maxZ, tag = "") {
      const x0 = Math.min(minX, maxX);
      const x1 = Math.max(minX, maxX);
      const z0 = Math.min(minZ, maxZ);
      const z1 = Math.max(minZ, maxZ);
      if (x1 - x0 < 1e-4 || z1 - z0 < 1e-4) return;
      layerOf(layer).boxes.push({ minX: x0, minZ: z0, maxX: x1, maxZ: z1, tag });
    },

    addOrientedBox(layer, cx, cz, halfL, halfW, rotY = 0, tag = "") {
      layerOf(layer).obbs.push({
        cx,
        cz,
        hl: halfL,
        hw: halfW,
        c: Math.cos(rotY),
        s: Math.sin(rotY),
        tag,
      });
    },

    addCircle(layer, x, z, r, tag = "") {
      if (r <= 1e-4) return;
      layerOf(layer).circles.push({ x, z, r, tag });
    },

    setHuman(layer, id, x, z, r = 0.36) {
      layerOf(layer).humans.set(id, { id, x, z, r });
    },

    removeHuman(layer, id) {
      layerOf(layer).humans.delete(id);
    },

    getHumans(layer) {
      return layerOf(layer).humans.values();
    },

    setVehicle(id, x, z, halfX, halfZ, dirX, dirZ, speed, halfLen, halfW) {
      vehicles.set(id, { id, x, z, halfX, halfZ, dirX, dirZ, speed, halfLen, halfW });
    },

    getVehicles() {
      return vehicles.values();
    },

    resolveCircle(layer, x, z, r = 0.36, ignoreId = null, opts = {}) {
      const L = layerOf(layer);
      let px = x;
      let pz = z;
      let collided = false;
      const checkVeh = layer === "outdoor" && !opts.ignoreVehicles;

      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < L.boxes.length; i++) {
          const hit = pushOutAABB(px, pz, r, L.boxes[i], pass + i);
          if (hit) {
            px = hit[0];
            pz = hit[1];
            collided = true;
          }
        }
        for (let i = 0; i < L.obbs.length; i++) {
          const hit = pushOutOBB(px, pz, r, L.obbs[i]);
          if (hit) {
            px = hit[0];
            pz = hit[1];
            collided = true;
          }
        }
        for (let i = 0; i < L.circles.length; i++) {
          const c = L.circles[i];
          const hit = pushOutCircle(px, pz, r, c.x, c.z, c.r, (i + pass) * 1.1);
          if (hit) {
            px = hit[0];
            pz = hit[1];
            collided = true;
          }
        }
        for (const h of L.humans.values()) {
          if (h.id === ignoreId) continue;
          const hit = pushOutCircle(px, pz, r, h.x, h.z, h.r, pass * 0.9 + 0.4);
          if (hit) {
            px = hit[0];
            pz = hit[1];
            collided = true;
          }
        }
        if (checkVeh) {
          for (const v of vehicles.values()) {
            const vb = {
              minX: v.x - v.halfX - 0.12,
              minZ: v.z - v.halfZ - 0.12,
              maxX: v.x + v.halfX + 0.12,
              maxZ: v.z + v.halfZ + 0.12,
            };
            const hit = pushOutAABB(px, pz, r, vb, pass);
            if (hit) {
              px = hit[0];
              pz = hit[1];
              collided = true;
            }
          }
        }
      }
      return { x: px, z: pz, collided };
    },

    clearanceAt(layer, qx, qz, r = 0.36, ignoreId = null, checkVehicles = false) {
      const L = layerOf(layer);
      let minC = 99;
      for (let i = 0; i < L.boxes.length; i++) {
        const c = distToAABB(qx, qz, L.boxes[i]) - r;
        if (c < minC) minC = c;
        if (minC < -0.5) return minC;
      }
      for (let i = 0; i < L.obbs.length; i++) {
        const c = distToOBB(qx, qz, L.obbs[i]) - r;
        if (c < minC) minC = c;
      }
      for (let i = 0; i < L.circles.length; i++) {
        const ci = L.circles[i];
        const c = Math.hypot(qx - ci.x, qz - ci.z) - (r + ci.r);
        if (c < minC) minC = c;
      }
      for (const h of L.humans.values()) {
        if (h.id === ignoreId) continue;
        const c = Math.hypot(qx - h.x, qz - h.z) - (r + h.r + 0.06);
        if (c < minC) minC = c;
      }
      if (layer === "outdoor" && checkVehicles) {
        for (const v of vehicles.values()) {
          const c = distToAABB(qx, qz, {
            minX: v.x - v.halfX - 0.14,
            minZ: v.z - v.halfZ - 0.14,
            maxX: v.x + v.halfX + 0.14,
            maxZ: v.z + v.halfZ + 0.14,
          }) - r;
          if (c < minC) minC = c;
        }
      }
      return minC;
    },

    steerAround(layer, x, z, dirX, dirZ, r = 0.36, ignoreId = null, prefSide = 0, checkVehicles = false) {
      const len = Math.hypot(dirX, dirZ);
      if (len < 1e-5) return { dx: 0, dz: 0, side: 0, clear: true };
      const fx = dirX / len;
      const fz = dirZ / len;
      const rx = -fz;
      const rz = fx;
      const self = this;

      // Nhanh: kiểm tra hướng đi thẳng trước — nếu hành lang thông thoáng thì đi thẳng mượt mà
      let straightClear = 99;
      for (let p = 0; p < FAN_PROBES.length; p++) {
        const d = FAN_PROBES[p];
        const c = self.clearanceAt(layer, x + fx * d, z + fz * d, r, ignoreId, checkVehicles);
        if (c < straightClear) straightClear = c;
      }
      if (straightClear > 0.12) {
        return { dx: fx, dz: fz, side: 0, clear: true };
      }

      // Quét quạt phía trước (±60° tối đa) — lách nhẹ giữ đúng vỉa hè, tuyệt đối không lao xuống lòng đường hay quay đầu
      let bestScore = -1e9;
      let bestDx = fx;
      let bestDz = fz;
      let bestSide = prefSide;

      for (let i = 0; i < FAN_ANGLES.length; i++) {
        const ang = FAN_ANGLES[i];
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const cx = fx * ca + rx * sa;
        const cz = fz * ca + rz * sa;
        const side = ang > 0.01 ? 1 : (ang < -0.01 ? -1 : 0);

        let minC = 99;
        let nearC = 99;
        for (let p = 0; p < FAN_PROBES.length; p++) {
          const d = FAN_PROBES[p];
          const c = self.clearanceAt(layer, x + cx * d, z + cz * d, r, ignoreId, checkVehicles);
          if (c < minC) minC = c;
          if (p === 0) nearC = c;
        }
        const clearTerm = Math.min(0.32, minC) * 2.4 + (minC > 0.04 ? 0.95 : 0) + (nearC > 0.03 ? 0.45 : -0.75);
        const anglePenalty = Math.abs(ang) * 1.45;
        const commitBonus = prefSide !== 0 && side === prefSide ? 0.34 : 0;
        const rightBias = side === 1 ? 0.05 : 0;
        const score = clearTerm - anglePenalty + commitBonus + rightBias;

        if (score > bestScore) {
          bestScore = score;
          bestDx = cx;
          bestDz = cz;
          bestSide = side !== 0 ? side : prefSide;
        }
      }

      return { dx: bestDx, dz: bestDz, side: bestSide, clear: false };
    },

    isCrossingSafe(fromX, fromZ, toX, toZ) {
      const minX = Math.min(fromX, toX);
      const maxX = Math.max(fromX, toX);
      const minZ = Math.min(fromZ, toZ);
      const maxZ = Math.max(fromZ, toZ);
      const midX = (fromX + toX) * 0.5;
      const midZ = (fromZ + toZ) * 0.5;

      for (const v of vehicles.values()) {
        if (Math.abs(v.dirX) > 0.5) {
          if (v.z + v.halfW + 0.9 < minZ || v.z - v.halfW - 0.9 > maxZ) continue;
          const ahead = (midX - v.x) * v.dirX;
          // Xe đã dừng chờ đèn đỏ trước vạch (v.speed < 0.45): chỉ chặn nếu thân xe thực sự đang nằm đè lên vạch kẻ đường!
          if (v.speed < 0.45) {
            if (Math.abs(ahead) < v.halfLen + 0.75) return false;
            continue;
          }
          const stopDist = v.halfLen + 1.4 + v.speed * 2.2;
          if (ahead > -(v.halfLen + 1.0) && ahead < stopDist) return false;
        } else {
          if (v.x + v.halfW + 0.9 < minX || v.x - v.halfW - 0.9 > maxX) continue;
          const ahead = (midZ - v.z) * v.dirZ;
          if (v.speed < 0.45) {
            if (Math.abs(ahead) < v.halfLen + 0.75) return false;
            continue;
          }
          const stopDist = v.halfLen + 1.4 + v.speed * 2.2;
          if (ahead > -(v.halfLen + 1.0) && ahead < stopDist) return false;
        }
      }
      return true;
    },

    getVehicleThreat(x, z, r = 0.38) {
      let best = null;
      for (const v of vehicles.values()) {
        if (v.speed <= 0.35) continue;
        const perpX = -v.dirZ;
        const perpZ = v.dirX;
        const vx = x - v.x;
        const vz = z - v.z;
        const fwd = vx * v.dirX + vz * v.dirZ;
        const lat = vx * perpX + vz * perpZ;
        const maxFwd = v.halfLen + Math.max(6.5, v.speed * 2.0);
        // Chỉ báo nguy hiểm khi người thực sự nằm trong lòng làn xe (không bao giờ kích hoạt khi đang đi an toàn trên vỉa hè!)
        const maxLat = v.halfW + 0.38 + r;
        if (fwd >= -v.halfLen * 0.35 && fwd <= maxFwd && Math.abs(lat) <= maxLat) {
          if (!best || fwd < best.fwd) {
            const sideSign = lat >= 0 ? 1 : -1;
            best = {
              vehicle: v,
              fwd,
              lat,
              sideSign,
              escapeX: perpX * sideSign,
              escapeZ: perpZ * sideSign,
              dist: Math.max(0, fwd - v.halfLen),
            };
          }
        }
      }
      return best;
    },
  };
}
