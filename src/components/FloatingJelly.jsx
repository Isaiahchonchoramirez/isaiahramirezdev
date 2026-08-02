import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import Jellyfish from "./Models/HeroModels/Jellyfish";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PulsingLight = () => {
  const lightRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(t * 3) * 1;
      const hue = (t * 0.2) % 1;
      lightRef.current.color.setHSL(hue, 1, 0.6);
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

// New component: Spotlight that follows the jellyfish
const FollowSpotlight = ({ jellyfishRef }) => {
  const spotlightRef = useRef();
  const targetRef = useRef(new THREE.Vector3());

  useFrame(() => {
    if (spotlightRef.current && jellyfishRef.current) {
      // Get jellyfish position
      const jellyPos = jellyfishRef.current.position;
      
      // Position spotlight above and slightly in front of jellyfish
      spotlightRef.current.position.set(
        jellyPos.x,
        jellyPos.y + 3,
        jellyPos.z + 2
      );
      
      // Make spotlight look at jellyfish
      targetRef.current.copy(jellyPos);
      spotlightRef.current.target.position.copy(targetRef.current);
      spotlightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <spotLight
        ref={spotlightRef}
        angle={0.3}
        penumbra={0.5}
        intensity={25}
        color="white"
        distance={20}
        castShadow
      />
      {/* Additional colored spotlights for more dramatic effect */}
      <FollowingColoredSpot jellyfishRef={jellyfishRef} color="#4cc9f0" offset={[2, 4, 3]} intensity={15} />
      <FollowingColoredSpot jellyfishRef={jellyfishRef} color="#9d4edd" offset={[-2, 4, 3]} intensity={15} />
    </>
  );
};

// Helper component for additional colored spotlights
const FollowingColoredSpot = ({ jellyfishRef, color, offset, intensity }) => {
  const spotRef = useRef();

  useFrame(() => {
    if (spotRef.current && jellyfishRef.current) {
      const jellyPos = jellyfishRef.current.position;
      spotRef.current.position.set(
        jellyPos.x + offset[0],
        jellyPos.y + offset[1],
        jellyPos.z + offset[2]
      );
      spotRef.current.target.position.copy(jellyPos);
      spotRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <spotLight
      ref={spotRef}
      angle={0.4}
      penumbra={1}
      intensity={intensity}
      color={color}
      distance={15}
    />
  );
};

/**
 * The jellyfish that drifts behind the whole site.
 *
 * It is the signature of the portfolio, but it is also a 1.8 MB model and a
 * live WebGL context, so it is deliberately not part of the first paint:
 *
 *  - mounting waits for the browser to go idle, so text and projects render first
 *  - it never mounts at all for `prefers-reduced-motion`, or on a device
 *    reporting very few cores, where it would cost more than it adds
 *  - rendering stops while the tab is hidden, rather than burning battery in
 *    a background tab
 */
const FloatingJelly = () => {
  const containerRef = useRef();
  const jellyfishRef = useRef();
  const [mounted, setMounted] = useState(false);

  const wanted =
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    (navigator.hardwareConcurrency ?? 8) > 2;

  useEffect(() => {
    if (!wanted) return;
    // Idle callback keeps the model off the critical path; the timeout is the
    // fallback for Safari, which still lacks requestIdleCallback.
    const schedule = window.requestIdleCallback || ((fn) => setTimeout(fn, 900));
    const cancel = window.cancelIdleCallback || clearTimeout;
    const handle = schedule(() => setMounted(true), { timeout: 2500 });
    return () => cancel(handle);
  }, [wanted]);

  useEffect(() => {
    if (!mounted) return;
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        containerRef.current.dataset.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        containerRef.current.dataset.mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mounted]);

  if (!wanted || !mounted) return null;

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 9 }}
    >
      <Canvas
        camera={{ position: [0, 0, 15], fov: 45 }}
        gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
        dpr={[1, 1.75]}
        frameloop="demand"
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.8} color="#2196f3" />

        <FlickerAmbient />
        <PulsingLight />
        <CausticEffect />
        <FollowSpotlight jellyfishRef={jellyfishRef} />

        <RenderWhileVisible />

        <Suspense fallback={null}>
          <Jellyfish containerRef={containerRef} ref={jellyfishRef} />
        </Suspense>
      </Canvas>
    </div>
  );
};

/**
 * Drives the render loop only while the tab is visible.
 *
 * The canvas runs on `frameloop="demand"`, so without this it would paint once
 * and freeze; with it, a hidden tab costs nothing at all.
 */
function RenderWhileVisible() {
  const { invalidate } = useThree();

  useEffect(() => {
    let raf;
    const tick = () => {
      invalidate();
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === "visible") raf = requestAnimationFrame(tick);
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", start);
    };
  }, [invalidate]);

  return null;
}

export default FloatingJelly;