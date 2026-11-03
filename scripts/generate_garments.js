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

  // 1A. Bodice with Square Neckline & Princess Seams
  // From waist Y=1.15 to chest Y=1.34; shoulder straps rise to Y=1.45
  {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const ySegments = 16;
    const radialSegments = 36;
    const waistY = 1.15;
    const bustY = 1.34;
    const strapTopY = 1.45;

    for (let iy = 0; iy <= ySegments; iy++) {
      const v = iy / ySegments;
      const y = waistY + (strapTopY - waistY) * v;

      // Base radius calculation
      let rx, rz, cz = 0.025;
      if (y <= bustY) {
        const t = (y - waistY) / (bustY - waistY);
        rx = 0.165 + (0.180 - 0.165) * Math.sin(t * Math.PI * 0.5);
        rz = 0.118 + (0.142 - 0.118) * Math.sin(t * Math.PI * 0.5);
        cz = 0.025 + 0.012 * t;
      } else {
        // Upper chest / straps
        const t = (y - bustY) / (strapTopY - bustY);
        rx = 0.180 - 0.040 * t;
        rz = 0.142 - 0.050 * t;
        cz = 0.037 - 0.015 * t;
      }

      for (let ix = 0; ix <= radialSegments; ix++) {
        const u = ix / radialSegments;
        const angle = u * Math.PI * 2;
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);

        // Front is sinA > 0 (Z > 0); Back is sinA < 0 (Z < 0)
        let curRx = rx;
        let curRz = rz;

        // Front bust contouring
        if (y > waistY && y < bustY + 0.03 && sinA > 0.1) {
          const bt = Math.sin(((y - waistY) / (bustY - waistY)) * Math.PI);
          curRz += Math.sin(angle) * 0.016 * bt;
        }

        let posX = cosA * curRx;
        let posZ = sinA * curRz + cz;
        let posY = y;

        // Square neckline cutout in front: push inwards or open up
        if (y > bustY && sinA > 0.3) {
          // Front neck cutout: push back towards chest wall
          const neckCut = Math.min(1.0, (y - bustY) / 0.08);
          if (Math.abs(posX) < 0.09) {
            posZ -= 0.025 * neckCut;
            curRz *= (1 - 0.15 * neckCut);
          }
        }

        positions.push(posX, posY, posZ);

        // UV: Orthographic front mapping for front faces, seamless wrap for back
        // Image spans Y=[0.55, 1.48] and X=[-0.38, 0.38]
        const uvU = 0.5 + (posX / 0.70);
        const uvV = (posY - 0.55) / 0.95;
        uvs.push(Math.max(0, Math.min(1, uvU)), Math.max(0, Math.min(1, uvV)));

        // Skin weights: smoothly blend Spine2, Spine1, Spine, Hips
        let i0 = HIPS_IDX, i1 = SPINE_IDX, i2 = SPINE1_IDX, i3 = SPINE2_IDX;
        let w0 = 0, w1 = 0, w2 = 0, w3 = 0;

        if (y >= 1.34) {
          w3 = 0.85; w2 = 0.15;
        } else if (y >= 1.25) {
          const t = (y - 1.25) / 0.09;
          w3 = t * 0.85; w2 = 1.0 - w3;
        } else if (y >= 1.18) {
          const t = (y - 1.18) / 0.07;
          w2 = t * 0.80; w1 = 1.0 - w2;
        } else {
          const t = (y - waistY) / 0.03;
          w1 = t * 0.60; w0 = 1.0 - w1;
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
  // Each sleeve is a bulbous ellipsoid with gathered ruffled elastic cuff
  function makePuffSleeve(isLeft) {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const sideSign = isLeft ? 1 : -1;
    const shoulderJoint = isLeft ? L_SHOULDER_IDX : R_SHOULDER_IDX;
    const armJoint = isLeft ? L_ARM_IDX : R_ARM_IDX;

    // Center of puff volume in upper arm space
    const centerX = sideSign * 0.20;
    const centerY = 1.37;
    const centerZ = 0.02;

    const latSegments = 14;
    const lonSegments = 20;

    for (let ilat = 0; ilat <= latSegments; ilat++) {
      const v = ilat / latSegments;
      const phi = v * Math.PI; // 0 (top of shoulder) to PI (bottom cuff)

      // Radius profile: balloon out in middle, gather tight at bottom cuff
      let r = Math.sin(phi) * 0.072;
      let yOffset = Math.cos(phi) * 0.075;

      // Add puff gather ripples
      r += Math.sin(phi * 2.5) * 0.012;

      // Elastic frill hem at the lower cuff opening
      if (v > 0.85) {
        r = 0.045 + Math.sin(v * 30) * 0.008; // Ruffled frill cuff
      }

      for (let ilon = 0; ilon <= lonSegments; ilon++) {
        const u = ilon / lonSegments;
        const theta = u * Math.PI * 2;

        const px = centerX + sideSign * (Math.cos(theta) * r + 0.015);
        const py = centerY + yOffset;
        const pz = centerZ + Math.sin(theta) * r;

        positions.push(px, py, pz);

        // UV mapping: map to the sleeve area in the texture
        const uvU = isLeft ? (0.75 + (px - centerX) * 1.5) : (0.25 + (px - centerX) * 1.5);
        const uvV = 0.70 + (py - 1.28) * 1.2;
        uvs.push(Math.max(0, Math.min(1, uvU)), Math.max(0, Math.min(1, uvV)));

        // Rigging: 50% Shoulder, 50% Arm at top; 10% Shoulder, 90% Arm at cuff
        const armWeight = Math.min(1.0, 0.4 + 0.6 * v);
        skinIndices.push(armJoint, shoulderJoint, SPINE2_IDX, HIPS_IDX);
        skinWeights.push(armWeight, 1.0 - armWeight, 0, 0);
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
  {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const bowCenterY = 1.15;
    const bowCenterZ = 0.145;

    // Center knot
    const knotW = 0.024, knotH = 0.028, knotD = 0.022;
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
        skinIndices.push(HIPS_IDX, SPINE_IDX, 0, 0);
        skinWeights.push(0.85, 0.15, 0, 0);
      });
      // 6 quad faces
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
    addBox(0, bowCenterY, bowCenterZ, knotW, knotH, knotD, 0.5, 0.62);

    // Left bow loop
    addBox(0.045, bowCenterY + 0.005, bowCenterZ + 0.005, 0.065, 0.040, 0.024, 0.56, 0.62);
    // Right bow loop
    addBox(-0.045, bowCenterY + 0.005, bowCenterZ + 0.005, 0.065, 0.040, 0.024, 0.44, 0.62);

    // Left ribbon sash tail (drapes down over skirt)
    const addRibbonTail = (startX, dirX) => {
      const segs = 6;
      const startIdx = positions.length / 3;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const ry = bowCenterY - 0.02 - t * 0.18; // Drapes down to Y=0.95
        const rx = startX + dirX * t * 0.035;
        const rz = bowCenterZ + 0.008 - t * 0.015;
        const rw = 0.028 * (1.0 - t * 0.2);

        positions.push(rx - rw/2, ry, rz);
        positions.push(rx + rw/2, ry, rz);
        uvs.push(0.5 + rx, (ry - 0.55) / 0.95);
        uvs.push(0.5 + rx, (ry - 0.55) / 0.95);

        skinIndices.push(HIPS_IDX, SPINE_IDX, 0, 0);
        skinIndices.push(HIPS_IDX, SPINE_IDX, 0, 0);
        skinWeights.push(0.9, 0.1, 0, 0);
        skinWeights.push(0.9, 0.1, 0, 0);
      }
      for (let s = 0; s < segs; s++) {
        const i0 = startIdx + s * 2;
        indices.push(i0, i0 + 1, i0 + 3);
        indices.push(i0, i0 + 3, i0 + 2);
      }
    };

    addRibbonTail(0.018, 0.7);  // Left tail
    addRibbonTail(-0.018, -0.6); // Right tail

    parts.push(makeRiggedGeometry({ positions, uvs, skinIndices, skinWeights, indices }));
  }

  // 1D. 3-Tier Layered Ruffled Skirt
  // Tier 1 (Waist to Upper Thigh): Y=1.15 to 0.96
  // Tier 2 (Mid Thigh Ruffle):     Y=0.98 to 0.80
  // Tier 3 (Lower Flounce Ruffle): Y=0.82 to 0.62
  function makeSkirtTier({ topY, botY, topRx, topRz, botRx, botRz, pleatCount, pleatDepth, uvVMin, uvVMax }) {
    const positions = [], uvs = [], skinIndices = [], skinWeights = [], indices = [];
    const ySegs = 10;
    const radialSegs = 40;

    for (let iy = 0; iy <= ySegs; iy++) {
      const v = iy / ySegs;
      const y = topY + (botY - topY) * v;
      const t = (topY - y) / (topY - botY); // 0 at top, 1 at bottom

      // Exponential flare
      const rx = topRx + (botRx - topRx) * Math.pow(t, 1.25);
      const rz = topRz + (botRz - topRz) * Math.pow(t, 1.2);
      const cz = 0.025 * (1 - t * 0.4);

      for (let ix = 0; ix <= radialSegs; ix++) {
        const u = ix / radialSegs;
        const angle = u * Math.PI * 2;

        // Physical wavy ruffles (flutes) at the bottom hem of each tier
        const waveStrength = Math.pow(t, 1.4);
        const wave = Math.sin(angle * pleatCount) * pleatDepth * waveStrength;

        const curRx = rx + wave;
        const curRz = rz + wave;

        const px = Math.sin(angle) * curRx;
        const pz = Math.cos(angle) * curRz + cz;
        const py = y;

        positions.push(px, py, pz);

        // UV: Front orthographic projection with graceful back continuation
        const uvU = 0.5 + (px / 0.78);
        const uvV = uvVMin + (uvVMax - uvVMin) * (1 - v);
        uvs.push(Math.max(0, Math.min(1, uvU)), Math.max(0, Math.min(1, uvV)));

        // Skirt Rigging: anchored to Hips, following Thigh strides smoothly
        const legInfluence = Math.min(0.40, t * 0.40);
        let i0 = HIPS_IDX, i1 = L_THIGH_IDX, i2 = R_THIGH_IDX, i3 = SPINE_IDX;
        let w0 = 1.0, w1 = 0, w2 = 0, w3 = 0;

        if (px > 0.01) {
          // Left side
          i1 = L_THIGH_IDX; i2 = L_KNEE_IDX;
          w1 = legInfluence * 0.75;
          w2 = legInfluence * 0.25;
          w0 = 1.0 - (w1 + w2);
        } else if (px < -0.01) {
          // Right side
          i1 = R_THIGH_IDX; i2 = R_KNEE_IDX;
          w1 = legInfluence * 0.75;
          w2 = legInfluence * 0.25;
          w0 = 1.0 - (w1 + w2);
        } else {
          // Center front / back
          w1 = legInfluence * 0.5;
          w2 = legInfluence * 0.5;
          w0 = 1.0 - (w1 + w2);
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

  // Tier 1 (Waist to Upper Thigh)
  parts.push(makeSkirtTier({
    topY: 1.15, botY: 0.95,
    topRx: 0.168, topRz: 0.122,
    botRx: 0.235, botRz: 0.180,
    pleatCount: 16, pleatDepth: 0.014,
    uvVMin: 0.40, uvVMax: 0.63
  }));

  // Tier 2 (Mid Thigh Ruffle Flounce)
  parts.push(makeSkirtTier({
    topY: 0.97, botY: 0.78,
    topRx: 0.245, topRz: 0.190,
    botRx: 0.315, botRz: 0.250,
    pleatCount: 20, pleatDepth: 0.018,
    uvVMin: 0.20, uvVMax: 0.43
  }));

  // Tier 3 (Bottom Layer Flounce with wavy hem)
  parts.push(makeSkirtTier({
    topY: 0.80, botY: 0.60,
    topRx: 0.325, topRz: 0.260,
    botRx: 0.400, botRz: 0.330,
    pleatCount: 24, pleatDepth: 0.024,
    uvVMin: 0.02, uvVMax: 0.23
  }));

  // Merge all garment parts into one unified SkinnedMesh geometry
  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SLIP DRESS & INDIAN BANARASI SILK SAREE
// ─────────────────────────────────────────────────────────────────────────────
function createSlipDressGeometry({ hemY = 0.55, hemRx = 0.285, hemRz = 0.245, pleatCount = 12, pleatDepth = 0.015 }) {
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
      rx = 0.165 + (hemRx - 0.165) * Math.pow(t, 1.25);
      rz = 0.118 + (hemRz - 0.118) * Math.pow(t, 1.20);
      cz = 0.025 * (1 - t) + 0.015 * t;
    } else if (y < bustY) {
      const t = (y - waistY) / (bustY - waistY);
      rx = 0.165 + (0.180 - 0.165) * Math.sin(t * Math.PI * 0.5);
      rz = 0.118 + (0.140 - 0.118) * Math.sin(t * Math.PI * 0.5);
      cz = 0.025 + 0.015 * t;
    } else {
      const t = (y - bustY) / (topY - bustY);
      rx = 0.180 - 0.045 * t;
      rz = 0.140 - 0.055 * t;
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
