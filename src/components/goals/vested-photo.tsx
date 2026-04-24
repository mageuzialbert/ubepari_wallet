"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

import { REVEAL_SPRING, useReducedMotion } from "@/lib/motion";

export type VestedPhotoProps = {
  imageUrl: string | undefined;
  alt: string;
  percent: number;
  /** Tints the bottom progress bar. Falls back to foreground. */
  colorAccent?: string | null;
  /** "active" draws the fog + bar; "completed" clears fog; "cancelled" desaturates. */
  state?: "active" | "completed" | "cancelled";
  /** 16/9 for the detail hero, 5/3 for list cards. */
  aspect?: "16/9" | "5/3";
  /** Optional overlaid content (name, percent pill) — we render it above the fog. */
  children?: React.ReactNode;
};

export function VestedPhoto({
  imageUrl,
  alt,
  percent,
  colorAccent,
  state = "active",
  aspect = "5/3",
  children,
}: VestedPhotoProps) {
  const reduced = useReducedMotion();
  const safe = Math.max(0, Math.min(100, percent));

  // Animate fog width 100 → (100-safe) on mount so every render feels like a
  // small reveal. When `percent` changes (e.g., after a contribution), the
  // spring target updates and the fog recedes naturally.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const target = useMotionValue(100);
  React.useEffect(() => {
    target.set(mounted ? 100 - safe : 100);
  }, [mounted, safe, target]);
  const fogWidth = useSpring(target, REVEAL_SPRING);
  const fogWidthPct = useTransform(fogWidth, (v) => `${v}%`);

  const barWidthTarget = useMotionValue(0);
  React.useEffect(() => {
    barWidthTarget.set(mounted ? safe : 0);
  }, [mounted, safe, barWidthTarget]);
  const barWidth = useSpring(barWidthTarget, REVEAL_SPRING);
  const barWidthPct = useTransform(barWidth, (v) => `${v}%`);

  // Reduced motion: skip the spring entirely, render final state on first paint.
  const fogStyle = reduced
    ? { width: `${100 - safe}%` }
    : { width: fogWidthPct };
  const barStyle = reduced
    ? { width: `${safe}%` }
    : { width: barWidthPct };

  const isCompleted = state === "completed";
  const isCancelled = state === "cancelled";
  const aspectClass = aspect === "16/9" ? "aspect-[16/9]" : "aspect-[5/3]";
  const barColor = colorAccent ?? "currentColor";

  return (
    <div
      className={`relative overflow-hidden ${aspectClass} w-full ${
        isCancelled ? "bg-muted/40" : "bg-card"
      }`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 640px"
          className={`object-cover transition-[filter] duration-500 ${
            isCancelled ? "grayscale opacity-50" : ""
          }`}
          priority={false}
        />
      ) : (
        <FallbackBlock name={alt} colorAccent={colorAccent} />
      )}

      {/* Bottom gradient for legibility of any overlaid text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
      />

      {/* Fog on the unvested portion — recedes right-to-left as percent rises. */}
      {!isCompleted && !isCancelled && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 backdrop-blur-[2px]"
          style={{
            ...fogStyle,
            background:
              "linear-gradient(90deg, rgba(8,10,16,0.25) 0%, rgba(8,10,16,0.72) 45%, rgba(8,10,16,0.85) 100%)",
          }}
        />
      )}

      {/* Bottom progress bar — the vivid edge of what's yours. */}
      {!isCancelled && (
        <motion.div
          aria-hidden
          className="absolute bottom-0 left-0 h-[3px]"
          style={{
            ...barStyle,
            background: barColor,
          }}
        />
      )}

      {/* Overlaid children (name, ref, percent pill). */}
      {children ? (
        <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function FallbackBlock({
  name,
  colorAccent,
}: {
  name: string;
  colorAccent?: string | null;
}) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: colorAccent
          ? `linear-gradient(135deg, ${colorAccent}22 0%, transparent 60%)`
          : undefined,
      }}
    >
      <span className="px-4 text-center text-[15px] font-semibold tracking-tight text-muted-foreground">
        {name}
      </span>
    </div>
  );
}
