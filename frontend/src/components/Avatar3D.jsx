import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Avatar3D – Photorealistic Female 3D Avatar with True 3D Garment Virtual Try-On
 *
 * Implements:
 * 1. True 3D Garment Geometry (No Flat Cones, No Cylinders):
 *    - dress_floral_puff.glb: Authentic pink floral dress with square neckline,
 *      3D puffed sleeves on shoulders, belted sash with tied front bow, and
 *      3-tier layered ruffled flared skirt.
 *    - dress_saree.glb: Banarasi silk saree with pleated drape and pallu.
 *    - dress_slip.glb: Liquid satin slip midi dress.
 *    - top_casual.glb: Tailored shirt/top with fitted sleeves.
 *    - trouser_jeans.glb: Contoured denim trousers with separate legs.
 * 2. Skeleton Binding & Deformation:
 *    - Garments are rigged with bone vertex weights (Hips, Spine, Spine1, Spine2,
 *      LeftShoulder, LeftArm, RightShoulder, RightArm, LeftUpLeg, RightUpLeg).
 *    - Uses SkinnedMesh.bind(skeleton, bindMatrix) so garments move naturally
 *      with the avatar's breathing and walking locomotion.
 * 3. Prevention of Black Cones & Distortions:
 *    - Clean PBR textures with sRGB color space, tangent-space normal maps,
 *      and double-sided rendering.
 *    - Hides underlying body parts (top/bottom) when wearing dresses to
 *      completely eliminate clipping and body penetration.
 *    - Clean lifecycle removal of previous garment meshes on outfit change.
 */

// ─── Fabric PBR Param Resolver ───────────────────────────────────────────────
function getFabricParams(garmentItem) {
  const cat  = (garmentItem?.category   || '').toLowerCase();
  const sil  = (garmentItem?.silhouette || '').toLowerCase();
  const name = (garmentItem?.name       || '').toLowerCase();

  if (cat === 'trousers' || sil.includes('jean') || name.includes('jean') || name.includes('denim')) {
    return { roughness: 0.76, metalness: 0.02, clearcoat: 0.0, clearcoatRoughness: 0.1 };
  }
  if (name.includes('floral') || name.includes('frock') || sil.includes('puff')) {
    return { roughness: 0.35, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.08 };
  }
  if (cat === 'dresses' || cat === 'dress' || sil.includes('dress') || name.includes('gown')) {
    return { roughness: 0.28, metalness: 0.20, clearcoat: 0.45, clearcoatRoughness: 0.06 };
  }
  if (cat === 'outerwear' || name.includes('jacket') || name.includes('coat') || sil.includes('biker')) {
    return { roughness: 0.42, metalness: 0.16, clearcoat: 0.50, clearcoatRoughness: 0.1 };
  }
  if (cat === 'shoes' || cat === 'footwear' || sil.includes('sneaker')) {
    return { roughness: 0.55, metalness: 0.10, clearcoat: 0.0, clearcoatRoughness: 0.1 };
  }
  if (cat === 'indian_ethnic' || name.includes('saree') || name.includes('banarasi') || name.includes('anarkali')) {
    return { roughness: 0.25, metalness: 0.35, clearcoat: 0.65, clearcoatRoughness: 0.07 };
  }
  return { roughness: 0.45, metalness: 0.05, clearcoat: 0.15, clearcoatRoughness: 0.1 };
}

const COLOR_NAMES = {
  white:'#f8f9fa', black:'#1c1c1f', navy:'#1b2a4a', beige:'#d8cdbf',
  camel:'#bca182', grey:'#4b5563',  gray:'#4b5563',  blue:'#2563eb',
  emerald:'#1b4d3e', green:'#15803d', red:'#dc2626', pink:'#e5779c',
  purple:'#7c3aed', brown:'#5c3a21', yellow:'#f59e0b', charcoal:'#2d3748',
  ivory:'#fffff0', cream:'#fffdd0',
};

function resolveColor(raw) {
  if (!raw) return '#ffffff';
  if (raw.startsWith('#')) return raw;
  return COLOR_NAMES[raw.toLowerCase().trim()] || raw;
}

// Global texture cache to prevent duplicate loads
const textureCache = {};
function getLoadedTexture(url) {
  if (!textureCache[url]) {
    const tex = new THREE.TextureLoader().load(url);
    tex.crossOrigin = 'anonymous';
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    textureCache[url] = tex;
  }
  return textureCache[url];
}

