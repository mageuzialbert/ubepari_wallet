import * as React from "react";

import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "mark" | "lockup" | "wordmark";

const MARK_PX: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 44,
  xl: 72,
};

const WORDMARK_CLASS: Record<LogoSize, string> = {
  sm: "text-[15px] leading-none",
  md: "text-lg leading-none",
  lg: "text-2xl leading-none",
  xl: "text-4xl leading-none",
};

const GAP_CLASS: Record<LogoSize, string> = {
  sm: "gap-2",
  md: "gap-2.5",
  lg: "gap-3",
  xl: "gap-4",
};

export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: LogoSize;
  variant?: LogoVariant;
  markTitle?: string;
}

export function Logo({
  size = "md",
  variant = "lockup",
  markTitle = "Ubepari Wallet",
  className,
  ...rest
}: LogoProps) {
  if (variant === "mark") {
    return (
      <span
        className={cn("inline-flex shrink-0", className)}
        aria-label={markTitle}
        {...rest}
      >
        <BrandMark size={MARK_PX[size]} title={markTitle} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        className={cn(
          "inline-flex items-baseline font-semibold tracking-tight lowercase",
          WORDMARK_CLASS[size],
          className,
        )}
        {...rest}
      >
        <span>ubepari&nbsp;wallet</span>
        <span aria-hidden className="text-brand-cyan">.</span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center", GAP_CLASS[size], className)}
      aria-label={markTitle}
      {...rest}
    >
      <BrandMark size={MARK_PX[size]} title={markTitle} />
      <span
        aria-hidden
        className={cn(
          "inline-flex items-baseline font-semibold tracking-tight lowercase",
          WORDMARK_CLASS[size],
        )}
      >
        <span>ubepari&nbsp;wallet</span>
        <span className="text-brand-cyan">.</span>
      </span>
    </span>
  );
}

interface BrandMarkProps {
  size: number;
  title?: string;
}

function BrandMark({ size, title }: BrandMarkProps) {
  return (
    <svg
      role="img"
      aria-label={title}
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <rect width="256" height="256" rx="58" fill="var(--brand-blue)" />
      <path
        fill="#ffffff"
        d="M 136 212 L 136 112 Q 136 96 146 84 L 194 32 Q 200 26 200 34 L 200 196 Q 200 212 184 212 Z"
      />
      <path
        fill="var(--brand-cyan)"
        d="M 60 128 L 124 128 L 124 196 Q 124 212 108 212 L 76 212 Q 60 212 60 196 Z"
      />
    </svg>
  );
}
