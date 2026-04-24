import { useMemo } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { GoalCard } from "@/components/GoalCard";
import { Button } from "@/components/ui/Button";
import { listGoals } from "@/api/goals";

export default function Goals() {
  const { t } = useTranslation();
  const router = useRouter();

  const query = useQuery({
    queryKey: ["goals"],
    queryFn: listGoals,
  });

  const { active, completed, cancelled } = useMemo(() => {
    const goals = query.data ?? [];
    return {
      active: goals.filter((g) => g.status === "active"),
      completed: goals.filter((g) => g.status === "completed"),
      cancelled: goals.filter((g) => g.status === "cancelled"),
    };
  }, [query.data]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
      >
        <Text
          className="mb-2 text-foreground"
          style={{ fontFamily: "Geist-SemiBold", fontSize: 32, letterSpacing: -0.5 }}
        >
          {t("nav.goals", "Your goals")}
        </Text>
        <Text className="mb-6 text-sm text-muted-foreground">
          {t("goals.sub", "Track progress on the PCs you're saving for.")}
        </Text>

        {query.isLoading ? (
          <View className="py-16 items-center">
            <ActivityIndicator />
          </View>
        ) : query.data && query.data.length === 0 ? (
          <View className="items-center rounded-3xl border border-border bg-card p-8">
            <Text
              className="text-foreground"
              style={{ fontFamily: "Geist-SemiBold", fontSize: 18 }}
            >
              {t("goals.emptyHeading", "No goals yet")}
            </Text>
            <Text className="mt-1 mb-5 text-center text-sm text-muted-foreground">
              {t("goals.emptyBody", "Pick a PC you love, choose a term, and start saving.")}
            </Text>
            <Button
              label={t("goals.emptyCta", "Browse the store")}
              onPress={() => router.push("/(tabs)/store")}
              size="lg"
              fullWidth
            />
          </View>
        ) : (
          <View className="gap-6">
            {active.length > 0 ? (
              <Section title={t("goals.active", "Active")}>
                <View className="gap-3">
                  {active.map((g) => <GoalCard key={g.id} goal={g} />)}
                </View>
              </Section>
            ) : null}
            {completed.length > 0 ? (
              <Section title={t("goals.completed", "Completed")}>
                <View className="gap-3">
                  {completed.map((g) => <GoalCard key={g.id} goal={g} />)}
                </View>
              </Section>
            ) : null}
            {cancelled.length > 0 ? (
              <Section title={t("goals.cancelled", "Cancelled")}>
                <View className="gap-3 opacity-60">
                  {cancelled.map((g) => <GoalCard key={g.id} goal={g} />)}
                </View>
              </Section>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-3 px-1 text-xs uppercase tracking-wider text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}
