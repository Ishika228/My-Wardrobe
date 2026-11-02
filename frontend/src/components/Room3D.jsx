import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Procedural Panoramic Twilight Skyline for Window
function LuxuryCitySkyline() {
  const skylineTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Ethereal Twilight Sky Gradient: Blush Pink into Warm Rose & Sunset Orange
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#2b1b3a');
    grad.addColorStop(0.35, '#5c2d58');
    grad.addColorStop(0.68, '#b85472');
    grad.addColorStop(0.88, '#e58e82');
    grad.addColorStop(1, '#f8bf9e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Silhouetted Skyscraper Cityline with sparkling golden windows
    ctx.fillStyle = '#221528';
    const buildings = [
      { x: 15, w: 75, h: 220 },
      { x: 95, w: 90, h: 320 },
      { x: 195, w: 70, h: 260 },
      { x: 275, w: 105, h: 390 },
      { x: 390, w: 85, h: 290 },
      { x: 485, w: 115, h: 360 },
      { x: 610, w: 80, h: 275 },
      { x: 700, w: 95, h: 340 },
      { x: 805, w: 90, h: 400 },
      { x: 905, w: 115, h: 290 }
    ];

    buildings.forEach((b) => {
      ctx.fillRect(b.x, 512 - b.h, b.w, b.h);
      ctx.fillStyle = '#fff0c7';
      for (let wy = 512 - b.h + 20; wy < 500; wy += 14) {
        for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 12) {
          if (Math.random() > 0.38) {
            ctx.fillRect(wx, wy, 4, 6);
          }
        }
      }
      ctx.fillStyle = '#221528';
    });

    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <mesh position={[-3.8, 3.2, -6.0]} rotation={[0, 0.28, 0]}>
      <planeGeometry args={[15, 8.5]} />
      <meshBasicMaterial map={skylineTexture} toneMapped={false} />
    </mesh>
  );
}

// 3D Luxury Designer Handbag
function DesignerHandbag({ position, color = '#f7d3dd', scale = 1, rotation = [0, 0, 0] }) {
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.34, 0.26, 0.16]} />
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.2, 0.082]}>
        <boxGeometry args={[0.32, 0.14, 0.015]} />
        <meshStandardMaterial color={color} roughness={0.28} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.13, 0.092]}>
        <boxGeometry args={[0.045, 0.035, 0.015]} />
        <meshStandardMaterial color="#f0d5a8" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <torusGeometry args={[0.1, 0.018, 12, 24, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  );
}

// Realistic Hanging Clothes inside wardrobe rails
function HangingGarment({ position, color = '#f7d3dd', length = 0.95 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.42, 0.014, 0.014]} />
        <meshStandardMaterial color="#f0d5a8" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.045, 0.007, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#f0d5a8" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh position={[0, -length / 2 + 0.06, 0]} castShadow>
        <boxGeometry args={[0.44, length, 0.075]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.1} />
      </mesh>
    </group>
  );
}

