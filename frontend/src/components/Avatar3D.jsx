import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Avatar3D – Photorealistic Female Avatar with Correct Garment Try-On
 *
 * ROOT CAUSE OF PREVIOUS DISTORTION:
 *   The avatar GLB (ReadyPlayerMe Wolf3D) ships with three proper UV-mapped
 *   skinned meshes: Wolf3D_Outfit_Top, Wolf3D_Outfit_Bottom, Wolf3D_Outfit_Footwear.
 *   Each mesh has tightly-packed UV islands that map the geometry exactly.
 *   The previous code replaced their materials with procedural canvas textures
 *   using RepeatWrapping + repeat.set([4,4]), which tiles the image 4×4 across
 *   those UV islands — producing narrow, stretched, distorted clothing.
 *
 * FIX:
 *   1. Apply materials with ClampToEdgeWrapping + repeat(1,1) so textures
 *      fill the UV space exactly once.
 *   2. For catalog items (color only): use a solid-color MeshPhysicalMaterial
 *      with correct fabric PBR params, preserving the mesh's own normal/roughness
 *      maps from the original material.
 *   3. For uploaded image items: load as ClampToEdge texture, no tiling.
 *   4. For pre-synthesised pbrMaterial (from imageTo3DService): use directly.
 *   5. Never tile. Never use RepeatWrapping on these outfit meshes.
 */

// ─── Fabric PBR param lookup ──────────────────────────────────────────────────
function getFabricParams(garmentItem) {
  const cat  = (garmentItem?.category   || '').toLowerCase();
  const sil  = (garmentItem?.silhouette || '').toLowerCase();
  const name = (garmentItem?.name       || '').toLowerCase();

  if (cat === 'trousers' || sil.includes('jean') || name.includes('jean') || name.includes('denim'))
    return { roughness: 0.78, metalness: 0.02, clearcoat: 0.0, clearcoatRoughness: 0.1 };
  if (cat === 'dresses' || cat === 'dress' || sil.includes('dress') || name.includes('gown'))
    return { roughness: 0.28, metalness: 0.22, clearcoat: 0.40, clearcoatRoughness: 0.08 };
  if (cat === 'outerwear' || name.includes('jacket') || name.includes('coat') || sil.includes('biker'))
    return { roughness: 0.42, metalness: 0.18, clearcoat: 0.50, clearcoatRoughness: 0.1  };
  if (cat === 'shoes' || cat === 'footwear' || sil.includes('sneaker'))
    return { roughness: 0.55, metalness: 0.10, clearcoat: 0.0,  clearcoatRoughness: 0.1  };
  if (name.includes('silk') || name.includes('satin') || sil.includes('satin'))
    return { roughness: 0.20, metalness: 0.25, clearcoat: 0.55, clearcoatRoughness: 0.06 };
  if (cat === 'indian_ethnic' || name.includes('saree') || name.includes('banarasi') || name.includes('anarkali'))
    return { roughness: 0.22, metalness: 0.38, clearcoat: 0.65, clearcoatRoughness: 0.08 };
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
  if (!raw) return '#9e7bb5';
  if (raw.startsWith('#')) return raw;
  return COLOR_NAMES[raw.toLowerCase().trim()] || raw;
}

/**
 * Build a garment MeshPhysicalMaterial that fits the Wolf3D outfit meshes
 * without distortion.
 *
 * @param {object} garmentItem  – outfit item (catalog or uploaded)
 * @param {THREE.Material} origMat – original material of the target mesh
 */
