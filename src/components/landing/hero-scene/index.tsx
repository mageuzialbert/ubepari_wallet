"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { HeroSceneFallback } from "./fallback";

const Scene = dynamic(() => import("./scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => <HeroSceneFallback />,
});

function subscribe(callback: () => void): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const small = window.matchMedia("(max-width: 640px)");
  reduced.addEventListener("change", callback);
  small.addEventListener("change", callback);
  return () => {
    reduced.removeEventListener("change", callback);
    small.removeEventListener("change", callback);
  };
}

function getSnapshot(): boolean {
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !window.matchMedia("(max-width: 640px)").matches
  );
}

const getServerSnapshot = (): boolean => false;

export function HeroScene({ className }: { className?: string }) {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className={className}>
      {enabled ? <Scene /> : <HeroSceneFallback />}
    </div>
  );
}
