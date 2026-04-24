import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";
import { formatTzs } from "@/lib/currency";
import { currentLocale } from "@/i18n";
import type { GoalTerm } from "@/types/api";

const TERMS: GoalTerm[] = [3, 6, 9, 12];

export function computeMonthlyTarget(price: number, term: GoalTerm): number {
  return Math.ceil(price / term / 1000) * 1000;
}

type Props = {
  priceTzs: number;
  term: GoalTerm;
  onTermChange: (t: GoalTerm) => void;
};

export function SaveTowardPanel({ priceTzs, term, onTermChange }: Props) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const monthly = computeMonthlyTarget(priceTzs, term);

  return (
    <View className="rounded-3xl border border-border bg-card p-5">
      <Text className="text-xs uppercase tracking-wider text-muted-foreground">
        {t("goal.planLabel", "Your savings plan")}
      </Text>
      <View className="mt-3 flex-row items-baseline gap-2">
        <Text
          className="text-foreground"
          style={{ fontFamily: "Geist-SemiBold", fontSize: 32, letterSpacing: -0.5 }}
        >
          {formatTzs(monthly, locale)}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {t("goal.perMonthSuffix", "/month")}
        </Text>
      </View>
      <Text className="mt-1 text-xs text-muted-foreground">
        {t("goal.disclaimer", "≈ rounded to the nearest TZS 1,000. No interest, no hidden fees.")}
      </Text>

      <View className="mt-5 flex-row gap-2">
        {TERMS.map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              haptic.light();
              onTermChange(m);
            }}
            className={[
              "flex-1 items-center rounded-2xl border py-3",
              term === m ? "border-primary bg-primary" : "border-border bg-muted",
            ].join(" ")}
          >
            <Text
              className={[
                "text-base font-semibold",
                term === m ? "text-primary-foreground" : "text-foreground",
              ].join(" ")}
            >
              {m}
            </Text>
            <Text
              className={[
                "text-xs",
                term === m ? "text-primary-foreground opacity-80" : "text-muted-foreground",
              ].join(" ")}
            >
              {t("goal.monthsSuffix", "months")}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mt-5 gap-2 rounded-2xl bg-muted p-4">
        <Row label={t("goal.rows.target", "Target price")} value={formatTzs(priceTzs, locale)} />
        <Row label={t("goal.rows.monthly", "Monthly")} value={formatTzs(monthly, locale)} />
        <Row label={t("goal.rows.term", "Term")} value={`${term} ${t("goal.monthsSuffix", "months")}`} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="text-xs font-medium text-foreground">{value}</Text>
    </View>
  );
}
