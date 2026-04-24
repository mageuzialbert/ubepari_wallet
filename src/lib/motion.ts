"use client";

import { useSyncExternalStore } from "react";

// Card-scale press / hover: snappy, ~300ms settle.
export const CARD_SPRING = { stiffness: 260, damping: 26, mass: 0.7 };

// Progress reveal / count-up: softer, so bars and numbers feel earned.
export const REVEAL_SPRING = { stiffness: 90, damping: 22, mass: 1 };

// Stagger step for list mount — keep tight so long lists don't drag.
export const STAGGER_STEP_S = 0.04;

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(callback: () => void): () => void {
  const m = window.matchMedia(REDUCED_QUERY);
  m.addEventListener("change", callback);
  return () => m.removeEventListener("change", callback);
}
const getReducedSnapshot = (): boolean =>
  window.matchMedia(REDUCED_QUERY).matches;
// Treat reduced motion as the safe default on the server so SSR doesn't animate
// then snap when the client picks up the real value.
const getReducedServerSnapshot = (): boolean => true;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    getReducedSnapshot,
    getReducedServerSnapshot,
  );
}
