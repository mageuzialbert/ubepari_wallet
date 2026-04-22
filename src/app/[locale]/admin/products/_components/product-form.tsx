"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary, useLocale } from "@/i18n/provider";

const BRANDS = ["Apple", "Dell", "HP", "Lenovo", "ASUS", "MSI", "Acer", "Custom"] as const;
const USAGE_TAGS = ["Gaming", "Design", "Coding", "Office", "Student", "Creator"] as const;
const SPEC_KEYS = [
  "cpu",
  "cpuGeneration",
  "ram",
  "storage",
  "gpu",
  "display",
  "os",
  "weight",
] as const;

type Brand = (typeof BRANDS)[number];
type UsageTag = (typeof USAGE_TAGS)[number];
type SpecKey = (typeof SPEC_KEYS)[number];
type Specs = Record<SpecKey, string>;

export type ProductFormInitial = {
  id: string | null;
  slug: string;
  brand: Brand;
  name_en: string;
  name_sw: string;
  tagline_en: string;
  tagline_sw: string;
  description_en: string;
  description_sw: string;
  cash_price_tzs: number | "";
  stock: number | "";
  featured: boolean;
  active: boolean;
  color_accent: string;
  specs: Specs;
  usage_tags: UsageTag[];
  slug_locked: boolean;
};

const EMPTY_SPECS: Specs = {
  cpu: "",
  cpuGeneration: "",
  ram: "",
  storage: "",
  gpu: "",
  display: "",
  os: "",
  weight: "",
};

