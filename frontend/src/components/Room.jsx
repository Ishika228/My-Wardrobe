import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// ---------- BASIC ROOM OBJECTS ----------

function Box({ position, size, color, ...props }) {
  return (
    <mesh position={position} castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

function Cylinder({ position, radius, height, color }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[radius, radius, height, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// ---------- FLOOR AND WALLS ----------

function RoomStructure() {
  return (
    <group>
      {/* Floor */}
      <Box position={[0, -0.15, 0]} size={[12, 0.3, 10]} color="#d9c5c5" />

      {/* Back wall */}
      <Box position={[0, 3, -5]} size={[12, 6, 0.2]} color="#f5dfe5" />

      {/* Side walls */}
      <Box position={[-6, 3, 0]} size={[0.2, 6, 10]} color="#ead2dc" />
      <Box position={[6, 3, 0]} size={[0.2, 6, 10]} color="#ead2dc" />

      {/* Ceiling decorative beams */}
      <Box position={[0, 5.9, -4.8]} size={[11.8, 0.15, 0.3]} color="#c99aaa" />
      <Box position={[-5.8, 5.9, 0]} size={[0.3, 0.15, 9.5]} color="#c99aaa" />

      {/* Large window */}
      <Box position={[0, 2.7, -4.85]} size={[4.2, 3.7, 0.08]} color="#a8c7dc" />
      <Box position={[0, 2.7, -4.7]} size={[0.08, 3.8, 0.12]} color="#fff0e8" />
      <Box position={[0, 2.7, -4.7]} size={[4.3, 0.08, 0.12]} color="#fff0e8" />
      <Box position={[0, 2.7, -4.65]} size={[0.08, 3.7, 0.12]} color="#fff0e8" />
    </group>
  );
}

// ---------- WARDROBE ----------

function Wardrobe({ position }) {
  const clothes = [
    "#e9a9bd",
    "#f4e6dc",
    "#a9b9d6",
    "#c8a3ca",
    "#e5c3a0",
    "#f5f0e9",
  ];

  return (
    <group position={position}>
      {/* Wardrobe frame */}
      <Box position={[0, 1.8, 0]} size={[2.5, 3.6, 0.35]} color="#b88d83" />

      {/* Interior */}
      <Box position={[0, 1.8, 0.2]} size={[2.3, 3.35, 0.12]} color="#f7e8e5" />

      {/* Shelves */}
      {[0.7, 1.5, 2.3, 3.1].map((y, i) => (
        <Box
          key={i}
          position={[0, y, 0.5]}
          size={[2.3, 0.08, 0.65]}
          color="#c49a8d"
        />
      ))}

      {/* Hanging rod */}
      <Cylinder
        position={[0, 2.8, 0.55]}
        radius={0.035}
        height={2.1}
        color="#d5ae78"
      />

      {/* Hanging clothes */}
      {clothes.map((color, i) => (
        <group key={i} position={[-0.85 + i * 0.34, 2.05, 0.55]}>
          {/* Hanger */}
          <Box
            position={[0, 0.55, 0]}
            size={[0.28, 0.025, 0.025]}
            color="#d5ae78"
          />

          {/* Clothing */}
          <Box
            position={[0, 0.05, 0]}
            size={[0.3, 0.9, 0.09]}
            color={color}
          />
        </group>
      ))}
    </group>
  );
}

// ---------- FEMALE DISPLAY AVATAR ----------

function FemaleAvatar() {
  return (
    <group position={[0, 0, 0.2]}>
      {/* Head */}
      <mesh position={[0, 2.65, 0]} castShadow>
        <sphereGeometry args={[0.27, 32, 32]} />
        <meshStandardMaterial color="#f1c5a9" roughness={0.8} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 2.82, -0.06]} castShadow>
        <sphereGeometry args={[0.29, 32, 32]} />
        <meshStandardMaterial color="#39251f" roughness={0.95} />
      </mesh>

      {/* Neck */}
      <Cylinder
        position={[0, 2.32, 0]}
        radius={0.09}
        height={0.25}
        color="#f1c5a9"
      />

      {/* Body / top */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.55, 8, 20]} />
        <meshStandardMaterial color="#fff0e9" roughness={0.9} />
      </mesh>

      {/* Waist */}
      <Cylinder
        position={[0, 1.4, 0]}
        radius={0.23}
        height={0.25}
        color="#f1c5a9"
      />

      {/* Skirt */}
      <mesh position={[0, 1.12, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.62, 0.65, 32]} />
        <meshStandardMaterial color="#d99ab5" roughness={0.85} />
      </mesh>

      {/* Legs */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={i} position={[x, 0.48, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.65, 8, 16]} />
          <meshStandardMaterial color="#f1c5a9" />
        </mesh>
      ))}

      {/* Shoes */}
      {[-0.16, 0.16].map((x, i) => (
        <Box
          key={i}
          position={[x, 0.08, 0.1]}
          size={[0.24, 0.13, 0.4]}
          color="#fff8f2"
        />
      ))}

      {/* Arms */}
      {[-0.4, 0.4].map((x, i) => (
        <mesh
          key={i}
          position={[x, 1.85, 0]}
          rotation={[0, 0, x]}
          castShadow
        >
          <capsuleGeometry args={[0.09, 0.55, 8, 16]} />
          <meshStandardMaterial color="#f1c5a9" />
        </mesh>
      ))}
    </group>
  );
}

