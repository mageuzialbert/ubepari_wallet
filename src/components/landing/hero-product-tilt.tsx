"use client";

import Image from "next/image";
import { useRef, useSyncExternalStore } from "react";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

const REDUCED_QUERY = "(prefers-reduced-motion: reduce), (pointer: coarse)";

function subscribeReduced(callback: () => void): () => void {
  const m = window.matchMedia(REDUCED_QUERY);
  m.addEventListener("change", callback);
  return () => m.removeEventListener("change", callback);
}
const getReducedSnapshot = (): boolean =>
  window.matchMedia(REDUCED_QUERY).matches;
const getReducedServerSnapshot = (): boolean => true;

const SPRING = { stiffness: 95, damping: 18, mass: 0.8 };

export function HeroProductTilt({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    getReducedSnapshot,
    getReducedServerSnapshot,
  );

  const cursorRotX = useMotionValue(0);
  const cursorRotY = useMotionValue(0);
  const cursorGlareX = useMotionValue(50);
  const cursorGlareY = useMotionValue(50);

  const sRotX = useSpring(cursorRotX, SPRING);
  const sRotY = useSpring(cursorRotY, SPRING);
  const sGlareX = useSpring(cursorGlareX, SPRING);
  const sGlareY = useSpring(cursorGlareY, SPRING);

  const { scrollY } = useScroll();
  const scrollRotY = useTransform(scrollY, [0, 700], [0, -16]);
  const scrollTrY = useTransform(scrollY, [0, 700], [0, -60]);
  const scrollScale = useTransform(scrollY, [0, 700], [1, 0.94]);
  const scrollOpacity = useTransform(scrollY, [0, 600, 900], [1, 0.85, 0]);

  const totalRotY = useTransform(
    [sRotY, scrollRotY] as const,
    ([cursor, scroll]) => Number(cursor) + Number(scroll),
  );

  const glareBg = useTransform(
    [sGlareX, sGlareY] as const,
    ([x, y]) =>
      `radial-gradient(circle at ${Number(x)}% ${Number(y)}%, rgba(255,255,255,0.28), rgba(255,255,255,0) 55%)`,
  );

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced) return;
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    cursorRotY.set(px * 22);
    cursorRotX.set(-py * 14);
    cursorGlareX.set(((e.clientX - r.left) / r.width) * 100);
    cursorGlareY.set(((e.clientY - r.top) / r.height) * 100);
  }

  function handleLeave() {
    cursorRotY.set(0);
    cursorRotX.set(0);
    cursorGlareX.set(50);
    cursorGlareY.set(50);
  }

  return (
    <div
      ref={wrapRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ perspective: 1400 }}
      className="relative aspect-[4/3] w-full"
    >
      <motion.div
        style={{
          rotateX: sRotX,
          rotateY: totalRotY,
          y: scrollTrY,
          scale: scrollScale,
          opacity: scrollOpacity,
          transformStyle: "preserve-3d",
        }}
        className="relative size-full"
      >
        <div className="relative size-full overflow-hidden rounded-[28px] border border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55)]">
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 600px"
            className="object-cover"
          />
          <motion.div
            aria-hidden
            style={{ backgroundImage: glareBg }}
            className="pointer-events-none absolute inset-0 mix-blend-screen"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/5"
          />
        </div>
      </motion.div>
    </div>
  );
}
