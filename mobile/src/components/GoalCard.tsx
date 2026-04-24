import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Circle } from "lucide-react-native";

import type { Goal } from "@/types/api";
import { formatTzs } from "@/lib/currency";
import { currentLocale } from "@/i18n";
import { haptic } from "@/lib/haptics";

type Props = { goal: Goal };

export function GoalCard({ goal }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const locale = currentLocale();
  const pct = goal.productPrice > 0 ? Math.min(1, goal.contributedTzs / goal.productPrice) : 0;

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        router.push({ pathname: "/(tabs)/goals/[id]", params: { id: goal.id } });
      }}
      className="rounded-3xl border border-border bg-card p-5 active:opacity-95"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          {goal.reference}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Circle
            size={8}
            color={
              goal.status === "active"
                ? "#22C55E"
                : goal.status === "completed"
                  ? "#1A2FB8"
                  : "#8E8E93"
            }
            fill={
              goal.status === "active"
                ? "#22C55E"
                : goal.status === "completed"
                  ? "#1A2FB8"
                  : "#8E8E93"
            }
          />
          <Text className="text-xs text-muted-foreground">{goal.status}</Text>
        </View>
      </View>
      <Text
        className="mt-2 text-foreground"
        style={{ fontFamily: "Geist-SemiBold", fontSize: 18 }}
      >
        {goal.productName ?? goal.productSlug}
      </Text>

      <View className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <View
          className="h-full bg-primary"
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </View>

      <View className="mt-3 flex-row justify-between">
        <Text className="text-xs text-muted-foreground">
          {formatTzs(goal.contributedTzs, locale)} / {formatTzs(goal.productPrice, locale)}
        </Text>
        {goal.status === "active" ? (
          <Text className="text-xs text-muted-foreground">
            {formatTzs(goal.monthlyTarget, locale)}{t("productCard.perMonthSuffix", "/mo")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
