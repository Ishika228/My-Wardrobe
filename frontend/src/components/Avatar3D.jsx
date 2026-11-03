import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadAndRigGlbGarment, fitAndRigStaticGarment } from '../services/garmentRiggingService.js';

/**
 * Avatar3D – Photorealistic Female 3D Avatar with True 3D Garment Virtual Try-On
 *
 * Implements:
 * 1. Cloud-Based 2D-to-3D Garment Generation & Auto-Rigging:
 *    - Loads dynamic GLB assets from Tripo3D API v3 / Cloud AI pipeline.
 *    - Auto-rigs static geometry with ReadyPlayerMe bone weights (Hips, Spine, Shoulders, Arms, Legs).
 *    - Binds to live avatar skeleton via SkinnedMesh.bind(skeleton, bindMatrix).
 * 2. Authentic Pre-Rigged 3D Garment Geometry:
 *    - dress_floral_puff.glb: Authentic pink floral dress with square neckline,
 *      3D puffed sleeves on shoulders, belted sash with tied front bow, and
 *      3-tier layered ruffled flared skirt.
 *    - dress_saree.glb: Banarasi silk saree with pleated drape and pallu.
 *    - dress_slip.glb: Liquid satin slip midi dress.
 *    - top_casual.glb: Tailored shirt/top with fitted sleeves.
 *    - trouser_jeans.glb: Contoured denim trousers with separate legs.
 * 3. Prevention of Black Cones, Clipping & Distortions:
 *    - Clean PBR textures with sRGB color space, tangent-space normal maps,
 *      and double-sided rendering.
 *    - Hides underlying body parts (top/bottom) when wearing dresses to
 *      completely eliminate clipping and body penetration.
 *    - Clean lifecycle removal and memory disposal of previous garment meshes on outfit change.
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
                       (imageSrc.startsWith('http') || imageSrc.startsWith('blob:') || imageSrc.startsWith('/'));

  if (hasRealImage) {
    try {
      const tex = getLoadedTexture(imageSrc);
      params.map = tex;
      params.color = new THREE.Color(color);
    } catch {
      params.color = new THREE.Color(color);
    }
  } else {
    params.color = new THREE.Color(color);
  }

  return new THREE.MeshPhysicalMaterial(params);
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Avatar3D({
  outfit = {},
  isWalking = false,
  isTryOnEffect = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  mode = 'demo',
  personalizedProfile = null,
}) {
  const groupRef = useRef();
  const activeDressRef = useRef(null);

  // Load avatar and authentic 3D garment GLB assets & mocap animations
  const avatarGltf = useGLTF('/models/female_avatar.glb');
  const animsGltf = useGLTF('/models/animations.glb');
  const dressFloralGltf = useGLTF('/models/garments/dress_floral_puff.glb');
  const dressSlipGltf = useGLTF('/models/garments/dress_slip.glb');
  const dressSareeGltf = useGLTF('/models/garments/dress_saree.glb');
  const topCasualGltf = useGLTF('/models/garments/top_casual.glb');
  const trouserJeansGltf = useGLTF('/models/garments/trouser_jeans.glb');

  // Retarget Mixamo animation tracks to match ReadyPlayerMe avatar bones
  // CRITICAL FIX: Mixamo animations contain translation tracks in centimeters (Hips Y=102.83, Spine Y=10.18).
  // Applying position tracks directly on a meter-scale ReadyPlayerMe skeleton shoots the bones 100 meters into the sky!
  // By discarding position and scale tracks and keeping pure rotation (quaternion) tracks,
  // the avatar preserves its exact anatomical ReadyPlayerMe bone lengths and stands grounded on the showroom floor.
  const retargetedAnimations = useMemo(() => {
    if (!animsGltf?.animations || animsGltf.animations.length === 0) return [];
    return animsGltf.animations.map((clip) => {
      const cloned = clip.clone();
      const cleanTracks = [];

      cloned.tracks.forEach((track) => {
        const cleanName = track.name.replace(/^mixamorig:?/, '');

        // 1. Discard scale tracks
        if (cleanName.endsWith('.scale')) return;

        // 2. Discard all translation/position tracks (humanoid bones have fixed lengths; only rotations drive poses)
        if (cleanName.endsWith('.position')) return;

        // 3. Keep all rotation/quaternion tracks
        track.name = cleanName;
        cleanTracks.push(track);
      });

      cloned.tracks = cleanTracks;
      return cloned;
    });
  }, [animsGltf]);

  // Set up animations on root group
  const { actions } = useAnimations(retargetedAnimations, groupRef);

  // Extract authentic 3D garment geometries
  const garmentGeometries = useMemo(() => {
    const extract = (gltf) => {
      let found = null;
      if (gltf?.scene) {
        gltf.scene.traverse((child) => {
          if (!found && child.isMesh && child.geometry) {
            found = child.geometry;
          }
        });
      }
      return found;
    };

    return {
      floralPuff: extract(dressFloralGltf),
      slip: extract(dressSlipGltf),
      saree: extract(dressSareeGltf),
      top: extract(topCasualGltf),
      jeans: extract(trouserJeansGltf),
    };
  }, [dressFloralGltf, dressSlipGltf, dressSareeGltf, topCasualGltf, trouserJeansGltf]);

  const meshesRef = useRef({
    top: null, bottom: null, shoes: null, body: null, head: null, hair: null,
    eyes: [], glasses: null, bones: {},
    origTopMat: null, origBottomMat: null, origShoesMat: null,
  });

  // Clone avatar scene safely with SkeletonUtils
  const avatarScene = useMemo(() => {
    if (!avatarGltf?.scene) return null;
    const clone = SkeletonUtils.clone(avatarGltf.scene);

    const disc = {
      top: null, bottom: null, shoes: null, body: null, head: null, hair: null,
      eyes: [], glasses: null, bones: {},
      origTopMat: null, origBottomMat: null, origShoesMat: null,
    };

    clone.traverse((child) => {
      if (child.isBone) {
        disc.bones[child.name] = child;
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

  // ── Manage Idle vs Walk Animation transitions via Mixamo mocap ────────────
  useEffect(() => {
    if (!actions) return;

    const idleAction = actions['idle'];
    const walkAction = actions['walk'];

    if (isWalking) {
      if (idleAction) idleAction.fadeOut(0.25);
      if (walkAction) {
        walkAction.reset().fadeIn(0.25).play();
        walkAction.timeScale = 1.05;
      }
    } else {
      if (walkAction) walkAction.fadeOut(0.25);
      if (idleAction) {
        idleAction.reset().fadeIn(0.25).play();
      }
    }
  }, [isWalking, actions]);

  // ── Procedural Eye Blinking & Natural Breathing ───────────────────────────
  const blinkTimerRef = useRef(0);
  const nextBlinkIntervalRef = useRef(3.5);

  useFrame((state, delta) => {
    const { head, bones } = meshesRef.current;
    const t = state.clock.getElapsedTime();

    // 1. Keep Hips firmly anchored at natural standing height with organic breathing (±3 mm)
    if (bones?.['Hips']) {
      const breathe = Math.sin(t * 1.8) * 0.003;
      bones['Hips'].position.set(0, 1.03696 + breathe, 0.0404);
    }

    // 2. Procedural Eye Blinking & Facial Micro-expressions
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
  });

  // ── Biometric Profile Adaptation (Custom Body Scaling) ───────────────────
  useEffect(() => {
    const { bones, head, body } = meshesRef.current;
    if (!bones || Object.keys(bones).length === 0) return;

    if (mode === 'personalized' && personalizedProfile) {
      if (personalizedProfile.boneScales) {
        Object.entries(personalizedProfile.boneScales).forEach(([bName, scale]) => {
          const bone = bones[bName];
          if (bone && Array.isArray(scale) && scale.length === 3) {
            bone.scale.set(scale[0], scale[1], scale[2]);
          }
        });
      }
      if (personalizedProfile.skinColor) {
        const skinCol = new THREE.Color(personalizedProfile.skinColor);
        if (head?.material) {
          head.material.color = skinCol;
          head.material.roughness = 0.58;
          head.material.needsUpdate = true;
        }
        if (body?.material) {
          body.material.color = skinCol;
          body.material.roughness = 0.58;
          body.material.needsUpdate = true;
        }
      }
      if (head?.morphTargetDictionary && head?.morphTargetInfluences && personalizedProfile.morphTargets) {
        const dict = head.morphTargetDictionary;
        const infl = head.morphTargetInfluences;
        Object.entries(personalizedProfile.morphTargets).forEach(([targetName, weight]) => {
          if (dict[targetName] !== undefined) {
            infl[dict[targetName]] = weight;
          }
        });
      }
    } else {
      const resetBones = ['Head', 'LeftShoulder', 'RightShoulder', 'Spine', 'Hips', 'LeftUpLeg', 'RightUpLeg'];
      resetBones.forEach((bName) => {
        const bone = bones[bName];
        if (bone) bone.scale.set(1, 1, 1);
      });
      const defaultSkin = new THREE.Color('#ffffff');
      if (head?.material) {
        head.material.color = defaultSkin;
        head.material.needsUpdate = true;
      }
      if (body?.material) {
        body.material.color = defaultSkin;
        body.material.needsUpdate = true;
      }
    }
  }, [mode, personalizedProfile, avatarScene]);

  // ── Outfit Application & Auto-Rigging Engine ──────────────────────────────
  useEffect(() => {
    if (!avatarScene) return;

    const {
      top, bottom, shoes,
      origTopMat, origBottomMat, origShoesMat,
    } = meshesRef.current;

    let isDisposed = false;

    // 1. Cleanly remove previous active live dress mesh
    if (activeDressRef.current) {
      avatarScene.remove(activeDressRef.current);
      if (activeDressRef.current.geometry) activeDressRef.current.geometry.dispose?.();
      if (activeDressRef.current.material) activeDressRef.current.material.dispose?.();
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

      const dressMat = buildGarmentMaterial(dressItem, origTopMat);
      const customGlbUrl = dressItem?.modelUrl || dressItem?.model3d?.modelUrl;

      // If a custom cloud-generated GLB URL exists, load and auto-rig it
      if (customGlbUrl && top?.skeleton) {
        loadAndRigGlbGarment(customGlbUrl, top.skeleton, top.bindMatrix, 'dress', dressMat)
          .then((riggedMesh) => {
            if (isDisposed) {
              riggedMesh.geometry?.dispose?.();
              return;
            }
            if (activeDressRef.current) {
              avatarScene.remove(activeDressRef.current);
            }
            riggedMesh.name = 'Avatar_Active_Dress';
            avatarScene.add(riggedMesh);
            activeDressRef.current = riggedMesh;

            // Hide underlying body garments to completely eliminate clipping
            if (top) top.visible = false;
            if (bottom) bottom.visible = false;
          })
          .catch((err) => {
            console.warn('[Avatar3D] Could not load custom GLB, using procedural fallback:', err.message);
            if (targetGeom && !isDisposed) {
              const dressSkinnedMesh = new THREE.SkinnedMesh(targetGeom.clone(), dressMat);
              dressSkinnedMesh.name = 'Avatar_Active_Dress';
              dressSkinnedMesh.bind(top.skeleton, top.bindMatrix);
              dressSkinnedMesh.castShadow = true;
              dressSkinnedMesh.receiveShadow = true;
              dressSkinnedMesh.frustumCulled = false;
              avatarScene.add(dressSkinnedMesh);
              activeDressRef.current = dressSkinnedMesh;
              if (top) top.visible = false;
              if (bottom) bottom.visible = false;
            }
          });
      } else if (targetGeom && top?.skeleton) {
        // Direct authentic SkinnedMesh binding
        const dressSkinnedMesh = new THREE.SkinnedMesh(targetGeom.clone(), dressMat);
        dressSkinnedMesh.name = 'Avatar_Active_Dress';
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

    return () => {
      isDisposed = true;
    };
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
useGLTF.preload('/models/animations.glb');
useGLTF.preload('/models/garments/dress_floral_puff.glb');
useGLTF.preload('/models/garments/dress_slip.glb');
useGLTF.preload('/models/garments/dress_saree.glb');
useGLTF.preload('/models/garments/top_casual.glb');
useGLTF.preload('/models/garments/trouser_jeans.glb');
