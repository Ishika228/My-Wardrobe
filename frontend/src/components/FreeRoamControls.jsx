import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// 3D Smooth Movement & Floating Controller ("Move Here and There")
export default function FreeRoamControls({
  controlsRef,
  autoRotate,
  dpadInput,
  onResetDpad
}) {
  const { camera } = useThree();
  const keysPressed = useRef({});
  const velocity = useRef(new THREE.Vector3());
  const floatingTimer = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Subtle floating breathing sway
    floatingTimer.current += delta * 0.8;
    const floatSway = Math.sin(floatingTimer.current) * 0.0015;

    // Movement direction vectors
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).normalize();

    const moveDirection = new THREE.Vector3();

    // Keyboard WASD or Arrow Keys
    const k = keysPressed.current;
    if (k['w'] || k['arrowup']) moveDirection.add(forward);
    if (k['s'] || k['arrowdown']) moveDirection.sub(forward);
    if (k['d'] || k['arrowright']) moveDirection.sub(right);
    if (k['a'] || k['arrowleft']) moveDirection.add(right);
    if (k['e'] || k[' ']) moveDirection.y += 0.8;
    if (k['q'] || k['shift']) moveDirection.y -= 0.8;

    // D-Pad input from UI
    if (dpadInput) {
      if (dpadInput === 'up') moveDirection.add(forward.clone().multiplyScalar(1.2));
      if (dpadInput === 'down') moveDirection.sub(forward.clone().multiplyScalar(1.2));
      if (dpadInput === 'left') {
        controls.setAzimuthalAngle(controls.getAzimuthalAngle() - 0.035);
      }
      if (dpadInput === 'right') {
        controls.setAzimuthalAngle(controls.getAzimuthalAngle() + 0.035);
      }
      if (dpadInput === 'center') {
        controls.reset();
        camera.position.set(0, 2.2, 5.2);
        controls.target.set(0, 1.8, 0);
        if (onResetDpad) onResetDpad();
      }
    }

    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize().multiplyScalar(delta * 4.5);
      velocity.current.lerp(moveDirection, 0.15);
    } else {
      velocity.current.lerp(new THREE.Vector3(), 0.1);
    }

    // Apply smooth movement to both camera and target
    if (velocity.current.lengthSq() > 0.00001) {
      camera.position.add(velocity.current);
      controls.target.add(velocity.current);

      // Clamp camera bounds to stay inside the dressing room
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -5.2, 5.2);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.8, 4.8);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -4.5, 6.2);

      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -4, 4);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.5, 3.5);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -4, 4);
    }

    // Gentle float effect on camera height
    camera.position.y += floatSway;

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={[0, 1.8, 0]}
      enablePan={true}
      enableZoom={true}
      minDistance={1.8}
      maxDistance={9.5}
      minPolarAngle={Math.PI / 3.4}
      maxPolarAngle={Math.PI / 1.9}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
      dampingFactor={0.06}
      enableDamping={true}
    />
  );
}

