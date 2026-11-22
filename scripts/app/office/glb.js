// Bộ nạp glTF 2.0 nhị phân (.glb) viết thuần JS cho Three.js — hỗ trợ PBR, Skeleton/SkinnedMesh, AnimationClip & HDR clearcoat.
// Giải mã ảnh nhúng qua createImageBitmap(Blob) (an toàn CSP default-src 'none' / img-src 'self' data:, không dùng URL ngoài).

const TYPE_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const COMP_INFO = {
  5120: [Int8Array, 1, 127],
  5121: [Uint8Array, 1, 255],
  5122: [Int16Array, 2, 32767],
  5123: [Uint16Array, 2, 65535],
  5125: [Uint32Array, 4, 4294967295],
  5126: [Float32Array, 4, 1],
};
const ATTR_MAP = {
  POSITION: "position",
  NORMAL: "normal",
  TEXCOORD_0: "uv",
  TEXCOORD_1: "uv1",
  COLOR_0: "color",
  JOINTS_0: "skinIndex",
  WEIGHTS_0: "skinWeight",
};

function readAccessor(json, binBytes, accIndex) {
  const acc = json.accessors[accIndex];
  if (!acc) return null;
  const numComp = TYPE_COUNT[acc.type] || 1;
  const [Typed, compSize, normDiv] = COMP_INFO[acc.componentType] || COMP_INFO[5126];
  const count = acc.count || 0;
  const bv = acc.bufferView !== undefined ? json.bufferViews[acc.bufferView] : null;
  const out = new Typed(count * numComp);

  if (bv && binBytes) {
    const baseOff = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const stride = bv.byteStride || numComp * compSize;
    const view = new DataView(binBytes.buffer, binBytes.byteOffset, binBytes.byteLength);
    for (let i = 0; i < count; i++) {
      const row = baseOff + i * stride;
      for (let c = 0; c < numComp; c++) {
        const off = row + c * compSize;
        let val = 0;
        if (off + compSize <= view.byteLength) {
          if (acc.componentType === 5120) val = view.getInt8(off);
          else if (acc.componentType === 5121) val = view.getUint8(off);
          else if (acc.componentType === 5122) val = view.getInt16(off, true);
          else if (acc.componentType === 5123) val = view.getUint16(off, true);
          else if (acc.componentType === 5125) val = view.getUint32(off, true);
          else val = view.getFloat32(off, true);
        }
        out[i * numComp + c] = val;
      }
    }
  }
  return { array: out, itemSize: numComp, normalized: Boolean(acc.normalized), count, normDiv };
}

function readAccessorFloat(json, binBytes, accIndex) {
  const raw = readAccessor(json, binBytes, accIndex);
  if (!raw) return null;
  if (raw.array instanceof Float32Array && !raw.normalized) return raw.array;
  const f = new Float32Array(raw.array.length);
  const scale = raw.normalized && raw.normDiv !== 1 ? 1 / raw.normDiv : 1;
  for (let i = 0; i < raw.array.length; i++) f[i] = raw.array[i] * scale;
  return f;
}

function wrapMode(THREE, code) {
  if (code === 33071) return THREE.ClampToEdgeWrapping;
  if (code === 33648) return THREE.MirroredRepeatWrapping;
  return THREE.RepeatWrapping;
}

