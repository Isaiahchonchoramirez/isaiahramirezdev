// 3D Jellyfish Model Credit:
// Model by n- from Sketchfab
// https://sketchfab.com/n-
// Attribution required per artist request


import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef, useState, useEffect } from 'react';

const Jellyfish = () => {
  const { scene, animations } = useGLTF('/models/crystal_jellyfish_leptomedusae.glb');
  const jellyRef = useRef();
  const modelRef = useRef();

  const { viewport, mouse } = useThree();
  const [target] = useState(() => new THREE.Vector3());
  const mixer = useRef();
  const tentaclesRef = useRef([]); // Save tentacles separately

  useEffect(() => {
    if (animations && animations.length && scene) {
      mixer.current = new THREE.AnimationMixer(scene);
      animations.forEach((clip) => mixer.current.clipAction(clip).play());
    }
  
    scene.traverse((child) => {
      if (child.isMesh) {
        const material = child.material;
  
        // Tag tentacles if their name matches
        if (child.position.y < -3) { 
          tentaclesRef.current.push(child);
        }
  
        // Gently enhance only light-reactive meshes
        if (material && (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) {
          material.metalness = 0.3;
          material.roughness = 0.7;
          material.emissive = new THREE.Color(0x0044ff);
          material.emissiveIntensity = 0.5;
          material.needsUpdate = true;
        } 
        else if (material && material.type === 'MeshBasicMaterial') {
          child.material = new THREE.MeshStandardMaterial({
            color: material.color,
            transparent: material.transparent,
            opacity: material.opacity,
            map: material.map || null,
            metalness: 0.3,
            roughness: 0.7,
            emissive: new THREE.Color(0x0044ff),
            emissiveIntensity: 0.5,
          });
        }
      }
    });
  }, [animations, scene]);
  

  useFrame((state, delta) => {
    if (mixer.current) mixer.current.update(delta);
    if (!jellyRef.current) return;
  
    target.set(mouse.x * viewport.width * 0.25, mouse.y * viewport.height * 0.25, 0);
    target.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.5;
    jellyRef.current.position.lerp(target, 0.1);
  
    const tiltX = -mouse.y * 0.3;
    const tiltZ = -mouse.x * 0.3;
    jellyRef.current.rotation.x = THREE.MathUtils.lerp(jellyRef.current.rotation.x, tiltX, 0.1);
    jellyRef.current.rotation.z = THREE.MathUtils.lerp(jellyRef.current.rotation.z, tiltZ, 0.1);
  
    // 📍 Animate only the tentacles
    const flickerSpeed = 10;
    const flickerAmount = Math.abs(Math.sin(state.clock.elapsedTime * flickerSpeed)) * 0.5;
  
    tentaclesRef.current.forEach((tentacle) => {
      if (tentacle.material) {
        tentacle.material.emissiveIntensity = 0.2 + flickerAmount; // Smooth flicker
        tentacle.material.opacity = 0.6 + flickerAmount * 0.2; // Optional opacity breathing
      }
    });
  
    // Jellyfish Y rotation as normal
    const time = state.clock.getElapsedTime();
    const spinInDuration = 2;
    const fullSpinSpeed = 4 * Math.PI;
  
    if (time < spinInDuration) {
      jellyRef.current.rotation.y = (time * fullSpinSpeed) / spinInDuration;
    } else {
      const t = time - spinInDuration;
      jellyRef.current.rotation.y = Math.sin(t * 0.8) * 0.4;
    }
  
    const period = 150;
    const maxRot = Math.PI * 6;
    const tPeriodic = (Math.sin((state.clock.elapsedTime / period) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
    const rotY = easeInOutSine(tPeriodic) * maxRot;
    jellyRef.current.rotation.y = rotY;
  });
  

  return (
    <group ref={jellyRef}>
      <primitive
        ref={modelRef}
        object={scene}
        scale={0.5}
        rotation={[Math.PI / 2, 1.6, 0]}
        raycast={null}
      />
    </group>
  );
};

export default Jellyfish;