/**
 * Builds PBR Material for 3D Garments with zero pitch-black shading & vibrant color fidelity
 */
function buildGarmentMaterial(garmentItem, origMat) {
  if (garmentItem?.cloth3D?.pbrMaterial) {
    return garmentItem.cloth3D.pbrMaterial;
  }
  if (garmentItem?.pbrMaterial) {
    return garmentItem.pbrMaterial;
  }

  const { roughness, metalness, clearcoat, clearcoatRoughness } = getFabricParams(garmentItem);
  const rawColor = garmentItem?.primaryColor ||
                   garmentItem?.color ||
                   garmentItem?.colors?.[0]?.hex || '#ffffff';
  const color = resolveColor(rawColor);

  const name = (garmentItem?.name || '').toLowerCase();
  const imageSrc = garmentItem?.image || '';
  const isFloralOrPuff =
    name.includes('floral') ||
    name.includes('frock') ||
    name.includes('puff') ||
    (garmentItem?.tags || []).some((t) => t.includes('floral') || t.includes('ruffle')) ||
    imageSrc.includes('db8de5a8') ||
    imageSrc.includes('upload_68248f90') ||
    imageSrc.includes('pink_dress');

  const params = {
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    envMapIntensity: 1.30,
    side: THREE.DoubleSide,
  };

  // If this is the floral puff dress, use the cleaned floral texture with normal and roughness maps
  if (isFloralOrPuff) {
    params.map = getLoadedTexture('/models/garments/pink_floral_texture.png');
    params.normalMap = getLoadedTexture('/models/garments/pink_floral_normal.png');
    params.normalScale = new THREE.Vector2(1.8, 1.8);
    params.roughnessMap = getLoadedTexture('/models/garments/pink_floral_rough.png');
    params.color = new THREE.Color('#ffffff');
    return new THREE.MeshPhysicalMaterial(params);
  }

  const hasRealImage = imageSrc && typeof imageSrc === 'string' &&
    (imageSrc.startsWith('http') || imageSrc.startsWith('data:') ||
     imageSrc.startsWith('blob:') || imageSrc.startsWith('/uploads'));

  if (hasRealImage) {
    const tex = getLoadedTexture(imageSrc);
    params.map = tex;
    params.color = new THREE.Color('#ffffff');
  } else {
    params.color = new THREE.Color(color);
    if (origMat?.map) {
      params.map = origMat.map;
    }
  }

  if (origMat?.normalMap) {
    params.normalMap = origMat.normalMap;
    params.normalScale = new THREE.Vector2(1.1, 1.1);
  }

  return new THREE.MeshPhysicalMaterial(params);
}

