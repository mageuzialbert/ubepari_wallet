const tzsFormatter = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function formatTzs(amount: number): string {
  return tzsFormatter.format(amount);
}

export function formatTzsCompact(amount: number): string {
  if (amount >= 1_000_000) return `TZS ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `TZS ${(amount / 1_000).toFixed(0)}K`;
  return `TZS ${amount}`;
}
