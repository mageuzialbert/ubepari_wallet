"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

const PANEL_COUNT = 22;
const Z_SPREAD = 42;
const SIGMA = 2.8;
const WAVE_SPRING = { stiffness: 160, damping: 22, mass: 0.6 };
const SCENE_SPRING = { stiffness: 80, damping: 22, mass: 1 };

const REST_ROT_Y = -36;
const REST_ROT_X = 16;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce), (pointer: coarse)";

function subscribeReduced(callback: () => void): () => void {
  const m = window.matchMedia(REDUCED_QUERY);
  m.addEventListener("change", callback);
  return () => m.removeEventListener("change", callback);
}
const getReducedSnapshot = (): boolean =>
  window.matchMedia(REDUCED_QUERY).matches;
const getReducedServerSnapshot = (): boolean => true;

function Panel({
  index,
  total,
  imageUrl,
  cursorPos,
  active,
}: {
  index: number;
  total: number;
  imageUrl: string;
  cursorPos: MotionValue<number>;
  active: MotionValue<number>;
}) {
  const t = index / (total - 1);
  const baseZ = (index - (total - 1)) * Z_SPREAD;
  const w = 200 + t * 80;
  const h = 280 + t * 120;
  const opacity = 0.32 + t * 0.68;
  const borderAlpha = 0.08 + t * 0.22;

  const waveTarget = useTransform(
    [cursorPos, active] as const,
    ([cp, a]) => {
      const dist = Math.abs(index - Number(cp));
      const influence = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA));
      return -influence * 70 * Number(a);
    },
  );
  const scaleTarget = useTransform(
    [cursorPos, active] as const,
    ([cp, a]) => {
      const dist = Math.abs(index - Number(cp));
      const influence = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA));
      const compressed = 0.35 + influence * 0.65;
      return Number(a) * compressed + (1 - Number(a));
    },
  );
  const waveY = useSpring(waveTarget, WAVE_SPRING);
  const scaleY = useSpring(scaleTarget, WAVE_SPRING);

  return (
    <motion.div
      className="pointer-events-none absolute overflow-hidden rounded-xl"
      style={{
        width: w,
        height: h,
        marginLeft: -w / 2,
        marginTop: -h / 2,
        translateZ: baseZ,
        y: waveY,
        scaleY,
        transformOrigin: "bottom center",
        opacity,
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0d0e12",
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,10,16,0.05) 0%, rgba(8,10,16,0.55) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-[inherit]"
        style={{
          border: `1px solid rgba(255,255,255,${borderAlpha})`,
          boxSizing: "border-box",
          boxShadow: `inset 0 0 24px rgba(92,199,232,${0.04 + t * 0.06})`,
        }}
      />
    </motion.div>
  );
}

export function HeroProductStack({
  images,
  className,
}: {
  images: string[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    getReducedSnapshot,
    getReducedServerSnapshot,
  );

  const cursorPos = useMotionValue(PANEL_COUNT / 2);
  const active = useMotionValue(0);

  const cursorRotY = useMotionValue(REST_ROT_Y);
  const cursorRotX = useMotionValue(REST_ROT_X);
  const sRotY = useSpring(cursorRotY, SCENE_SPRING);
  const sRotX = useSpring(cursorRotX, SCENE_SPRING);

  const { scrollY } = useScroll();
  const scrollRotY = useTransform(scrollY, [0, 700], [0, -10]);
  const scrollTrY = useTransform(scrollY, [0, 700], [0, -50]);
  const scrollScale = useTransform(scrollY, [0, 700], [1, 0.94]);
  const scrollOpacity = useTransform(scrollY, [0, 600, 900], [1, 0.85, 0]);
  const totalRotY = useTransform(
    [sRotY, scrollRotY] as const,
    ([cur, scr]) => Number(cur) + Number(scr),
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (e.clientX - rect.left) / rect.width;
      const cy = (e.clientY - rect.top) / rect.height;
      cursorRotY.set(REST_ROT_Y + (cx - 0.5) * 14);
      cursorRotX.set(REST_ROT_X + (cy - 0.5) * -10);
      cursorPos.set(cx * (PANEL_COUNT - 1));
      active.set(1);
    },
    [reduced, cursorRotY, cursorRotX, cursorPos, active],
  );

  const handlePointerLeave = useCallback(() => {
    cursorRotY.set(REST_ROT_Y);
    cursorRotX.set(REST_ROT_X);
    active.set(0);
  }, [cursorRotY, cursorRotX, active]);

  const safeImages = images.length > 0 ? images : [""];

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative flex h-full w-full select-none items-center justify-center ${className ?? ""}`}
      style={{ perspective: 900 }}
    >
      <motion.div
        style={{
          rotateY: totalRotY,
          rotateX: sRotX,
          y: scrollTrY,
          scale: scrollScale,
          opacity: scrollOpacity,
          transformStyle: "preserve-3d",
          position: "relative",
          width: 0,
          height: 0,
        }}
      >
        {Array.from({ length: PANEL_COUNT }).map((_, i) => (
          <Panel
            key={i}
            index={i}
            total={PANEL_COUNT}
            imageUrl={safeImages[i % safeImages.length]}
            cursorPos={cursorPos}
            active={active}
          />
        ))}
      </motion.div>
    </div>
  );
}
