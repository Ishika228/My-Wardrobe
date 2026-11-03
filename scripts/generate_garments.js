const fs = require('fs');
const path = require('path');

// Polyfill FileReader for Node.js GLTFExporter
global.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    if (blob.arrayBuffer) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
      });
    } else {
      this.result = blob;
      if (this.onloadend) this.onloadend();
    }
  }
};

const THREE = require('../Frontend/node_modules/three');
const { GLTFExporter } = require('../Frontend/node_modules/three/examples/jsm/exporters/GLTFExporter.js');
const BufferGeometryUtils = require('../Frontend/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js');

const outDir = path.join(__dirname, '../Frontend/public/models/garments');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Skeleton joint index mapping from female_avatar.glb
const HIPS_IDX = 0;
const SPINE_IDX = 1;
const SPINE1_IDX = 2;
const SPINE2_IDX = 3;
const NECK_IDX = 4;
const L_SHOULDER_IDX = 9;
const L_ARM_IDX = 10;
const L_FOREARM_IDX = 11;
const R_SHOULDER_IDX = 33;
const R_ARM_IDX = 34;
const R_FOREARM_IDX = 35;
const L_THIGH_IDX = 57;
const L_KNEE_IDX = 58;
const R_THIGH_IDX = 62;
const R_KNEE_IDX = 63;

// Helper: build buffer geometry with skinning attributes
function makeRiggedGeometry({ positions, normals, uvs, skinIndices, skinWeights, indices }) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (normals && normals.length > 0) {
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  }
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geom.setIndex(indices);
  if (!normals || normals.length === 0) {
    geom.computeVertexNormals();
  }
  return geom;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DRESS: PINK FLORAL DRESS WITH PUFF SLEEVES, SQUARE NECK, BOW & 3 TIERS
