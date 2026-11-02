import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Room3D from './Room3D.jsx';
import Avatar3D from './Avatar3D.jsx';
import ClothingDisplays from './ClothingDisplays.jsx';
import AvatarController from './AvatarController.jsx';

// Atmospheric floating light particles (delicate golden champagne motes)
function FloatingParticles({ count = 75 }) {
  const pointsRef = useRef();

  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sca = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 12;
      pos[i * 3 + 1] = Math.random() * 4.5 + 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      sca[i]         = Math.random() * 0.7 + 0.3;
    }
    return [pos, sca];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime() * 0.2;
    const arr = pointsRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3 + 1;
      arr[idx] += Math.sin(time + i * 1.5) * 0.002 + 0.001;
      if (arr[idx] > 5) arr[idx] = 0.5;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-scale"
          count={scales.length}
          array={scales}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#ffe8ba"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Complete 3D Penthouse Dressing Room Virtual Scene
export default function VRScene({
  controlsRef,
  autoRotate,
  avatarPosition,
  setAvatarPosition,
  avatarRotation,
  setAvatarRotation,
  isWalking,
  setIsWalking,
  currentOutfit,
  isTryOnEffect,
  selectedProduct,
  onSelectProduct,
  activeCategory,
  cameraMode,
  dpadInput,
  onResetDpad,
  avatarMode = 'demo',
  personalizedProfile = null
}) {
  return (
    <>
      <color attach="background" args={['#1c1524']} />

      {/* Warm Ambient Room Lighting */}
      <ambientLight intensity={1.2} color="#fff8f0" />

      {/* Main Overhead Directional Light casting realistic soft shadows */}
      <directionalLight
        position={[2.5, 6.5, 4]}
        intensity={1.85}
        color="#fff7ec"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
      />

      {/* Warm Window Twilight Fill Light (Blush Rose Sunset) */}
      <directionalLight position={[-4, 3, -3]} intensity={0.9} color="#f2bcd0" />

      {/* 3D Penthouse Luxury Architecture, Walk-in Wardrobe, Mirror, Furniture */}
      <Room3D />

      {/* Interactive 3D Clothing Displays (Floating clothes, racks, podiums) - No floating text */}
      <ClothingDisplays
        selectedProductId={selectedProduct?.id}
        onSelectProduct={onSelectProduct}
        activeCategory={activeCategory}
      />

      {/* Realistic 3D Human Female Model with Mixamo Skeletal Animations */}
      <Avatar3D
        position={avatarPosition}
        rotation={avatarRotation}
        isWalking={isWalking}
        outfit={currentOutfit}
        isTryOnEffect={isTryOnEffect}
        mode={avatarMode}
        personalizedProfile={personalizedProfile}
      />

      {/* Atmospheric Floating Champagne Dust Particles */}
      <FloatingParticles count={75} />

      {/* Avatar Locomotion & Orbit Controls */}
      <AvatarController
        avatarPosition={avatarPosition}
        setAvatarPosition={setAvatarPosition}
        avatarRotation={avatarRotation}
        setAvatarRotation={setAvatarRotation}
        isWalking={isWalking}
        setIsWalking={setIsWalking}
        dpadInput={dpadInput}
        onResetDpad={onResetDpad}
        cameraMode={cameraMode}
        controlsRef={controlsRef}
        autoRotate={autoRotate}
      />
    </>
  );
}
