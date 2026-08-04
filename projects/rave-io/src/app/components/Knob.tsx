import { useEffect, useRef, useState } from "react";

/**
 * A rotary control.
 *
 * Drag vertically, or use the arrow keys — the original was mouse-only, which
 * made every effect unreachable from a keyboard and from any touch device.
 */
export function Knob({
  value,
  onChange,
  label,
  color = "#2ff5d8",
  size = 52,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  color?: string;
  size?: number;
}) {
  const [dragging, setDragging] = useState(false);
  const origin = useRef({ y: 0, value: 0 });
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (!dragging) return;

    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    const move = (y: number) => latest.current(clamp(origin.current.value + (origin.current.y - y) * 0.7));

    const onMouseMove = (event: MouseEvent) => move(event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      // Otherwise the page scrolls out from under the finger mid-drag.
      event.preventDefault();
      move(event.touches[0].clientY);
    };
    const onUp = () => setDragging(false);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onUp);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onUp);
    };
  }, [dragging]);

  const begin = (y: number) => {
    origin.current = { y, value };
    setDragging(true);
  };

  // 270° of travel from -135° to +135°, the convention on hardware.
  const radius = size / 2;
  const track = radius - 7;
  const angle = -135 + (value / 100) * 270;
  const radians = (angle * Math.PI) / 180;
  const startRadians = (-135 * Math.PI) / 180;
  const dot = { x: radius + Math.cos(radians) * (track - 4), y: radius + Math.sin(radians) * (track - 4) };
  const arcStart = { x: radius + Math.cos(startRadians) * track, y: radius + Math.sin(startRadians) * track };
  const arcEnd = { x: radius + Math.cos(radians) * track, y: radius + Math.sin(radians) * track };
  const largeArc = (value / 100) * 270 > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="cursor-ns-resize rounded-full outline-none focus-visible:ring-2 touch-none"
        style={{ ...({ "--tw-ring-color": color } as React.CSSProperties) }}
        onMouseDown={(e) => begin(e.clientY)}
        onTouchStart={(e) => begin(e.touches[0].clientY)}
        onDoubleClick={() => onChange(50)}
        onKeyDown={(e) => {
          const delta = e.shiftKey ? 10 : 1;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onChange(Math.min(100, value + delta));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(Math.max(0, value - delta));
          } else if (e.key === "Home") {
            e.preventDefault();
            onChange(0);
          } else if (e.key === "End") {
            e.preventDefault();
            onChange(100);
          }
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={radius} cy={radius} r={radius - 2} fill="#0a0c18" stroke="rgba(160,180,255,0.14)" />
          <path
            d={describeArc(radius, track, -135, 135)}
            fill="none"
            stroke="rgba(160,180,255,0.12)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {value > 0.5 && (
            <path
              d={`M ${arcStart.x} ${arcStart.y} A ${track} ${track} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 5px ${color})` }}
            />
          )}
          <circle cx={dot.x} cy={dot.y} r="3" fill={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
          <circle cx={radius} cy={radius} r={radius * 0.3} fill="#06070d" stroke={`${color}40`} />
        </svg>
      </div>
      <span className="text-[10px] tracking-[0.16em] font-mono uppercase text-muted-foreground">{label}</span>
      <span className="text-[10px] font-mono tabular-nums font-semibold" style={{ color }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

function describeArc(center: number, radius: number, fromDeg: number, toDeg: number): string {
  const from = (fromDeg * Math.PI) / 180;
  const to = (toDeg * Math.PI) / 180;
  const x1 = center + Math.cos(from) * radius;
  const y1 = center + Math.sin(from) * radius;
  const x2 = center + Math.cos(to) * radius;
  const y2 = center + Math.sin(to) * radius;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2}`;
}
