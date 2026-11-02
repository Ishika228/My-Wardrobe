import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Avatar Locomotion, Mirror Station & Camera Controller
export default function AvatarController({
  avatarPosition,
  setAvatarPosition,
  avatarRotation,
  setAvatarRotation,
  isWalking,
  setIsWalking,
  dpadInput = { x: 0, y: 0 },
  onResetDpad = () => {},
  cameraMode = 'follow', // 'follow', 'free', 'mirror'
  controlsRef,
  autoRotate = false
}) {
  const { camera } = useThree();
  const keysPressed = useRef({
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false,
  });

  // Current avatar position & velocity internally tracked
  const currentPos = useRef(new THREE.Vector3(...avatarPosition));
  const currentRotY = useRef(avatarRotation[1]);
  const targetRotY = useRef(avatarRotation[1]);

  // Boundaries inside the luxury boutique room
  const BOUNDS = {
    minX: -4.3,
    maxX: 4.3,
    minZ: -4.2,
    maxZ: 4.2
  };

  // Listen to keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (keysPressed.current[e.code] !== undefined) {
        keysPressed.current[e.code] = true;
      }
    };

    const handleKeyUp = (e) => {
      if (keysPressed.current[e.code] !== undefined) {
        keysPressed.current[e.code] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    // Determine movement direction vector
    let moveX = 0;
    let moveZ = 0;

    // Check keyboard input
    const k = keysPressed.current;
    if (k.KeyW || k.ArrowUp) moveZ -= 1;
    if (k.KeyS || k.ArrowDown) moveZ += 1;
    if (k.KeyA || k.ArrowLeft) moveX -= 1;
    if (k.KeyD || k.ArrowRight) moveX += 1;

    // Add mobile D-pad input
    if (dpadInput.y !== 0) moveZ -= dpadInput.y;
    if (dpadInput.x !== 0) moveX += dpadInput.x;

    const moving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;

    if (moving) {
      if (!isWalking) setIsWalking(true);

      // Normalize movement direction
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const dirX = moveX / len;
      const dirZ = moveZ / len;

      const speed = 2.8 * delta;

      // Update position with room boundaries
      const newX = THREE.MathUtils.clamp(currentPos.current.x + dirX * speed, BOUNDS.minX, BOUNDS.maxX);
      const newZ = THREE.MathUtils.clamp(currentPos.current.z + dirZ * speed, BOUNDS.minZ, BOUNDS.maxZ);

      currentPos.current.x = newX;
      currentPos.current.z = newZ;

      // Target rotation facing direction of movement
      targetRotY.current = Math.atan2(dirX, dirZ);

      // Smoothly rotate avatar towards direction of movement
      currentRotY.current = THREE.MathUtils.lerp(
        currentRotY.current,
        targetRotY.current,
        0.18
      );

      // Propagate position and rotation
      setAvatarPosition([newX, 0, newZ]);
      setAvatarRotation([0, currentRotY.current, 0]);
    } else {
      if (isWalking) setIsWalking(false);
    }

    // Camera modes: 'mirror', 'follow', 'free'
    if (controlsRef?.current) {
      const controls = controlsRef.current;

      if (cameraMode === 'mirror') {
        // Position camera for full-length mirror outfit inspection
        const targetLook = new THREE.Vector3(currentPos.current.x, 1.8, currentPos.current.z);
        controls.target.lerp(targetLook, 0.08);
      } else if (cameraMode === 'follow') {
        // Smoothly interpolate orbit controls target to avatar hips
        const targetLook = new THREE.Vector3(currentPos.current.x, 1.8, currentPos.current.z);
        controls.target.lerp(targetLook, 0.08);

        if (moving) {
          const camDeltaX = dirX ? dirX * 2.8 * delta * 0.7 : 0;
          const camDeltaZ = dirZ ? dirZ * 2.8 * delta * 0.7 : 0;
          camera.position.x += camDeltaX;
          camera.position.z += camDeltaZ;
        }
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.06}
      maxPolarAngle={Math.PI / 2 + 0.02}
      minPolarAngle={Math.PI / 8}
      minDistance={1.6}
      maxDistance={10.0}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
    />
  );
}
