import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createGarmentPBRMaterial } from '../data/garmentTextures.js';

/**
 * 3D Stylized Female Fashion Boutique Model
 * Exact graphic recreation of the reference character (Image 1):
 * - Pixar-style expressive facial sculpt with 3D eyes (emerald iris, dark limbal ring, catchlight)
 * - Sculpted chestnut-brown high-volume bun, sweeping crown, and framing face tendrils
 * - Tailored deep maroon waistcoat/vest with gold buttons over crisp white collared shirt & black tie
 * - Form-fitting midnight-navy skinny trousers with subtle ankle gap
 * - Matching pointed-toe maroon ballet flats on both feet
 * - Natural contrapposto idle posture and articulated walking locomotion
 * - Wardrobe try-on system integration
 */

// Procedural high-resolution face canvas texture (used as decal for soft skin features)
function createFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base warm peach skin tone
  const grad = ctx.createRadialGradient(512, 480, 50, 512, 512, 500);
  grad.addColorStop(0, '#fce4d2');
  grad.addColorStop(0.6, '#f7cdb0');
  grad.addColorStop(1, '#e8b594');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Soft airbrushed cheek blush
  const drawBlush = (x, y) => {
    const bGrad = ctx.createRadialGradient(x, y, 10, x, y, 140);
    bGrad.addColorStop(0, 'rgba(235, 115, 105, 0.42)');
    bGrad.addColorStop(0.5, 'rgba(235, 125, 115, 0.18)');
    bGrad.addColorStop(1, 'rgba(235, 125, 115, 0)');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.arc(x, y, 140, 0, Math.PI * 2);
    ctx.fill();
  };
  drawBlush(300, 560);
  drawBlush(724, 560);

  // Subtle nose bridge shading & soft nostrils
  ctx.strokeStyle = 'rgba(175, 100, 75, 0.28)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(512, 420);
  ctx.quadraticCurveTo(506, 560, 504, 600);
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = 'rgba(150, 80, 55, 0.45)';
  ctx.beginPath();
  ctx.ellipse(488, 610, 10, 7, -0.2, 0, Math.PI * 2);
  ctx.ellipse(536, 610, 10, 7, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Full, soft coral-rose lips
  // Upper lip with cupid's bow
  ctx.fillStyle = '#be5249';
  ctx.beginPath();
  ctx.moveTo(410, 710);
  ctx.quadraticCurveTo(470, 688, 496, 700);
  ctx.quadraticCurveTo(512, 708, 528, 700);
  ctx.quadraticCurveTo(554, 688, 614, 710);
  ctx.quadraticCurveTo(512, 730, 410, 710);
  ctx.fill();

  // Lower lip (plump and rounded)
  ctx.fillStyle = '#cf5e55';
  ctx.beginPath();
  ctx.moveTo(414, 712);
  ctx.quadraticCurveTo(512, 775, 610, 712);
  ctx.quadraticCurveTo(512, 732, 414, 712);
  ctx.fill();

  // Gloss highlight on lower lip
  ctx.fillStyle = 'rgba(255, 235, 230, 0.55)';
  ctx.beginPath();
  ctx.ellipse(512, 742, 48, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Procedural hair texture with realistic highlights and depth
function createHairTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Rich chestnut base
  ctx.fillStyle = '#3a1e0d';
  ctx.fillRect(0, 0, 512, 512);

  // Hair strands
  for (let i = 0; i < 180; i++) {
    const isHighlight = i % 3 === 0;
    ctx.strokeStyle = isHighlight ? '#5c331a' : '#221106';
    ctx.lineWidth = isHighlight ? 2.5 : 1.5;
    ctx.globalAlpha = isHighlight ? 0.65 : 0.45;
    ctx.beginPath();
    const x = Math.random() * 512;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 15, 170, x - 15, 340, x + 10, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

// 3D Eye Component with multi-layer cornea, emerald iris, limbal ring & specular catchlights
function Stylized3DEye({ isLeft = true }) {
  const flip = isLeft ? 1 : -1;
  return (
    <group position={[0.046 * flip, 0.040, 0.096]} rotation={[-0.02, 0.10 * flip, 0.02 * flip]}>
      {/* Sclera (Eyeball) */}
      <mesh castShadow>
        <sphereGeometry args={[0.030, 24, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.02} />
      </mesh>

      {/* Iris Disc & Pupil Facing Forward */}
      <group position={[0, 0, 0.024]}>
        {/* Dark Limbal Ring */}
        <mesh>
          <circleGeometry args={[0.018, 28]} />
          <meshBasicMaterial color="#14341b" />
        </mesh>
        {/* Vibrant Emerald Iris Body */}
        <mesh position={[0, 0, 0.001]}>
          <circleGeometry args={[0.0155, 28]} />
          <meshBasicMaterial color="#2fa753" />
        </mesh>
        {/* Bright Jade Center Ring */}
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[0.011, 24]} />
          <meshBasicMaterial color="#68db82" />
        </mesh>
        {/* Deep Black Pupil */}
        <mesh position={[0, 0, 0.003]}>
          <circleGeometry args={[0.007, 20]} />
          <meshBasicMaterial color="#0a0503" />
        </mesh>
        {/* Crisp Specular Catchlight (Top-Right) */}
        <mesh position={[0.0044, 0.005, 0.004]}>
          <circleGeometry args={[0.0038, 14]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Secondary Specular Soft Reflection */}
        <mesh position={[-0.005, -0.0042, 0.004]}>
          <circleGeometry args={[0.0022, 10]} />
          <meshBasicMaterial color="rgba(255,255,255,0.75)" />
        </mesh>
      </group>

      {/* Elegant Curved Black Upper Eyelash / Liner Rim */}
      <mesh position={[0, 0.016, 0.020]} rotation={[0.42, 0, 0.06 * flip]}>
        <torusGeometry args={[0.027, 0.0038, 8, 24, Math.PI * 0.95]} />
        <meshBasicMaterial color="#1a0c06" />
      </mesh>

      {/* Winged Outer Eyelash Tip */}
      <mesh
        position={[0.025 * flip, 0.015, 0.019]}
        rotation={[0.25, 0.25 * flip, -0.55 * flip]}
      >
        <coneGeometry args={[0.0032, 0.015, 8]} />
        <meshBasicMaterial color="#1a0c06" />
      </mesh>

      {/* Arched Chestnut-Brown Eyebrow */}
      <mesh
        position={[0.002 * flip, 0.038, 0.016]}
        rotation={[-0.18, 0.08 * flip, -0.05 * flip]}
      >
        <torusGeometry args={[0.031, 0.0044, 8, 18, Math.PI * 0.72]} />
        <meshStandardMaterial color="#381c0c" roughness={0.6} />
      </mesh>
    </group>
  );
}

// Global cached textures
let cachedFace = null;
let cachedHair = null;

export default function Avatar3D({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isWalking = false,
  outfit = null,
  isTryOnEffect = false
}) {
  const groupRef = useRef();
  const auraRef = useRef();

  // Dynamic garment mesh refs for try-on updates
  const vestMeshRef = useRef();
  const shirtMeshRef = useRef();
  const leftSleeveRef = useRef();
  const rightSleeveRef = useRef();
  const pantsLeftThighRef = useRef();
  const pantsRightThighRef = useRef();
  const pantsLeftCalfRef = useRef();
  const pantsRightCalfRef = useRef();
  const shoeLeftRef = useRef();
  const shoeRightRef = useRef();
  const dressMeshRef = useRef();
  const pelvisJeansRef = useRef();

  // Skeletal FK Joint Refs
  const pelvisRef = useRef();
  const spineRef = useRef();
  const chestRef = useRef();
  const neckRef = useRef();
  const headRef = useRef();
  const bunRef = useRef();

  // Limbs
  const leftHipRef = useRef();
  const leftKneeRef = useRef();
  const leftFootRef = useRef();

  const rightHipRef = useRef();
  const rightKneeRef = useRef();
  const rightFootRef = useRef();

  const leftShoulderRef = useRef();
  const leftElbowRef = useRef();
  const leftWristRef = useRef();

  const rightShoulderRef = useRef();
  const rightElbowRef = useRef();
  const rightWristRef = useRef();

  // Create High-Fidelity Materials matching Image 1
  const materials = useMemo(() => {
    if (!cachedFace) cachedFace = createFaceTexture();
    if (!cachedHair) cachedHair = createHairTexture();

    return {
      skin: new THREE.MeshStandardMaterial({
        color: '#f8d2b8',
        roughness: 0.58,
        metalness: 0.02
      }),
      face: new THREE.MeshStandardMaterial({
        map: cachedFace,
        roughness: 0.54,
        metalness: 0.01
      }),
      hair: new THREE.MeshStandardMaterial({
        map: cachedHair,
        color: '#3d1f0d',
        roughness: 0.62,
        metalness: 0.04
      }),
      whiteShirt: new THREE.MeshStandardMaterial({
        color: '#fcfcfd',
        roughness: 0.60,
        metalness: 0.02
      }),
      maroonVest: new THREE.MeshStandardMaterial({
        color: '#721b27',
        roughness: 0.58,
        metalness: 0.06
      }),
      navyJeans: new THREE.MeshStandardMaterial({
        color: '#182743',
        roughness: 0.72,
        metalness: 0.03
      }),
      maroonShoe: new THREE.MeshStandardMaterial({
        color: '#5e1925',
        roughness: 0.38,
        metalness: 0.08
      }),
      darkSole: new THREE.MeshStandardMaterial({
        color: '#151515',
        roughness: 0.85,
        metalness: 0.0
      }),
      goldBrass: new THREE.MeshStandardMaterial({
        color: '#d4af37',
        roughness: 0.22,
        metalness: 0.88
      }),
      blackTie: new THREE.MeshStandardMaterial({
        color: '#161616',
        roughness: 0.75,
        metalness: 0.05
      }),
      beltLeather: new THREE.MeshStandardMaterial({
        color: '#20150d',
        roughness: 0.5,
        metalness: 0.2
      })
    };
  }, []);

  // Handle Wardrobe Virtual Try-On updates while preserving signature look by default
  useEffect(() => {
    // 1. Dress override (replaces top and bottom completely)
    if (outfit?.dress) {
      const dressMat = createGarmentPBRMaterial(outfit.dress, 'satin');
      if (dressMeshRef.current) {
        dressMeshRef.current.visible = true;
        dressMeshRef.current.traverse((child) => {
          if (child.isMesh) child.material = dressMat;
        });
      }
      if (pelvisJeansRef.current) pelvisJeansRef.current.visible = false;
      if (vestMeshRef.current) vestMeshRef.current.visible = false;
      if (shirtMeshRef.current) shirtMeshRef.current.visible = false;
      if (pantsLeftThighRef.current) pantsLeftThighRef.current.visible = false;
      if (pantsRightThighRef.current) pantsRightThighRef.current.visible = false;
      if (pantsLeftCalfRef.current) pantsLeftCalfRef.current.visible = false;
      if (pantsRightCalfRef.current) pantsRightCalfRef.current.visible = false;
    } else {
      if (dressMeshRef.current) dressMeshRef.current.visible = false;
      if (pelvisJeansRef.current) pelvisJeansRef.current.visible = true;
      if (shirtMeshRef.current) shirtMeshRef.current.visible = true;
      if (pantsLeftThighRef.current) pantsLeftThighRef.current.visible = true;
      if (pantsRightThighRef.current) pantsRightThighRef.current.visible = true;
      if (pantsLeftCalfRef.current) pantsLeftCalfRef.current.visible = true;
      if (pantsRightCalfRef.current) pantsRightCalfRef.current.visible = true;

      // Custom top try-on
      if (outfit?.top) {
        const topMat = createGarmentPBRMaterial(outfit.top, 'ribbed');
        if (vestMeshRef.current) {
          vestMeshRef.current.visible = true;
          vestMeshRef.current.traverse((child) => {
            if (child.isMesh) child.material = topMat;
          });
        }
      } else {
        if (vestMeshRef.current) {
          vestMeshRef.current.visible = true;
          vestMeshRef.current.traverse((child) => {
            if (child.isMesh) child.material = materials.maroonVest;
          });
        }
      }

      // Custom bottom try-on
      if (outfit?.bottom) {
        const bottomMat = createGarmentPBRMaterial(outfit.bottom, 'denim');
        [pantsLeftThighRef, pantsRightThighRef, pantsLeftCalfRef, pantsRightCalfRef].forEach((ref) => {
          if (ref.current) ref.current.material = bottomMat;
        });
        if (pelvisJeansRef.current && pelvisJeansRef.current.children[0]) {
          pelvisJeansRef.current.children[0].material = bottomMat;
        }
      } else {
        [pantsLeftThighRef, pantsRightThighRef, pantsLeftCalfRef, pantsRightCalfRef].forEach((ref) => {
          if (ref.current) ref.current.material = materials.navyJeans;
        });
        if (pelvisJeansRef.current && pelvisJeansRef.current.children[0]) {
          pelvisJeansRef.current.children[0].material = materials.navyJeans;
        }
      }
    }

    // Both shoes try-on
    if (outfit?.shoes) {
      const shoeMat = createGarmentPBRMaterial(outfit.shoes, 'sneaker');
      if (shoeLeftRef.current) shoeLeftRef.current.material = shoeMat;
      if (shoeRightRef.current) shoeRightRef.current.material = shoeMat;
    } else {
      if (shoeLeftRef.current) shoeLeftRef.current.material = materials.maroonShoe;
      if (shoeRightRef.current) shoeRightRef.current.material = materials.maroonShoe;
    }
  }, [outfit, materials]);

  // Articulated Forward Kinematic Animation System
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Try-on aura
    if (auraRef.current && isTryOnEffect) {
      auraRef.current.rotation.y += delta * 2.5;
      const s = 1 + Math.sin(t * 8) * 0.12;
      auraRef.current.scale.set(s, s, s);
    }

    if (isWalking) {
      const freq = 6.0;
      const legCycle = Math.sin(t * freq) * 0.50;
      const armCycle = Math.sin(t * freq) * 0.42;

      // Pelvis movement
      if (pelvisRef.current) {
        pelvisRef.current.position.y = 1.0 + Math.abs(Math.sin(t * freq)) * 0.035;
        pelvisRef.current.rotation.y = Math.sin(t * freq) * 0.1;
        pelvisRef.current.rotation.z = 0;
      }

      // Spine counter-twist
      if (spineRef.current) {
        spineRef.current.rotation.y = -Math.sin(t * freq) * 0.08;
      }

      // Coordinated leg swing with natural knee bend
      if (leftHipRef.current) {
        leftHipRef.current.rotation.x = legCycle;
        if (leftKneeRef.current) {
          leftKneeRef.current.rotation.x = legCycle < 0 ? -legCycle * 1.15 : 0.08;
        }
      }
      if (rightHipRef.current) {
        rightHipRef.current.rotation.x = -legCycle;
        if (rightKneeRef.current) {
          rightKneeRef.current.rotation.x = -legCycle < 0 ? legCycle * 1.15 : 0.08;
        }
      }

      // Natural arm swing opposite to legs
      if (leftShoulderRef.current) {
        leftShoulderRef.current.rotation.x = -armCycle;
        leftShoulderRef.current.rotation.z = 0.12;
      }
      if (rightShoulderRef.current) {
        rightShoulderRef.current.rotation.x = armCycle;
        rightShoulderRef.current.rotation.z = -0.12;
      }

      // Gentle head bob
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * freq * 0.5) * 0.05;
        headRef.current.rotation.x = 0.02;
        headRef.current.rotation.z = 0;
      }
    } else {
      // ── IDLE POSE (Matches Image 1 Contrapposto Stance Exactly) ──
      const breath = Math.sin(t * 1.5) * 0.007;

      if (pelvisRef.current) {
        pelvisRef.current.position.y = 1.0 + breath;
        // Weight shifted onto right leg, left hip slightly lower
        pelvisRef.current.rotation.z = 0.035;
        pelvisRef.current.rotation.y = 0.05;
      }

      if (spineRef.current) {
        // Counter-lean for elegant S-curve spine
        spineRef.current.rotation.z = -0.028;
        spineRef.current.rotation.y = -0.03;
      }

      // Left leg relaxed forward
      if (leftHipRef.current) {
        leftHipRef.current.rotation.x = 0.06;
        leftHipRef.current.rotation.z = -0.03;
      }
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = 0.10;

      // Right leg supporting weight straight
      if (rightHipRef.current) {
        rightHipRef.current.rotation.x = -0.03;
        rightHipRef.current.rotation.z = 0.04;
      }
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = 0.04;

      // Relaxed arms hanging naturally by sides
      const armBreathe = Math.sin(t * 1.3) * 0.02;
      if (leftShoulderRef.current) {
        leftShoulderRef.current.rotation.x = -0.04 + armBreathe;
        leftShoulderRef.current.rotation.z = 0.14; // hangs down-outward naturally
      }
      if (leftElbowRef.current) {
        leftElbowRef.current.rotation.x = 0.15; // slight natural forward bend
      }

      if (rightShoulderRef.current) {
        rightShoulderRef.current.rotation.x = -0.06 - armBreathe;
        rightShoulderRef.current.rotation.z = -0.14;
      }
      if (rightElbowRef.current) {
        rightElbowRef.current.rotation.x = 0.18;
      }

      // Head tilted & turned matching Image 1's curious engaging expression
      if (headRef.current) {
        headRef.current.rotation.y = -0.18 + Math.sin(t * 0.6) * 0.03; // turned toward viewer
        headRef.current.rotation.z = 0.06 + Math.sin(t * 0.9) * 0.015;  // charming slight tilt
        headRef.current.rotation.x = -0.02;
      }

      if (bunRef.current) {
        bunRef.current.rotation.z = Math.sin(t * 1.3) * 0.012;
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={[1.45, 1.45, 1.45]}>
      {/* Dedicated Soft Front Face & Beauty Key Light - Ensures face is crystal clear and vivid */}
      <pointLight position={[0, 1.75, 1.1]} intensity={1.8} color="#fff9f2" distance={3.8} />

      {/* Sparkle Try-on aura */}
      {isTryOnEffect && (
        <group ref={auraRef} position={[0, 1.2, 0]}>
          <pointLight intensity={3.5} color="#f472b6" distance={3.8} />
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.78, 32]} />
            <meshBasicMaterial color="#f472b6" transparent opacity={0.65} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* ── SKELETAL ROOT: PELVIS / HIPS (Y=1.00m) ── */}
      <group ref={pelvisRef} position={[0, 1.0, 0]}>
        {/* Navy Jeans Waistband / Pelvis */}
        <group ref={pelvisJeansRef}>
          <mesh castShadow receiveShadow position={[0, 0, 0]}>
            <cylinderGeometry args={[0.138, 0.148, 0.13, 24]} />
            <primitive object={materials.navyJeans} attach="material" />
          </mesh>

          {/* Slim Leather Belt */}
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.142, 0.142, 0.018, 24]} />
            <primitive object={materials.beltLeather} attach="material" />
          </mesh>
          {/* Belt Buckle (Gold) */}
          <mesh position={[0, 0.05, 0.143]}>
            <boxGeometry args={[0.024, 0.022, 0.008]} />
            <primitive object={materials.goldBrass} attach="material" />
          </mesh>
        </group>

        {/* Dynamic Full Dress (attached directly to pelvis, follows avatar posture) */}
        <group ref={dressMeshRef} visible={false}>
          {/* Fitted Bodice covering waist and chest */}
          <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.155, 0.138, 0.34, 28]} />
            <meshStandardMaterial color="#c98a9c" roughness={0.35} />
          </mesh>
          {/* Bodice Upper Cowl / Neckline contour */}
          <mesh castShadow position={[0, 0.34, 0.02]}>
            <cylinderGeometry args={[0.142, 0.155, 0.06, 28]} />
            <meshStandardMaterial color="#c98a9c" roughness={0.35} />
          </mesh>
          {/* Waistline seam band */}
          <mesh castShadow position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.140, 0.144, 0.03, 28]} />
            <meshStandardMaterial color="#c98a9c" roughness={0.35} />
          </mesh>
          {/* Elegant Flared A-Line Skirt down past knees */}
          <mesh castShadow receiveShadow position={[0, -0.30, 0]}>
            <cylinderGeometry args={[0.144, 0.35, 0.62, 32]} />
            <meshStandardMaterial color="#c98a9c" roughness={0.35} />
          </mesh>
        </group>

        {/* ── LEFT LEG (FK Hierarchy: Hip -> Thigh -> Knee -> Calf -> Ankle -> Shoe) ── */}
        <group ref={leftHipRef} position={[-0.088, -0.06, 0]}>
          {/* Left Thigh (Midnight Navy Denim) */}
          <mesh castShadow receiveShadow position={[0, -0.19, 0]} ref={pantsLeftThighRef}>
            <cylinderGeometry args={[0.068, 0.050, 0.38, 20]} />
            <primitive object={materials.navyJeans} attach="material" />
          </mesh>

          {/* Left Knee Joint */}
          <group ref={leftKneeRef} position={[0, -0.38, 0]}>
            {/* Left Calf / Lower Leg */}
            <mesh castShadow receiveShadow position={[0, -0.20, 0.005]} ref={pantsLeftCalfRef}>
              <cylinderGeometry args={[0.048, 0.036, 0.40, 20]} />
              <primitive object={materials.navyJeans} attach="material" />
            </mesh>

            {/* Subtle Ankle Skin Gap (warm peach skin visible above shoe) */}
            <mesh castShadow position={[0, -0.408, 0.01]}>
              <cylinderGeometry args={[0.033, 0.035, 0.035, 16]} />
              <primitive object={materials.skin} attach="material" />
            </mesh>

            {/* Left Ankle & Shoe */}
            <group ref={leftFootRef} position={[0, -0.435, 0.03]}>
              {/* Pointed Loafer Upper (Maroon) */}
              <mesh castShadow receiveShadow position={[0, -0.02, 0.035]} ref={shoeLeftRef}>
                <boxGeometry args={[0.088, 0.055, 0.19]} />
                <primitive object={materials.maroonShoe} attach="material" />
              </mesh>
              {/* Pointed Almond Toe Taper */}
              <mesh castShadow position={[0, -0.024, 0.12]}>
                <coneGeometry args={[0.044, 0.055, 16]} rotation={[Math.PI / 2, 0, 0]} />
                <primitive object={materials.maroonShoe} attach="material" />
              </mesh>
              {/* Dark Sole */}
              <mesh position={[0, -0.052, 0.035]}>
                <boxGeometry args={[0.092, 0.012, 0.20]} />
                <primitive object={materials.darkSole} attach="material" />
              </mesh>
              {/* Low Heel with Gold Accent */}
              <mesh position={[0, -0.056, -0.045]}>
                <cylinderGeometry args={[0.018, 0.016, 0.022, 12]} />
                <primitive object={materials.goldBrass} attach="material" />
              </mesh>
            </group>
          </group>
        </group>

        {/* ── RIGHT LEG (FK Hierarchy: Hip -> Thigh -> Knee -> Calf -> Ankle -> Shoe) ── */}
        <group ref={rightHipRef} position={[0.088, -0.06, 0]}>
          {/* Right Thigh (Midnight Navy Denim) */}
          <mesh castShadow receiveShadow position={[0, -0.19, 0]} ref={pantsRightThighRef}>
            <cylinderGeometry args={[0.068, 0.050, 0.38, 20]} />
            <primitive object={materials.navyJeans} attach="material" />
          </mesh>

          {/* Right Knee Joint */}
          <group ref={rightKneeRef} position={[0, -0.38, 0]}>
            {/* Right Calf / Lower Leg */}
            <mesh castShadow receiveShadow position={[0, -0.20, 0.005]} ref={pantsRightCalfRef}>
              <cylinderGeometry args={[0.048, 0.036, 0.40, 20]} />
              <primitive object={materials.navyJeans} attach="material" />
            </mesh>

            {/* Subtle Ankle Skin Gap */}
            <mesh castShadow position={[0, -0.408, 0.01]}>
              <cylinderGeometry args={[0.033, 0.035, 0.035, 16]} />
              <primitive object={materials.skin} attach="material" />
            </mesh>

            {/* Right Ankle & Shoe */}
            <group ref={rightFootRef} position={[0, -0.435, 0.03]}>
              {/* Pointed Loafer Upper (Maroon) */}
              <mesh castShadow receiveShadow position={[0, -0.02, 0.035]} ref={shoeRightRef}>
                <boxGeometry args={[0.088, 0.055, 0.19]} />
                <primitive object={materials.maroonShoe} attach="material" />
              </mesh>
              {/* Pointed Almond Toe Taper */}
              <mesh castShadow position={[0, -0.024, 0.12]}>
                <coneGeometry args={[0.044, 0.055, 16]} rotation={[Math.PI / 2, 0, 0]} />
                <primitive object={materials.maroonShoe} attach="material" />
              </mesh>
              {/* Dark Sole */}
              <mesh position={[0, -0.052, 0.035]}>
                <boxGeometry args={[0.092, 0.012, 0.20]} />
                <primitive object={materials.darkSole} attach="material" />
              </mesh>
              {/* Low Heel with Gold Accent */}
              <mesh position={[0, -0.056, -0.045]}>
                <cylinderGeometry args={[0.018, 0.016, 0.022, 12]} />
                <primitive object={materials.goldBrass} attach="material" />
              </mesh>
            </group>
          </group>
        </group>

        {/* ── TORSO & UPPER BODY (Spine) ── */}
        <group ref={spineRef} position={[0, 0.08, 0]}>
          {/* Lower Torso / Slender Feminine Waist (White Shirt Base) */}
          <mesh castShadow receiveShadow position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.125, 0.138, 0.15, 24]} />
            <primitive object={materials.whiteShirt} attach="material" />
          </mesh>

          {/* CHEST & WAISTCOAT (VEST) */}
          <group ref={chestRef} position={[0, 0.22, 0]}>
            {/* Crisp White Shirt Torso */}
            <mesh castShadow receiveShadow position={[0, 0.03, 0]} ref={shirtMeshRef}>
              <cylinderGeometry args={[0.142, 0.125, 0.22, 24]} />
              <primitive object={materials.whiteShirt} attach="material" />
            </mesh>

            {/* TAILORED MAROON WAISTCOAT / VEST */}
            <group ref={vestMeshRef}>
              {/* Main Vest Body */}
              <mesh castShadow receiveShadow position={[0, 0.02, 0.008]}>
                <cylinderGeometry args={[0.148, 0.132, 0.23, 24]} />
                <primitive object={materials.maroonVest} attach="material" />
              </mesh>

              {/* V-Neck Cutout Area (Showing White Shirt) */}
              <mesh position={[0, 0.07, 0.12]}>
                <boxGeometry args={[0.085, 0.15, 0.045]} />
                <primitive object={materials.whiteShirt} attach="material" />
              </mesh>

              {/* Left & Right Vest Front Lapel Edges */}
              <mesh position={[-0.042, 0.015, 0.138]} rotation={[0, 0, -0.09]}>
                <boxGeometry args={[0.016, 0.21, 0.018]} />
                <primitive object={materials.maroonVest} attach="material" />
              </mesh>
              <mesh position={[0.042, 0.015, 0.138]} rotation={[0, 0, 0.09]}>
                <boxGeometry args={[0.016, 0.21, 0.018]} />
                <primitive object={materials.maroonVest} attach="material" />
              </mesh>

              {/* Tailored Front Hem Tips (Classic waistcoat triangular points at bottom) */}
              <mesh position={[-0.035, -0.115, 0.13]} rotation={[0, 0, -0.2]}>
                <coneGeometry args={[0.022, 0.04, 8]} />
                <primitive object={materials.maroonVest} attach="material" />
              </mesh>
              <mesh position={[0.035, -0.115, 0.13]} rotation={[0, 0, 0.2]}>
                <coneGeometry args={[0.022, 0.04, 8]} />
                <primitive object={materials.maroonVest} attach="material" />
              </mesh>

              {/* 4 Gold / Brass Waistcoat Buttons down the center */}
              {[-0.06, -0.015, 0.03, 0.075].map((yVal, i) => (
                <mesh key={i} position={[0, yVal, 0.148]}>
                  <sphereGeometry args={[0.0065, 12, 12]} />
                  <primitive object={materials.goldBrass} attach="material" />
                </mesh>
              ))}

              {/* Slender Black Necktie */}
              <mesh position={[0, 0.075, 0.135]}>
                <boxGeometry args={[0.024, 0.13, 0.012]} />
                <primitive object={materials.blackTie} attach="material" />
              </mesh>
              {/* Tie Knot */}
              <mesh position={[0, 0.145, 0.138]}>
                <boxGeometry args={[0.032, 0.024, 0.016]} />
                <primitive object={materials.blackTie} attach="material" />
              </mesh>
            </group>

            {/* Crisp High White Shirt Collar */}
            <mesh position={[0, 0.155, 0]}>
              <cylinderGeometry args={[0.078, 0.095, 0.05, 20]} />
              <primitive object={materials.whiteShirt} attach="material" />
            </mesh>

            {/* ── LEFT ARM ── */}
            <group ref={leftShoulderRef} position={[-0.185, 0.12, 0]}>
              {/* Upper Arm (White Shirt Sleeve) */}
              <mesh castShadow receiveShadow position={[0, -0.12, 0]} ref={leftSleeveRef}>
                <cylinderGeometry args={[0.044, 0.038, 0.24, 16]} />
                <primitive object={materials.whiteShirt} attach="material" />
              </mesh>

              {/* Elbow Joint */}
              <group ref={leftElbowRef} position={[0, -0.24, 0]}>
                {/* Forearm (White Shirt Sleeve) */}
                <mesh castShadow receiveShadow position={[0, -0.11, 0]}>
                  <cylinderGeometry args={[0.037, 0.031, 0.22, 16]} />
                  <primitive object={materials.whiteShirt} attach="material" />
                </mesh>
                {/* White Cuff */}
                <mesh position={[0, -0.21, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.025, 16]} />
                  <primitive object={materials.whiteShirt} attach="material" />
                </mesh>

                {/* Left Hand / Fingers */}
                <group ref={leftWristRef} position={[0, -0.23, 0]}>
                  {/* Palm */}
                  <mesh castShadow position={[0, -0.035, 0]}>
                    <boxGeometry args={[0.040, 0.055, 0.018]} />
                    <primitive object={materials.skin} attach="material" />
                  </mesh>
                  {/* Relaxed Fingers */}
                  <mesh castShadow position={[0, -0.075, 0.005]}>
                    <capsuleGeometry args={[0.015, 0.035, 6, 8]} />
                    <primitive object={materials.skin} attach="material" />
                  </mesh>
                  {/* Thumb */}
                  <mesh castShadow position={[0.022, -0.03, 0.008]} rotation={[0, 0, -0.35]}>
                    <capsuleGeometry args={[0.008, 0.026, 6, 8]} />
                    <primitive object={materials.skin} attach="material" />
                  </mesh>
                </group>
              </group>
            </group>

            {/* ── RIGHT ARM ── */}
            <group ref={rightShoulderRef} position={[0.185, 0.12, 0]}>
              {/* Upper Arm (White Shirt Sleeve) */}
              <mesh castShadow receiveShadow position={[0, -0.12, 0]} ref={rightSleeveRef}>
                <cylinderGeometry args={[0.044, 0.038, 0.24, 16]} />
                <primitive object={materials.whiteShirt} attach="material" />
              </mesh>

              {/* Elbow Joint */}
              <group ref={rightElbowRef} position={[0, -0.24, 0]}>
                {/* Forearm (White Shirt Sleeve) */}
                <mesh castShadow receiveShadow position={[0, -0.11, 0]}>
                  <cylinderGeometry args={[0.037, 0.031, 0.22, 16]} />
                  <primitive object={materials.whiteShirt} attach="material" />
                </mesh>
                {/* White Cuff */}
                <mesh position={[0, -0.21, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.025, 16]} />
                  <primitive object={materials.whiteShirt} attach="material" />
                </mesh>

                {/* Right Hand / Fingers */}
                <group ref={rightWristRef} position={[0, -0.23, 0]}>
                  {/* Palm */}
                  <mesh castShadow position={[0, -0.035, 0]}>
                    <boxGeometry args={[0.040, 0.055, 0.018]} />
                    <primitive object={materials.skin} attach="material" />
                  </mesh>
                  {/* Relaxed Fingers */}
                  <mesh castShadow position={[0, -0.075, 0.005]}>
                    <capsuleGeometry args={[0.015, 0.035, 6, 8]} />
                    <primitive object={materials.skin} attach="material" />
                  </mesh>
                  {/* Thumb */}
                  <mesh castShadow position={[-0.022, -0.03, 0.008]} rotation={[0, 0, 0.35]}>
                    <capsuleGeometry args={[0.008, 0.026, 6, 8]} />
                    <primitive object={materials.skin} attach="material" />
                  </mesh>
                </group>
              </group>
            </group>

            {/* ── NECK & HEAD ── */}
            <group ref={neckRef} position={[0, 0.165, 0]}>
              {/* Slender Feminine Neck */}
              <mesh castShadow position={[0, 0.055, 0]}>
                <cylinderGeometry args={[0.046, 0.055, 0.11, 20]} />
                <primitive object={materials.skin} attach="material" />
              </mesh>

              {/* ── HEAD & FACIAL SCULPT (Stylized Expressive Face matching Image 1) ── */}
              <group ref={headRef} position={[0, 0.17, 0]}>
                {/* Smooth 3D Cranium / Head Skull (Warm Peach Porcelain Skin) */}
                <mesh castShadow position={[0, 0.045, -0.005]} scale={[0.96, 1.10, 0.98]}>
                  <sphereGeometry args={[0.118, 32, 28]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>

                {/* Soft Feminine Cheek Contours */}
                <mesh position={[-0.052, 0.018, 0.065]} scale={[1, 1.1, 0.8]}>
                  <sphereGeometry args={[0.046, 16, 16]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>
                <mesh position={[0.052, 0.018, 0.065]} scale={[1, 1.1, 0.8]}>
                  <sphereGeometry args={[0.046, 16, 16]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>

                {/* Delicate Cheek Blush */}
                <mesh position={[-0.058, 0.016, 0.088]} rotation={[0, -0.35, 0]}>
                  <circleGeometry args={[0.024, 20]} />
                  <meshBasicMaterial color="#e27068" transparent opacity={0.38} />
                </mesh>
                <mesh position={[0.058, 0.016, 0.088]} rotation={[0, 0.35, 0]}>
                  <circleGeometry args={[0.024, 20]} />
                  <meshBasicMaterial color="#e27068" transparent opacity={0.38} />
                </mesh>

                {/* Delicate Tapered Jaw and Chin */}
                <mesh castShadow position={[0, -0.036, 0.040]} scale={[0.88, 1.0, 0.82]}>
                  <sphereGeometry args={[0.056, 20, 18]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>

                {/* 3D Cute Sculpted Button Nose */}
                {/* Nose Bridge */}
                <mesh position={[0, 0.030, 0.106]} rotation={[0.22, 0, 0]}>
                  <cylinderGeometry args={[0.006, 0.009, 0.032, 12]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>
                {/* Nose Tip */}
                <mesh castShadow position={[0, 0.016, 0.118]}>
                  <sphereGeometry args={[0.011, 16, 14]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>
                {/* Nostril Wings */}
                <mesh position={[-0.010, 0.013, 0.110]}>
                  <sphereGeometry args={[0.0055, 12, 10]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>
                <mesh position={[0.010, 0.013, 0.110]}>
                  <sphereGeometry args={[0.0055, 12, 10]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>

                {/* 3D Sculpted Rosy Lips (Cupid's Bow & Gloss) */}
                {/* Upper Lip with Cupid's Bow */}
                <group position={[0, -0.015, 0.104]}>
                  <mesh position={[-0.012, 0.002, 0]}>
                    <sphereGeometry args={[0.010, 14, 12]} scale={[1.4, 0.65, 0.8]} />
                    <meshStandardMaterial color="#c6474b" roughness={0.35} />
                  </mesh>
                  <mesh position={[0.012, 0.002, 0]}>
                    <sphereGeometry args={[0.010, 14, 12]} scale={[1.4, 0.65, 0.8]} />
                    <meshStandardMaterial color="#c6474b" roughness={0.35} />
                  </mesh>
                  <mesh position={[0, 0.004, 0.001]}>
                    <sphereGeometry args={[0.006, 10, 8]} scale={[1.0, 0.8, 0.8]} />
                    <meshStandardMaterial color="#c6474b" roughness={0.35} />
                  </mesh>
                </group>

                {/* Lower Lip (Plump with Gloss Highlight) */}
                <group position={[0, -0.027, 0.101]}>
                  <mesh>
                    <sphereGeometry args={[0.014, 16, 14]} scale={[1.8, 0.75, 0.9]} />
                    <meshStandardMaterial color="#d8565b" roughness={0.30} />
                  </mesh>
                  {/* Gloss Specular Shine */}
                  <mesh position={[0, -0.002, 0.010]}>
                    <sphereGeometry args={[0.004, 10, 8]} scale={[2.0, 0.5, 0.5]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
                  </mesh>
                </group>

                {/* Left 3D Eye (Cornea, Emerald Iris, Catchlight & Curved Lashes) */}
                <Stylized3DEye isLeft={true} />

                {/* Right 3D Eye */}
                <Stylized3DEye isLeft={false} />

                {/* Delicate 3D Ears */}
                <mesh position={[-0.108, 0.035, -0.008]} rotation={[0, 0.22, 0]}>
                  <sphereGeometry args={[0.026, 14, 12]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>
                <mesh position={[0.108, 0.035, -0.008]} rotation={[0, -0.22, 0]}>
                  <sphereGeometry args={[0.026, 14, 12]} />
                  <primitive object={materials.skin} attach="material" />
                </mesh>

                {/* ── 3D HAIR SCULPT (Chestnut Brown Updo Bun & Strands) ── */}
                {/* Hair Crown Volume Covering Head Top & Back */}
                <mesh castShadow position={[0, 0.082, -0.025]} scale={[1.02, 1.05, 1.02]}>
                  <sphereGeometry args={[0.120, 28, 24, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
                  <primitive object={materials.hair} attach="material" />
                </mesh>

                {/* Back Sweep of Hair to Nape */}
                <mesh castShadow position={[0, 0.035, -0.088]} scale={[0.95, 0.95, 0.85]}>
                  <sphereGeometry args={[0.098, 22, 20]} />
                  <primitive object={materials.hair} attach="material" />
                </mesh>

                {/* HIGH-VOLUME TOP BUN (Signature feature from Image 1) */}
                <group ref={bunRef} position={[0, 0.185, -0.032]} rotation={[-0.08, 0, 0]}>
                  {/* Primary Large Voluminous Bun */}
                  <mesh castShadow>
                    <sphereGeometry args={[0.076, 24, 20]} />
                    <primitive object={materials.hair} attach="material" />
                  </mesh>
                  {/* Organic Bun Twist Lobes */}
                  <mesh castShadow position={[0.028, 0.02, 0.012]}>
                    <sphereGeometry args={[0.052, 18, 16]} />
                    <primitive object={materials.hair} attach="material" />
                  </mesh>
                  <mesh castShadow position={[-0.026, 0.024, -0.01]}>
                    <sphereGeometry args={[0.054, 18, 16]} />
                    <primitive object={materials.hair} attach="material" />
                  </mesh>
                  <mesh castShadow position={[0, 0.042, 0.008]}>
                    <sphereGeometry args={[0.046, 16, 14]} />
                    <primitive object={materials.hair} attach="material" />
                  </mesh>
                  {/* Bun Base Wrap Strand */}
                  <mesh position={[0, -0.022, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.056, 0.012, 12, 28]} />
                    <primitive object={materials.hair} attach="material" />
                  </mesh>
                </group>

                {/* Delicate Framing Side Tendrils / Wisps (hanging in front of ears) */}
                {/* Left face tendril */}
                <mesh position={[-0.094, 0.015, 0.042]} rotation={[0.18, 0.28, 0.1]}>
                  <capsuleGeometry args={[0.014, 0.075, 8, 10]} />
                  <primitive object={materials.hair} attach="material" />
                </mesh>
                {/* Right face tendril */}
                <mesh position={[0.094, 0.015, 0.042]} rotation={[0.18, -0.28, -0.1]}>
                  <capsuleGeometry args={[0.014, 0.075, 8, 10]} />
                  <primitive object={materials.hair} attach="material" />
                </mesh>

                {/* Forehead Side-Swept Fringe Strands */}
                <mesh position={[-0.032, 0.112, 0.092]} rotation={[0.42, 0.18, -0.12]}>
                  <capsuleGeometry args={[0.016, 0.065, 8, 10]} />
                  <primitive object={materials.hair} attach="material" />
                </mesh>
                <mesh position={[0.032, 0.112, 0.092]} rotation={[0.42, -0.18, 0.12]}>
                  <capsuleGeometry args={[0.016, 0.065, 8, 10]} />
                  <primitive object={materials.hair} attach="material" />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
