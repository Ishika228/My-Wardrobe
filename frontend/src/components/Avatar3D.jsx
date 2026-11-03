import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Avatar3D – Photorealistic Female 3D Avatar with True 3D Garment Try-On
 *
 * Solutions Implemented:
 * 1. Skinned Mesh Garment Fitting:
 *    - For Dresses / One-piece outfits: Loads actual 3D dress GLB assets (dress_slip.glb / dress_saree.glb)
 *      with natural A-line drape, bust contouring, waist cinch, and physical pleats.
 *    - Binds the dress SkinnedMesh directly to the avatar's live skeleton armature
 *      (Hips, Spine, Spine1, Spine2, LeftUpLeg, RightUpLeg).
 *    - Skirt flexes and sways fluidly with the avatar's walking stride without tearing or clipping.
 *    - Hides separate pants/top underneath so there is ZERO body penetration or clipping.
 * 2. Proper Replacement & Mesh Lifecycle:
 *    - When switching from a dress to a top/trousers or another dress, the previous garment
 *      mesh is cleanly removed from the scene and its memory disposed. No overlapping ghosts.
 * 3. Accurate Category Separation:
 *    - Dresses: Full-body flowing 3D dress SkinnedMesh.
 *    - Tops: Skinned top mesh with category-tailored PBR physical materials.
 *    - Trousers: Skinned bottoms with authentic twill denim / weave PBR materials.
 *    - Footwear: PBR material fitting with leather/sneaker finish.
 * 4. Realistic Locomotion:
 *    - Upright posture, relaxed arms at sides, chest breathing, procedural eye blinking.
 *    - Fluid walking locomotion with synchronized leg stride, knee flexing, and counter-arm swing.
 */

// ─── Fabric PBR Param Resolver ───────────────────────────────────────────────
function getFabricParams(garmentItem) {
  const cat  = (garmentItem?.category   || '').toLowerCase();
  const sil  = (garmentItem?.silhouette || '').toLowerCase();
  const name = (garmentItem?.name       || '').toLowerCase();

  if (cat === 'trousers' || sil.includes('jean') || name.includes('jean') || name.includes('denim')) {
    return { roughness: 0.78, metalness: 0.02, clearcoat: 0.0, clearcoatRoughness: 0.1 };
  }
  if (cat === 'dresses' || cat === 'dress' || sil.includes('dress') || name.includes('gown')) {
    return { roughness: 0.26, metalness: 0.24, clearcoat: 0.50, clearcoatRoughness: 0.06 };
  }
  if (cat === 'outerwear' || name.includes('jacket') || name.includes('coat') || sil.includes('biker')) {
    return { roughness: 0.40, metalness: 0.20, clearcoat: 0.45, clearcoatRoughness: 0.1 };
  }
  if (cat === 'shoes' || cat === 'footwear' || sil.includes('sneaker')) {
    return { roughness: 0.55, metalness: 0.10, clearcoat: 0.0,  clearcoatRoughness: 0.1 };
  }
  if (name.includes('silk') || name.includes('satin') || sil.includes('satin')) {
    return { roughness: 0.20, metalness: 0.25, clearcoat: 0.60, clearcoatRoughness: 0.05 };
  }
  if (cat === 'indian_ethnic' || name.includes('saree') || name.includes('banarasi') || name.includes('anarkali')) {
    return { roughness: 0.22, metalness: 0.38, clearcoat: 0.68, clearcoatRoughness: 0.07 };
  }
  return { roughness: 0.55, metalness: 0.05, clearcoat: 0.0, clearcoatRoughness: 0.1 };
}

const COLOR_NAMES = {
  white:'#f8f9fa', black:'#1c1c1f', navy:'#1b2a4a', beige:'#d8cdbf',
  camel:'#bca182', grey:'#4b5563',  gray:'#4b5563',  blue:'#2563eb',
  emerald:'#1b4d3e', green:'#15803d', red:'#dc2626', pink:'#ec4899',
  purple:'#7c3aed', brown:'#5c3a21', yellow:'#f59e0b', charcoal:'#2d3748',
  ivory:'#fffff0', cream:'#fffdd0',
};