function buildGarmentMaterial(garmentItem, origMat) {
  // Pre-synthesised 3D material from the Claude imageTo3D skill – use as-is
  if (garmentItem?.pbrMaterial) return garmentItem.pbrMaterial;

  const { roughness, metalness, clearcoat, clearcoatRoughness } = getFabricParams(garmentItem);
  const rawColor = garmentItem?.primaryColor ||
                   garmentItem?.color ||
                   garmentItem?.colors?.[0]?.hex || '#9e7bb5';
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
    envMapIntensity: 1.2,
    // Preserve original normal / roughness maps from the Wolf3D mesh
    normalMap:    origMat?.normalMap    || null,
    normalScale:  origMat?.normalMap ? new THREE.Vector2(1.0, 1.0) : undefined,
    roughnessMap: origMat?.roughnessMap || null,
    metalnessMap: origMat?.metalnessMap || null,
  };

  if (hasRealImage) {
    // ── Uploaded or catalog image ──────────────────────────────────────────
    // ClampToEdge + repeat(1,1) → image fills UVs exactly once, no tiling
    const tex = new THREE.TextureLoader().load(imageSrc);
    tex.crossOrigin  = 'anonymous';
    tex.wrapS        = THREE.ClampToEdgeWrapping;
    tex.wrapT        = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    tex.colorSpace   = THREE.SRGBColorSpace;
    tex.needsUpdate  = true;
    params.map   = tex;
    params.color = new THREE.Color('#ffffff'); // white tint = true image colors
  } else {
    // ── Color-only catalog item ───────────────────────────────────────────
    params.color = new THREE.Color(color);
    // Reuse original base-color map if available (keeps the Wolf3D outfit look
    // but tinted with the catalog color via the color property)
    if (origMat?.map) {
      params.map = origMat.map;
    }
  }

  return new THREE.MeshPhysicalMaterial(params);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Avatar3D({
  position          = [0, 0, 0],
  rotation          = [0, 0, 0],
  isWalking         = false,
  outfit            = null,
  isTryOnEffect     = false,
  mode              = 'demo',
  personalizedProfile = null,
}) {
  const groupRef       = useRef();
  const avatarSceneRef = useRef();
  const avatarGltf     = useGLTF('/models/female_avatar.glb');

  const meshesRef = useRef({
    head: null, body: null, hair: null,
    top: null, bottom: null, shoes: null,
    eyes: [], glasses: null,
    bones: {}, restQuaternions: {}, restPositions: {},
    origTopMat: null, origBottomMat: null, origShoesMat: null,
  });

  // ── Clone scene, discover meshes & skeleton ───────────────────────────────
  const avatarScene = useMemo(() => {
    if (!avatarGltf?.scene) return null;
    const clone = SkeletonUtils.clone(avatarGltf.scene);
    const disc  = {
      head: null, body: null, hair: null,
      top: null, bottom: null, shoes: null,
      eyes: [], glasses: null,
      bones: {}, restQuaternions: {}, restPositions: {},
      origTopMat: null, origBottomMat: null, origShoesMat: null,
    };

    clone.traverse((child) => {
      if (child.isBone) {
        disc.bones[child.name]           = child;
        disc.restQuaternions[child.name] = child.quaternion.clone();
        disc.restPositions[child.name]   = child.position.clone();
      }

      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
        child.frustumCulled = false;

        // Use exact ReadyPlayerMe node names for reliable matching
        switch (child.name) {
          case 'Wolf3D_Head':
            disc.head = child; break;
          case 'Wolf3D_Body':
            disc.body = child; break;
          case 'Wolf3D_Hair':
            disc.hair = child; break;
          case 'Wolf3D_Outfit_Top':
            disc.top        = child;
            disc.origTopMat = child.material?.clone?.() || null;
            break;
          case 'Wolf3D_Outfit_Bottom':
            disc.bottom        = child;
            disc.origBottomMat = child.material?.clone?.() || null;
            break;
          case 'Wolf3D_Outfit_Footwear':
            disc.shoes        = child;
            disc.origShoesMat = child.material?.clone?.() || null;
            break;
          case 'EyeLeft':
          case 'EyeRight':
            disc.eyes.push(child); break;
          case 'Wolf3D_Glasses':
            disc.glasses  = child;
            child.visible = false;
            break;
          default: {
            const n = child.name.toLowerCase();
            if (n.includes('eye') && !n.includes('brow')) disc.eyes.push(child);
          }
        }

        // Tune PBR for non-outfit meshes only
        if (!child.name.startsWith('Wolf3D_Outfit') && child.material) {
          const mat     = child.material.clone();
          const matName = (mat.name || '').toLowerCase();
          if (matName.includes('skin') || matName.includes('body') || matName.includes('head')) {
            mat.roughness = 0.58; mat.metalness = 0.0; mat.envMapIntensity = 1.0;
          } else if (matName.includes('eye')) {
            mat.roughness = 0.10; mat.metalness = 0.05; mat.envMapIntensity = 1.5;
          } else if (matName.includes('hair')) {
            mat.roughness = 0.72; mat.metalness = 0.10; mat.envMapIntensity = 0.9;
          }
          mat.needsUpdate = true;
          child.material  = mat;
        }
      }
    });

    meshesRef.current = disc;
    return clone;
  }, [avatarGltf]);

  // ── Locomotion & idle posture ─────────────────────────────────────────────
  const walkPhaseRef         = useRef(0);
  const blinkTimerRef        = useRef(0);
  const nextBlinkIntervalRef = useRef(3.5);

  useFrame((state, delta) => {
    const { bones, restQuaternions, restPositions, head } = meshesRef.current;
    if (!bones || Object.keys(bones).length === 0) return;
    const t = state.clock.getElapsedTime();

    // Eye blinking
    if (head?.morphTargetDictionary && head?.morphTargetInfluences) {
      const dict = head.morphTargetDictionary;
      const infl = head.morphTargetInfluences;
      blinkTimerRef.current += delta;
      if (blinkTimerRef.current > nextBlinkIntervalRef.current) {
        const bp = (blinkTimerRef.current - nextBlinkIntervalRef.current) / 0.18;
        if (bp <= 1.0) {
          const v = Math.sin(bp * Math.PI);
          if (dict['eyeBlinkLeft']  !== undefined) infl[dict['eyeBlinkLeft']]  = v;
          if (dict['eyeBlinkRight'] !== undefined) infl[dict['eyeBlinkRight']] = v;
        } else {
          if (dict['eyeBlinkLeft']  !== undefined) infl[dict['eyeBlinkLeft']]  = 0;
          if (dict['eyeBlinkRight'] !== undefined) infl[dict['eyeBlinkRight']] = 0;
          blinkTimerRef.current        = 0;
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
      walkPhaseRef.current += delta * 7.2;
      const p  = walkPhaseRef.current;
      const ls = Math.sin(p) * 0.42;
      const rs = Math.sin(p + Math.PI) * 0.42;
      const lk = Math.max(0, -Math.sin(p)) * 0.55;
      const rk = Math.max(0, -Math.sin(p + Math.PI)) * 0.55;
      applyRel('LeftUpLeg',   ls, 0, 0);
      applyRel('RightUpLeg',  rs, 0, 0);
      applyRel('LeftLeg',    -lk, 0, 0);
      applyRel('RightLeg',   -rk, 0, 0);
      const la = Math.sin(p + Math.PI) * 0.32;
      const ra = Math.sin(p) * 0.32;
      applyRel('LeftArm',      la, 0, -1.05);
      applyRel('RightArm',     ra, 0,  1.05);
      applyRel('LeftForeArm',   0, 0, -0.22);
      applyRel('RightForeArm',  0, 0,  0.22);
      const hips = bones['Hips'];
      if (hips && restPositions['Hips']) {
        hips.position.y = restPositions['Hips'].y + Math.abs(Math.sin(p)) * 0.025;
        applyRel('Hips',  0, Math.sin(p) * 0.04, 0);
        applyRel('Spine', 0, -Math.sin(p) * 0.03, 0);
        applyRel('Spine1',0, -Math.sin(p) * 0.02, 0);
        applyRel('Neck',  0,  Math.sin(p) * 0.02, 0);
      }
    } else {
      walkPhaseRef.current = THREE.MathUtils.lerp(walkPhaseRef.current, 0, 0.1);
      const breathe = Math.sin(t * 1.8) * 0.025;
      const sway    = Math.sin(t * 0.8) * 0.018;
      applyRel('LeftUpLeg',    0.02, 0, -0.02);
      applyRel('RightUpLeg',  -0.02, 0,  0.02);
      applyRel('LeftLeg',      0, 0, 0);
      applyRel('RightLeg',     0, 0, 0);
      applyRel('LeftArm',      breathe * 0.4, 0, -1.08 + sway);
      applyRel('RightArm',     breathe * 0.4, 0,  1.08 - sway);
      applyRel('LeftForeArm',  0, 0, -0.25);
      applyRel('RightForeArm', 0, 0,  0.25);
      applyRel('Spine',   breathe * 0.5, sway * 0.5, 0);
      applyRel('Spine1',  breathe, 0, 0);
      applyRel('Neck',   -breathe * 0.4, sway * 0.3, 0);
      applyRel('Head',   -breathe * 0.2, 0, 0);
      const hips = bones['Hips'];
      if (hips && restPositions['Hips']) {
        hips.position.y = restPositions['Hips'].y + Math.sin(t * 1.8) * 0.005;
        applyRel('Hips', 0, sway, 0);
      }
    }
  });

  // ── Virtual Try-On ────────────────────────────────────────────────────────
  useEffect(() => {
    const {
      top, bottom, shoes,
      origTopMat, origBottomMat, origShoesMat,
    } = meshesRef.current;

    // Dispose a previously applied custom material (not the originals)
    const disposeIfCustom = (mesh, orig) => {
      if (mesh?.material && mesh.material !== orig &&
          mesh.material.uuid !== orig?.uuid) {
        // Only dispose if it was created by us (has no 'Wolf3D' name)
        if (!(mesh.material.name || '').startsWith('Wolf3D')) {
          mesh.material.dispose?.();
        }
      }
    };

    const applyMat = (mesh, garmentItem, origMat) => {
      if (!mesh) return;
      disposeIfCustom(mesh, origMat);
      mesh.material = buildGarmentMaterial(garmentItem, origMat);
      mesh.material.needsUpdate = true;
      mesh.visible = true;
    };

    const restoreOrig = (mesh, origMat) => {
      if (!mesh || !origMat) return;
      disposeIfCustom(mesh, origMat);
      mesh.material = origMat.clone();
      mesh.material.needsUpdate = true;
      mesh.visible = true;
    };

    const isIndianEthnic =
      outfit?.dress?.category === 'indian_ethnic'       ||
      outfit?.top?.category   === 'indian_ethnic'       ||
      (outfit?.dress?.silhouette || '').includes('saree') ||
      (outfit?.dress?.silhouette || '').includes('anarkali');

    if (outfit?.dress || isIndianEthnic) {
      // ── Full-length dress / saree / anarkali ─────────────────────────────
      const dressItem = outfit.dress || outfit.top;
      applyMat(top,    dressItem, origTopMat);
      applyMat(bottom, dressItem, origBottomMat);
    } else {
      // ── Separate top ─────────────────────────────────────────────────────
      if (outfit?.top) {
        applyMat(top, outfit.top, origTopMat);
      } else {
        restoreOrig(top, origTopMat);
      }

      // ── Separate bottom ──────────────────────────────────────────────────
      if (outfit?.bottom) {
        applyMat(bottom, outfit.bottom, origBottomMat);
      } else {
        restoreOrig(bottom, origBottomMat);
      }
    }

    // ── Footwear ─────────────────────────────────────────────────────────────
    if (outfit?.shoes) {
      applyMat(shoes, outfit.shoes, origShoesMat);
    } else {
      restoreOrig(shoes, origShoesMat);
    }
  }, [outfit, avatarScene]);

  // ── Try-on sparkle aura ───────────────────────────────────────────────────
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

useGLTF.preload('/models/female_avatar.glb');
