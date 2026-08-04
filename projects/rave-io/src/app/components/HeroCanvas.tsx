import { useEffect, useRef } from "react";

/**
 * The hero backdrop: a grid, sweeping lasers and layered waveforms that bend
 * toward the pointer.
 *
 * Two things it now does that it did not before: it respects
 * prefers-reduced-motion, and it stops animating when scrolled out of view.
 * A full-screen canvas repainting at 60fps behind three screens of interface
 * is a laptop fan for no reason.
 */
export function HeroCanvas({ accent = "#2ff5d8" }: { accent?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -9999, y: -9999 };
    let frame = 0;
    let visible = true;

    // Back the canvas at device resolution so the lines are not soft on a
    // retina display, but keep the drawing code in CSS pixels.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduced) frame = requestAnimationFrame(draw);
    });
    observer.observe(canvas);

    const WAVES = [
      { amp: 58, freq: 0.0068, speed: 0.9, color: accent, offset: 0.5, weight: 2.4 },
      { amp: 34, freq: 0.013, speed: 1.35, color: "#ff3d7f", offset: 0.46, weight: 1.2 },
      { amp: 72, freq: 0.004, speed: 0.6, color: "#8b5cff", offset: 0.54, weight: 1.2 },
      { amp: 22, freq: 0.022, speed: 1.8, color: "#2fa8ff", offset: 0.5, weight: 1 },
    ];
    const LASERS = [
      { x1: 0, y1: 0.22, x2: 1, y2: 0.74, color: accent, speed: 0.28 },
      { x1: 0, y1: 0.66, x2: 1, y2: 0.1, color: "#ff3d7f", speed: 0.5 },
      { x1: 0.22, y1: 0, x2: 0.86, y2: 1, color: "#8b5cff", speed: 0.21 },
      { x1: 0.76, y1: 0, x2: 0.14, y2: 1, color: "#2fa8ff", speed: 0.38 },
    ];

    function draw(time: number) {
      const width = canvas!.offsetWidth;
      const height = canvas!.offsetHeight;

      ctx!.fillStyle = "#06070d";
      ctx!.fillRect(0, 0, width, height);

      // Grid, brightening near the pointer.
      ctx!.lineWidth = 0.5;
      for (let x = 0; x < width; x += 64) {
        const near = mouse.x > -100 && Math.abs(x - mouse.x) < 110;
        ctx!.strokeStyle = near ? "rgba(160,180,255,0.16)" : "rgba(160,180,255,0.04)";
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, height);
        ctx!.stroke();
      }
      for (let y = 0; y < height; y += 64) {
        const near = mouse.y > -100 && Math.abs(y - mouse.y) < 110;
        ctx!.strokeStyle = near ? "rgba(160,180,255,0.16)" : "rgba(160,180,255,0.04)";
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(width, y);
        ctx!.stroke();
      }

      LASERS.forEach((laser, i) => {
        const pulse = 0.18 + 0.5 * Math.abs(Math.sin(time * 0.001 * laser.speed + i * 1.07));
        const sway = Math.sin(time * 0.0004 * laser.speed + i * 0.7) * 0.04;
        const x1 = (laser.x1 + sway) * width;
        const x2 = (laser.x2 - sway) * width;

        [18, 7, 1.6].forEach((weight, layer) => {
          const alpha = Math.round(pulse * [0.07, 0.24, 0.8][layer] * 255);
          ctx!.beginPath();
          ctx!.moveTo(x1, laser.y1 * height);
          ctx!.lineTo(x2, laser.y2 * height);
          ctx!.strokeStyle = laser.color + alpha.toString(16).padStart(2, "0");
          ctx!.lineWidth = weight;
          ctx!.shadowColor = laser.color;
          ctx!.shadowBlur = [44, 16, 5][layer];
          ctx!.stroke();
        });
        ctx!.shadowBlur = 0;
      });

      WAVES.forEach((wave, index) => {
        const centre = wave.offset * height;
        ctx!.beginPath();
        for (let x = 0; x <= width; x += 3) {
          // The pointer drags the waveform toward itself, falling off with distance.
          const pull = Math.max(0, 1 - Math.hypot(x - mouse.x, centre - mouse.y) / 215) * (mouse.y - centre) * 0.4;
          const y =
            centre +
            Math.sin(x * wave.freq + time * wave.speed * 0.001) * wave.amp +
            Math.sin(x * wave.freq * 2.3 + time * wave.speed * 0.0018 + index) * wave.amp * 0.3 +
            pull;
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }

        // Fade both ends so the lines do not terminate against the edges.
        const gradient = ctx!.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `${wave.color}00`);
        gradient.addColorStop(0.14, `${wave.color}d0`);
        gradient.addColorStop(0.86, `${wave.color}d0`);
        gradient.addColorStop(1, `${wave.color}00`);

        ctx!.strokeStyle = gradient;
        ctx!.lineWidth = wave.weight;
        ctx!.globalAlpha = index === 0 ? 1 : 0.5;
        ctx!.shadowColor = wave.color;
        ctx!.shadowBlur = index === 0 ? 22 : 9;
        ctx!.stroke();
        ctx!.shadowBlur = 0;
        ctx!.globalAlpha = 1;
      });

      if (mouse.x > -100) {
        const glow = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 240);
        glow.addColorStop(0, "rgba(47,245,216,0.12)");
        glow.addColorStop(0.45, "rgba(139,92,255,0.05)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.fillStyle = glow;
        ctx!.fillRect(0, 0, width, height);
      }

      if (visible) frame = requestAnimationFrame(draw);
    }

    if (reduced) draw(0);
    else frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [accent]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" aria-hidden="true" />;
}