async function decodeTextures(THREE, json, binBytes, ownedTex) {
  const images = json.images || [];
  const textures = json.textures || [];
  const samplers = json.samplers || [];
  const bitmaps = await Promise.all(images.map(async (img) => {
    if (img.bufferView === undefined || !binBytes) return null;
    const bv = json.bufferViews[img.bufferView];
    if (!bv) return null;
    const off = bv.byteOffset || 0;
    const len = bv.byteLength || 0;
    const slice = binBytes.subarray(off, off + len);
    const mime = img.mimeType || "image/png";
    try {
      return await createImageBitmap(new Blob([slice], { type: mime }));
    } catch {
      return null;
    }
  }));

  const cache = new Map();
  return function getTexture(texIdx, isSRGB) {
    if (texIdx === undefined || texIdx === null) return null;
    const key = `${texIdx}|${isSRGB ? 1 : 0}`;
    if (cache.has(key)) return cache.get(key);
    const tDef = textures[texIdx];
    const bmp = tDef && tDef.source !== undefined ? bitmaps[tDef.source] : null;
    if (!bmp) return null;
    const tex = new THREE.Texture(bmp);
    tex.flipY = false;
    tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    const samp = tDef.sampler !== undefined ? samplers[tDef.sampler] : null;
    tex.wrapS = wrapMode(THREE, samp && samp.wrapS);
    tex.wrapT = wrapMode(THREE, samp && samp.wrapT);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    cache.set(key, tex);
    ownedTex.push(tex);
    return tex;
  };
}

function buildMaterials(THREE, json, getTexture, ownedMat) {
  const out = (json.materials || []).map((m) => {
    const pbr = m.pbrMetallicRoughness || {};
    const cc = m.extensions && m.extensions.KHR_materials_clearcoat;
    const sh = m.extensions && m.extensions.KHR_materials_sheen;
    const opts = {
      roughness: pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1.0,
      metalness: pbr.metallicFactor !== undefined ? pbr.metallicFactor : 1.0,
      side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    };
    const bcf = pbr.baseColorFactor;
    if (bcf) {
      opts.color = new THREE.Color().setRGB(bcf[0], bcf[1], bcf[2]);
      if (bcf[3] !== undefined && bcf[3] < 1) opts.opacity = bcf[3];
    }
    const baseTex = pbr.baseColorTexture ? getTexture(pbr.baseColorTexture.index, true) : null;
    if (baseTex) opts.map = baseTex;
    const mrTex = pbr.metallicRoughnessTexture ? getTexture(pbr.metallicRoughnessTexture.index, false) : null;
    if (mrTex) {
      opts.metalnessMap = mrTex;
      opts.roughnessMap = mrTex;
    }
    if (m.normalTexture) {
      const nt = getTexture(m.normalTexture.index, false);
      if (nt) {
        opts.normalMap = nt;
        const sc = m.normalTexture.scale !== undefined ? m.normalTexture.scale : 1;
        opts.normalScale = new THREE.Vector2(sc, sc);
      }
    }
    if (m.occlusionTexture) {
      const ot = getTexture(m.occlusionTexture.index, false);
      if (ot) {
        opts.aoMap = ot;
        opts.aoMapIntensity = m.occlusionTexture.strength !== undefined ? m.occlusionTexture.strength : 1;
      }
    }
    if (m.emissiveFactor) {
      const ef = m.emissiveFactor;
      opts.emissive = new THREE.Color().setRGB(ef[0], ef[1], ef[2]);
    }
    if (m.emissiveTexture) {
      const et = getTexture(m.emissiveTexture.index, true);
      if (et) {
        opts.emissiveMap = et;
        if (!opts.emissive) opts.emissive = new THREE.Color(0xffffff);
      }
    }
    if (m.alphaMode === "MASK") {
      opts.alphaTest = m.alphaCutoff !== undefined ? m.alphaCutoff : 0.5;
    } else if (m.alphaMode === "BLEND") {
      opts.transparent = true;
      opts.depthWrite = false;
    }
    if (cc) {
      opts.clearcoat = cc.clearcoatFactor !== undefined ? cc.clearcoatFactor : 0;
      opts.clearcoatRoughness = cc.clearcoatRoughnessFactor !== undefined ? cc.clearcoatRoughnessFactor : 0;
    }
    if (sh) {
      opts.sheen = 1;
      opts.sheenRoughness = sh.sheenRoughnessFactor !== undefined ? sh.sheenRoughnessFactor : 0.6;
      if (sh.sheenColorFactor) opts.sheenColor = new THREE.Color(...sh.sheenColorFactor);
    }
    const mat = cc || sh ? new THREE.MeshPhysicalMaterial(opts) : new THREE.MeshStandardMaterial(opts);
    mat.name = m.name || "";
    mat.userData.glbBaseColorHex = mat.color ? mat.color.getHex() : 0xffffff;
    ownedMat.push(mat);
    return mat;
  });
  const defMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.7, metalness: 0.1 });
  ownedMat.push(defMat);
  return { list: out, fallback: defMat };
}

