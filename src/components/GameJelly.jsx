import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import { getAssetPath } from "../utils/assetPath";

const JellyModel = ({ reduceMotion }) => {
  const groupRef = useRef(null);
  const mixerRef = useRef(null);
  const { scene, animations } = useGLTF(
    getAssetPath("/models/crystal_jellyfish_leptomedusae.glb")
  );
  // The floating site mascot may be mounted at the same time. A cloned scene
  // keeps the two canvases from fighting over one Three.js object hierarchy.
  const model = useMemo(() => clone(scene), [scene]);

  useEffect(() => {
    if (reduceMotion || !animations.length) return;
    const mixer = new THREE.AnimationMixer(model);
    animations.forEach((clip) => mixer.clipAction(clip).play());
    mixerRef.current = mixer;
    return () => mixer.stopAllAction();
  }, [animations, model, reduceMotion]);

  useFrame((state, delta) => {
    mixerRef.current?.update(delta);
    if (!groupRef.current || reduceMotion) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.35;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.45) * 0.13;
  });

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 1.6, 0]} scale={0.22}>
      <primitive object={model} raycast={null} />
    </group>
  );
};

const GameJelly = () => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      frameloop={reduceMotion ? "demand" : "always"}
    >
      <ambientLight intensity={1.35} color="#78e8ff" />
      <pointLight position={[2, 3, 4]} intensity={12} color="#a879ff" />
      <pointLight position={[-3, -1, 3]} intensity={8} color="#4ee8ff" />
      <JellyModel reduceMotion={reduceMotion} />
    </Canvas>
  );
};

useGLTF.preload(getAssetPath("/models/crystal_jellyfish_leptomedusae.glb"));

export default GameJelly;
