export function pushesRemaining(
  remainingTzs: number,
  monthlyTargetTzs: number,
): number {
  if (remainingTzs <= 0) return 0;
  if (monthlyTargetTzs <= 0) return 0;
  return Math.max(1, Math.ceil(remainingTzs / monthlyTargetTzs));
}

export type OwnershipKey =
  | "itsYours"
  | "almostThere"
  | "pushesLeftOne"
  | "pushesLeft"
  | "justStarted";

export type OwnershipCopy = {
  key: OwnershipKey;
  count?: number;
};

// Branches by percent + pushes so the copy scales with progress instead of
// showing the same "N pushes from yours" line at 0% and at 97%.
export function ownershipCopy(
  percent: number,
  pushes: number,
): OwnershipCopy {
  if (percent >= 100) return { key: "itsYours" };
  if (percent >= 90) return { key: "almostThere" };
  if (pushes === 1) return { key: "pushesLeftOne" };
  if (pushes >= 2) return { key: "pushesLeft", count: pushes };
  return { key: "justStarted" };
}
