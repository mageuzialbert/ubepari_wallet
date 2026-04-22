export type KpiTone = "default" | "muted" | "accent" | "warn";

const TONE_CLASS: Record<KpiTone, string> = {
  default: "border-border/60",
  muted: "border-border/60",
  accent: "border-foreground/30",
  warn: "border-amber-500/40",
};

export function Kpi({
  label,
  value,
  sublabel,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: KpiTone;
}) {
  return (
    <div className={`rounded-3xl border ${TONE_CLASS[tone]} bg-card px-5 py-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {sublabel ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}
