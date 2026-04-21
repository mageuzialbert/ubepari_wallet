"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import type { UsageTag } from "@/lib/products";

const USAGES: UsageTag[] = [
  "Gaming",
  "Design",
  "Coding",
  "Office",
  "Student",
  "Creator",
];

const BRANDS = ["Apple", "Dell", "HP", "Lenovo", "ASUS", "MSI", "Acer", "Custom"];

const PRICE_BUCKETS = [
  { label: "Under 2M", value: "0-2000000" },
  { label: "2M – 4M", value: "2000000-4000000" },
  { label: "4M – 6M", value: "4000000-6000000" },
  { label: "6M+", value: "6000000-99999999" },
];

export function FilterRail() {
  const router = useRouter();
  const params = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || next.get(key) === value) next.delete(key);
      else next.set(key, value);
      router.replace(`/store${next.size ? `?${next.toString()}` : ""}`, {
        scroll: false,
      });
    },
    [params, router],
  );

  const active = {
    usage: params.get("usage"),
    brand: params.get("brand"),
    price: params.get("price"),
  };

  const hasAny = active.usage || active.brand || active.price;

  return (
    <aside className="sticky top-20 flex flex-col gap-8 text-[13px]">
      {hasAny && (
        <button
          onClick={() => router.replace("/store", { scroll: false })}
          className="self-start text-[12px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Clear all filters
        </button>
      )}

      <FilterGroup label="Usage">
        {USAGES.map((u) => (
          <FilterPill
            key={u}
            label={u}
            active={active.usage === u}
            onClick={() => updateParam("usage", u)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Brand">
        {BRANDS.map((b) => (
          <FilterPill
            key={b}
            label={b}
            active={active.brand === b}
            onClick={() => updateParam("brand", b)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Monthly plan">
        {PRICE_BUCKETS.map((p) => (
          <FilterPill
            key={p.value}
            label={p.label}
            active={active.price === p.value}
            onClick={() => updateParam("price", p.value)}
          />
        ))}
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[12px] transition-all ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/70 bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
