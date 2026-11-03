import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Avatar Locomotion, Mirror Station & Camera Controller
export default function AvatarController({
  avatarPosition = [0, 0, 0],
  setAvatarPosition = () => {},
  avatarRotation = [0, 0, 0],
  setAvatarRotation = () => {},
  isWalking = false,
  setIsWalking = () => {},
  dpadInput = { x: 0, y: 0 },
  onResetDpad = () => {},
  cameraMode = 'follow', // 'follow', 'free'
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

  // Sync internal position if external prop changes (e.g. Reset view)
  useEffect(() => {
    if (avatarPosition) {
      currentPos.current.set(avatarPosition[0], avatarPosition[1], avatarPosition[2]);
    }
  }, [avatarPosition]);

  useEffect(() => {
    if (avatarRotation) {
      currentRotY.current = avatarRotation[1];
      targetRotY.current = avatarRotation[1];
    }
  }, [avatarRotation]);

  // Boundaries inside the luxury boutique room
  const BOUNDS = {
    minX: -4.3,
    maxX: 4.3,
    minZ: -4.2,
    maxZ: 4.2
  };

  // Listen to keyboard events (handles both code e.g. KeyW and lowercase key e.g. 'w')
  useEffect(() => {
    const handleKeyDown = (e) => {
      const code = e.code;
      const key = (e.key || '').toLowerCase();
      if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') keysPressed.current.KeyW = true;
      if (code === 'KeyS' || key === 's' || code === 'ArrowDown') keysPressed.current.KeyS = true;
      if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') keysPressed.current.KeyA = true;
      if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') keysPressed.current.KeyD = true;
    };

    const handleKeyUp = (e) => {
      const code = e.code;
      const key = (e.key || '').toLowerCase();
      if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') keysPressed.current.KeyW = false;
      if (code === 'KeyS' || key === 's' || code === 'ArrowDown') keysPressed.current.KeyS = false;
      if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') keysPressed.current.KeyA = false;
      if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') keysPressed.current.KeyD = false;
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
    let dirX = 0;
    let dirZ = 0;

    // Check keyboard input
    const k = keysPressed.current;
    if (k.KeyW) moveZ -= 1;
    if (k.KeyS) moveZ += 1;
    if (k.KeyA) moveX -= 1;
    if (k.KeyD) moveX += 1;

    // Add mobile D-pad input
    if (dpadInput.y !== 0) moveZ -= dpadInput.y;
    if (dpadInput.x !== 0) moveX += dpadInput.x;

    const moving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;

    if (moving) {
      if (!isWalking) setIsWalking(true);

      // Normalize movement direction
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      dirX = moveX / len;
      dirZ = moveZ / len;

      const speed = 2.6 * delta;

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

    // Camera follow and target tracking
    if (controlsRef?.current) {
      const controls = controlsRef.current;
      const targetLook = new THREE.Vector3(currentPos.current.x, 1.45, currentPos.current.z);
      controls.target.lerp(targetLook, 0.08);

      if (cameraMode === 'follow' && moving) {
        const camDeltaX = dirX * 2.6 * delta * 0.7;
        const camDeltaZ = dirZ * 2.6 * delta * 0.7;
        camera.position.x += camDeltaX;
        camera.position.z += camDeltaZ;
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
      minDistance={1.4}
      maxDistance={10.0}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
    />
  );
}
