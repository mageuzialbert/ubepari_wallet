import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import type { AssistantCard as Card } from "@/types/api";
import { formatTzs } from "@/lib/currency";
import { currentLocale } from "@/i18n";
import { haptic } from "@/lib/haptics";

export function AssistantCard({ card }: { card: Card }) {
  const router = useRouter();
  const { t } = useTranslation();
  const locale = currentLocale();

  if (card.kind === "product") {
    return (
      <Pressable
        onPress={() => {
          haptic.light();
          router.push({ pathname: "/(tabs)/store/[slug]", params: { slug: card.slug } });
        }}
        className="mt-2 flex-row overflow-hidden rounded-2xl border border-border bg-card active:opacity-95"
      >
        <View className="h-24 w-24 bg-muted">
          {card.image ? (
            <Image
              source={{ uri: card.image }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : null}
        </View>
        <View className="flex-1 justify-center p-3">
          <Text className="text-xs uppercase tracking-wider text-muted-foreground">
            {card.brand}
          </Text>
          <Text
            numberOfLines={1}
            className="text-base text-foreground"
            style={{ fontFamily: "Geist-SemiBold" }}
          >
            {card.name}
          </Text>
          <Text numberOfLines={1} className="text-xs text-muted-foreground">
            {card.tagline}
          </Text>
          <Text className="mt-1 text-sm font-medium text-foreground">
            {formatTzs(card.priceTzs, locale)}
          </Text>
        </View>
      </Pressable>
    );
  }

  if (card.kind === "goal") {
    const pct =
      card.priceTzs > 0 ? Math.min(1, card.contributedTzs / card.priceTzs) : 0;
    return (
      <Pressable
        onPress={() => {
          haptic.light();
          router.push({ pathname: "/(tabs)/goals/[id]", params: { id: card.id } });
        }}
        className="mt-2 rounded-2xl border border-border bg-card p-4 active:opacity-95"
      >
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          {card.reference}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-1 text-base text-foreground"
          style={{ fontFamily: "Geist-SemiBold" }}
        >
          {card.productName}
        </Text>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <View className="h-full bg-primary" style={{ width: `${Math.round(pct * 100)}%` }} />
        </View>
        <Text className="mt-2 text-xs text-muted-foreground">
          {formatTzs(card.contributedTzs, locale)} / {formatTzs(card.priceTzs, locale)}
        </Text>
      </Pressable>
    );
  }

  if (card.kind === "goalPlan") {
    return (
      <View className="mt-2 rounded-2xl border border-border bg-card p-4">
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("goal.planLabel", "Savings plan")}
        </Text>
        <Text
          className="mt-2 text-foreground"
          style={{ fontFamily: "Geist-SemiBold", fontSize: 24 }}
        >
          {formatTzs(card.monthlyTarget, locale)}
          <Text className="text-sm font-normal text-muted-foreground">
            {t("goal.perMonthSuffix", "/mo")}
          </Text>
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground">
          {formatTzs(card.priceTzs, locale)} · {card.term} {t("goal.monthsSuffix", "months")}
        </Text>
      </View>
    );
  }

  if (card.kind === "contribution") {
    return (
      <View className="mt-2 rounded-2xl border border-border bg-card p-4">
        <Text className="text-sm font-medium text-foreground">
          {formatTzs(card.amountTzs, locale)}
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground">
          {card.status} · {new Date(card.createdAt).toLocaleString(locale)}
        </Text>
      </View>
    );
  }

  return null;
}