export async function parseGLB(THREE, arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (arrayBuffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) {
    throw new Error("Tệp không đúng định dạng glTF nhị phân (.glb)");
  }
  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error("Chỉ hỗ trợ glTF 2.0");

  let off = 12;
  let json = null;
  let binBytes = null;
  while (off + 8 <= arrayBuffer.byteLength) {
    const len = view.getUint32(off, true);
    const kind = view.getUint32(off + 4, true);
    const dataOff = off + 8;
    if (dataOff + len > arrayBuffer.byteLength) break;
    if (kind === 0x4e4f534a) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, dataOff, len)));
    } else if (kind === 0x004e4942) {
      binBytes = new Uint8Array(arrayBuffer, dataOff, len);
    }
    off = dataOff + len;
  }
  if (!json) throw new Error("GLB thiếu chunk JSON");

  const ownedTex = [];
  const ownedMat = [];
  const ownedGeo = [];
  const getTexture = await decodeTextures(THREE, json, binBytes, ownedTex);
  const mats = buildMaterials(THREE, json, getTexture, ownedMat);

  // Xác định mọi node thuộc xương (Skeleton joints)
  const jointIndices = new Set();
  for (const sk of json.skins || []) {
    for (const j of sk.joints || []) jointIndices.add(j);
  }

  // Tạo node cây
  const nodeObjs = (json.nodes || []).map((n, idx) => {
    const obj = jointIndices.has(idx) ? new THREE.Bone() : new THREE.Group();
    const safe = (n.name || "node").replace(/[.\[\]:/\\]/g, "_");
    obj.name = `${safe}_${idx}`;
    obj.userData.glbNodeIdx = idx;
    if (n.matrix) {
      const m = new THREE.Matrix4().fromArray(n.matrix);
      m.decompose(obj.position, obj.quaternion, obj.scale);
    } else {
      if (n.translation) obj.position.fromArray(n.translation);
      if (n.rotation) obj.quaternion.fromArray(n.rotation);
      if (n.scale) obj.scale.fromArray(n.scale);
    }
    return obj;
  });

  (json.nodes || []).forEach((n, idx) => {
    for (const ch of n.children || []) {
      if (nodeObjs[ch]) nodeObjs[idx].add(nodeObjs[ch]);
    }
  });

  // Dựng các bộ xương (Skeleton)
  const skeletons = (json.skins || []).map((sk) => {
    const bones = (sk.joints || []).map((j) => nodeObjs[j]).filter(Boolean);
    const inv = [];
    if (sk.inverseBindMatrices !== undefined) {
      const f = readAccessorFloat(json, binBytes, sk.inverseBindMatrices);
      for (let i = 0; i < bones.length; i++) {
        inv.push(new THREE.Matrix4().fromArray(f, i * 16));
      }
    }
    return new THREE.Skeleton(bones, inv);
  });

  // Dựng các mesh / primitive
  const meshes = json.meshes || [];
  (json.nodes || []).forEach((n, idx) => {
    if (n.mesh === undefined) return;
    const mDef = meshes[n.mesh];
    if (!mDef) return;
    const sk = n.skin !== undefined ? skeletons[n.skin] : null;
    for (const prim of mDef.primitives || []) {
      const geo = new THREE.BufferGeometry();
      for (const [gAttr, tAttr] of Object.entries(ATTR_MAP)) {
        const accIdx = prim.attributes && prim.attributes[gAttr];
        if (accIdx === undefined) continue;
        const accData = readAccessor(json, binBytes, accIdx);
        if (!accData) continue;
        geo.setAttribute(tAttr, new THREE.BufferAttribute(accData.array, accData.itemSize, accData.normalized));
      }
      if (prim.indices !== undefined) {
        const idxData = readAccessor(json, binBytes, prim.indices);
        if (idxData) geo.setIndex(new THREE.BufferAttribute(idxData.array, 1, false));
      }
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (geo.attributes.uv && !geo.attributes.uv1) geo.setAttribute("uv1", geo.attributes.uv);
      ownedGeo.push(geo);

      const mat = prim.material !== undefined && mats.list[prim.material] ? mats.list[prim.material] : mats.fallback;
      let mesh;
      if (sk && geo.attributes.skinIndex && geo.attributes.skinWeight) {
        mesh = new THREE.SkinnedMesh(geo, mat);
        mesh.userData.glbSkinIdx = n.skin;
        mesh.bind(sk, new THREE.Matrix4());
      } else {
        mesh = new THREE.Mesh(geo, mat);
      }
      mesh.castShadow = mesh.receiveShadow = true;
      nodeObjs[idx].add(mesh);
    }
  });

  const scene = new THREE.Group();
  const sIdx = json.scene !== undefined ? json.scene : 0;
  const rootNodes = (json.scenes && json.scenes[sIdx] && json.scenes[sIdx].nodes) || [];
  for (const r of rootNodes) {
    if (nodeObjs[r]) scene.add(nodeObjs[r]);
  }
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scene);

  // Dựng AnimationClips
  const animations = (json.animations || []).map((anim, aIdx) => {
    const tracks = [];
    for (const ch of anim.channels || []) {
      const tNode = ch.target && nodeObjs[ch.target.node];
      const path = ch.target && ch.target.path;
      const samp = anim.samplers && anim.samplers[ch.sampler];
      if (!tNode || !samp || (path !== "translation" && path !== "rotation" && path !== "scale")) continue;
      const times = readAccessorFloat(json, binBytes, samp.input);
      const values = readAccessorFloat(json, binBytes, samp.output);
      if (!times || !values || !times.length) continue;
      const prop = path === "translation" ? "position" : path === "rotation" ? "quaternion" : path;
      const trackName = `${tNode.name}.${prop}`;
      // Xử lý CUBICSPLINE nhẹ nhàng về tuyến tính nếu gặp
      let cleanVals = values;
      const stride = path === "rotation" ? 4 : 3;
      if (samp.interpolation === "CUBICSPLINE" && values.length === times.length * stride * 3) {
        cleanVals = new Float32Array(times.length * stride);
        for (let i = 0; i < times.length; i++) {
          for (let k = 0; k < stride; k++) cleanVals[i * stride + k] = values[(i * 3 + 1) * stride + k];
        }
      }
      if (path === "rotation") tracks.push(new THREE.QuaternionKeyframeTrack(trackName, times, cleanVals));
      else tracks.push(new THREE.VectorKeyframeTrack(trackName, times, cleanVals));
    }
    return new THREE.AnimationClip(anim.name || `anim_${aIdx}`, -1, tracks);
  });

  return {
    scene,
    animations,
    skeletons,
    bounds,
    dispose() {
      for (const g of ownedGeo) g.dispose();
      for (const m of ownedMat) m.dispose();
      for (const t of ownedTex) t.dispose();
      for (const b of tBmpList(ownedTex)) {
        if (b && b.close) b.close();
      }
    },
  };
}

