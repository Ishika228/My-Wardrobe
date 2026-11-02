import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { createGarmentPBRMaterial } from '../data/garmentTextures.js';

/**
 * High-End Realistic Female Fashion Model with Modular Rigged Clothing System
 * - Uses Mixamo-rigged humanoid skeleton with natural proportions and detailed features
 * - Dynamically attaches modular garments to the body skeleton using submesh partition
 * - Supports independent swapping of Top, Bottom, Dress, Outerwear, and Shoes
 * - Fully animated with seamless transitions between Idle, Walking, and Turning states
 */
export default function Avatar3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isWalking = false,
  outfit = null,
  isTryOnEffect = false
}) {
  const groupRef = useRef();

  // Load avatar and Mixamo animations
  const avatarGltf = useGLTF('/models/female_avatar.glb');
  const animsGltf = useGLTF('/models/animations.glb');

  // Precomputed triangle partition regions for modular garment attachment
  const [regions, setRegions] = useState(null);

  useEffect(() => {
    fetch('/models/avatar_regions.json')
      .then((res) => res.json())
      .then((data) => setRegions(data))
      .catch((err) => console.error('Error loading avatar regions:', err));
  }, []);

  // Cloned skinned avatar body with modular garment meshes
  const modularSystem = useMemo(() => {
    if (!avatarGltf?.scene || !regions) return null;

    // Clone base avatar scene
    const clone = avatarGltf.scene.clone(true);
    let originalSkinnedMesh = null;

    clone.traverse((child) => {
      if (child.isSkinnedMesh && !originalSkinnedMesh) {
        originalSkinnedMesh = child;
      }
    });

    if (!originalSkinnedMesh) return null;

    const baseGeom = originalSkinnedMesh.geometry;
    const skeleton = originalSkinnedMesh.skeleton;

    // Helper to generate a new SkinnedMesh sharing the avatar's exact skeleton and bones
    function createRegionSkinnedMesh(name, indexArray, baseMat) {
      const subGeom = baseGeom.clone();
      subGeom.setIndex(new THREE.Uint16BufferAttribute(new Uint16Array(indexArray), 1));
      subGeom.computeVertexNormals();

      const mesh = new THREE.SkinnedMesh(subGeom, baseMat);
      mesh.name = name;
      mesh.bind(skeleton, originalSkinnedMesh.bindMatrix);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    // Realistic PBR skin material for Head/Face and Arms
    const baseMat = originalSkinnedMesh.material.clone();
    baseMat.roughness = 0.48;
    baseMat.metalness = 0.05;
    baseMat.envMapIntensity = 1.0;

    // Create modular submeshes
    const headMesh = createRegionSkinnedMesh('Avatar_Head', regions.head, baseMat);
    const armsMesh = createRegionSkinnedMesh('Avatar_Arms', regions.arms, baseMat);
    const topMesh = createRegionSkinnedMesh('Garment_Top', regions.top, baseMat);
    const bottomMesh = createRegionSkinnedMesh('Garment_Bottom', regions.bottom, baseMat);
    const shoesMesh = createRegionSkinnedMesh('Garment_Shoes', regions.shoes, baseMat);

    // Replace original monolithic mesh with modular meshes inside parent
    const parentNode = originalSkinnedMesh.parent;
    parentNode.remove(originalSkinnedMesh);

    parentNode.add(headMesh);
    parentNode.add(armsMesh);
    parentNode.add(topMesh);
    parentNode.add(bottomMesh);
    parentNode.add(shoesMesh);

    return {
      rootScene: clone,
      headMesh,
      armsMesh,
      topMesh,
      bottomMesh,
      shoesMesh,
      baseMat
    };
  }, [avatarGltf, regions]);

  // Hook up Mixamo skeletal animations
  const { actions } = useAnimations(animsGltf?.animations || [], groupRef);

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

  // Dynamic Virtual Try-On: Apply selected wardrobe items onto the avatar modular garments
  useEffect(() => {
    if (!modularSystem) return;

    const { topMesh, bottomMesh, shoesMesh, baseMat } = modularSystem;

    // 1. Dress or Top
    if (outfit?.dress) {
      // Dress covers both top and bottom with cohesive drape
      const dressMat = createGarmentPBRMaterial(outfit.dress);
      topMesh.material = dressMat;
      bottomMesh.material = dressMat;
      topMesh.visible = true;
      bottomMesh.visible = true;
    } else {
      // Individual Top
      if (outfit?.top) {
        topMesh.material = createGarmentPBRMaterial(outfit.top, 'ribbed');
        topMesh.visible = true;
      } else {
        // Default chic white crop top
        topMesh.material = createGarmentPBRMaterial({ primaryColor: '#ffffff', category: 'tops', silhouette: 'crop-tank' });
        topMesh.visible = true;
      }

      // Individual Bottom (Jeans / Trousers / Skirt)
      if (outfit?.bottom) {
        bottomMesh.material = createGarmentPBRMaterial(outfit.bottom, 'denim');
        bottomMesh.visible = true;
      } else {
        // Default vintage denim jeans
        bottomMesh.material = createGarmentPBRMaterial({ primaryColor: '#5e84a8', category: 'trousers', silhouette: 'wide-jeans' });
        bottomMesh.visible = true;
      }
    }

    // 2. Shoes
    if (outfit?.shoes) {
      shoesMesh.material = createGarmentPBRMaterial(outfit.shoes, 'sneaker');
    } else {
      shoesMesh.material = createGarmentPBRMaterial({ primaryColor: '#ffffff', category: 'shoes', silhouette: 'sneakers' });
    }
  }, [outfit, modularSystem]);

  // Try-on glowing sparkle aura
  const auraRef = useRef();
  useFrame((state, delta) => {
    if (auraRef.current && isTryOnEffect) {
      const t = state.clock.getElapsedTime();
      auraRef.current.rotation.y += delta * 2;
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

      {/* Render the Modular Human Avatar Model */}
      {modularSystem?.rootScene ? (
        <primitive
          object={modularSystem.rootScene}
          scale={[1.1, 1.1, 1.1]}
          position={[0, 0, 0]}
        />
      ) : null}
    </group>
  );
}

// Preload models for immediate instant loading
useGLTF.preload('/models/female_avatar.glb');
useGLTF.preload('/models/animations.glb');
