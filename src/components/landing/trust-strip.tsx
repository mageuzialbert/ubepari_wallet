"use client";

import { Lock, PhoneCall, ShieldCheck, Truck } from "lucide-react";

import { useDictionary } from "@/i18n/provider";

const ICONS = [ShieldCheck, Lock, Truck, PhoneCall] as const;

export function TrustStrip() {
  const t = useDictionary().trustStrip;

  return (
    <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {t.items.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <div key={item.title} className="flex flex-col gap-2">
              <Icon
                className="h-5 w-5 text-foreground"
                strokeWidth={1.8}
              />
              <p className="text-[14px] font-medium">{item.title}</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
