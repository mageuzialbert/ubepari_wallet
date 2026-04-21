"use client";

import * as React from "react";
import type { Dictionary } from "./types";
import type { Locale } from "./config";

type DictionaryContextValue = {
  dict: Dictionary;
  locale: Locale;
};

const DictionaryContext = React.createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({
  dict,
  locale,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ dict, locale }), [dict, locale]);
  return <DictionaryContext.Provider value={value}>{children}</DictionaryContext.Provider>;
}

export function useDictionary(): Dictionary {
  const ctx = React.useContext(DictionaryContext);
  if (!ctx) throw new Error("useDictionary must be used within DictionaryProvider");
  return ctx.dict;
}

export function useLocale(): Locale {
  const ctx = React.useContext(DictionaryContext);
  if (!ctx) throw new Error("useLocale must be used within DictionaryProvider");
  return ctx.locale;
}
