import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

import { getAssetPath } from '../../../utils/assetPath';

const KEYBOARD_SPEED = 8;

const Jellyfish = forwardRef(({ containerRef }, ref) => {
  const { scene, animations } = useGLTF(getAssetPath('/models/crystal_jellyfish_leptomedusae.glb'));
  const jellyRef = useRef();
  const modelRef = useRef();
  const keys = useRef({ w: false, a: false, s: false, d: false });

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

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };
    const setKey = (down) => (e) => {
      if (isTyping()) return;
      const k = e.key.toLowerCase();
      if (k in keys.current) keys.current[k] = down;
    };
    const onDown = setKey(true);
    const onUp = setKey(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (mixer.current) mixer.current.update(delta);
    if (!jellyRef.current) return;

    const k = keys.current;
    const dx = (k.d ? 1 : 0) - (k.a ? 1 : 0);
    const dy = (k.w ? 1 : 0) - (k.s ? 1 : 0);
    const isMoving = dx !== 0 || dy !== 0;

    let tiltX, tiltZ;

    if (isMoving) {
      // Keyboard control: move directly, tilt in motion direction
      jellyRef.current.position.x += dx * KEYBOARD_SPEED * delta;
      jellyRef.current.position.y += dy * KEYBOARD_SPEED * delta;
      tiltX = -dy * 0.3;
      tiltZ = -dx * 0.3;
    } else {
      // Mouse follow: read latest mouse, lerp toward it with a gentle bob
      if (containerRef?.current) {
        const mouseX = parseFloat(containerRef.current.dataset.mouseX || 0);
        const mouseY = parseFloat(containerRef.current.dataset.mouseY || 0);
        mouse.set(mouseX, mouseY);
      }
      target.set(mouse.x * viewport.width * 0.25, mouse.y * viewport.height * 0.25, 0);
      target.y += Math.sin(state.clock.elapsedTime * 1.5) * 0.5;
      jellyRef.current.position.lerp(target, 0.1);
      tiltX = -mouse.y * 0.3;
      tiltZ = -mouse.x * 0.3;
    }

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