// Công trình biểu tượng đường phố Sài Gòn chân thật trên trục chân trời Tây-Bắc (nhìn thẳng dọc đại lộ khi "Dạo phố"):
// - Tháp sen kính hiện đại (kiểu Bitexco: mặt cắt elip vát nghiêng dần lên đỉnh kèm sân đỗ trực thăng vươn ngang độc đáo).
// - Nhà thờ gạch đỏ hai tháp chuông Roman-Gothic (mái chóp đá xám, thánh giá, cửa sổ hoa hồng, cửa vòm gạch nung).
// - Hàng cờ đỏ sao vàng bay phấp phới trên cột đèn vỉa hè + hàng cây rợp bóng ven đại lộ bắt nắng ngược chiều.

export function createSaigonAssets(THREE) {
  // Cờ đỏ sao vàng uốn lượn nhẹ bằng lưới nhiều đốt
  const flagGeo = new THREE.PlaneGeometry(0.92, 0.62, 10, 4);
  const spireGeo = new THREE.ConeGeometry(1, 1, 8);
  const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 18);
  const lotusSegGeo = new THREE.CylinderGeometry(0.92, 1.04, 1, 20);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  return {
    geos: { flagGeo, spireGeo, cylinderGeo, lotusSegGeo, boxGeo },
    dispose() {
      for (const g of Object.values(this.geos)) g.dispose();
    },
  };
}