// Luxury Walk-In Wardrobe Room Architecture
export default function Room3D() {
  // Load real GLTF luxury furniture models
  const sofaGltf = useGLTF('/models/sofa.glb');
  const chairGltf = useGLTF('/models/armchair.glb');

  return (
    <group position={[0, 0, 0]}>
      {/* 1. POLISHED CALACATTA MARBLE FLOORING */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#faf7f2" roughness={0.18} metalness={0.12} />
      </mesh>

      {/* Champagne Gold Floor Inlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <ringGeometry args={[4.4, 4.46, 64]} />
        <meshStandardMaterial color="#edd4af" metalness={0.92} roughness={0.22} />
      </mesh>

      {/* 2. PLUSH BLUSH-PINK RUNWAY RUG */}
      <group position={[0, 0.015, 0.2]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[2.5, 64]} />
          <meshStandardMaterial color="#eec8d2" roughness={0.88} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[1.78, 1.82, 64]} />
          <meshBasicMaterial color="#f7e1e7" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[2.2, 2.24, 64]} />
          <meshBasicMaterial color="#f7e1e7" />
        </mesh>
      </group>

      {/* 3. SUSPENDED HALO CHANDELIER */}
      <group position={[0, 5.8, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[18, 18]} />
          <meshStandardMaterial color="#fdfbf7" roughness={0.85} />
        </mesh>
        <group position={[0, -1.25, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.42, 0.07, 24, 64]} />
            <meshStandardMaterial
              color="#fff7e6"
              emissive="#ffeed1"
              emissiveIntensity={2.2}
              roughness={0.15}
            />
          </mesh>
          <pointLight position={[0, -0.2, 0]} intensity={1.8} color="#fff6e8" distance={8.5} />
        </group>
      </group>

      {/* 4. WALLS & PANORAMIC CITY SKYLINE WINDOW */}
      <mesh position={[0, 2.9, -5.3]}>
        <planeGeometry args={[18, 6.0]} />
        <meshStandardMaterial color="#f9f5f0" roughness={0.9} />
      </mesh>

      <group position={[-3.8, 2.9, -3.4]} rotation={[0, 0.35, 0]}>
        <LuxuryCitySkyline />
        <mesh position={[0, 0, -1]}>
          <boxGeometry args={[5.2, 5.6, 0.12]} />
          <meshPhysicalMaterial
            color="#d9eaf5"
            transmission={0.9}
            opacity={0.35}
            transparent
            roughness={0.05}
            ior={1.5}
          />
        </mesh>
      </group>

      {/* 5. FULL-LENGTH OUTFIT CHECK MIRROR STATION */}
      <group position={[-2.85, 2.45, -0.5]} rotation={[0, 0.45, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.45, 3.3, 0.1]} />
          <meshStandardMaterial color="#f0d5a8" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[0.725, 0.725, 0.1, 32, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#f0d5a8" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.05, 0.06]}>
          <planeGeometry args={[1.24, 3.05]} />
          <meshStandardMaterial color="#e8f3f5" roughness={0.03} metalness={0.98} />
        </mesh>
        <pointLight position={[0, 0.5, 0.6]} intensity={1.5} color="#fff6eb" distance={5.5} />
      </group>

      {/* Real Model Live Display Standing Mirror in VIP Penthouse */}
      <group position={[-1.75, 2.05, -0.65]} rotation={[0, 0.45, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.08, 1.9, 0.04]} />
          <meshStandardMaterial color="#f0d5a8" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0, 0.024]}>
          <planeGeometry args={[0.98, 1.8]} />
          <meshBasicMaterial map={useMemo(() => {
            const loader = new THREE.TextureLoader();
            const tex = loader.load('/fashion_lady.png');
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
          }, [])} />
        </mesh>
        <pointLight position={[0, 0, 0.35]} intensity={0.85} color="#ffe4e6" distance={2.8} />
      </group>

      {/* 6. NEON SCRIPT */}
      <group position={[-3.3, 3.8, -1.7]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[1.0, 0.03, 0.02]} />
          <meshBasicMaterial color="#f472b6" />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.8, 0.03, 0.02]} />
          <meshBasicMaterial color="#f472b6" />
        </mesh>
        <pointLight position={[0, 0, 0.2]} intensity={1.2} color="#f472b6" distance={3.8} />
      </group>

      {/* 7. REALISTIC 3D VELVET SOFA & SEATING (From GlamVelvetSofa GLTF) */}
      {sofaGltf?.scene ? (
        <group position={[-2.7, 0, -3.4]} rotation={[0, 0.8, 0]} scale={[1.1, 1.1, 1.1]}>
          <primitive object={sofaGltf.scene.clone(true)} />
        </group>
      ) : null}

      {/* Real 3D Sheen Armchair */}
      {chairGltf?.scene ? (
        <group position={[-2.4, 0, 1.2]} rotation={[0, 0.5, 0]} scale={[1.3, 1.3, 1.3]}>
          <primitive object={chairGltf.scene.clone(true)} />
        </group>
      ) : null}

      {/* 8. GRAND WALK-IN WARDROBE (RIGHT WALL) */}
      <group position={[2.7, 0, -1.8]}>
        <mesh position={[0, 2.75, -0.72]}>
          <boxGeometry args={[4.4, 5.5, 0.08]} />
          <meshStandardMaterial color="#f7f3ed" roughness={0.4} />
        </mesh>

        {/* 5 Fluted Vertical Dividers with Champagne Gold Trims */}
        {[-2.2, -1.1, 0, 1.1, 2.2].map((x, idx) => (
          <group key={idx} position={[x, 2.75, 0]}>
            <mesh>
              <boxGeometry args={[0.08, 5.5, 1.4]} />
              <meshStandardMaterial color="#f5ece4" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0, 0.705]}>
              <boxGeometry args={[0.09, 5.5, 0.02]} />
              <meshStandardMaterial color="#f0d5a8" metalness={0.92} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Illuminated Shelves */}
        {[0.82, 1.85, 3.25, 4.35, 5.35].map((y, idx) => (
          <group key={idx} position={[0, y, 0]}>
            <mesh>
              <boxGeometry args={[4.4, 0.065, 1.4]} />
              <meshStandardMaterial color="#f5ece4" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0, 0.705]}>
              <boxGeometry args={[4.4, 0.068, 0.015]} />
              <meshStandardMaterial color="#f0d5a8" metalness={0.92} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.038, 0.1]}>
              <boxGeometry args={[4.2, 0.015, 0.05]} />
              <meshBasicMaterial color="#fff5e0" />
            </mesh>
            <pointLight position={[0, -0.22, 0]} intensity={0.7} color="#fff1db" distance={3.2} />
          </group>
        ))}

        {/* Designer Handbag Displays */}
        <DesignerHandbag position={[-1.65, 4.45, -0.2]} color="#fad2e1" scale={1.12} />
        <DesignerHandbag position={[-0.55, 4.45, -0.2]} color="#ffffff" scale={1.05} />
        <DesignerHandbag position={[0.55, 4.45, -0.2]} color="#dfc2a6" scale={1.1} />
        <DesignerHandbag position={[1.65, 4.45, -0.2]} color="#242229" scale={1.1} />

        {/* Hanging Clothes Rails */}
        <mesh position={[-1.1, 3.12, -0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 2.1, 16]} />
          <meshStandardMaterial color="#f0d5a8" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[1.1, 3.12, -0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 2.1, 16]} />
          <meshStandardMaterial color="#f0d5a8" metalness={0.95} roughness={0.15} />
        </mesh>

        {[
          { x: -1.95, col: '#fae3ea', len: 1.05 },
          { x: -1.65, col: '#ffffff', len: 0.85 },
          { x: -1.35, col: '#f2ccd8', len: 1.15 },
          { x: -1.05, col: '#cbdbe8', len: 0.95 },
          { x: -0.75, col: '#2a2830', len: 1.0 },
          { x: -0.45, col: '#faf5ee', len: 1.15 },
          { x: 0.45, col: '#e8b4c2', len: 1.05 },
          { x: 0.75, col: '#f8f4ec', len: 0.88 },
          { x: 1.05, col: '#edd8c7', len: 1.1 },
          { x: 1.35, col: '#ffffff', len: 0.9 },
          { x: 1.65, col: '#35333d', len: 1.18 },
          { x: 1.95, col: '#d4b79b', len: 1.25 }
        ].map((item, idx) => (
          <HangingGarment
            key={idx}
            position={[item.x, 3.02, -0.1]}
            color={item.col}
            length={item.len}
          />
        ))}

        {/* Drawers */}
        <group position={[0, 0.4, 0]}>
          <mesh>
            <boxGeometry args={[4.35, 0.78, 1.32]} />
            <meshStandardMaterial color="#f3ece5" roughness={0.45} />
          </mesh>
          {[-1.5, -0.5, 0.5, 1.5].map((x) => (
            <mesh key={x} position={[x, 0, 0.67]}>
              <boxGeometry args={[0.95, 0.7, 0.02]} />
              <meshStandardMaterial color="#faedf1" roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

useGLTF.preload('/models/sofa.glb');
useGLTF.preload('/models/armchair.glb');
