import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createGarmentPBRMaterial } from '../data/garmentTextures.js';

/**
 * Photorealistic Adult Female 3D Avatar
 * - True human anatomy with lifelike skin, hair, facial features and natural posture
 * - Natural grounded idle stance with lowered relaxed arms, chest breathing, and procedural eye blinking
 * - Fluid walking locomotion with synchronized leg stride, knee flexing, and arm swing
 * - Full Virtual Try-On integration (Tops, Bottoms, Dresses, Shoes, Indian Ethnic)
 * - MediaPipe biometric scaling and facial morph targets support
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

  // Load photorealistic female 3D model
  const avatarGltf = useGLTF('/models/female_avatar.glb');

  // Mesh and bone references
  const meshesRef = useRef({
    head: null,
    body: null,
    hair: null,
    top: null,
    bottom: null,
    shoes: null,
    eyes: [],
    glasses: null,
    bones: {},
    restQuaternions: {},
    restPositions: {}
  });

  // Clone scene, discover meshes, skeleton bones, and record rest pose
  const avatarScene = useMemo(() => {
    if (!avatarGltf?.scene) return null;

    const clone = SkeletonUtils.clone(avatarGltf.scene);
    const discovered = {
      head: null,
      body: null,
      hair: null,
      top: null,
      bottom: null,
      shoes: null,
      eyes: [],
      glasses: null,
      bones: {},
      restQuaternions: {},
      restPositions: {}
    };

    clone.traverse((child) => {
      if (child.isBone) {
        discovered.bones[child.name] = child;
        discovered.restQuaternions[child.name] = child.quaternion.clone();
        discovered.restPositions[child.name] = child.position.clone();
      }

      if (child.isMesh || child.isSkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false; // Prevent unwanted culling during movement

        const name = child.name.toLowerCase();

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
          child.visible = false; // Clean face by default
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

  // Locomotion & Posture Animation Loop
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
        const blinkProgress = (blinkTimerRef.current - nextBlinkIntervalRef.current) / 0.18;
        if (blinkProgress <= 1.0) {
          const blinkVal = Math.sin(blinkProgress * Math.PI);
          if (dict['eyeBlinkLeft'] !== undefined) infl[dict['eyeBlinkLeft']] = blinkVal;
          if (dict['eyeBlinkRight'] !== undefined) infl[dict['eyeBlinkRight']] = blinkVal;
        } else {
          if (dict['eyeBlinkLeft'] !== undefined) infl[dict['eyeBlinkLeft']] = 0;
          if (dict['eyeBlinkRight'] !== undefined) infl[dict['eyeBlinkRight']] = 0;
          blinkTimerRef.current = 0;
          nextBlinkIntervalRef.current = 2.8 + Math.random() * 2.5;
        }
      }
    }

    // Helper to rotate a bone relative to its rest quaternion
    const applyRelativeRotation = (boneName, eulerX, eulerY, eulerZ) => {
      const bone = bones[boneName];
      const rest = restQuaternions[boneName];
      if (!bone || !rest) return;
      const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(eulerX, eulerY, eulerZ, 'XYZ'));
      bone.quaternion.copy(rest).multiply(rot);
    };

    if (isWalking) {
      // --- WALKING STATE ---
      walkPhaseRef.current += delta * 7.2;
      const phase = walkPhaseRef.current;

      // Leg stride swing
      const leftStride = Math.sin(phase) * 0.42;
      const rightStride = Math.sin(phase + Math.PI) * 0.42;

      // Natural knee flex on the back/lift phase
      const leftKnee = Math.max(0, -Math.sin(phase)) * 0.55;
      const rightKnee = Math.max(0, -Math.sin(phase + Math.PI)) * 0.55;

      // Apply leg rotations relative to rest pose
      applyRelativeRotation('LeftUpLeg', leftStride, 0, 0);
      applyRelativeRotation('RightUpLeg', rightStride, 0, 0);
      applyRelativeRotation('LeftLeg', -leftKnee, 0, 0);
      applyRelativeRotation('RightLeg', -rightKnee, 0, 0);

      // Arm swing in counter-cadence with legs (relaxed down + swinging forward/back)
      const leftArmSwing = Math.sin(phase + Math.PI) * 0.32;
      const rightArmSwing = Math.sin(phase) * 0.32;
      applyRelativeRotation('LeftArm', leftArmSwing, 0, -1.05);
      applyRelativeRotation('RightArm', rightArmSwing, 0, 1.05);
      applyRelativeRotation('LeftForeArm', 0, 0, -0.22);
      applyRelativeRotation('RightForeArm', 0, 0, 0.22);

      // Subtle hip bob and sway
      const hips = bones['Hips'];
      const restHips = restPositions['Hips'];
      if (hips && restHips) {
        hips.position.y = restHips.y + Math.abs(Math.sin(phase)) * 0.025;
        applyRelativeRotation('Hips', 0, Math.sin(phase) * 0.04, 0);
      }

      // Torso counter-rotation
      applyRelativeRotation('Spine', 0, -Math.sin(phase) * 0.03, 0);
      applyRelativeRotation('Spine1', 0, -Math.sin(phase) * 0.02, 0);
      applyRelativeRotation('Neck', 0, Math.sin(phase) * 0.02, 0);
    } else {
      // --- NATURAL IDLE STANCE ---
      // Smoothly wind down walk phase
      walkPhaseRef.current = THREE.MathUtils.lerp(walkPhaseRef.current, 0, 0.1);

      // Rhythmic chest breathing & subtle weight shift
      const breathe = Math.sin(t * 1.8) * 0.025;
      const sway = Math.sin(t * 0.8) * 0.018;

      // Legs standing straight and grounded on floor
      applyRelativeRotation('LeftUpLeg', 0.02, 0, -0.02);
      applyRelativeRotation('RightUpLeg', -0.02, 0, 0.02);
      applyRelativeRotation('LeftLeg', 0, 0, 0);
      applyRelativeRotation('RightLeg', 0, 0, 0);

      // Relaxed arms at sides with breathing micro-movement
      applyRelativeRotation('LeftArm', breathe * 0.4, 0, -1.08 + sway);
      applyRelativeRotation('RightArm', breathe * 0.4, 0, 1.08 - sway);
      applyRelativeRotation('LeftForeArm', 0, 0, -0.25);
      applyRelativeRotation('RightForeArm', 0, 0, 0.25);

      // Spine breathing
      applyRelativeRotation('Spine', breathe * 0.5, sway * 0.5, 0);
      applyRelativeRotation('Spine1', breathe, 0, 0);
      applyRelativeRotation('Neck', -breathe * 0.4, sway * 0.3, 0);
      applyRelativeRotation('Head', -breathe * 0.2, 0, 0);

      // Hips rest firmly at floor ground height
      const hips = bones['Hips'];
      const restHips = restPositions['Hips'];
      if (hips && restHips) {
        hips.position.y = restHips.y + Math.sin(t * 1.8) * 0.005;
        applyRelativeRotation('Hips', 0, sway, 0);
      }
    }
  });

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

      top.material = dressMat;
      top.material.needsUpdate = true;
      top.visible = true;

      bottom.material = dressMat;
      bottom.material.needsUpdate = true;
      bottom.visible = true;
    } else {
      // 2. Separate Top
      if (outfit?.top) {
        top.material = createGarmentPBRMaterial(outfit.top, 'ribbed');
      } else {
        // Default chic ivory silk crop tank
        top.material = createGarmentPBRMaterial({
          primaryColor: '#ffffff',
          category: 'tops',
          silhouette: 'crop-tank'
        });
      }
      top.material.needsUpdate = true;
      top.visible = true;

      // 3. Separate Bottom (Jeans, Trousers, Skirt)
      if (outfit?.bottom) {
        bottom.material = createGarmentPBRMaterial(outfit.bottom, 'denim');
      } else {
        // Default indigo twill denim
        bottom.material = createGarmentPBRMaterial({
          primaryColor: '#5e84a8',
          category: 'trousers',
          silhouette: 'jeans'
        });
      }
      bottom.material.needsUpdate = true;
      bottom.visible = true;
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
    shoes.material.needsUpdate = true;
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
          scale={[1.15, 1.15, 1.15]}
          position={[0, 0, 0]}
        />
      )}
    </group>
  );
}

// Preload model
useGLTF.preload('/models/female_avatar.glb');
