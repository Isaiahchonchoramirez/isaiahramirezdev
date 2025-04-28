import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import Jellyfish from "./Models/HeroModels/Jellyfish"; // ✅ Make sure the path is correct
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PulsingLight = () => {
  const lightRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(t * 3) * 1; // Still breathing intensity

      // 🚨 Strobe COLORS: cycle through HSL colors
      const hue = (t * 0.2) % 1; // 0 to 1 smoothly over time
      lightRef.current.color.setHSL(hue, 1, 0.6); // full saturation, mid lightness
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 2, 5]}
      distance={15}
      intensity={2}
      castShadow
    />
  );
};

const FlickerAmbient = () => {
  const ambientRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.4 + Math.sin(t * 1.2) * 0.1;
    }
  });

  return <ambientLight ref={ambientRef} color="#448aff" intensity={0.5} />;
};

const CausticEffect = () => {
  const causticRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (causticRef.current) {
      causticRef.current.color.setHSL(0.6 + Math.sin(t * 0.3) * 0.1, 0.7, 0.7);
      causticRef.current.intensity = 0.4 + Math.sin(t * 2.5) * 0.3;
    }
  });

  return (
    <spotLight
      ref={causticRef}
      position={[0, 5, 2]}
      angle={0.8}
      penumbra={0.4}
      distance={15}
      intensity={1}
      color="#66e2ff"
    />
  );
};

const FloatingJelly = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <FlickerAmbient />
        <PulsingLight />
        <CausticEffect />
        <Suspense fallback={null}>
          <Jellyfish />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default FloatingJelly;
