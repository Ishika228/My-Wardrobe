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
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
}

// Generate complete PBR material set for a clothing piece
export function createGarmentPBRMaterial(garmentItem, defaultType = 'ribbed') {
  const color = garmentItem?.primaryColor || garmentItem?.colors?.[0]?.hex || '#ffffff';
  const silhouette = garmentItem?.silhouette || '';
  const category = garmentItem?.category || '';

  let fabricType = defaultType;
  let roughness = 0.6;
  let metalness = 0.05;
  let clearcoat = 0.0;
  let clearcoatRoughness = 0.1;

  if (category === 'trousers' || silhouette.includes('jeans')) {
    fabricType = 'denim';
    roughness = 0.75;
    metalness = 0.02;
  } else if (category === 'dresses' || silhouette.includes('slip') || silhouette.includes('satin')) {
    fabricType = 'satin';
    roughness = 0.25;
    metalness = 0.25;
    clearcoat = 0.4;
  } else if (category === 'outerwear' || silhouette.includes('biker') || silhouette.includes('leather')) {
    fabricType = 'leather';
    roughness = 0.4;
    metalness = 0.2;
    clearcoat = 0.5;
  } else if (category === 'shoes' || silhouette.includes('sneaker')) {
    fabricType = 'sneaker';
    roughness = 0.55;
    metalness = 0.1;
  } else {
    fabricType = 'ribbed';
    roughness = 0.55;
    metalness = 0.05;
  }

  const map = createFabricTexture(fabricType, color);

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

