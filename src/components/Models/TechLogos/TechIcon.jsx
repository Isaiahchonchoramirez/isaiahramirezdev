import { Float, useGLTF } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * The spinning tech logos.
 *
 * These look good, so they are back — but previously all five WebGL contexts
 * mounted on page load, each pulling its own GLB *and* an HDR environment map,
 * for a section most visitors scroll past. Three changes keep the look and
 * drop nearly all of the cost:
 *
 *  - nothing mounts until the card is scrolled near the viewport
 *  - `Environment preset="city"` is replaced by plain lights, removing a
 *    multi-megabyte HDR fetch per card
 *  - each canvas renders on demand and stops entirely when the tab is hidden
 */

function Model({ model }) {
  const { scene } = useGLTF(model.modelPath);

  useEffect(() => {
    if (model.name !== "Interactive Developer") return;
    scene.traverse((child) => {
      if (child.isMesh && child.name === "Object_5") {
        child.material = new THREE.MeshStandardMaterial({ color: "white" });
      }
    });
  }, [scene, model]);

  return (
    <Float speed={5.5} rotationIntensity={0.5} floatIntensity={0.9}>
      <group scale={model.scale} rotation={model.rotation}>
        <primitive object={scene} />
      </group>
    </Float>
  );
}

/**
 * `frameloop="demand"` paints once and then waits, so Float needs something to
 * drive it — but only while the tab is actually being looked at.
 */
function SpinWhileVisible() {
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

const TechIconCardExperience = ({ model, fallback = null }) => {
  const hostRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Reduced motion keeps the static mark rather than a spinning model.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      // Begin loading a little before the card scrolls in, so it is ready.
      { rootMargin: "300px 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="h-full w-full">
      {active ? (
        <Canvas
          dpr={[1, 1.5]}
          frameloop="demand"
          gl={{ antialias: true, powerPreference: "low-power" }}
        >
          {/* Plain lights instead of an HDR environment — visually close, and
              it saves a CDN fetch on every card. */}
          <ambientLight intensity={0.65} />
          <directionalLight position={[5, 5, 5]} intensity={1.4} />
          <directionalLight position={[-5, 2, -3]} intensity={0.5} color="#7dd3fc" />
          <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2} />

          {/* The static mark stays visible underneath until the model loads,
              so the grid never shows a hole. */}
          <Suspense fallback={null}>
            <Model model={model} />
          </Suspense>

          <SpinWhileVisible />
        </Canvas>
      ) : (
        fallback
      )}
    </div>
  );
};

export default TechIconCardExperience;
