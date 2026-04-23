"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTzs } from "@/lib/currency";
import { useDictionary, useLocale } from "@/i18n/provider";
import type { CardPayload } from "@/lib/assistant/tools";

type ProductCardProps = Extract<CardPayload, { kind: "product" }>;

export function ProductCard(props: ProductCardProps) {
  const locale = useLocale();
  const dict = useDictionary();
  const t = dict.assistant;

  return (
    <div className="flex items-stretch gap-3 rounded-2xl border border-border/60 bg-card p-3">
      <div className="relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted/40">
        {props.image ? (
          <Image
            src={props.image}
            alt={props.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {props.brand}
          </p>
          <h3 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight">
            {props.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
            {props.tagline}
          </p>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-[13px] font-semibold tracking-tight">
            {formatTzs(props.priceTzs, locale)}
          </p>
          <Button asChild size="sm" className="h-7 rounded-full px-3 text-[11px]">
            <Link href={`/${locale}/store/${props.slug}`}>
              {t.cardCtaSeeSpec} <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