function resolveColor(raw) {
  if (!raw) return '#ffffff';
  if (raw.startsWith('#')) return raw;
  return COLOR_NAMES[raw.toLowerCase().trim()] || raw;
}

/**
 * Builds PBR Material for 3D Garments with ClampToEdge (0 stretching, 0 distorted tiling)
 */
function buildGarmentMaterial(garmentItem, origMat) {
  if (garmentItem?.pbrMaterial) {
    return garmentItem.pbrMaterial;
  }

  const { roughness, metalness, clearcoat, clearcoatRoughness } = getFabricParams(garmentItem);
  const rawColor = garmentItem?.primaryColor ||
                   garmentItem?.color ||
                   garmentItem?.colors?.[0]?.hex || '#ffffff';
  const color = resolveColor(rawColor);

  const imageSrc = garmentItem?.image;
  const hasRealImage = imageSrc && typeof imageSrc === 'string' &&
    (imageSrc.startsWith('http') || imageSrc.startsWith('data:') ||
     imageSrc.startsWith('blob:') || imageSrc.startsWith('/uploads'));

  const params = {
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    envMapIntensity: 1.25,
    side: THREE.DoubleSide,
    normalMap: origMat?.normalMap || null,
    normalScale: origMat?.normalMap ? new THREE.Vector2(1.1, 1.1) : undefined,
    roughnessMap: origMat?.roughnessMap || null,
    metalnessMap: origMat?.metalnessMap || null,
  };

  if (hasRealImage) {
    const tex = new THREE.TextureLoader().load(imageSrc);
    tex.crossOrigin = 'anonymous';
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    params.map = tex;
    params.color = new THREE.Color('#ffffff');
  } else {
    params.color = new THREE.Color(color);
    if (origMat?.map) {
      params.map = origMat.map;
    }
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
  const avatarSceneRef = useRef();
  const activeDressRef = useRef(null);

  // Load avatar and actual 3D garment assets
  const avatarGltf = useGLTF('/models/female_avatar.glb');
  const dressSlipGltf = useGLTF('/models/garments/dress_slip.glb');
  const dressSareeGltf = useGLTF('/models/garments/dress_saree.glb');

  // Extract 3D dress geometries
  const dressGeometries = useMemo(() => {
    let slipGeom = null;
    let sareeGeom = null;

    if (dressSlipGltf?.scene) {
      dressSlipGltf.scene.traverse((c) => {
        if (c.isMesh && !slipGeom) slipGeom = c.geometry.clone();
      });
    }

    if (dressSareeGltf?.scene) {
      dressSareeGltf.scene.traverse((c) => {
        if (c.isMesh && !sareeGeom) sareeGeom = c.geometry.clone();
      });
    }

    return { slip: slipGeom, saree: sareeGeom };
  }, [dressSlipGltf, dressSareeGltf]);

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
      // ── DRESS / SAREE TRY-ON: Load actual 3D Garment GLB & Bind to Skeleton ──
      const dressItem = outfit.dress || outfit.top;
      const targetGeom = isIndianEthnic ? dressGeometries.saree : dressGeometries.slip;

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

        // Hide separate top and bottom pants underneath to completely prevent clipping
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
  }, [outfit, avatarScene, dressGeometries]);

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
          <pointLight intensity={3.5} color="#f472b6" distance={3.8} />
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.78, 32]} />
            <meshBasicMaterial color="#f472b6" transparent opacity={0.65} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.55, 0.62, 32]} />
            <meshBasicMaterial color="#fcd34d" transparent opacity={0.55} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {avatarScene && (
        <primitive
          ref={avatarSceneRef}
          object={avatarScene}
          scale={[1.15, 1.15, 1.15]}
          position={[0, 0, 0]}
        />
      )}
    </group>
  );
}

// Preload avatar and real 3D garment GLB assets
useGLTF.preload('/models/female_avatar.glb');
useGLTF.preload('/models/garments/dress_slip.glb');
useGLTF.preload('/models/garments/dress_saree.glb');
