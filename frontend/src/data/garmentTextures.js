import * as THREE from 'three';

// Procedural high-resolution textile texture synthesis for photorealistic fabrics
export function createFabricTexture(type = 'denim', primaryColor = '#5e84a8', accentColor = '#3d5c7a') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Fill base color
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, 512, 512);

  if (type === 'denim') {
    // Authentic twill weave diagonal ribs
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.35;
    for (let i = -512; i < 1024; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 512, 512);
      ctx.stroke();
    }
    // Cross weave with white weft specks
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.18;
    for (let i = -512; i < 1024; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i + 512, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
    }
  } else if (type === 'ribbed') {
    // Fine vertical ribbed knit pattern
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.28;
    for (let x = 0; x < 512; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    // Subtle sheen line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15;
    for (let x = 3; x < 512; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
  } else if (type === 'satin') {
    // Liquid silky smooth gradient with lustrous specular falloff
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(0.35, '#ffffff');
    grad.addColorStop(0.65, primaryColor);
    grad.addColorStop(1, accentColor);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, 0, 512, 512);
  } else if (type === 'leather') {
    // Organic leather grain noise
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 12000; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      ctx.fillRect(rx, ry, Math.random() * 2 + 1, Math.random() * 2 + 1);
    }
  } else if (type === 'sneaker') {
    // Clean athletic sneaker texture with subtle stitching
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(20, 20, 472, 472);
  } else if (type === 'banarasi_silk') {
    // Traditional Indian Banarasi Silk with woven metallic Gold Zari motifs & Paisley borders
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(0.5, accentColor || '#a21caf');
    grad.addColorStop(1, primaryColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Intricate Gold Zari Brocade weave pattern
    ctx.strokeStyle = '#d4af37'; // Pure gold zari
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.65;

    // Diamond zari floral grid (Jari Jaal)
    const gridSize = 32;
    for (let x = 0; x <= 512; x += gridSize) {
      for (let y = 0; y <= 512; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 8, y);
        ctx.lineTo(x, y + 8);
        ctx.lineTo(x - 8, y);
        ctx.closePath();
        ctx.stroke();

        // Little gold buti inside each motif
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Heavy Gold Zari Saree Pallu Border
    ctx.fillStyle = '#d4af37';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(0, 470, 512, 42);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    for (let x = 0; x < 512; x += 16) {
      ctx.fillRect(x, 474, 8, 34);
    }
  } else if (type === 'chikankari' || type === 'georgette') {
    // Lucknowi Chikankari Embroidery on Georgette
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 512, 512);

    // Delicate white shadow-work thread embroidery
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.45;

    for (let x = 20; x < 512; x += 40) {
      for (let y = 20; y < 512; y += 40) {
        // Floral petal spray
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Gold zari scallop edge
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 20) {
      ctx.arc(x + 10, 500, 10, Math.PI, 0, true);
    }
    ctx.stroke();
  } else if (type === 'jutti') {
    // Handcrafted Indian ethnic jutti shoe with gold zardozi stitching
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(15, 15, 482, 482);

    // Toe medallion embroidery
    ctx.beginPath();
    ctx.arc(256, 256, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(type.includes('silk') || type.includes('chikankari') ? [2, 2] : [4, 4]);
  texture.needsUpdate = true;
  return texture;
}

// Color name to hex resolution map for MongoDB items
const COLOR_MAP = {
  white:    '#f8f9fa',
  black:    '#1c1c1f',
  navy:     '#1b2a4a',
  beige:    '#d8cdbf',
  camel:    '#bca182',
  grey:     '#4b5563',
  gray:     '#4b5563',
  blue:     '#2563eb',
  emerald:  '#1b4d3e',
  green:    '#15803d',
  red:      '#dc2626',
  pink:     '#ec4899',
  purple:   '#7c3aed',
  brown:    '#5c3a21',
  yellow:   '#f59e0b',
  charcoal: '#2d3748'
};

function normalizeHexColor(c) {
  if (!c) return '#9e7bb5';
  if (c.startsWith('#')) return c;
  const lower = c.toLowerCase().trim();
  return COLOR_MAP[lower] || c;
}

// Generate complete PBR material set for a clothing piece
export function createGarmentPBRMaterial(garmentItem, defaultType = 'ribbed') {
  const rawColor = garmentItem?.primaryColor || garmentItem?.color || garmentItem?.colors?.[0]?.hex || '#ffffff';
  const color = normalizeHexColor(rawColor);
  const silhouette = (garmentItem?.silhouette || '').toLowerCase();
  const category = (garmentItem?.category || '').toLowerCase();
  const name = (garmentItem?.name || '').toLowerCase();

  let fabricType = defaultType;
  let roughness = 0.6;
  let metalness = 0.05;
  let clearcoat = 0.0;
  let clearcoatRoughness = 0.1;

  // Indian Ethnic Wear Detection (Sarees, Anarkalis, Kurtis, Lehengas)
  if (
    category === 'indian_ethnic' ||
    silhouette.includes('saree') ||
    silhouette.includes('anarkali') ||
    silhouette.includes('kurti') ||
    silhouette.includes('lehenga') ||
    name.includes('saree') ||
    name.includes('anarkali') ||
    name.includes('kurti') ||
    name.includes('banarasi')
  ) {
    if (name.includes('chikankari') || name.includes('georgette') || name.includes('chanderi')) {
      fabricType = 'chikankari';
      roughness = 0.45;
      metalness = 0.15;
      clearcoat = 0.25;
    } else {
      fabricType = 'banarasi_silk';
      roughness = 0.22;
      metalness = 0.38; // Rich gold zari sheen
      clearcoat = 0.65; // Glossy silk drape
      clearcoatRoughness = 0.08;
    }
  } else if (category === 'trousers' || silhouette.includes('jeans') || name.includes('jean') || name.includes('trouser')) {
    fabricType = 'denim';
    roughness = 0.75;
    metalness = 0.02;
  } else if (category === 'dresses' || category === 'dress' || silhouette.includes('dress') || name.includes('dress') || name.includes('gown')) {
    fabricType = 'satin';
    roughness = 0.25;
    metalness = 0.25;
    clearcoat = 0.4;
  } else if (category === 'outerwear' || silhouette.includes('biker') || name.includes('jacket') || name.includes('coat')) {
    fabricType = 'leather';
    roughness = 0.4;
    metalness = 0.2;
    clearcoat = 0.5;
  } else if (category === 'shoes' || silhouette.includes('sneaker') || silhouette.includes('jutti') || name.includes('shoe') || name.includes('sneaker') || name.includes('loafer')) {
    if (name.includes('jutti') || name.includes('ethnic') || silhouette.includes('jutti')) {
      fabricType = 'jutti';
      roughness = 0.35;
      metalness = 0.3;
      clearcoat = 0.3;
    } else {
      fabricType = 'sneaker';
      roughness = 0.55;
      metalness = 0.1;
    }
  } else {
    fabricType = 'ribbed';
    roughness = 0.55;
    metalness = 0.05;
  }

  let map = createFabricTexture(fabricType, color);

  // If a real uploaded photo or image URL exists, project it onto the PBR garment material
  if (
    garmentItem?.image &&
    typeof garmentItem.image === 'string' &&
    (garmentItem.image.startsWith('http') || garmentItem.image.startsWith('data:') || garmentItem.image.startsWith('/uploads'))
  ) {
    try {
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      const customTex = loader.load(garmentItem.image, (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1.5, 1.5);
        tex.needsUpdate = true;
      });
      customTex.wrapS = THREE.RepeatWrapping;
      customTex.wrapT = THREE.RepeatWrapping;
      customTex.repeat.set(1.5, 1.5);
      map = customTex;
    } catch (e) {
      console.warn('Could not load custom garment texture map:', e.message);
    }
  }

  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    map,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    envMapIntensity: 1.2
  });
}
