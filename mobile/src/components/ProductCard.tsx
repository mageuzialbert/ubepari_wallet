import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import type { Product } from "@/types/api";
import { formatTzs } from "@/lib/currency";
import { currentLocale } from "@/i18n";
import { haptic } from "@/lib/haptics";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const locale = currentLocale();
  const monthly = Math.ceil(product.priceTzs / 6 / 1000) * 1000;

  return (
    <Pressable
      onPress={() => {
        haptic.light();
        router.push({ pathname: "/(tabs)/store/[slug]", params: { slug: product.slug } });
      }}
      className="rounded-3xl border border-border bg-card active:opacity-95"
    >
      <View
        className="overflow-hidden rounded-t-3xl"
        style={{
          aspectRatio: 4 / 3,
          backgroundColor: product.colorAccent ?? "#1A2FB8",
        }}
      >
        {product.images[0] ? (
          <Image
            source={{ uri: product.images[0] }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
      </View>
      <View className="p-4">
        <Text className="text-xs uppercase tracking-wider text-muted-foreground">
          {product.brand}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-1 text-base font-semibold text-foreground"
          style={{ fontFamily: "Geist-SemiBold" }}
        >
          {product.name}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
          {product.tagline}
        </Text>
        <View className="mt-2 flex-row items-end justify-between">
          <Text className="text-sm font-medium text-foreground">
            {formatTzs(product.priceTzs, locale)}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {t("featured.monthlyPrefix", "from")} {formatTzs(monthly, locale)}
            {t("productCard.perMonthSuffix", "/mo")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
