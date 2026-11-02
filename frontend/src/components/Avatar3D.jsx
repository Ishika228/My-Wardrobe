import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { createGarmentPBRMaterial } from '../data/garmentTextures.js';

/**
 * Photorealistic Adult Female 3D Avatar
 * - True human anatomy, lifelike skin shader, natural hair, eyes, teeth, and proportions
 * - Supports Mode 1: Photorealistic Demo Model ("Elena")
 * - Supports Mode 2: MediaPipe Personalized Avatar (Biometric bone scaling & skin adaptation)
 * - Mixamo skeletal animation retargeting (smooth idle breathing, walking, turning)
 * - 72 ARKit facial blendshapes with procedural natural eye blinking
 * - Virtual try-on for Western outfits and Traditional Indian Sarees & Suits
 */
export default function Avatar3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isWalking = false,
  outfit = null,
  isTryOnEffect = false,
  mode = 'demo', // 'demo' | 'personalized'
  personalizedProfile = null
}) {
  const groupRef = useRef();
  const avatarSceneRef = useRef();

  // Load photorealistic female 3D model & animations
  const avatarGltf = useGLTF('/models/female_avatar.glb');
  const animsGltf = useGLTF('/models/animations.glb');

  // Retarget Mixamo animation tracks to match the avatar bones (removes 'mixamorig:' prefix)
  const retargetedAnimations = useMemo(() => {
    if (!animsGltf?.animations || animsGltf.animations.length === 0) return [];
    return animsGltf.animations.map((clip) => {
      const cloned = clip.clone();
      cloned.tracks.forEach((track) => {
        // Replace bone track names like "mixamorig:Hips.position" -> "Hips.position"
        track.name = track.name.replace(/^mixamorig:?/, '');
      });
      return cloned;
    });
  }, [animsGltf]);

  // Set up animations on the root group
  const { actions, mixer } = useAnimations(retargetedAnimations, groupRef);

  // Mesh references for modular styling and blendshapes
  const meshesRef = useRef({
    head: null,
    body: null,
    hair: null,
    top: null,
    bottom: null,
    shoes: null,
    eyes: [],
    glasses: null,
    bones: {}
  });

  // Clone scene and discover meshes, skeleton bones, and materials
  const avatarScene = useMemo(() => {
    if (!avatarGltf?.scene) return null;

    const clone = avatarGltf.scene.clone(true);
    const discovered = {
      head: null,
      body: null,
      hair: null,
      top: null,
      bottom: null,
      shoes: null,
      eyes: [],
      glasses: null,
      bones: {}
    };

    clone.traverse((child) => {
      if (child.isBone) {
        discovered.bones[child.name] = child;
      }

      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const name = child.name.toLowerCase();

        // Separate submeshes
        if (name.includes('head')) {
          discovered.head = child;
        } else if (name.includes('body')) {
          discovered.body = child;
        } else if (name.includes('hair')) {
          discovered.hair = child;
        } else if (name.includes('top')) {
          discovered.top = child;
        } else if (name.includes('bottom')) {
          discovered.bottom = child;
        } else if (name.includes('footwear') || name.includes('shoe')) {
          discovered.shoes = child;
        } else if (name.includes('eye') && !name.includes('brow')) {
          discovered.eyes.push(child);
        } else if (name.includes('glass')) {
          discovered.glasses = child;
          // Hide glasses by default for clean natural face
          child.visible = false;
        }

        // Configure realistic PBR skin material
        if (child.material) {
          const mat = child.material.clone();
          const matName = (mat.name || '').toLowerCase();

          if (matName.includes('skin') || matName.includes('body') || matName.includes('head')) {
            mat.roughness = 0.58;
            mat.metalness = 0.0;
            mat.envMapIntensity = 1.0;
            mat.needsUpdate = true;
          } else if (matName.includes('eye')) {
            mat.roughness = 0.1;
            mat.metalness = 0.05;
            mat.envMapIntensity = 1.5;
          } else if (matName.includes('hair')) {
            mat.roughness = 0.72;
            mat.metalness = 0.1;
            mat.envMapIntensity = 0.9;
          }
          child.material = mat;
        }
      }
    });

    meshesRef.current = discovered;
    return clone;
  }, [avatarGltf]);

  // Manage Idle vs Walk Animation transitions
  useEffect(() => {
    if (!actions) return;

    const idleAction = actions['idle'];
    const walkAction = actions['walk'];

    if (isWalking) {
      if (idleAction) idleAction.fadeOut(0.2);
      if (walkAction) {
        walkAction.reset().fadeIn(0.2).play();
        walkAction.timeScale = 1.05;
      }
    } else {
      if (walkAction) walkAction.fadeOut(0.25);
      if (idleAction) {
        idleAction.reset().fadeIn(0.25).play();
        idleAction.timeScale = 0.9;
      }
    }
  }, [isWalking, actions]);

  // Natural Procedural Eye Blinking & Micro-Expressions
  const blinkTimerRef = useRef(0);
  const nextBlinkIntervalRef = useRef(3.5);

  useFrame((state, delta) => {
    const headMesh = meshesRef.current.head;
    if (!headMesh || !headMesh.morphTargetDictionary || !headMesh.morphTargetInfluences) return;

    const dict = headMesh.morphTargetDictionary;
    const infl = headMesh.morphTargetInfluences;

    blinkTimerRef.current += delta;

    // Trigger blink
    if (blinkTimerRef.current > nextBlinkIntervalRef.current) {
      const blinkProgress = (blinkTimerRef.current - nextBlinkIntervalRef.current) / 0.18; // 180ms blink
      if (blinkProgress <= 1.0) {
        // Natural eye closure curve
        const blinkVal = Math.sin(blinkProgress * Math.PI);
        if (dict['eyeBlinkLeft'] !== undefined) infl[dict['eyeBlinkLeft']] = blinkVal;
        if (dict['eyeBlinkRight'] !== undefined) infl[dict['eyeBlinkRight']] = blinkVal;
      } else {
        // Reset for next blink
        if (dict['eyeBlinkLeft'] !== undefined) infl[dict['eyeBlinkLeft']] = 0;
        if (dict['eyeBlinkRight'] !== undefined) infl[dict['eyeBlinkRight']] = 0;
        blinkTimerRef.current = 0;
        nextBlinkIntervalRef.current = 2.8 + Math.random() * 2.5; // Natural 2.8s - 5.3s cadence
      }
    }

    // Subtle gentle breathing micro-sway on spine
    const bones = meshesRef.current.bones;
    const spineBone = bones['Spine1'] || bones['mixamorig:Spine1'];
    if (spineBone) {
      const t = state.clock.getElapsedTime();
      const breathe = Math.sin(t * 1.8) * 0.015;
      spineBone.scale.z = 1.0 + breathe;
    }
  });

  // Mode 2: Apply MediaPipe Biometrics & Reshape Skeleton Bones + Skin Complexion
  useEffect(() => {
    const { bones, head, body } = meshesRef.current;
    if (!bones) return;

    if (mode === 'personalized' && personalizedProfile) {
      // 1. Reshape Head & Jawbone
      const headBone = bones['Head'] || bones['mixamorig:Head'];
      if (headBone && personalizedProfile.headScale) {
        const [hx, hy, hz] = personalizedProfile.headScale;
        headBone.scale.set(hx, hy, hz);
      }

      // 2. Reshape Shoulders
      const leftShoulder = bones['LeftShoulder'] || bones['mixamorig:LeftShoulder'];
      const rightShoulder = bones['RightShoulder'] || bones['mixamorig:RightShoulder'];
      const sScale = personalizedProfile.shoulderScale || 1.0;
      if (leftShoulder) leftShoulder.scale.set(sScale, 1.0, 1.0);
      if (rightShoulder) rightShoulder.scale.set(sScale, 1.0, 1.0);

      // 3. Reshape Torso & Spine
      const spineBone = bones['Spine'] || bones['mixamorig:Spine'];
      if (spineBone && personalizedProfile.torsoScale) {
        const [tx, ty, tz] = personalizedProfile.torsoScale;
        spineBone.scale.set(tx, ty, tz);
      }

      // 4. Reshape Hips & Waist
      const hipsBone = bones['Hips'] || bones['mixamorig:Hips'];
      const hScale = personalizedProfile.hipScale || 1.0;
      if (hipsBone) {
        hipsBone.scale.set(hScale, 1.0, hScale);
      }

      // 5. Reshape Legs
      const leftLeg = bones['LeftUpLeg'] || bones['mixamorig:LeftUpLeg'];
      const rightLeg = bones['RightUpLeg'] || bones['mixamorig:RightUpLeg'];
      const legScale = personalizedProfile.legScale || 1.0;
      if (leftLeg) leftLeg.scale.set(1.0, legScale, 1.0);
      if (rightLeg) rightLeg.scale.set(1.0, legScale, 1.0);

      // 6. Apply Authentic Detected Skin Complexion
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

      // 7. Apply Facial Blendshapes
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
      // Mode 1: Reset to Default Photorealistic Demo Model ("Elena")
      const resetBones = ['Head', 'LeftShoulder', 'RightShoulder', 'Spine', 'Hips', 'LeftUpLeg', 'RightUpLeg'];
      resetBones.forEach((bName) => {
        const bone = bones[bName] || bones[`mixamorig:${bName}`];
        if (bone) bone.scale.set(1, 1, 1);
      });

      // Default warm radiant human skin tone
      const defaultSkin = new THREE.Color('#fbe2d3');
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

  // Dynamic Virtual Try-On: Apply selected clothing onto modular avatar meshes
  useEffect(() => {
    const { top, bottom, shoes } = meshesRef.current;
    if (!top || !bottom || !shoes) return;

    const isIndianEthnic =
      outfit?.dress?.category === 'indian_ethnic' ||
      outfit?.top?.category === 'indian_ethnic' ||
      outfit?.dress?.silhouette === 'saree' ||
      outfit?.dress?.silhouette === 'anarkali';

    // 1. One-Piece Ensemble: Sarees, Anarkalis, or Western Dresses
    if (outfit?.dress || isIndianEthnic) {
      const dressItem = outfit.dress || outfit.top;
      const dressMat = createGarmentPBRMaterial(dressItem);

      // Top receives bodice / choli / kurta material
      top.material = dressMat;
      top.visible = true;

      // Bottom receives pleated saree / anarkali skirt / gown material
      bottom.material = dressMat;
      bottom.visible = true;
    } else {
      // 2. Separate Top
      if (outfit?.top) {
        top.material = createGarmentPBRMaterial(outfit.top, 'ribbed');
        top.visible = true;
      } else {
        // Default chic ivory silk crop tank
        top.material = createGarmentPBRMaterial({
          primaryColor: '#ffffff',
          category: 'tops',
          silhouette: 'crop-tank'
        });
        top.visible = true;
      }

      // 3. Separate Bottom (Jeans, Trousers, Skirt)
      if (outfit?.bottom) {
        bottom.material = createGarmentPBRMaterial(outfit.bottom, 'denim');
        bottom.visible = true;
      } else {
        // Default indigo twill denim
        bottom.material = createGarmentPBRMaterial({
          primaryColor: '#5e84a8',
          category: 'trousers',
          silhouette: 'jeans'
        });
        bottom.visible = true;
      }
    }

    // 4. Footwear
    if (outfit?.shoes) {
      shoes.material = createGarmentPBRMaterial(outfit.shoes, 'sneaker');
    } else {
      shoes.material = createGarmentPBRMaterial({
        primaryColor: '#ffffff',
        category: 'shoes',
        silhouette: 'sneaker'
      });
    }
  }, [outfit, avatarScene]);

  // Try-on glowing sparkle aura
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
      {/* Try-On Sparkle Aura */}
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

      {/* Render Photorealistic Human Female 3D Avatar */}
      {avatarScene && (
        <primitive
          ref={avatarSceneRef}
          object={avatarScene}
          scale={[1.0, 1.0, 1.0]}
          position={[0, 0, 0]}
        />
      )}
    </group>
  );
}

// Preload models for instant response
useGLTF.preload('/models/female_avatar.glb');
useGLTF.preload('/models/animations.glb');
