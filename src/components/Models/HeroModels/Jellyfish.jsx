import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const getAssetPath = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  return base + path.replace(/^\//, '');
};

const Jellyfish = forwardRef(({ containerRef }, ref) => {
  const { scene, animations } = useGLTF(getAssetPath('/models/crystal_jellyfish_leptomedusae.glb'));
  const jellyRef = useRef();
  const modelRef = useRef();

  const { viewport } = useThree();
  const [target] = useState(() => new THREE.Vector3());
  const [mouse] = useState(() => new THREE.Vector2());
  const mixer = useRef();

  // Expose jellyRef to parent component
  useImperativeHandle(ref, () => jellyRef.current);

  useEffect(() => {
    if (animations && animations.length && scene) {
      mixer.current = new THREE.AnimationMixer(scene);
      animations.forEach((clip) => mixer.current.clipAction(clip).play());
    }

    if (modelRef.current) {
      modelRef.current.traverse((n) => (n.frustumCulled = false));
    }
  }, [animations, scene]);

  useFrame((state, delta) => {
    if (mixer.current) mixer.current.update(delta);
    if (!jellyRef.current) return;

    // Get mouse position from container
    if (containerRef?.current) {
      const mouseX = parseFloat(containerRef.current.dataset.mouseX || 0);
      const mouseY = parseFloat(containerRef.current.dataset.mouseY || 0);
      mouse.set(mouseX, mouseY);
    }
  
    // Smooth mouse following
    target.set(mouse.x * viewport.width * 0.25, mouse.y * viewport.height * 0.25, 0);
    target.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.5;
    jellyRef.current.position.lerp(target, 0.1);
  
    // Gentle tilt based on mouse position
    const tiltX = -mouse.y * 0.3;
    const tiltZ = -mouse.x * 0.3;
    jellyRef.current.rotation.x = THREE.MathUtils.lerp(jellyRef.current.rotation.x, tiltX, 0.1);
    jellyRef.current.rotation.z = THREE.MathUtils.lerp(jellyRef.current.rotation.z, tiltZ, 0.1);
  
    // Smooth slow rotation around Y-axis
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
});

export default Jellyfish;