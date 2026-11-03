import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Procedural fabric texture synthesis (used for display cards / Garment3D
// floating meshes in the boutique – NOT for the avatar outfit meshes).
//
// IMPORTANT: These textures are for the 3-D clothing-display items that float
// on hangers in the boutique room. They must NOT be applied to the avatar's
// Wolf3D_Outfit_* skinned meshes, which have their own UV layout.
// ─────────────────────────────────────────────────────────────────────────────
export function createFabricTexture(type = 'denim', primaryColor = '#5e84a8', accentColor = '#3d5c7a') {
  const canvas = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, 512, 512);

  if (type === 'denim') {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.35;
    for (let i = -512; i < 1024; i += 4) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 512, 512); ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    ctx.globalAlpha = 0.18;
    for (let i = -512; i < 1024; i += 8) {
      ctx.beginPath(); ctx.moveTo(i + 512, 0); ctx.lineTo(i, 512); ctx.stroke();
    }

  } else if (type === 'ribbed') {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth   = 2.5;
    ctx.globalAlpha = 0.28;
    for (let x = 0; x < 512; x += 6) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    ctx.globalAlpha = 0.15;
    for (let x = 3; x < 512; x += 6) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }

  } else if (type === 'satin') {
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0,    primaryColor);
    grad.addColorStop(0.35, '#ffffff');
    grad.addColorStop(0.65, primaryColor);
    grad.addColorStop(1,    accentColor);
    ctx.fillStyle   = grad;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, 512, 512);

  } else if (type === 'leather') {
    ctx.fillStyle   = accentColor;
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 12000; i++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 2 + 1, Math.random() * 2 + 1);
    }

  } else if (type === 'sneaker') {
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(20, 20, 472, 472);

  } else if (type === 'banarasi_silk') {
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0,   primaryColor);
    grad.addColorStop(0.5, accentColor || '#a21caf');
    grad.addColorStop(1,   primaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth   = 1.6;
    ctx.globalAlpha = 0.65;
    const gs = 32;
    for (let x = 0; x <= 512; x += gs) {
      for (let y = 0; y <= 512; y += gs) {
        ctx.beginPath();
        ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y);
        ctx.lineTo(x, y + 8); ctx.lineTo(x - 8, y);
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle   = '#d4af37';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 470, 512, 42);
    ctx.fillStyle   = '#ffffff';
    ctx.globalAlpha = 0.35;
    for (let x = 0; x < 512; x += 16) ctx.fillRect(x, 474, 8, 34);

  } else if (type === 'chikankari' || type === 'georgette') {
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.8;
    ctx.globalAlpha = 0.45;
    for (let x = 20; x < 512; x += 40) {
      for (let y = 20; y < 512; y += 40) {
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 20) ctx.arc(x + 10, 500, 10, Math.PI, 0, true);
    ctx.stroke();

  } else if (type === 'jutti') {
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth   = 2.5;
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(15, 15, 482, 482);
    ctx.beginPath(); ctx.arc(256, 256, 45, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  // For boutique-display hanging clothes only – these use simple cylinder /
  // box geometry with their own UV (0-1 range), so a modest 2x repeat is fine.
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  return texture;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  white:'#f8f9fa', black:'#1c1c1f', navy:'#1b2a4a', beige:'#d8cdbf',
  camel:'#bca182', grey:'#4b5563',  gray:'#4b5563',  blue:'#2563eb',
  emerald:'#1b4d3e', green:'#15803d', red:'#dc2626', pink:'#ec4899',
  purple:'#7c3aed', brown:'#5c3a21', yellow:'#f59e0b', charcoal:'#2d3748',
};

function normalizeHexColor(c) {
  if (!c) return '#9e7bb5';
  if (c.startsWith('#')) return c;
  return COLOR_MAP[c.toLowerCase().trim()] || c;
}

// ─────────────────────────────────────────────────────────────────────────────
// createGarmentPBRMaterial
//
// This function is kept for backward compatibility and for the boutique-display
// Garment3D floating items.  It must NOT be used for avatar outfit meshes
// (Avatar3D handles those internally with buildGarmentMaterial).
// ─────────────────────────────────────────────────────────────────────────────
export function createGarmentPBRMaterial(garmentItem, defaultType = 'ribbed') {
  // If a pre-synthesised pbrMaterial exists (imageTo3DService), return it
  if (garmentItem?.pbrMaterial) return garmentItem.pbrMaterial;

  const rawColor = garmentItem?.primaryColor ||
                   garmentItem?.color ||
                   garmentItem?.colors?.[0]?.hex || '#ffffff';
  const color    = normalizeHexColor(rawColor);
  const silhouette = (garmentItem?.silhouette || '').toLowerCase();
  const category   = (garmentItem?.category   || '').toLowerCase();
  const name       = (garmentItem?.name        || '').toLowerCase();

  let fabricType = defaultType;
  let roughness  = 0.6, metalness = 0.05, clearcoat = 0.0, clearcoatRoughness = 0.1;

  if (
    category === 'indian_ethnic' || silhouette.includes('saree') ||
    silhouette.includes('anarkali') || name.includes('banarasi')
  ) {
    fabricType = name.includes('chikankari') ? 'chikankari' : 'banarasi_silk';
    roughness  = 0.22; metalness = 0.38; clearcoat = 0.65; clearcoatRoughness = 0.08;
  } else if (category === 'trousers' || silhouette.includes('jeans') || name.includes('jean')) {
    fabricType = 'denim'; roughness = 0.75; metalness = 0.02;
  } else if (category === 'dresses' || category === 'dress' || name.includes('dress')) {
    fabricType = 'satin'; roughness = 0.25; metalness = 0.25; clearcoat = 0.4;
  } else if (category === 'outerwear' || name.includes('jacket') || name.includes('coat')) {
    fabricType = 'leather'; roughness = 0.4; metalness = 0.2; clearcoat = 0.5;
  } else if (category === 'shoes' || silhouette.includes('sneaker') || name.includes('jutti')) {
    fabricType = name.includes('jutti') ? 'jutti' : 'sneaker';
    roughness  = 0.55; metalness = 0.1;
  } else {
    fabricType = 'ribbed'; roughness = 0.55; metalness = 0.05;
  }

  const fabricTex = createFabricTexture(fabricType, color);

  // For uploaded / catalog images: load as single-use ClampToEdge texture
  // (no tiling – avoids distortion on display meshes too)
  const imageSrc = garmentItem?.image;
  const hasRealImage = imageSrc && typeof imageSrc === 'string' &&
    (imageSrc.startsWith('http') || imageSrc.startsWith('data:') ||
     imageSrc.startsWith('blob:') || imageSrc.startsWith('/uploads'));

  let map = fabricTex;
  if (hasRealImage) {
    const tex = new THREE.TextureLoader().load(imageSrc);
    tex.crossOrigin  = 'anonymous';
    tex.wrapS        = THREE.ClampToEdgeWrapping;
    tex.wrapT        = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    tex.colorSpace   = THREE.SRGBColorSpace;
    tex.needsUpdate  = true;
    map = tex;
  }

  return new THREE.MeshPhysicalMaterial({
    color: hasRealImage ? new THREE.Color('#ffffff') : new THREE.Color(color),
    map,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    envMapIntensity: 1.2,
  });
}
