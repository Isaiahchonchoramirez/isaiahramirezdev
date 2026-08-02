import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

import HeroLights from "./HeroLights";
import Particles from "./Particles";

/**
 * The hero's ambient water.
 *
 * This used to render the room GLB alongside the globally-mounted jellyfish,
 * which meant two WebGL contexts and two model downloads competing on the
 * homepage. The jellyfish is the signature, so it keeps the spotlight and this
 * canvas is only light and drifting particles behind it.
 */
const HeroExperience = () => (
  <Canvas
    camera={{ position: [0, 0, 15], fov: 45 }}
    dpr={[1, 1.6]}
    gl={{ antialias: false, powerPreference: "low-power" }}
  >
    <ambientLight intensity={0.2} color="#1a1a40" />
    <Suspense fallback={null}>
      <HeroLights />
      <Particles count={80} />
    </Suspense>
  </Canvas>
);

export default HeroExperience;