// ---------- FULL LENGTH MIRROR ----------

function FullMirror({ position }) {
  return (
    <group position={position}>
      <Box position={[0, 1.6, 0]} size={[1.45, 3.3, 0.12]} color="#d5a66f" />

      <Box
        position={[0, 1.6, 0.08]}
        size={[1.25, 3.1, 0.04]}
        color="#b7d0d2"
      />

      {/* Mirror lights */}
      {[-0.65, 0.65].map((x, i) => (
        <mesh key={i} position={[x, 1.6, 0.13]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial
            color="#fff2c9"
            emissive="#ffe2a6"
            emissiveIntensity={2}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------- VANITY TABLE ----------

function Vanity() {
  return (
    <group position={[-4.2, 0, -2.5]}>
      <Box position={[0, 0.85, 0]} size={[2, 0.12, 0.85]} color="#f8e9e5" />

      <Box position={[-0.75, 0.4, 0]} size={[0.12, 0.8, 0.7]} color="#c99e9b" />
      <Box position={[0.75, 0.4, 0]} size={[0.12, 0.8, 0.7]} color="#c99e9b" />

      {/* Vanity mirror */}
      <mesh position={[0, 1.8, -0.25]}>
        <circleGeometry args={[0.55, 48]} />
        <meshStandardMaterial color="#b6d0d0" metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Stool */}
      <Cylinder position={[0, 0.35, 0.85]} radius={0.38} height={0.65} color="#d99ab5" />
    </group>
  );
}

// ---------- PLANT DECORATION ----------

function Plant({ position }) {
  return (
    <group position={position}>
      <Cylinder position={[0, 0.3, 0]} radius={0.28} height={0.55} color="#d5a7a0" />

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 1.1) * 0.28,
            0.85 + (i % 3) * 0.12,
            Math.cos(i * 1.1) * 0.2,
          ]}
          rotation={[0.4, i, 0.3]}
        >
          <sphereGeometry args={[0.17, 16, 16]} />
          <meshStandardMaterial color="#779477" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

// ---------- ROUND RUG ----------

function Rug() {
  return (
    <mesh position={[0, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[2.5, 64]} />
      <meshStandardMaterial color="#d8b5c4" roughness={1} />
    </mesh>
  );
}

// ---------- COMPLETE GLAMORA ROOM ----------

function GlamoraScene() {
  return (
    <>
      <color attach="background" args={["#ead9df"]} />

      <ambientLight intensity={1.1} />

      <directionalLight
        position={[4, 8, 5]}
        intensity={2}
        castShadow
      />

      <pointLight position={[0, 4, 0]} intensity={1.5} color="#ffd8c8" />
      <pointLight position={[-4, 3, 1]} intensity={1} color="#f3b6d1" />

      <RoomStructure />

      {/* Wardrobe units */}
      <Wardrobe position={[-4.4, 0, -4.3]} />
      <Wardrobe position={[4.4, 0, -4.3]} />

      {/* Avatar and rug */}
      <Rug />
      <FemaleAvatar />

      {/* Mirror */}
      <FullMirror position={[2.3, 0, 1.5]} />

      {/* Vanity */}
      <Vanity />

      {/* Plants */}
      <Plant position={[-4.8, 0, 2.8]} />
      <Plant position={[4.8, 0, 2.5]} />

      {/* Center display platform */}
      <Cylinder
        position={[0, 0.12, 0.2]}
        radius={1.1}
        height={0.2}
        color="#c69aab"
      />

      {/* Small seating area */}
      <Box
        position={[3.7, 0.4, 3.3]}
        size={[1.5, 0.7, 1.1]}
        color="#dba8b9"
      />

      {/* Decorative side table */}
      <Cylinder
        position={[4.7, 0.65, 1.8]}
        radius={0.4}
        height={0.1}
        color="#d6b18a"
      />
      <Cylinder
        position={[4.7, 0.3, 1.8]}
        radius={0.07}
        height={0.6}
        color="#d6b18a"
      />
    </>
  );
}

// ---------- MAIN COMPONENT ----------

export default function Room() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        background: "#ead9df",
      }}
    >
      <Canvas
        shadows
        camera={{
          position: [9, 6, 11],
          fov: 45,
        }}
      >
        <GlamoraScene />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={22}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, 1.5, 0]}
        />
      </Canvas>

      {/* Room title */}
      <div
        style={{
          position: "absolute",
          top: 22,
          left: 25,
          padding: "14px 22px",
          borderRadius: 18,
          background: "rgba(255,255,255,0.82)",
          color: "#9b637e",
          fontFamily: "Arial, sans-serif",
          boxShadow: "0 5px 25px rgba(100,50,70,0.12)",
        }}
      >
        <h2 style={{ margin: 0, letterSpacing: 2 }}>GLAMORA</h2>
        <small>Your Style. Your Fantasy. Your Glam World.</small>
      </div>

      {/* Controls hint */}
      <div
        style={{
          position: "absolute",
          bottom: 22,
          right: 25,
          padding: "12px 18px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.85)",
          color: "#80566b",
          fontFamily: "Arial, sans-serif",
          fontSize: 13,
        }}
      >
        Drag to rotate · Scroll to zoom · Right-click to pan
      </div>
    </div>
  );
}
