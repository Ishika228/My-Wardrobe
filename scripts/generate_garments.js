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

const outDir = path.join(__dirname, '../Frontend/public/models/garments');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Read female_avatar.glb skin structure to get exact bone hierarchy & bind pose
const avatarBuf = fs.readFileSync(path.join(__dirname, '../Frontend/public/models/female_avatar.glb'));
const jsonChunkLen = avatarBuf.readUInt32LE(12);
const gltfJson = JSON.parse(avatarBuf.slice(20, 20 + jsonChunkLen).toString('utf8'));
const skinDef = gltfJson.skins[0];
const jointNodeIndices = skinDef.joints;
const jointNames = jointNodeIndices.map(ni => gltfJson.nodes[ni].name);

console.log('Total skeleton joints:', jointNames.length);
const jointIndexMap = {};
jointNames.forEach((name, idx) => { jointIndexMap[name] = idx; });

const HIPS_IDX = jointIndexMap['Hips'] || 0;
const SPINE_IDX = jointIndexMap['Spine'] || 1;
const SPINE1_IDX = jointIndexMap['Spine1'] || 2;
const SPINE2_IDX = jointIndexMap['Spine2'] || 3;
const L_THIGH_IDX = jointIndexMap['LeftUpLeg'] || 57;
const R_THIGH_IDX = jointIndexMap['RightUpLeg'] || 62;
const L_KNEE_IDX = jointIndexMap['LeftLeg'] || 58;
const R_KNEE_IDX = jointIndexMap['RightLeg'] || 63;

/**
 * Build 3D Slip Midi Dress Geometry with natural drape, pleats, and skin weights
 */
function createDressGeometry(options = {}) {
  const {
    hemY = 0.52,       // Below knee midi length
    waistY = 1.16,     // Natural female waist
    bustY = 1.34,      // Bust curve
    topY = 1.48,       // Shoulder straps / neckline
    hemRadiusX = 0.28, // Flare at hem
    hemRadiusZ = 0.24,
    waistRadiusX = 0.165,
    waistRadiusZ = 0.118,
    bustRadiusX = 0.180,
    bustRadiusZ = 0.140,
    pleatCount = 10,
    pleatDepth = 0.016
  } = options;

  const ySegments = 44;
  const radialSegments = 48;

  const positions = [];
  const normals = [];
  const uvs = [];
  const skinIndices = [];
  const skinWeights = [];
  const indices = [];

  for (let iy = 0; iy <= ySegments; iy++) {
    const v = iy / ySegments;
    const y = hemY + (topY - hemY) * v;

    // Calculate cross-sectional radius and center offset at this Y
    let rx, rz, cz = 0.02;

    if (y < waistY) {
      // Skirt region: flares from waist down to hem with subtle physical folds
      const t = (waistY - y) / (waistY - hemY); // 0 at waist, 1 at hem
      rx = waistRadiusX + (hemRadiusX - waistRadiusX) * Math.pow(t, 1.3);
      rz = waistRadiusZ + (hemRadiusZ - waistRadiusZ) * Math.pow(t, 1.2);
      cz = 0.025 * (1 - t) + 0.015 * t;
    } else if (y < bustY) {
      // Midsection: gently expands from waist up to bust
      const t = (y - waistY) / (bustY - waistY);
      rx = waistRadiusX + (bustRadiusX - waistRadiusX) * Math.sin(t * Math.PI * 0.5);
      rz = waistRadiusZ + (bustRadiusZ - waistRadiusZ) * Math.sin(t * Math.PI * 0.5);
      cz = 0.025 + 0.015 * t;
    } else {
      // Upper chest, neckline and straps
      const t = (y - bustY) / (topY - bustY);
      rx = bustRadiusX - 0.045 * t;
      rz = bustRadiusZ - 0.055 * t;
      cz = 0.040 - 0.020 * t;
    }

    for (let ix = 0; ix <= radialSegments; ix++) {
      const u = ix / radialSegments;
      const angle = u * Math.PI * 2;

      // Realistic fabric pleating/drape folds in skirt, fading out as it reaches waist
      let fold = 0;
      if (y < waistY) {
        const foldStrength = Math.pow((waistY - y) / (waistY - hemY), 1.2);
        fold = Math.sin(angle * pleatCount) * pleatDepth * foldStrength;
        // Subtle secondary wave
        fold += Math.cos(angle * 4) * (pleatDepth * 0.4) * foldStrength;
      }

      // Bust forward contouring on front (cos(angle) > 0 is front Z > 0)
      let bustBulge = 0;
      if (y >= waistY && y <= topY) {
        const bustT = 1 - Math.abs(y - bustY) / 0.16;
        if (bustT > 0 && Math.sin(angle) > 0.1) {
          bustBulge = Math.sin(angle) * 0.018 * Math.pow(bustT, 1.5);
        }
      }

      const curRx = rx + fold;
      const curRz = rz + fold + bustBulge;

      // X is sin(angle), Z is cos(angle) in local coordinates
      const posX = Math.sin(angle) * curRx;
      const posZ = Math.cos(angle) * curRz + cz;
      const posY = y;

      positions.push(posX, posY, posZ);
      uvs.push(u, v);

      // Compute skin weights
      // Smooth gradient between Spine2, Spine1, Spine, Hips, and Thighs
      let i0 = HIPS_IDX, i1 = SPINE_IDX, i2 = L_THIGH_IDX, i3 = R_THIGH_IDX;
      let w0 = 1.0, w1 = 0.0, w2 = 0.0, w3 = 0.0;

      if (y >= 1.35) {
        // Upper chest & neckline -> Spine2 (70%) + Spine1 (30%)
        i0 = SPINE2_IDX; i1 = SPINE1_IDX; i2 = SPINE_IDX; i3 = HIPS_IDX;
        const st = (y - 1.35) / (topY - 1.35);
        w0 = 0.65 + 0.35 * st;
        w1 = 1.0 - w0;
        w2 = 0.0; w3 = 0.0;
      } else if (y >= 1.20) {
        // Ribcage & upper waist -> Spine1 (60%) + Spine (40%)
        i0 = SPINE1_IDX; i1 = SPINE_IDX; i2 = SPINE2_IDX; i3 = HIPS_IDX;
        const st = (y - 1.20) / (1.35 - 1.20);
        w0 = 0.5 + 0.5 * st;
        w1 = 1.0 - w0;
        w2 = 0.0; w3 = 0.0;
      } else if (y >= 1.02) {
        // Waist & upper pelvis -> Spine (40%) + Hips (60%)
        i0 = HIPS_IDX; i1 = SPINE_IDX; i2 = SPINE1_IDX; i3 = L_THIGH_IDX;
        const st = (y - 1.02) / (1.20 - 1.02);
        w1 = st * 0.5;
        w0 = 1.0 - w1;
        w2 = 0.0; w3 = 0.0;
      } else {
        // Flowing skirt: anchored to Hips (65%), while left & right sides follow thighs (35%)
        i0 = HIPS_IDX;
        const skirtT = (1.02 - y) / (1.02 - hemY); // 0 at hips, 1 at hem
        const legInfluence = Math.min(0.42, skirtT * 0.42);

        if (posX > 0.02) {
          // Left side
          i1 = L_THIGH_IDX;
          i2 = L_KNEE_IDX;
          i3 = HIPS_IDX;
          w1 = legInfluence * (1 - skirtT * 0.3);
          w2 = legInfluence * (skirtT * 0.3);
          w0 = 1.0 - (w1 + w2);
          w3 = 0.0;
        } else if (posX < -0.02) {
          // Right side
          i1 = R_THIGH_IDX;
          i2 = R_KNEE_IDX;
          i3 = HIPS_IDX;
          w1 = legInfluence * (1 - skirtT * 0.3);
          w2 = legInfluence * (skirtT * 0.3);
          w0 = 1.0 - (w1 + w2);
          w3 = 0.0;
        } else {
          // Center front / back seam
          i1 = L_THIGH_IDX;
          i2 = R_THIGH_IDX;
          i3 = SPINE_IDX;
          w1 = legInfluence * 0.5;
          w2 = legInfluence * 0.5;
          w0 = 1.0 - (w1 + w2);
          w3 = 0.0;
        }
      }

      skinIndices.push(i0, i1, i2, i3);
      skinWeights.push(w0, w1, w2, w3);
    }
  }

  // Generate face indices (quads converted to pairs of triangles)
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

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  return geom;
}