function tBmpList(textures) {
  const seen = new Set();
  for (const t of textures) if (t && t.image) seen.add(t.image);
  return seen;
}

export async function loadGLB(THREE, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
  const buf = await res.arrayBuffer();
  return parseGLB(THREE, buf);
}

// Tạo bản sao độc lập (nhân bản xương SkinnedMesh & auto-scale chuẩn mét + bám sàn)
function cloneNodeTree(src, nodeMap) {
  const dst = src.clone(false);
  nodeMap.set(src, dst);
  for (const ch of src.children) {
    dst.add(cloneNodeTree(ch, nodeMap));
  }
  return dst;
}

export function instantiateGLB(THREE, parsed, opts = {}) {
  const nodeMap = new Map();
  const root = cloneNodeTree(parsed.scene, nodeMap);

  // Nối lại Skeleton cho mọi SkinnedMesh vừa clone để mỗi nhân vật chuyển động độc lập
  root.traverse((o) => {
    if (o.isSkinnedMesh && o.userData.glbSkinIdx !== undefined) {
      const origSk = parsed.skeletons[o.userData.glbSkinIdx];
      if (origSk) {
        const newBones = origSk.bones.map((b) => nodeMap.get(b) || b);
        const newSk = new THREE.Skeleton(newBones, origSk.boneInverses.map((m) => m.clone()));
        o.bind(newSk, new THREE.Matrix4());
      }
    }
    if (o.isMesh) {
      o.castShadow = opts.castShadow !== false;
      o.receiveShadow = opts.receiveShadow !== false;
      o.frustumCulled = !o.isSkinnedMesh;
    }
  });

  const box = parsed.bounds.clone();
  const size = new THREE.Vector3();
  box.getSize(size);
  let sc = 1;
  if (opts.targetHeight && size.y > 1e-4) sc = opts.targetHeight / size.y;
  else if (opts.targetLength && Math.max(size.x, size.z) > 1e-4) sc = opts.targetLength / Math.max(size.x, size.z);
  else if (opts.targetScale) sc = opts.targetScale;
  root.scale.multiplyScalar(sc);

  if (opts.rotY) root.rotation.y += opts.rotY;
  root.updateMatrixWorld(true);

  const wBox = new THREE.Box3().setFromObject(root);
  const wCenter = new THREE.Vector3();
  wBox.getCenter(wCenter);
  const wrapper = new THREE.Group();
  if (opts.centerXZ !== false) {
    root.position.x -= wCenter.x;
    root.position.z -= wCenter.z;
  }
  if (opts.groundY !== false) {
    root.position.y -= wBox.min.y;
  }
  wrapper.add(root);

  let mixer = null;
  let action = null;
  if (parsed.animations && parsed.animations.length) {
    mixer = new THREE.AnimationMixer(root);
    action = mixer.clipAction(parsed.animations[0]);
    action.play();
  }

  return { group: wrapper, root, mixer, action };
}