// ─────────────────────────────────────────────────────────────────────────────
function createFloralPuffDressGeometry() {
  const parts = [];

  // 1A. Bodice with Square Neckline & Princess Seams fitted to ReadyPlayerMe Avatar Torso
  // Fits avatar waist Y=1.135 (rx=0.118, rz=0.095, cz=0.054) to bust Y=1.340 (rx=0.137, rz=0.112, cz=0.044)
  // Shoulder straps rise over shoulders to Y=1.455 (aligned with neck Y=1.469, shoulders Y=1.449)
  {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const ySegments = 20;
    const radialSegments = 40;
    const waistY = 1.135;
    const bustY = 1.340;
    const strapTopY = 1.455;

    for (let iy = 0; iy <= ySegments; iy++) {
      const v = iy / ySegments;
      const baseY = waistY + (strapTopY - waistY) * v;

      for (let ix = 0; ix <= radialSegments; ix++) {
        const u = ix / radialSegments;
        const angle = u * Math.PI * 2;
        const sinA = Math.sin(angle); // > 0 front, < 0 back
        const cosA = Math.cos(angle); // > 0 left, < 0 right

        let rx, rz, cz, y = baseY;

        if (baseY <= bustY) {
          // From waist up to bust
          const t = (baseY - waistY) / (bustY - waistY);
          const rx_front = 0.118 + (0.137 - 0.118) * Math.sin(t * Math.PI * 0.5);
          const rx_side = 0.158 + (0.165 - 0.158) * Math.sin(t * Math.PI * 0.5);
          const rz_front = 0.095 + (0.112 - 0.095) * Math.sin(t * Math.PI * 0.5);
          const rz_back = 0.150 + (0.138 - 0.150) * t;
          const cz_base = 0.054 + (0.044 - 0.054) * t;

          // Seamless 360-degree wrap:
          // Front (+Z, sinA > 0) preserves authentic front geometry & bust shape
          // Sides (cosA near ±1) widen to rx_side to fully enclose side ribs and waist
          // Back (-Z, sinA < 0) extends to rz_back to fully enclose spine and upper back
          const eff_cz = cz_base - (1.0 - sinA) * 0.022;
          let rz_val = sinA >= 0 ? rz_front : rz_back;
          if (sinA > 0.1) {
            rz_val += sinA * 0.010 * Math.sin(t * Math.PI);
          }
          rx = rx_front + (rx_side - rx_front) * Math.abs(cosA);
          rz = rz_val;
          cz = eff_cz;
        } else {
          // Upper chest, square neckline and shoulder straps
          const t = (baseY - bustY) / (strapTopY - bustY);
          const rx_front = 0.137 + (0.130 - 0.137) * t;
          const rx_side = 0.165 + (0.150 - 0.165) * t;
          const rz_front = 0.112 + (0.085 - 0.112) * t;
          const rz_back = 0.138 + (0.100 - 0.138) * t;
          const cz_base = 0.044 + (0.005 - 0.044) * t;

          const eff_cz = cz_base - (1.0 - sinA) * 0.018;
          let rz_val = sinA >= 0 ? rz_front : rz_back;

          // Square neckline cutout in front: sinA > 0.35 (front center |X| < 0.078)
          const isFrontCenter = sinA > 0.35 && Math.abs(cosA * rx_front) < 0.078;
          if (isFrontCenter) {
            // Drop front neckline to upper bust level (1.365)
            y = Math.min(y, bustY + 0.025 + (1 - sinA) * 0.03);
            rz_val *= 0.94;
          } else if (sinA < -0.35) {
            // Back neck: gently dips to 1.415
            y = Math.min(y, 1.415 + (1 + sinA) * 0.02);
          }

          rx = rx_front + (rx_side - rx_front) * Math.abs(cosA);
          rz = rz_val;
          cz = eff_cz;
        }

        const posX = cosA * rx;
        const posZ = sinA * rz + cz;
        const posY = y;

        positions.push(posX, posY, posZ);

        // UV: Orthographic front mapping for front faces, seamless wrap for back
        const uvU = 0.5 + (posX / 0.70);
        const uvV = (posY - 0.55) / 0.95;
        uvs.push(Math.max(0, Math.min(1, uvU)), Math.max(0, Math.min(1, uvV)));

        // Rigging weights anchored to avatar spine bones
        let i0 = HIPS_IDX, i1 = SPINE_IDX, i2 = SPINE1_IDX, i3 = SPINE2_IDX;
        let w0 = 0, w1 = 0, w2 = 0, w3 = 0;

        if (posY >= 1.40) {
          // Straps / shoulders
          if (posX > 0.06) {
            i0 = SPINE2_IDX; i1 = L_SHOULDER_IDX;
            w0 = 0.55; w1 = 0.45;
          } else if (posX < -0.06) {
            i0 = SPINE2_IDX; i1 = R_SHOULDER_IDX;
            w0 = 0.55; w1 = 0.45;
          } else {
            i0 = SPINE2_IDX; i1 = SPINE1_IDX;
            w0 = 0.85; w1 = 0.15;
          }
        } else if (posY >= 1.30) {
          // Chest / bust
          i0 = SPINE2_IDX; i1 = SPINE1_IDX;
          const t = (posY - 1.30) / 0.10;
          w0 = 0.50 + 0.40 * t;
          w1 = 1.0 - w0;
        } else if (posY >= 1.20) {
          // Mid torso
          i0 = SPINE1_IDX; i1 = SPINE_IDX;
          const t = (posY - 1.20) / 0.10;
          w0 = 0.50 + 0.40 * t;
          w1 = 1.0 - w0;
        } else {
          // Waist
          i0 = SPINE_IDX; i1 = HIPS_IDX;
          const t = (posY - waistY) / 0.065;
          w0 = 0.40 + 0.50 * t;
          w1 = 1.0 - w0;
        }
        skinIndices.push(i0, i1, i2, i3);
        skinWeights.push(w0, w1, w2, w3);
      }
    }

    for (let iy = 0; iy < ySegments; iy++) {
      for (let ix = 0; ix < radialSegments; ix++) {
        const a = iy * (radialSegments + 1) + ix;
        const b = (iy + 1) * (radialSegments + 1) + ix;
        const c = (iy + 1) * (radialSegments + 1) + (ix + 1);
        const d = iy * (radialSegments + 1) + (ix + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    parts.push(makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices }));
  }

  // 1B. Volumetric 3D Puff Sleeves (Left and Right)
  // Perfectly positioned around avatar shoulder joints (X=±0.138, Y=1.430, Z=-0.015)
  function makePuffSleeve(isLeft) {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const sideSign = isLeft ? 1 : -1;
    const shoulderJoint = isLeft ? L_SHOULDER_IDX : R_SHOULDER_IDX;
    const armJoint = isLeft ? L_ARM_IDX : R_ARM_IDX;

    // Center of puff volume anchored over shoulder socket and upper deltoid
    const centerX = sideSign * 0.138;
    const centerY = 1.430;
    const centerZ = -0.015;

    const latSegments = 16;
    const lonSegments = 24;

    for (let ilat = 0; ilat <= latSegments; ilat++) {
      const v = ilat / latSegments;
      const phi = v * Math.PI; // 0 (top of shoulder) to PI (bottom cuff)

      // Radius profile: balloon out in middle, gather tight at bottom cuff
      let r = Math.sin(phi) * 0.058;
      let yOffset = Math.cos(phi) * 0.055;

      // Add puff gather ripples
      r += Math.sin(phi * 3.0) * 0.006;

      // Elastic frill hem at the lower cuff opening
      if (v > 0.82) {
        const frillT = (v - 0.82) / 0.18;
        r = 0.038 + Math.sin(v * 35) * 0.007 * frillT;
      }

      for (let ilon = 0; ilon <= lonSegments; ilon++) {
        const u = ilon / lonSegments;
        const theta = u * Math.PI * 2;

        const px = centerX + sideSign * (0.012 + Math.cos(theta) * r);
        const py = centerY + yOffset;
        const pz = centerZ + Math.sin(theta) * (r * 0.95);

        positions.push(px, py, pz);

        // UV mapping: map to the sleeve area in the texture
        const uvU = isLeft ? (0.75 + (px - centerX) * 1.5) : (0.25 + (px - centerX) * 1.5);
        const uvV = 0.72 + (py - 1.35) * 1.2;
        uvs.push(Math.max(0, Math.min(1, uvU)), Math.max(0, Math.min(1, uvV)));

        // Rigging: top firmly anchored to shoulder/spine2, lower follows arm
        let i0 = shoulderJoint, i1 = SPINE2_IDX, i2 = armJoint, i3 = 0;
        let w0 = 0, w1 = 0, w2 = 0, w3 = 0;

        if (v < 0.35) {
          // Shoulder cap anchor
          w0 = 0.60; w1 = 0.30; w2 = 0.10;
        } else if (v < 0.70) {
          const t = (v - 0.35) / 0.35;
          w0 = 0.60 * (1 - t) + 0.25 * t;
          w1 = 0.30 * (1 - t);
          w2 = 0.10 * (1 - t) + 0.75 * t;
        } else {
          // Lower bicep cuff
          w0 = 0.20; w1 = 0.0; w2 = 0.80;
        }

        skinIndices.push(i0, i1, i2, i3);
        skinWeights.push(w0, w1, w2, w3);
      }
    }

    for (let ilat = 0; ilat < latSegments; ilat++) {
      for (let ilon = 0; ilon < lonSegments; ilon++) {
        const a = ilat * (lonSegments + 1) + ilon;
        const b = (ilat + 1) * (lonSegments + 1) + ilon;
        const c = (ilat + 1) * (lonSegments + 1) + (ilon + 1);
        const d = ilat * (lonSegments + 1) + (ilon + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices });
  }

  parts.push(makePuffSleeve(true));  // Left puff sleeve
  parts.push(makePuffSleeve(false)); // Right puff sleeve

  // 1C. Waistband Sash & 3D Tied Bow Knot in Front
  // Aligned directly onto avatar waistline at Y=1.135, Z=0.155 (flush with waistband)
  {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const bowCenterY = 1.135;
    const bowCenterZ = 0.155;

    const addBox = (cx, cy, cz, w, h, d, u0, v0) => {
      const startIdx = positions.length / 3;
      const hw = w/2, hh = h/2, hd = d/2;
      const corners = [
        [-hw, -hh,  hd], [ hw, -hh,  hd], [ hw,  hh,  hd], [-hw,  hh,  hd], // front
        [-hw, -hh, -hd], [ hw, -hh, -hd], [ hw,  hh, -hd], [-hw,  hh, -hd], // back
      ];
      corners.forEach(([x, y, z]) => {
        positions.push(cx + x, cy + y, cz + z);
        uvs.push(u0, v0);
        skinIndices.push(SPINE_IDX, HIPS_IDX, 0, 0);
        skinWeights.push(0.60, 0.40, 0, 0);
      });
      const faces = [
        [0, 1, 2, 3], [5, 4, 7, 6], // front, back
        [4, 0, 3, 7], [1, 5, 6, 2], // left, right
        [3, 2, 6, 7], [4, 5, 1, 0]  // top, bottom
      ];
      faces.forEach(([a, b, c, d]) => {
        indices.push(startIdx + a, startIdx + b, startIdx + c);
        indices.push(startIdx + a, startIdx + c, startIdx + d);
      });
    };

    // Add knot
    addBox(0, bowCenterY, bowCenterZ, 0.026, 0.028, 0.018, 0.5, 0.62);

    // Left bow loop
    addBox(0.040, bowCenterY + 0.003, bowCenterZ + 0.002, 0.052, 0.032, 0.018, 0.56, 0.62);
    // Right bow loop
    addBox(-0.040, bowCenterY + 0.003, bowCenterZ + 0.002, 0.052, 0.032, 0.018, 0.44, 0.62);

    // Left and right ribbon sash tails draping naturally down over skirt
    const addRibbonTail = (startX, dirX) => {
      const segs = 8;
      const startIdx = positions.length / 3;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const ry = bowCenterY - 0.015 - t * 0.18; // Drapes down to Y=0.94
        const rx = startX + dirX * t * 0.030;
        const rz = bowCenterZ + 0.003 + t * 0.015;
        const rw = 0.024 * (1.0 - t * 0.15);

        positions.push(rx - rw/2, ry, rz);
        positions.push(rx + rw/2, ry, rz);
        uvs.push(0.5 + rx, (ry - 0.55) / 0.95);
        uvs.push(0.5 + rx, (ry - 0.55) / 0.95);

        const spineW = Math.max(0.1, 0.6 * (1 - t));
        skinIndices.push(SPINE_IDX, HIPS_IDX, 0, 0);
        skinIndices.push(SPINE_IDX, HIPS_IDX, 0, 0);
        skinWeights.push(spineW, 1.0 - spineW, 0, 0);
        skinWeights.push(spineW, 1.0 - spineW, 0, 0);
      }
      for (let s = 0; s < segs; s++) {
        const i0 = startIdx + s * 2;
        indices.push(i0, i0 + 1, i0 + 3);
        indices.push(i0, i0 + 3, i0 + 2);
      }
    };

    addRibbonTail(0.014, 0.6);  // Left tail
    addRibbonTail(-0.014, -0.6); // Right tail

    parts.push(makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices }));
  }

  // 1D. 3-Tier Layered Ruffled Skirt
  // Tier 1 (Waist to Upper Thigh): Y=1.135 to 0.96 (connecting seamlessly with bodice waist)
  // Tier 2 (Mid Thigh Ruffle):     Y=0.97 to 0.79
  // Tier 3 (Lower Flounce Ruffle): Y=0.80 to 0.63
  function makeSkirtTier({ topY, botY, topRx, topRz, botRx, botRz, topCz, botCz, pleatCount, pleatDepth, uvVMin, uvVMax }) {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const ySegs = 12;
    const radialSegs = 40;

    for (let iy = 0; iy <= ySegs; iy++) {
      const v = iy / ySegs;
      const y = topY + (botY - topY) * v;
      const t = (topY - y) / (topY - botY); // 0 at top, 1 at bottom

      // Exponential flare
      const rx_front = topRx + (botRx - topRx) * Math.pow(t, 1.25);
      const rx_side = (topRx + 0.038) + ((botRx + 0.035) - (topRx + 0.038)) * Math.pow(t, 1.25);
      const rz_front = topRz + (botRz - topRz) * Math.pow(t, 1.20);
      const rz_back = (topRz + 0.055) + ((botRz + 0.045) - (topRz + 0.055)) * Math.pow(t, 1.20);
      const cz_base = topCz + (botCz - topCz) * t;

      for (let ix = 0; ix <= radialSegs; ix++) {
        const u = ix / radialSegs;
        const angle = u * Math.PI * 2;
        const cosA = Math.cos(angle); // Z direction (> 0 front, < 0 back)
        const sinA = Math.sin(angle); // X direction

        // Physical wavy ruffles (flutes) at the bottom hem of each tier
        const waveStrength = Math.pow(t, 1.4);
        const wave = Math.sin(angle * pleatCount) * pleatDepth * waveStrength;

        const eff_cz = cz_base - (1.0 - cosA) * 0.022;
        const curRz = (cosA >= 0 ? rz_front : rz_back) + wave;
        const curRx = (rx_front + (rx_side - rx_front) * Math.abs(sinA)) + wave;

        const px = sinA * curRx;
        const pz = cosA * curRz + eff_cz;
        const py = y;

        positions.push(px, py, pz);

        // UV: Front orthographic projection with graceful back continuation
        const uvU = 0.5 + (px / 0.75);
        const uvV = uvVMin + (uvVMax - uvVMin) * (1 - v);
        uvs.push(Math.max(0, Math.min(1, uvU)), Math.max(0, Math.min(1, uvV)));

        // Skirt Rigging: anchored to Hips and Waist, following Thigh strides smoothly
        let i0 = HIPS_IDX, i1 = SPINE_IDX, i2 = L_THIGH_IDX, i3 = R_THIGH_IDX;
        let w0 = 1.0, w1 = 0, w2 = 0, w3 = 0;

        if (py > 1.05) {
          // Waist transition
          const wt = (py - 1.05) / 0.085;
          w1 = wt * 0.45;
          w0 = 1.0 - w1;
        } else {
          const legInf = Math.min(0.45, (1.05 - py) * 0.9);
          if (px > 0.01) {
            i1 = L_THIGH_IDX; i2 = L_KNEE_IDX;
            w1 = legInf * 0.75; w2 = legInf * 0.25;
            w0 = 1.0 - (w1 + w2);
          } else if (px < -0.01) {
            i1 = R_THIGH_IDX; i2 = R_KNEE_IDX;
            w1 = legInf * 0.75; w2 = legInf * 0.25;
            w0 = 1.0 - (w1 + w2);
          } else {
            i1 = L_THIGH_IDX; i2 = R_THIGH_IDX;
            w1 = legInf * 0.50; w2 = legInf * 0.50;
            w0 = 1.0 - (w1 + w2);
          }
        }

        skinIndices.push(i0, i1, i2, i3);
        skinWeights.push(w0, w1, w2, w3);
      }
    }

    for (let iy = 0; iy < ySegs; iy++) {
      for (let ix = 0; ix < radialSegs; ix++) {
        const a = iy * (radialSegs + 1) + ix;
        const b = (iy + 1) * (radialSegs + 1) + ix;
        const c = (iy + 1) * (radialSegs + 1) + (ix + 1);
        const d = iy * (radialSegs + 1) + (ix + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices });
  }

  // Tier 1 (Waist to Upper Thigh) - connects directly to bodice at Y=1.135
  parts.push(makeSkirtTier({
    topY: 1.135, botY: 0.96,
    topRx: 0.120, topRz: 0.095, topCz: 0.054,
    botRx: 0.215, botRz: 0.165, botCz: 0.030,
    pleatCount: 16, pleatDepth: 0.012,
    uvVMin: 0.42, uvVMax: 0.63
  }));

  // Tier 2 (Mid Thigh Ruffle Flounce)
  parts.push(makeSkirtTier({
    topY: 0.97, botY: 0.79,
    topRx: 0.220, topRz: 0.170, topCz: 0.030,
    botRx: 0.285, botRz: 0.225, botCz: 0.022,
    pleatCount: 20, pleatDepth: 0.016,
    uvVMin: 0.22, uvVMax: 0.44
  }));

  // Tier 3 (Bottom Layer Flounce with wavy hem)
  parts.push(makeSkirtTier({
    topY: 0.80, botY: 0.63,
    topRx: 0.290, topRz: 0.230, topCz: 0.022,
    botRx: 0.355, botRz: 0.285, botCz: 0.015,
    pleatCount: 24, pleatDepth: 0.022,
    uvVMin: 0.02, uvVMax: 0.24
  }));

  // Merge all garment parts into one unified SkinnedMesh geometry
  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SLIP DRESS & INDIAN BANARASI SILK SAREE
// ─────────────────────────────────────────────────────────────────────────────
function createSlipDressGeometry({ hemY = 0.55, hemRx = 0.330, hemRz = 0.265, pleatCount = 12, pleatDepth = 0.015 }) {
  const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
  const ySegs = 40;
  const radialSegs = 48;
  const waistY = 1.15;
  const bustY = 1.34;
  const topY = 1.48;

  for (let iy = 0; iy <= ySegs; iy++) {
    const v = iy / ySegs;
    const y = hemY + (topY - hemY) * v;

    let rx, rz, cz = 0.025;
    if (y < waistY) {
      const t = (waistY - y) / (waistY - hemY);
      rx = 0.180 + (hemRx - 0.180) * Math.pow(t, 1.25);
      rz = 0.135 + (hemRz - 0.135) * Math.pow(t, 1.20);
      cz = 0.025 * (1 - t) + 0.015 * t;
    } else if (y < bustY) {
      const t = (y - waistY) / (bustY - waistY);
      rx = 0.180 + (0.195 - 0.180) * Math.sin(t * Math.PI * 0.5);
      rz = 0.135 + (0.150 - 0.135) * Math.sin(t * Math.PI * 0.5);
      cz = 0.025 + 0.015 * t;
    } else {
      const t = (y - bustY) / (topY - bustY);
      rx = 0.195 - 0.045 * t;
      rz = 0.150 - 0.055 * t;
      cz = 0.040 - 0.020 * t;
    }

    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const angle = u * Math.PI * 2;

      let fold = 0;
      if (y < waistY) {
        const foldStrength = Math.pow((waistY - y) / (waistY - hemY), 1.2);
        fold = Math.sin(angle * pleatCount) * pleatDepth * foldStrength;
      }

      const curRx = rx + fold;
      const curRz = rz + fold;

      const px = Math.sin(angle) * curRx;
      const pz = Math.cos(angle) * curRz + cz;
      const py = y;

      positions.push(px, py, pz);
      uvs.push(0.5 + (px / (hemRx * 2.2)), (py - hemY) / (topY - hemY));

      let i0 = HIPS_IDX, i1 = SPINE_IDX, i2 = L_THIGH_IDX, i3 = R_THIGH_IDX;
      let w0 = 1.0, w1 = 0, w2 = 0, w3 = 0;

      if (y >= 1.34) {
        i0 = SPINE2_IDX; i1 = SPINE1_IDX;
        w0 = 0.8; w1 = 0.2;
      } else if (y >= 1.18) {
        i0 = SPINE1_IDX; i1 = SPINE_IDX;
        w0 = 0.7; w1 = 0.3;
      } else if (y >= 1.02) {
        i0 = HIPS_IDX; i1 = SPINE_IDX;
        w0 = 0.7; w1 = 0.3;
      } else {
        const t = (1.02 - y) / (1.02 - hemY);
        const legInf = Math.min(0.40, t * 0.40);
        if (px > 0.01) {
          i1 = L_THIGH_IDX; i2 = L_KNEE_IDX;
          w1 = legInf * 0.75; w2 = legInf * 0.25; w0 = 1.0 - (w1 + w2);
        } else if (px < -0.01) {
          i1 = R_THIGH_IDX; i2 = R_KNEE_IDX;
          w1 = legInf * 0.75; w2 = legInf * 0.25; w0 = 1.0 - (w1 + w2);
        } else {
          w1 = legInf * 0.5; w2 = legInf * 0.5; w0 = 1.0 - (w1 + w2);
        }
      }

      skinIndices.push(i0, i1, i2, i3);
      skinWeights.push(w0, w1, w2, w3);
    }
  }

  for (let iy = 0; iy < ySegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * (radialSegs + 1) + ix;
      const b = (iy + 1) * (radialSegs + 1) + ix;
      const c = (iy + 1) * (radialSegs + 1) + (ix + 1);
      const d = iy * (radialSegs + 1) + (ix + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  return makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TOP: TAILORED SHIRT / CASUAL TOP WITH SLEEVES
// ─────────────────────────────────────────────────────────────────────────────
function createTopGeometry() {
  const parts = [];

  // Torso / Bodice from waist Y=1.12 to neck Y=1.48
  {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const ySegs = 14;
    const radialSegs = 32;
    for (let iy = 0; iy <= ySegs; iy++) {
      const v = iy / ySegs;
      const y = 1.12 + (1.48 - 1.12) * v;
      let rx = 0.170, rz = 0.125, cz = 0.025;
      if (y > 1.24 && y < 1.38) {
        rx = 0.182; rz = 0.142; cz = 0.035;
      }

      for (let ix = 0; ix <= radialSegs; ix++) {
        const u = ix / radialSegs;
        const angle = u * Math.PI * 2;
        const px = Math.sin(angle) * rx;
        const pz = Math.cos(angle) * rz + cz;
        const py = y;

        positions.push(px, py, pz);
        uvs.push(0.5 + px / 0.45, (py - 1.12) / 0.36);

        let i0 = SPINE1_IDX, i1 = SPINE2_IDX, w0 = 0.5, w1 = 0.5;
        if (y > 1.32) { i0 = SPINE2_IDX; i1 = NECK_IDX; w0 = 0.85; w1 = 0.15; }
        else if (y < 1.20) { i0 = SPINE_IDX; i1 = SPINE1_IDX; w0 = 0.7; w1 = 0.3; }
        skinIndices.push(i0, i1, 0, 0);
        skinWeights.push(w0, w1, 0, 0);
      }
    }
    for (let iy = 0; iy < ySegs; iy++) {
      for (let ix = 0; ix < radialSegs; ix++) {
        const a = iy * (radialSegs + 1) + ix;
        const b = (iy + 1) * (radialSegs + 1) + ix;
        const c = (iy + 1) * (radialSegs + 1) + (ix + 1);
        const d = iy * (radialSegs + 1) + (ix + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    parts.push(makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices }));
  }

  // Left and Right Fitted Sleeves
  function makeTopSleeve(isLeft) {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const side = isLeft ? 1 : -1;
    const armIdx = isLeft ? L_ARM_IDX : R_ARM_IDX;
    const shldIdx = isLeft ? L_SHOULDER_IDX : R_SHOULDER_IDX;

    const segsY = 10;
    const radSegs = 16;
    for (let iy = 0; iy <= segsY; iy++) {
      const v = iy / segsY;
      const py = 1.44 - v * 0.22; // Upper arm length down to Y=1.22
      const pxBase = side * (0.17 + v * 0.05);
      const r = 0.058 - v * 0.010;

      for (let ix = 0; ix <= radSegs; ix++) {
        const u = ix / radSegs;
        const angle = u * Math.PI * 2;
        const px = pxBase + side * Math.cos(angle) * r;
        const pz = 0.02 + Math.sin(angle) * r;

        positions.push(px, py, pz);
        uvs.push(isLeft ? 0.8 + u * 0.2 : u * 0.2, v);

        skinIndices.push(armIdx, shldIdx, 0, 0);
        skinWeights.push(0.7 + v * 0.3, 0.3 - v * 0.3, 0, 0);
      }
    }
    for (let iy = 0; iy < segsY; iy++) {
      for (let ix = 0; ix < radSegs; ix++) {
        const a = iy * (radSegs + 1) + ix;
        const b = (iy + 1) * (radSegs + 1) + ix;
        const c = (iy + 1) * (radSegs + 1) + (ix + 1);
        const d = iy * (radSegs + 1) + (ix + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    return makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices });
  }

  parts.push(makeTopSleeve(true));
  parts.push(makeTopSleeve(false));

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TROUSERS: DENIM JEANS WITH SEPARATE CONTOURED LEGS
// ─────────────────────────────────────────────────────────────────────────────
function createTrousersGeometry() {
  const parts = [];

  // Waistband & Pelvis from Y=1.16 down to crotch Y=0.98
  {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const ySegs = 8;
    const radialSegs = 32;
    for (let iy = 0; iy <= ySegs; iy++) {
      const v = iy / ySegs;
      const y = 1.16 - (1.16 - 0.98) * v;
      const rx = 0.170 + v * 0.015;
      const rz = 0.125 + v * 0.020;
      const cz = 0.025;

      for (let ix = 0; ix <= radialSegs; ix++) {
        const angle = (ix / radialSegs) * Math.PI * 2;
        const px = Math.sin(angle) * rx;
        const pz = Math.cos(angle) * rz + cz;
        positions.push(px, y, pz);
        uvs.push(ix / radialSegs, 0.75 + v * 0.25);
        skinIndices.push(HIPS_IDX, SPINE_IDX, 0, 0);
        skinWeights.push(0.9, 0.1, 0, 0);
      }
    }
    for (let iy = 0; iy < ySegs; iy++) {
      for (let ix = 0; ix < radialSegs; ix++) {
        const a = iy * (radialSegs + 1) + ix;
        const b = (iy + 1) * (radialSegs + 1) + ix;
        const c = (iy + 1) * (radialSegs + 1) + (ix + 1);
        const d = iy * (radialSegs + 1) + (ix + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    parts.push(makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices }));
  }

  // Left & Right Pant Legs from crotch Y=0.98 down to ankle Y=0.18
  function makePantLeg(isLeft) {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const side = isLeft ? 1 : -1;
    const thighIdx = isLeft ? L_THIGH_IDX : R_THIGH_IDX;
    const kneeIdx = isLeft ? L_KNEE_IDX : R_KNEE_IDX;

    const ySegs = 24;
    const radSegs = 20;
    for (let iy = 0; iy <= ySegs; iy++) {
      const v = iy / ySegs;
      const y = 0.98 - (0.98 - 0.18) * v;
      const thighX = side * (0.095 - v * 0.020);
      let r = 0.095 - v * 0.032; // Taper from thigh to ankle

      for (let ix = 0; ix <= radSegs; ix++) {
        const angle = (ix / radSegs) * Math.PI * 2;
        const px = thighX + Math.sin(angle) * r;
        const pz = 0.020 + Math.cos(angle) * (r * 0.95);

        positions.push(px, y, pz);
        uvs.push((isLeft ? 0 : 0.5) + (ix / radSegs) * 0.5, (1 - v) * 0.75);

        let wThigh = 1.0, wKnee = 0.0;
        if (y < 0.60) {
          const kt = (0.60 - y) / (0.60 - 0.18);
          wKnee = 0.4 + kt * 0.5;
          wThigh = 1.0 - wKnee;
        } else if (y < 0.80) {
          const kt = (0.80 - y) / 0.20;
          wKnee = kt * 0.4;
          wThigh = 1.0 - wKnee;
        }

        skinIndices.push(thighIdx, kneeIdx, HIPS_IDX, 0);
        skinWeights.push(wThigh, wKnee, 0, 0);
      }
    }
    for (let iy = 0; iy < ySegs; iy++) {
      for (let ix = 0; ix < radSegs; ix++) {
        const a = iy * (radSegs + 1) + ix;
        const b = (iy + 1) * (radSegs + 1) + ix;
        const c = (iy + 1) * (radSegs + 1) + (ix + 1);
        const d = iy * (radSegs + 1) + (ix + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }
    return makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices });
  }

  parts.push(makePantLeg(true));
  parts.push(makePantLeg(false));

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXPORT UTILITY
// ─────────────────────────────────────────────────────────────────────────────
const exporter = new GLTFExporter();

function exportGlb(mesh, filename) {
  return new Promise((resolve, reject) => {
    exporter.parse(
      mesh,
      (gltf) => {
        const dest = path.join(outDir, filename);
        fs.writeFileSync(dest, Buffer.from(gltf));
        console.log(`Saved ${filename} (${gltf.byteLength} bytes) to ${dest}`);
        resolve();
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

async function run() {
  console.log('Generating authentic 3D garment GLB assets...');

  // 1. Floral Puff-Sleeve Dress with square neckline, waist bow & 3 ruffled tiers
  console.log('1. Generating dress_floral_puff.glb...');
  const floralGeom = createFloralPuffDressGeometry();
  const floralMat = new THREE.MeshPhysicalMaterial({
    name: 'Dress_Floral_Puff_Material',
    color: new THREE.Color('#e5779c'), // Authentic floral pink
    roughness: 0.35,
    metalness: 0.05,
    clearcoat: 0.25,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide
  });
  const floralMesh = new THREE.Mesh(floralGeom, floralMat);
  floralMesh.name = 'Dress_Floral_Puff_Mesh';
  await exportGlb(floralMesh, 'dress_floral_puff.glb');

  // 2. Slip Midi Dress
  console.log('2. Generating dress_slip.glb...');
  const slipGeom = createSlipDressGeometry({ hemY: 0.55, hemRx: 0.285, hemRz: 0.245 });
  const slipMat = new THREE.MeshPhysicalMaterial({
    name: 'Dress_Slip_Material',
    color: new THREE.Color('#d9779f'),
    roughness: 0.24,
    metalness: 0.22,
    clearcoat: 0.55,
    side: THREE.DoubleSide
  });
  const slipMesh = new THREE.Mesh(slipGeom, slipMat);
  slipMesh.name = 'Dress_Slip_Mesh';
  await exportGlb(slipMesh, 'dress_slip.glb');

  // 3. Indian Ethnic Banarasi Saree
  console.log('3. Generating dress_saree.glb...');
  const sareeGeom = createSlipDressGeometry({ hemY: 0.22, hemRx: 0.310, hemRz: 0.270, pleatCount: 16, pleatDepth: 0.022 });
  const sareeMat = new THREE.MeshPhysicalMaterial({
    name: 'Dress_Saree_Material',
    color: new THREE.Color('#831843'),
    roughness: 0.28,
    metalness: 0.38,
    clearcoat: 0.65,
    side: THREE.DoubleSide
  });
  const sareeMesh = new THREE.Mesh(sareeGeom, sareeMat);
  sareeMesh.name = 'Dress_Saree_Mesh';
  await exportGlb(sareeMesh, 'dress_saree.glb');

  // 4. Tailored Top / Shirt
  console.log('4. Generating top_casual.glb...');
  const topGeom = createTopGeometry();
  const topMat = new THREE.MeshPhysicalMaterial({
    name: 'Top_Casual_Material',
    color: new THREE.Color('#ffffff'),
    roughness: 0.55,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const topMesh = new THREE.Mesh(topGeom, topMat);
  topMesh.name = 'Top_Casual_Mesh';
  await exportGlb(topMesh, 'top_casual.glb');

  // 5. Denim Trousers / Jeans
  console.log('5. Generating trouser_jeans.glb...');
  const trouserGeom = createTrousersGeometry();
  const trouserMat = new THREE.MeshPhysicalMaterial({
    name: 'Trouser_Jeans_Material',
    color: new THREE.Color('#2563eb'),
    roughness: 0.78,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  const trouserMesh = new THREE.Mesh(trouserGeom, trouserMat);
  trouserMesh.name = 'Trouser_Jeans_Mesh';
  await exportGlb(trouserMesh, 'trouser_jeans.glb');

  console.log('All authentic 3D garment GLB assets successfully generated!');
}

run().catch(console.error);