// 1. Build Satin Bias-Cut Slip Midi Dress
console.log('Generating dress_slip.glb...');
const slipGeom = createDressGeometry({
  hemY: 0.55,
  waistY: 1.15,
  bustY: 1.35,
  topY: 1.48,
  hemRadiusX: 0.285,
  hemRadiusZ: 0.245,
  pleatCount: 12,
  pleatDepth: 0.015
});

const slipMat = new THREE.MeshPhysicalMaterial({
  name: 'Dress_Slip_Material',
  color: new THREE.Color('#c98a9c'),
  roughness: 0.24,
  metalness: 0.22,
  clearcoat: 0.55,
  clearcoatRoughness: 0.06,
  side: THREE.DoubleSide
});

const slipMesh = new THREE.Mesh(slipGeom, slipMat);
slipMesh.name = 'Dress_Slip_Mesh';

// 2. Build Royal Banarasi Silk Saree / Ethnic Dress
console.log('Generating dress_saree.glb...');
const sareeGeom = createDressGeometry({
  hemY: 0.22, // Ankle length Indian saree
  waistY: 1.14,
  bustY: 1.35,
  topY: 1.49,
  hemRadiusX: 0.310,
  hemRadiusZ: 0.270,
  pleatCount: 16,
  pleatDepth: 0.022
});

const sareeMat = new THREE.MeshPhysicalMaterial({
  name: 'Dress_Saree_Material',
  color: new THREE.Color('#831843'),
  roughness: 0.28,
  metalness: 0.38,
  clearcoat: 0.65,
  clearcoatRoughness: 0.08,
  side: THREE.DoubleSide
});

const sareeMesh = new THREE.Mesh(sareeGeom, sareeMat);
sareeMesh.name = 'Dress_Saree_Mesh';

// Export using GLTFExporter
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
  await exportGlb(slipMesh, 'dress_slip.glb');
  await exportGlb(sareeMesh, 'dress_saree.glb');
  console.log('All 3D garment GLB assets successfully generated!');
}

run().catch(console.error);
