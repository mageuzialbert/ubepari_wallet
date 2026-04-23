"use client";

import * as React from "react";

export function GoalProgressRing({
  percent,
  size = 200,
  strokeWidth = 14,
  label,
  sublabel,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
}) {
  const safe = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (safe / 100) * circ;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-border/60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="fill-none stroke-foreground transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
        <span className="text-4xl font-semibold tracking-tight">{label}</span>
        {sublabel && (
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