export const DEFAULT_PRODUCT_FORM: ProductFormInitial = {
  id: null,
  slug: "",
  brand: "Apple",
  name_en: "",
  name_sw: "",
  tagline_en: "",
  tagline_sw: "",
  description_en: "",
  description_sw: "",
  cash_price_tzs: "",
  stock: 0,
  featured: false,
  active: true,
  color_accent: "",
  specs: { ...EMPTY_SPECS },
  usage_tags: [],
  slug_locked: false,
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type ApiError =
  | "bad_input"
  | "slug_in_use"
  | "slug_locked"
  | "not_found"
  | "unauthenticated"
  | "forbidden"
  | "unknown";

export function ProductForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: ProductFormInitial;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const t = dict.admin.products;

  const [state, setState] = useState<ProductFormInitial>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const slugEditable = !state.slug_locked;

  function update<K extends keyof ProductFormInitial>(key: K, value: ProductFormInitial[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }
  function updateSpec(key: SpecKey, value: string) {
    setState((s) => ({ ...s, specs: { ...s.specs, [key]: value } }));
  }
  function toggleTag(tag: UsageTag) {
    setState((s) => ({
      ...s,
      usage_tags: s.usage_tags.includes(tag)
        ? s.usage_tags.filter((t) => t !== tag)
        : [...s.usage_tags, tag],
    }));
  }

  function onNameEnChange(value: string) {
    update("name_en", value);
    if (!slugTouched && mode === "create") {
      setState((s) => ({ ...s, name_en: value, slug: slugify(value) }));
    }
  }

  function issueFor(field: string): string | null {
    const key = issues[field];
    if (!key) return null;
    const v = t.form.validation;
    switch (key) {
      case "length":
        return v.length;
      case "format":
        return v.format;
      case "range":
        return v.range;
      case "enum":
        return v.enum;
      case "required":
        return v.required;
      default:
        return v.required;
    }
  }

  function topLevelErrorMessage(): string | null {
    if (!error) return null;
    switch (error as ApiError) {
      case "bad_input":
        return t.toast.validation;
      case "slug_in_use":
        return t.toast.slugInUse;
      case "slug_locked":
        return t.toast.slugLocked;
      case "not_found":
        return t.toast.notFound;
      case "unauthenticated":
        return t.toast.unauthenticated;
      default:
        return t.toast.error;
    }
  }

  const usageTagLabels = useMemo(() => t.form.usageTags, [t.form.usageTags]);

  async function submit() {
    setError(null);
    setIssues({});
    setSaved(false);

    const payload = {
      name_en: state.name_en,
      name_sw: state.name_sw,
      slug: state.slug,
      brand: state.brand,
      tagline_en: state.tagline_en,
      tagline_sw: state.tagline_sw,
      description_en: state.description_en,
      description_sw: state.description_sw,
      cash_price_tzs: typeof state.cash_price_tzs === "number" ? state.cash_price_tzs : Number(state.cash_price_tzs),
      stock: typeof state.stock === "number" ? state.stock : Number(state.stock),
      featured: state.featured,
      active: state.active,
      color_accent: state.color_accent ? state.color_accent : null,
      specs: state.specs,
      usage_tags: state.usage_tags,
    };

    const url = mode === "create" ? "/api/admin/products" : `/api/admin/products/${initial.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[product-form] network error", err);
      setError("unknown");
      return;
    }

    if (res.status === 401) {
      router.push(`/${locale}/signin`);
      return;
    }

    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      id?: string;
      error?: ApiError;
      issues?: Record<string, string>;
    };

    if (!res.ok || !body.ok) {
      setError(body.error ?? "unknown");
      if (body.issues) setIssues(body.issues);
      return;
    }

    setSaved(true);
    if (mode === "create" && body.id) {
      startTransition(() => {
        router.push(`/${locale}/admin/products/${body.id}`);
        router.refresh();
      });
    } else {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  async function doDelete() {
    if (mode !== "edit" || !initial.id) return;
    if (!window.confirm(t.delete.confirmBody)) return;
    setError(null);
    let res: Response;
    try {
      res = await fetch(`/api/admin/products/${initial.id}`, { method: "DELETE" });
    } catch (err) {
      console.error("[product-form] delete error", err);
      setError("unknown");
      return;
    }
    if (res.status === 401) {
      router.push(`/${locale}/signin`);
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: ApiError };
    if (!res.ok || !body.ok) {
      setError(body.error ?? "unknown");
      return;
    }
    startTransition(() => {
      router.push(`/${locale}/admin/products?status=inactive`);
      router.refresh();
    });
  }

  const topError = topLevelErrorMessage();

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(submit);
      }}
    >
      <Section heading={t.form.sectionIdentity}>
        <Grid2>
          <Field label={t.form.nameEn} error={issueFor("name_en")}>
            <Input
              value={state.name_en}
              onChange={(e) => onNameEnChange(e.target.value)}
              maxLength={80}
              required
            />
          </Field>
          <Field label={t.form.nameSw} error={issueFor("name_sw")}>
            <Input
              value={state.name_sw}
              onChange={(e) => update("name_sw", e.target.value)}
              maxLength={80}
              required
            />
          </Field>
        </Grid2>
        <Grid2>
          <Field
            label={t.form.slugLabel}
            hint={slugEditable ? t.form.slugHint : t.form.slugLocked}
            error={issueFor("slug")}
          >
            <Input
              value={state.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", e.target.value.toLowerCase());
              }}
              disabled={!slugEditable}
              maxLength={60}
              required
              className="font-mono"
            />
          </Field>
          <Field label={t.form.brandLabel} error={issueFor("brand")}>
            <select
              value={state.brand}
              onChange={(e) => update("brand", e.target.value as Brand)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
            >
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
        </Grid2>
      </Section>

      <Section heading={t.form.sectionCopy}>
        <Grid2>
          <Field label={t.form.taglineEn} error={issueFor("tagline_en")}>
            <Input
              value={state.tagline_en}
              onChange={(e) => update("tagline_en", e.target.value)}
              maxLength={140}
              required
            />
          </Field>
          <Field label={t.form.taglineSw} error={issueFor("tagline_sw")}>
            <Input
              value={state.tagline_sw}
              onChange={(e) => update("tagline_sw", e.target.value)}
              maxLength={140}
              required
            />
          </Field>
        </Grid2>
        <Field label={t.form.descriptionEn} error={issueFor("description_en")}>
          <textarea
            value={state.description_en}
            onChange={(e) => update("description_en", e.target.value)}
            rows={4}
            maxLength={2000}
            required
            className="w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
          />
        </Field>
        <Field label={t.form.descriptionSw} error={issueFor("description_sw")}>
          <textarea
            value={state.description_sw}
            onChange={(e) => update("description_sw", e.target.value)}
            rows={4}
            maxLength={2000}
            required
            className="w-full rounded-2xl border border-border/60 bg-background/40 px-3 py-2 text-[13px] outline-none transition-colors focus:border-foreground/40"
          />
        </Field>
      </Section>

      <Section heading={t.form.sectionCommerce}>
        <Grid2>
          <Field
            label={t.form.priceLabel}
            hint={t.form.priceHint}
            error={issueFor("cash_price_tzs")}
          >
            <Input
              type="number"
              inputMode="numeric"
              value={state.cash_price_tzs === "" ? "" : String(state.cash_price_tzs)}
              onChange={(e) =>
                update(
                  "cash_price_tzs",
                  e.target.value === "" ? "" : Math.max(0, Math.floor(Number(e.target.value))),
                )
              }
              min={10000}
              max={100000000}
              required
            />
          </Field>
          <Field label={t.form.stockLabel} hint={t.form.stockHint} error={issueFor("stock")}>
            <Input
              type="number"
              inputMode="numeric"
              value={state.stock === "" ? "" : String(state.stock)}
              onChange={(e) =>
                update(
                  "stock",
                  e.target.value === "" ? "" : Math.max(0, Math.floor(Number(e.target.value))),
                )
              }
              min={0}
              max={10000}
              required
            />
          </Field>
        </Grid2>
        <Grid2>
          <Toggle
            label={t.form.featuredLabel}
            checked={state.featured}
            onChange={(v) => update("featured", v)}
          />
          <Toggle
            label={t.form.activeLabel}
            checked={state.active}
            onChange={(v) => update("active", v)}
          />
        </Grid2>
        <Field
          label={t.form.colorLabel}
          hint={t.form.colorHint}
          error={issueFor("color_accent")}
        >
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={state.color_accent || "#111111"}
              onChange={(e) => update("color_accent", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-border/60 bg-transparent"
            />
            <Input
              value={state.color_accent}
              onChange={(e) => update("color_accent", e.target.value)}
              placeholder="#000000"
              maxLength={7}
              className="font-mono"
            />
          </div>
        </Field>
      </Section>

      <Section heading={t.form.sectionSpecs}>
        <Grid2>
          {SPEC_KEYS.map((key) => (
            <Field
              key={key}
              label={t.form.specs[key]}
              error={issueFor(`specs.${key}`)}
            >
              <Input
                value={state.specs[key]}
                onChange={(e) => updateSpec(key, e.target.value)}
                maxLength={80}
                required
              />
            </Field>
          ))}
        </Grid2>
      </Section>

      <Section heading={t.form.sectionTags} hint={t.form.tagsHint}>
        <div className="flex flex-wrap gap-2">
          {USAGE_TAGS.map((tag) => {
            const on = state.usage_tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-tight transition-colors ${
                  on
                    ? "bg-foreground text-background"
                    : "border border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {usageTagLabels[tag]}
              </button>
            );
          })}
        </div>
        {issueFor("usage_tags") ? (
          <p className="text-[12px] text-destructive">{issueFor("usage_tags")}</p>
        ) : null}
      </Section>

      {topError ? (
        <p className="text-[13px] text-destructive">{topError}</p>
      ) : null}
      {saved && !topError ? (
        <p className="text-[13px] text-emerald-400">
          {mode === "create" ? t.toast.created : t.toast.updated}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-4 py-4 backdrop-blur sm:-mx-0 sm:rounded-2xl sm:border sm:bg-card sm:px-6">
        <div>
          {mode === "edit" && state.active ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full text-destructive"
              onClick={doDelete}
              disabled={pending}
            >
              {t.actions.delete}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => router.push(`/${locale}/admin/products`)}
            disabled={pending}
          >
            {t.actions.cancel}
          </Button>
          <Button type="submit" className="rounded-full" disabled={pending}>
            {mode === "create" ? t.actions.create : t.actions.save}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Section({
  heading,
  hint,
  children,
}: {
  heading: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {heading}
      </h2>
      {hint ? <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p> : null}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-[12px]">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3">
      <span className="text-[13px]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-foreground"
      />
    </label>
  );
}