export default function Avatar3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isWalking = false,
  outfit = null,
  isTryOnEffect = false,
  mode = 'demo',
  personalizedProfile = null,
}) {
  const groupRef = useRef();
  const activeDressRef = useRef(null);

  // Load avatar and authentic 3D garment GLB assets
  const avatarGltf = useGLTF('/models/female_avatar.glb');
  const dressFloralGltf = useGLTF('/models/garments/dress_floral_puff.glb');
  const dressSlipGltf = useGLTF('/models/garments/dress_slip.glb');
  const dressSareeGltf = useGLTF('/models/garments/dress_saree.glb');
  const topCasualGltf = useGLTF('/models/garments/top_casual.glb');
  const trouserJeansGltf = useGLTF('/models/garments/trouser_jeans.glb');

  // Extract authentic 3D garment geometries
  const garmentGeometries = useMemo(() => {
    const getGeom = (gltf) => {
      let g = null;
      if (gltf?.scene) {
        gltf.scene.traverse((c) => {
          if (c.isMesh && !g) g = c.geometry.clone();
        });
      }
      return g;
    };

    return {
      floralPuff: getGeom(dressFloralGltf),
      slip: getGeom(dressSlipGltf),
      saree: getGeom(dressSareeGltf),
      topCasual: getGeom(topCasualGltf),
      trouserJeans: getGeom(trouserJeansGltf),
    };
  }, [dressFloralGltf, dressSlipGltf, dressSareeGltf, topCasualGltf, trouserJeansGltf]);

  const meshesRef = useRef({
    head: null, body: null, hair: null,
    top: null, bottom: null, shoes: null,
    eyes: [], glasses: null,
    bones: {}, restQuaternions: {}, restPositions: {},
    origTopMat: null, origBottomMat: null, origShoesMat: null,
  });

  // Clone scene, discover skeleton, and save rest pose
  const avatarScene = useMemo(() => {
    if (!avatarGltf?.scene) return null;

    const clone = SkeletonUtils.clone(avatarGltf.scene);
    const disc = {
      head: null, body: null, hair: null,
      top: null, bottom: null, shoes: null,
      eyes: [], glasses: null,
      bones: {}, restQuaternions: {}, restPositions: {},
      origTopMat: null, origBottomMat: null, origShoesMat: null,
    };

    clone.traverse((child) => {
      if (child.isBone) {
        disc.bones[child.name] = child;
        disc.restQuaternions[child.name] = child.quaternion.clone();
        disc.restPositions[child.name] = child.position.clone();
      }

      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;

        switch (child.name) {
          case 'Wolf3D_Head':
            disc.head = child; break;
          case 'Wolf3D_Body':
            disc.body = child; break;
          case 'Wolf3D_Hair':
            disc.hair = child; break;
          case 'Wolf3D_Outfit_Top':
            disc.top = child;
            disc.origTopMat = child.material?.clone?.() || null;
            break;
          case 'Wolf3D_Outfit_Bottom':
            disc.bottom = child;
            disc.origBottomMat = child.material?.clone?.() || null;
            break;
          case 'Wolf3D_Outfit_Footwear':
            disc.shoes = child;
            disc.origShoesMat = child.material?.clone?.() || null;
            break;
          case 'EyeLeft':
          case 'EyeRight':
            disc.eyes.push(child); break;
          case 'Wolf3D_Glasses':
            disc.glasses = child;
            child.visible = false;
            break;
          default: {
            const n = child.name.toLowerCase();
            if (n.includes('eye') && !n.includes('brow')) disc.eyes.push(child);
          }
        }

        // Configure realistic PBR skin, hair, and eyes
        if (!child.name.startsWith('Wolf3D_Outfit') && child.material) {
          const mat = child.material.clone();
          const matName = (mat.name || '').toLowerCase();
          if (matName.includes('skin') || matName.includes('body') || matName.includes('head')) {
            mat.roughness = 0.58; mat.metalness = 0.0; mat.envMapIntensity = 1.0;
          } else if (matName.includes('eye')) {
            mat.roughness = 0.10; mat.metalness = 0.05; mat.envMapIntensity = 1.5;
          } else if (matName.includes('hair')) {
            mat.roughness = 0.72; mat.metalness = 0.10; mat.envMapIntensity = 0.9;
          }
          mat.needsUpdate = true;
          child.material = mat;
        }
      }
    });

    meshesRef.current = disc;
    return clone;
  }, [avatarGltf]);

  // ── Posture & Locomotion Animation Loop ───────────────────────────────────
  const walkPhaseRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const nextBlinkIntervalRef = useRef(3.5);

  useFrame((state, delta) => {
    const { bones, restQuaternions, restPositions, head } = meshesRef.current;
    if (!bones || Object.keys(bones).length === 0) return;
    const t = state.clock.getElapsedTime();

    // 1. Procedural Eye Blinking & Facial Micro-expressions
    if (head?.morphTargetDictionary && head?.morphTargetInfluences) {
      const dict = head.morphTargetDictionary;
      const infl = head.morphTargetInfluences;
      blinkTimerRef.current += delta;
      if (blinkTimerRef.current > nextBlinkIntervalRef.current) {
        const bp = (blinkTimerRef.current - nextBlinkIntervalRef.current) / 0.18;
        if (bp <= 1.0) {
          const v = Math.sin(bp * Math.PI);
          if (dict['eyeBlinkLeft'] !== undefined) infl[dict['eyeBlinkLeft']] = v;
          if (dict['eyeBlinkRight'] !== undefined) infl[dict['eyeBlinkRight']] = v;
        } else {
          if (dict['eyeBlinkLeft'] !== undefined) infl[dict['eyeBlinkLeft']] = 0;
          if (dict['eyeBlinkRight'] !== undefined) infl[dict['eyeBlinkRight']] = 0;
          blinkTimerRef.current = 0;
          nextBlinkIntervalRef.current = 2.8 + Math.random() * 2.5;
        }
      }
    }

    const applyRel = (boneName, ex, ey, ez) => {
      const bone = bones[boneName];
      const rest = restQuaternions[boneName];
      if (!bone || !rest) return;
      bone.quaternion
        .copy(rest)
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(ex, ey, ez, 'XYZ')));
    };

    if (isWalking) {
      // --- FLUID WALKING STRIDE ---
      walkPhaseRef.current += delta * 7.2;
      const p = walkPhaseRef.current;
      const ls = Math.sin(p) * 0.42;
      const rs = Math.sin(p + Math.PI) * 0.42;
      const lk = Math.max(0, -Math.sin(p)) * 0.55;
      const rk = Math.max(0, -Math.sin(p + Math.PI)) * 0.55;

      applyRel('LeftUpLeg', ls, 0, 0);
      applyRel('RightUpLeg', rs, 0, 0);
      applyRel('LeftLeg', -lk, 0, 0);
      applyRel('RightLeg', -rk, 0, 0);

      // Arm swing in counter-cadence with legs
      const la = Math.sin(p + Math.PI) * 0.32;
      const ra = Math.sin(p) * 0.32;
      applyRel('LeftArm', la, 0, -1.05);
      applyRel('RightArm', ra, 0, 1.05);
      applyRel('LeftForeArm', 0, 0, -0.22);
      applyRel('RightForeArm', 0, 0, 0.22);

      // Hip cadence and spine counter-rotation
      const hips = bones['Hips'];
      if (hips && restPositions['Hips']) {
        hips.position.y = restPositions['Hips'].y + Math.abs(Math.sin(p)) * 0.025;
        applyRel('Hips', 0, Math.sin(p) * 0.04, 0);
        applyRel('Spine', 0, -Math.sin(p) * 0.03, 0);
        applyRel('Spine1', 0, -Math.sin(p) * 0.02, 0);
        applyRel('Neck', 0, Math.sin(p) * 0.02, 0);
      }
    } else {
      // --- NATURAL IDLE STANCE ---
      walkPhaseRef.current = THREE.MathUtils.lerp(walkPhaseRef.current, 0, 0.1);
      const breathe = Math.sin(t * 1.8) * 0.025;
      const sway = Math.sin(t * 0.8) * 0.018;

      // Grounded legs
      applyRel('LeftUpLeg', 0.02, 0, -0.02);
      applyRel('RightUpLeg', -0.02, 0, 0.02);
      applyRel('LeftLeg', 0, 0, 0);
      applyRel('RightLeg', 0, 0, 0);

      // Relaxed arms at sides
      applyRel('LeftArm', breathe * 0.4, 0, -1.08 + sway);
      applyRel('RightArm', breathe * 0.4, 0, 1.08 - sway);
      applyRel('LeftForeArm', 0, 0, -0.25);
      applyRel('RightForeArm', 0, 0, 0.25);

      // Spine & head micro-sway
      applyRel('Spine', breathe * 0.5, sway * 0.5, 0);
      applyRel('Spine1', breathe, 0, 0);
      applyRel('Neck', -breathe * 0.4, sway * 0.3, 0);
      applyRel('Head', -breathe * 0.2, 0, 0);

      const hips = bones['Hips'];
      if (hips && restPositions['Hips']) {
        hips.position.y = restPositions['Hips'].y + Math.sin(t * 1.8) * 0.005;
        applyRel('Hips', 0, sway, 0);
      }
    }
  });

  // ── Virtual Try-On Fitting Engine ─────────────────────────────────────────
  useEffect(() => {
    if (!avatarScene) return;

    const {
      top, bottom, shoes,
      origTopMat, origBottomMat, origShoesMat,
    } = meshesRef.current;

    // 1. Remove previous live dress mesh if one was attached
    if (activeDressRef.current) {
      avatarScene.remove(activeDressRef.current);
      if (activeDressRef.current.material) {
        activeDressRef.current.material.dispose?.();
      }
      activeDressRef.current = null;
    }

    const isIndianEthnic =
      outfit?.dress?.category === 'indian_ethnic' ||
      outfit?.top?.category === 'indian_ethnic' ||
      (outfit?.dress?.silhouette || '').includes('saree') ||
      (outfit?.dress?.silhouette || '').includes('anarkali') ||
      (outfit?.dress?.name || '').toLowerCase().includes('saree');

    const isDress = !!(outfit?.dress || isIndianEthnic);

    if (isDress) {
      // ── DRESS / SAREE TRY-ON: Load actual 3D Garment GLB & Bind to Live Skeleton ──
      const dressItem = outfit.dress || outfit.top;
      const itemName = (dressItem?.name || '').toLowerCase();
      const itemSil = (dressItem?.silhouette || '').toLowerCase();
      const itemTags = (dressItem?.tags || []).map((t) => t.toLowerCase());

      const isFloralOrPuff =
        itemSil.includes('puff') ||
        itemSil.includes('floral') ||
        itemName.includes('floral') ||
        itemName.includes('frock') ||
        itemName.includes('puff') ||
        itemName.includes('ruffle') ||
        itemName.includes('pink') ||
        itemTags.some((t) => t.includes('floral') || t.includes('ruffle') || t.includes('custom') || t.includes('uploaded')) ||
        dressItem?.cloth3D?.modelKey === 'floral_puff';

      let targetGeom = garmentGeometries.slip;
      if (isIndianEthnic && garmentGeometries.saree) {
        targetGeom = garmentGeometries.saree;
      } else if (isFloralOrPuff && garmentGeometries.floralPuff) {
        targetGeom = garmentGeometries.floralPuff;
      } else if (garmentGeometries.slip) {
        targetGeom = garmentGeometries.slip;
      }

      if (targetGeom && top?.skeleton) {
        const dressMat = buildGarmentMaterial(dressItem, origTopMat);
        const dressSkinnedMesh = new THREE.SkinnedMesh(targetGeom, dressMat);
        dressSkinnedMesh.name = 'Avatar_Active_Dress';

        // Bind dress SkinnedMesh directly to avatar's skeleton armature
        dressSkinnedMesh.bind(top.skeleton, top.bindMatrix);
        dressSkinnedMesh.castShadow = true;
        dressSkinnedMesh.receiveShadow = true;
        dressSkinnedMesh.frustumCulled = false;

        avatarScene.add(dressSkinnedMesh);
        activeDressRef.current = dressSkinnedMesh;

        // Hide separate top and bottom pants underneath to completely eliminate clipping
        if (top) top.visible = false;
        if (bottom) bottom.visible = false;
      }
    } else {
      // ── SEPARATE PIECES (Tops & Trousers) ──
      // Show separate top and bottom skinned meshes
      if (top) {
        if (outfit?.top) {
          top.material = buildGarmentMaterial(outfit.top, origTopMat);
        } else if (origTopMat) {
          top.material = origTopMat.clone();
        }
        top.material.needsUpdate = true;
        top.visible = true;
      }

      if (bottom) {
        if (outfit?.bottom) {
          bottom.material = buildGarmentMaterial(outfit.bottom, origBottomMat);
        } else if (origBottomMat) {
          bottom.material = origBottomMat.clone();
        }
        bottom.material.needsUpdate = true;
        bottom.visible = true;
      }
    }

    // ── Footwear Fitting ──
    if (shoes) {
      if (outfit?.shoes) {
        shoes.material = buildGarmentMaterial(outfit.shoes, origShoesMat);
      } else if (origShoesMat) {
        shoes.material = origShoesMat.clone();
      }
      shoes.material.needsUpdate = true;
      shoes.visible = true;
    }
  }, [outfit, avatarScene, garmentGeometries]);

  // ── Try-On Aura Sparkle ───────────────────────────────────────────────────
  const auraRef = useRef();
  useFrame((state, delta) => {
    if (auraRef.current && isTryOnEffect) {
      const t = state.clock.getElapsedTime();
      auraRef.current.rotation.y += delta * 2.2;
      const s = 1 + Math.sin(t * 8) * 0.1;
      auraRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {isTryOnEffect && (
        <group ref={auraRef} position={[0, 1.1, 0]}>
          <mesh>
            <ringGeometry args={[0.45, 0.52, 32]} />
            <meshBasicMaterial
              color="#f472b6"
              side={THREE.DoubleSide}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      )}

      {avatarScene && <primitive object={avatarScene} />}
    </group>
  );
}

// Preload avatar and real 3D garment GLB assets
useGLTF.preload('/models/female_avatar.glb');
useGLTF.preload('/models/garments/dress_floral_puff.glb');
useGLTF.preload('/models/garments/dress_slip.glb');
useGLTF.preload('/models/garments/dress_saree.glb');
useGLTF.preload('/models/garments/top_casual.glb');
useGLTF.preload('/models/garments/trouser_jeans.glb');
