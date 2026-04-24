import { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { File, Paths } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import * as Sharing from "expo-sharing";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GoalProgressRing } from "@/components/GoalProgressRing";
import { ContributeSheet } from "@/components/ContributeSheet";
import { getGoalDetail, cancelGoal, receiptUrl } from "@/api/goals";
import { apiBaseUrl } from "@/api/client";
import { tokenStorage } from "@/auth/token-storage";
import { formatTzs } from "@/lib/currency";
import { currentLocale } from "@/i18n";
import { mapApiError } from "@/lib/errors";
import { haptic } from "@/lib/haptics";

export default function GoalDetail() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locale = currentLocale();
  const qc = useQueryClient();

  const [showContribute, setShowContribute] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const query = useQuery({
    queryKey: ["goal", id],
    queryFn: () => getGoalDetail(id!),
    enabled: !!id,
  });

  async function handleCancel() {
    if (!id) return;
    Alert.alert(
      t("goalDetail.cancelTitle", "Cancel this goal?"),
      t(
        "goalDetail.cancelBody",
        "Your contributions stay on file and our team will process a refund.",
      ),
      [
        { text: t("common.keep", "Keep goal"), style: "cancel" },
        {
          text: t("goalDetail.cancelConfirm", "Cancel goal"),
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelGoal(id);
              haptic.success();
              qc.invalidateQueries({ queryKey: ["goal", id] });
              qc.invalidateQueries({ queryKey: ["goals"] });
            } catch (e) {
              Alert.alert(t("common.error", "Error"), mapApiError(e));
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }

  async function handleDownloadReceipt() {
    if (!id) return;
    setDownloading(true);
    try {
      const session = await tokenStorage.read();
      if (!session) throw new Error("no_session");
      const response = await expoFetch(`${apiBaseUrl()}${receiptUrl(id)}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!response.ok) throw new Error(`receipt_${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const file = new File(Paths.cache, `receipt-${id}.pdf`);
      if (file.exists) file.delete();
      file.create();
      file.write(bytes);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: t("goalDetail.receipt", "Receipt"),
        });
      }
    } catch (e) {
      Alert.alert(t("common.error", "Error"), mapApiError(e));
    } finally {
      setDownloading(false);
    }
  }

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const detail = query.data;
  if (!detail) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">{t("goalDetail.notFound", "Goal not found")}</Text>
      </SafeAreaView>
    );
  }

  const { goal, productName, contributions } = detail;
  const progress = goal.productPrice > 0 ? goal.contributedTzs / goal.productPrice : 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerTitle: "", headerBackTitle: t("common.back", "Back") }} />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <View className="items-center py-6">
            <GoalProgressRing progress={progress} size={200}>
              <Text
                className="text-foreground"
                style={{ fontFamily: "Geist-SemiBold", fontSize: 28 }}
              >
                {Math.round(progress * 100)}%
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                {formatTzs(goal.contributedTzs, locale)}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t("goalDetail.of", "of")} {formatTzs(goal.productPrice, locale)}
              </Text>
            </GoalProgressRing>
          </View>

          <Text
            className="text-center text-foreground"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 24, letterSpacing: -0.5 }}
          >
            {productName ?? goal.productSlug}
          </Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            {goal.reference}
          </Text>

          <Card className="mt-6 gap-2 p-5">
            <Row label={t("goalDetail.monthly", "Monthly target")} value={formatTzs(goal.monthlyTarget, locale)} />
            <Row label={t("goalDetail.term", "Term")} value={`${goal.targetMonths} ${t("goal.monthsSuffix", "months")}`} />
            <Row
              label={t("goalDetail.status", "Status")}
              value={goal.status}
            />
            {goal.nextReminderDate ? (
              <Row
                label={t("goalDetail.nextReminder", "Next reminder")}
                value={new Date(goal.nextReminderDate).toLocaleDateString(locale)}
              />
            ) : null}
            {goal.receiptNumber ? (
              <Row label={t("goalDetail.receiptNo", "Receipt #")} value={goal.receiptNumber} />
            ) : null}
          </Card>

          <View className="mt-6 gap-3">
            {goal.status === "active" ? (
              <>
                <Button
                  label={t("goalDetail.contribute", "Contribute")}
                  fullWidth
                  size="lg"
                  onPress={() => setShowContribute(true)}
                />
                <Button
                  label={t("goalDetail.cancel", "Cancel goal")}
                  variant="outline"
                  fullWidth
                  loading={cancelling}
                  onPress={handleCancel}
                />
              </>
            ) : null}
            {goal.status === "completed" ? (
              <Button
                label={t("goalDetail.downloadReceipt", "Download receipt")}
                fullWidth
                size="lg"
                loading={downloading}
                onPress={handleDownloadReceipt}
              />
            ) : null}
          </View>

          {contributions && contributions.length > 0 ? (
            <View className="mt-8">
              <Text className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
                {t("goalDetail.history", "Contributions")}
              </Text>
              <Card className="p-0">
                {contributions.map((c, i) => (
                  <View
                    key={c.id}
                    className={[
                      "px-5 py-4",
                      i < contributions.length - 1 ? "border-b border-border" : "",
                    ].join(" ")}
                  >
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-medium text-foreground">
                        {formatTzs(c.amountTzs, locale)}
                      </Text>
                      <Text
                        className="text-xs"
                        style={{
                          color:
                            c.status === "success"
                              ? "#22C55E"
                              : c.status === "failed"
                                ? "#E74C3C"
                                : "#8E8E93",
                        }}
                      >
                        {c.status}
                      </Text>
                    </View>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {c.provider} · {new Date(c.createdAt).toLocaleString(locale)}
                    </Text>
                  </View>
                ))}
              </Card>
            </View>
          ) : null}
        </ScrollView>

        <ContributeSheet
          visible={showContribute}
          onClose={() => setShowContribute(false)}
          goalId={goal.id}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["goal", goal.id] });
            qc.invalidateQueries({ queryKey: ["goals"] });
          }}
        />
      </SafeAreaView>
    </>
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