export function createHDAssetManager(THREE, onReady) {
  const models = new Map();
  let manifest = {};
  let disposed = false;

  fetch("/hd-assets/manifest.json")
    .then((r) => (r.ok ? r.json() : {}))
    .then(async (m) => {
      if (disposed || !m || typeof m !== "object") return;
      manifest = m;
      const entries = Object.entries(m).filter(([, v]) => typeof v === "string" && v.endsWith(".glb"));
      if (!entries.length) return;
      let cursor = 0;
      async function worker() {
        while (cursor < entries.length && !disposed) {
          const [key, file] = entries[cursor++];
          try {
            const parsed = await loadGLB(THREE, "/hd-assets/" + file);
            if (disposed) {
              parsed.dispose();
              return;
            }
            models.set(key, parsed);
          } catch {
            /* bỏ qua từng model lẻ nếu lỗi, giữ nguyên hình học dự phòng */
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(8, entries.length) }, worker));
      if (!disposed && models.size && onReady) onReady();
    })
    .catch(() => {
      /* app hoạt động bình thường khi chưa cài gói .xoffice-hd */
    });

  return {
    has(key) {
      return models.has(key);
    },
    get(key) {
      return models.get(key) || null;
    },
    get manifest() {
      return manifest;
    },
    dispose() {
      disposed = true;
      for (const p of models.values()) p.dispose();
      models.clear();
    },
  };
}
