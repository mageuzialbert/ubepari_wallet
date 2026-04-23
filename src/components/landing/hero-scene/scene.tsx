"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { useTheme } from "next-themes";

import { TopoBackdrop } from "./topo-shader";

const subscribeMounted = (): (() => void) => () => {};
const getMountedSnapshot = (): boolean => true;
const getMountedServerSnapshot = (): boolean => false;

export function Scene() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);
  const mounted = useSyncExternalStore(
    subscribeMounted,
    getMountedSnapshot,
    getMountedServerSnapshot,
  );
  const { resolvedTheme } = useTheme();
  const isDark = mounted ? resolvedTheme !== "light" : true;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointerRef.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => {
      pointerRef.current.x = 0;
      pointerRef.current.y = 0;
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    const io = new IntersectionObserver(
      (entries) => setVisible(entries[0]?.isIntersecting ?? false),
      { threshold: 0.05 },
    );
    io.observe(el);

    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 4.0], fov: 38 }}
        frameloop={visible ? "always" : "never"}
      >
        <TopoBackdrop pointerRef={pointerRef} isDark={isDark} />
      </Canvas>
    </div>
  );
}

export default Scene;
