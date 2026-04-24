import { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getProduct } from "@/api/products";
import { createGoal } from "@/api/goals";
import { SaveTowardPanel } from "@/components/SaveTowardPanel";
import { Button } from "@/components/ui/Button";
import { currentLocale } from "@/i18n";
import { formatTzs } from "@/lib/currency";
import { mapApiError } from "@/lib/errors";
import { haptic } from "@/lib/haptics";
import { useAuthStore } from "@/auth/auth-store";
import type { GoalTerm } from "@/types/api";

export default function ProductDetail() {
  const router = useRouter();
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const locale = currentLocale();
  const user = useAuthStore((s) => s.user);

  const [term, setTerm] = useState<GoalTerm>(6);
  const [creating, setCreating] = useState(false);

  const query = useQuery({
    queryKey: ["product", slug, locale],
    queryFn: () => getProduct(slug!, locale),
    enabled: !!slug,
  });

  async function handleStart() {
    if (!slug) return;
    if (!user) {
      router.push("/(auth)/sign-in");
      return;
    }
    if (user.kycStatus !== "approved") {
      Alert.alert(
        t("startGoal.kycRequiredTitle", "Verify your ID"),
        t(
          "startGoal.kycRequiredBody",
          "Complete KYC verification before starting a savings goal.",
        ),
        [
          { text: t("common.cancel", "Cancel"), style: "cancel" },
          { text: t("common.continue", "Continue"), onPress: () => router.push("/kyc") },
        ],
      );
      return;
    }
    setCreating(true);
    try {
      const { goalId } = await createGoal({ productSlug: slug, termMonths: term });
      haptic.success();
      router.push({ pathname: "/(tabs)/goals/[id]", params: { id: goalId } });
    } catch (e) {
      haptic.error();
      Alert.alert(t("common.error", "Error"), mapApiError(e));
    } finally {
      setCreating(false);
    }
  }

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  const product = query.data;
  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">{t("product.notFound", "Product not found")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerTitle: "", headerBackTitle: t("common.back", "Back") }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View
            className="mx-5 mt-2 overflow-hidden rounded-3xl"
            style={{ aspectRatio: 4 / 3, backgroundColor: product.colorAccent ?? "#1A2FB8" }}
          >
            {product.images[0] ? (
              <Image
                source={{ uri: product.images[0] }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : null}
          </View>

          <View className="px-5 pt-6">
            <Text className="text-xs uppercase tracking-wider text-muted-foreground">
              {product.brand}
            </Text>
            <Text
              className="mt-1 text-foreground"
              style={{ fontFamily: "Geist-SemiBold", fontSize: 28, letterSpacing: -0.5 }}
            >
              {product.name}
            </Text>
            <Text className="mt-2 text-base leading-6 text-muted-foreground">
              {product.tagline}
            </Text>
            <Text className="mt-4 text-xl font-semibold text-foreground">
              {formatTzs(product.priceTzs, locale)}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {product.usageTags.map((tag) => (
                <View key={tag} className="rounded-full bg-muted px-3 py-1">
                  <Text className="text-xs text-muted-foreground">{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="mt-6 px-5">
            <SaveTowardPanel priceTzs={product.priceTzs} term={term} onTermChange={setTerm} />
          </View>

          <View className="mt-6 px-5">
            <Text className="mb-3 text-sm font-medium text-foreground">
              {t("product.specs", "Specs")}
            </Text>
            <View className="rounded-2xl border border-border bg-card p-4">
              <Spec k={t("specs.cpu", "CPU")} v={`${product.specs.cpu} · ${product.specs.cpuGeneration}`} />
              <Spec k={t("specs.ram", "RAM")} v={product.specs.ram} />
              <Spec k={t("specs.storage", "Storage")} v={product.specs.storage} />
              <Spec k={t("specs.gpu", "GPU")} v={product.specs.gpu} />
              <Spec k={t("specs.display", "Display")} v={product.specs.display} />
              <Spec k={t("specs.os", "OS")} v={product.specs.os} />
              <Spec k={t("specs.weight", "Weight")} v={product.specs.weight} last />
            </View>
            {product.description ? (
              <Text className="mt-4 text-sm leading-6 text-muted-foreground">
                {product.description}
              </Text>
            ) : null}
          </View>
        </ScrollView>

        <View className="absolute bottom-0 w-full bg-background p-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" }}>
          <Button
            label={t("goal.startGoalButton", "Save toward this")}
            fullWidth
            size="lg"
            loading={creating}
            onPress={handleStart}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

function Spec({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View
      className={[
        "flex-row justify-between py-2",
        last ? "" : "border-b border-border",
      ].join(" ")}
    >
      <Text className="text-xs text-muted-foreground">{k}</Text>
      <Text numberOfLines={1} className="max-w-[60%] text-right text-xs font-medium text-foreground">
        {v}
      </Text>
    </View>
  );
}