function makeFlagTexture(THREE) {
  const c = document.createElement("canvas");
  c.width = 192;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#da251d";
  ctx.fillRect(0, 0, 192, 128);
  ctx.fillStyle = "#ffff00";
  ctx.beginPath();
  const cx = 96, cy = 64, rOut = 28, rIn = 11;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOut : rIn;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildSaigonLandmarks(THREE, sgAssets, natureAssets, mats, plan, streetZ, anim) {
  const g = sgAssets.geos;
  const root = new THREE.Group();
  const westRoadX = -6.6;

  // ---------------------------------------------------------------- 1. Tháp Sen kính hiện đại kèm sân đỗ trực thăng (Bitexco silhouette)
  // Đặt ở ô Tây-Bắc xa phía cuối đường nhìn dọc đại lộ khi đứng vỉa hè Dạo phố
  const bx = -35.0, bz = -15.5;
  const towerGrp = new THREE.Group();
  towerGrp.position.set(bx, 0, bz);
  towerGrp.rotation.y = 0.28;
  root.add(towerGrp);

  const glassCurtain = mats.physical("#49759c", { roughness: 0.08, metalness: 0.42, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const mullionRing = mats.standard("#94a3b8", { roughness: 0.25, metalness: 0.85 });
  const glowBand = mats.freshStandard("#fde68a", { roughness: 0.18, emissive: "#f59e0b", emissiveIntensity: 0.14 });
  const concreteCore = mats.standard("#cbd5e1", { roughness: 0.65 });

  // Thân tháp thuôn hình búp sen 10 tầng vươn cao 46m
  const tiers = 10;
  const tierH = 4.6;
  for (let i = 0; i < tiers; i++) {
    const taper = 1.0 - (i / tiers) * 0.46;
    const rx = 4.6 * taper;
    const rz = 3.2 * taper;
    const m = new THREE.Mesh(g.lotusSegGeo, glassCurtain);
    m.position.y = i * tierH + tierH * 0.5;
    m.scale.set(rx, tierH * 0.96, rz);
    m.castShadow = i < 4;
    towerGrp.add(m);

    const ring = new THREE.Mesh(g.cylinderGeo, mullionRing);
    ring.position.y = (i + 1) * tierH;
    ring.scale.set(rx * 0.98, 0.26, rz * 0.98);
    towerGrp.add(ring);

    if (i % 2 === 1) {
      const band = new THREE.Mesh(g.cylinderGeo, glowBand);
      band.position.y = i * tierH + tierH * 0.5;
      band.scale.set(rx * 0.95, tierH * 0.36, rz * 0.95);
      towerGrp.add(band);
    }
  }
  // Đỉnh chóp vát nghiêng đặc trưng tháp búp sen
  const crown = new THREE.Mesh(g.boxGeo, mullionRing);
  crown.position.set(0, tiers * tierH + 1.4, 0);
  crown.rotation.z = -0.34;
  crown.scale.set(4.6, 2.8, 3.2);
  towerGrp.add(crown);

  // Sân đỗ trực thăng hình tròn vươn ngang ở tầng 2/3 (~30.5m) kèm giàn thanh chống thép xiên
  const heliY = 30.5;
  const heliDisk = new THREE.Mesh(g.cylinderGeo, concreteCore);
  heliDisk.position.set(-5.2, heliY, 1.8);
  heliDisk.scale.set(3.9, 0.45, 3.9);
  const heliRim = new THREE.Mesh(g.cylinderGeo, mullionRing);
  heliRim.position.set(-5.2, heliY - 0.1, 1.8);
  heliRim.scale.set(4.1, 0.28, 4.1);
  const heliMark = mats.freshStandard("#facc15", { roughness: 0.35, emissive: "#eab308", emissiveIntensity: 0.35 });
  const hBarA = new THREE.Mesh(g.boxGeo, heliMark);
  hBarA.position.set(-5.2, heliY + 0.26, 1.8);
  hBarA.scale.set(2.4, 0.06, 0.42);
  towerGrp.add(heliDisk, heliRim, hBarA);
  for (const sz of [-1.2, 1.2]) {
    const strut = new THREE.Mesh(g.boxGeo, mullionRing);
    strut.position.set(-3.1, heliY - 2.3, 1.2 + sz);
    strut.rotation.z = -0.68;
    strut.scale.set(0.32, 6.2, 0.32);
    towerGrp.add(strut);
  }

  // ---------------------------------------------------------------- 2. Nhà thờ gạch đỏ hai tháp chuông (kiểu Nhà thờ Đức Bà Sài Gòn)
  // Đặt chếch sang phía Bắc-Tây-Bắc cạnh công viên, tạo bộ đôi biểu tượng cùng tháp Bitexco!
  const cx = -16.5, cz = -18.5;
  const cathGrp = new THREE.Group();
  cathGrp.position.set(cx, 0, cz);
  cathGrp.rotation.y = 0.42;
  root.add(cathGrp);

  const brickMat = mats.standard("#9a412c", { roughness: 0.85, tex: "stone", bump: 0.025 });
  const brickTrim = mats.standard("#c27355", { roughness: 0.72 });
  const slateSpire = mats.standard("#64748b", { roughness: 0.62, metalness: 0.2 });
  const crossMat = mats.standard("#cbd5e1", { roughness: 0.25, metalness: 0.8 });
  const roseGlass = mats.freshStandard("#fbbf24", { roughness: 0.2, emissive: "#f59e0b", emissiveIntensity: 0.42 });

  // Thân chính giáo đường + mái ngói dốc
  const nave = new THREE.Mesh(g.boxGeo, brickMat);
  nave.position.set(0, 7.2, -3.5);
  nave.scale.set(11.6, 14.4, 15.0);
  nave.castShadow = true;
  cathGrp.add(nave);

  const naveRoof = new THREE.Mesh(g.spireGeo, slateSpire);
  naveRoof.position.set(0, 16.4, -3.5);
  naveRoof.rotation.y = Math.PI / 4;
  naveRoof.scale.set(8.6, 4.4, 11.2);
  cathGrp.add(naveRoof);

  // Mặt tiền giữa + đầu hồi tam giác + cửa sổ hoa hồng phát sáng vàng ấm
  const facade = new THREE.Mesh(g.boxGeo, brickMat);
  facade.position.set(0, 8.8, 4.2);
  facade.scale.set(5.4, 17.6, 2.2);
  const gable = new THREE.Mesh(g.spireGeo, brickTrim);
  gable.position.set(0, 19.8, 4.2);
  gable.rotation.y = Math.PI / 4;
  gable.scale.set(4.1, 4.6, 2.4);
  const roseWin = new THREE.Mesh(g.cylinderGeo, roseGlass);
  roseWin.rotation.x = Math.PI / 2;
  roseWin.position.set(0, 11.2, 5.32);
  roseWin.scale.set(1.45, 0.16, 1.45);
  const portal = new THREE.Mesh(g.boxGeo, brickTrim);
  portal.position.set(0, 2.5, 5.45);
  portal.scale.set(2.8, 5.0, 0.55);
  const portalArch = new THREE.Mesh(g.boxGeo, roseGlass);
  portalArch.position.set(0, 2.2, 5.6);
  portalArch.scale.set(1.8, 3.8, 0.35);
  cathGrp.add(facade, gable, roseWin, portal, portalArch);

  // Hai tháp chuông đối xứng + chóp nón bát giác vút cao 36m + thánh giá trên đỉnh
  for (const sx of [-4.25, 4.25]) {
    const tBase = new THREE.Mesh(g.boxGeo, brickMat);
    tBase.position.set(sx, 11.0, 4.2);
    tBase.scale.set(3.2, 22.0, 3.2);
    const belfry = new THREE.Mesh(g.boxGeo, brickTrim);
    belfry.position.set(sx, 18.8, 4.2);
    belfry.scale.set(3.45, 1.0, 3.45);
    const lancet = new THREE.Mesh(g.boxGeo, glowBand);
    lancet.position.set(sx, 17.0, 5.82);
    lancet.scale.set(1.1, 2.6, 0.12);
    const spire = new THREE.Mesh(g.spireGeo, slateSpire);
    spire.position.set(sx, 28.0, 4.2);
    spire.scale.set(2.05, 12.2, 2.05);
    const crV = new THREE.Mesh(g.boxGeo, crossMat);
    crV.position.set(sx, 34.9, 4.2);
    crV.scale.set(0.16, 1.8, 0.16);
    const crH = new THREE.Mesh(g.boxGeo, crossMat);
    crH.position.set(sx, 35.35, 4.2);
    crH.scale.set(1.0, 0.16, 0.16);
    cathGrp.add(tBase, belfry, lancet, spire, crV, crH);
  }

  // ---------------------------------------------------------------- 3. Cờ Tổ quốc đỏ sao vàng phấp phới dọc đại lộ
  const flagTex = makeFlagTexture(THREE);
  const flagMat = new THREE.MeshStandardMaterial({
    map: flagTex,
    roughness: 0.72,
    side: THREE.DoubleSide,
    emissive: "#991b1b",
    emissiveIntensity: 0.15,
  });
  const poleMat = mats.standard("#94a3b8", { roughness: 0.3, metalness: 0.85 });
  const basePos = g.flagGeo.attributes.position.array.slice();
  const flags = [];
  for (const [fx, fz, dir] of [
    [9.5, streetZ + 10.65, 1],
    [22.5, streetZ + 11.72, 1],
    [32.5, streetZ + 11.72, 1],
    [westRoadX + 5.0, streetZ + 1.4, -1],
  ]) {
    const fg = new THREE.Group();
    fg.position.set(fx, 0, fz);
    const staff = new THREE.Mesh(g.cylinderGeo, poleMat);
    staff.position.set(0, 3.0, 0);
    staff.rotation.z = dir * -0.45;
    staff.scale.set(0.032, 1.65, 0.032);
    const cloth = new THREE.Mesh(g.flagGeo.clone(), flagMat);
    cloth.position.set(dir * 0.45, 3.45, 0);
    cloth.rotation.z = dir * -0.15;
    fg.add(staff, cloth);
    root.add(fg);
    flags.push({ cloth, dir, geo: cloth.geometry });
  }

  return {
    root,
    setMood(mood) {
      const night = mood === "night";
      const sunset = mood === "sunset";
      glowBand.emissiveIntensity = night ? 1.85 : sunset ? 0.95 : 0.14;
      roseGlass.emissiveIntensity = night ? 1.65 : sunset ? 1.05 : 0.42;
      heliMark.emissiveIntensity = night ? 1.4 : sunset ? 0.8 : 0.25;
      glassCurtain.color.set(night ? "#1e3a5f" : sunset ? "#5b7da0" : "#49759c");
    },
    animate(t, motion) {
      for (let fIdx = 0; fIdx < flags.length; fIdx++) {
        const fl = flags[fIdx];
        const arr = fl.geo.attributes.position.array;
        for (let k = 0; k < arr.length; k += 3) {
          const bx0 = basePos[k];
          const by0 = basePos[k + 1];
          const u = (bx0 + 0.46) / 0.92;
          arr[k + 2] = motion
            ? Math.sin(u * 4.2 - t * 4.4 + fIdx * 1.3 + by0 * 1.5) * 0.14 * u
            : Math.sin(u * 3.2) * 0.08 * u;
        }
        fl.geo.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      flagTex.dispose();
      flagMat.dispose();
      for (const fl of flags) fl.geo.dispose();
    },
  };
}
