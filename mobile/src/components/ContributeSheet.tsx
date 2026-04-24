import { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { topupGoal, getPayment } from "@/api/goals";
import type { MnoProvider } from "@/types/api";
import { formatTzs } from "@/lib/currency";
import { currentLocale } from "@/i18n";
import { normalizeTzPhone } from "@/lib/phone";
import { mapApiError } from "@/lib/errors";
import { haptic } from "@/lib/haptics";
import { useAuthStore } from "@/auth/auth-store";

type Props = {
  visible: boolean;
  onClose: () => void;
  goalId: string;
  onSuccess?: () => void;
};

type Step = "form" | "pending" | "done" | "failed";

const PROVIDERS: { key: MnoProvider; label: string }[] = [
  { key: "mpesa", label: "M-Pesa" },
  { key: "tigopesa", label: "Tigo Pesa" },
  { key: "airtelmoney", label: "Airtel Money" },
];

const QUICK: number[] = [50_000, 100_000, 250_000, 500_000];

export function ContributeSheet({ visible, onClose, goalId, onSuccess }: Props) {
  const { t } = useTranslation();
  const locale = currentLocale();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState<string>("");
  const [provider, setProvider] = useState<MnoProvider>("mpesa");
  const [phone, setPhone] = useState<string>(user?.phone ?? "");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep("form");
      setAmount("");
      setPhone(user?.phone ?? "");
      setPaymentId(null);
      setError(null);
    }
  }, [visible, user?.phone]);

  const mutation = useMutation({
    mutationFn: topupGoal,
    onSuccess: (res) => {
      setPaymentId(res.paymentId);
      setStep("pending");
      haptic.light();
    },
    onError: (e) => {
      setError(mapApiError(e));
      setStep("failed");
      haptic.error();
    },
  });

  const paymentQuery = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => getPayment(paymentId!),
    enabled: !!paymentId && step === "pending",
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!paymentQuery.data) return;
    if (paymentQuery.data.status === "success") {
      setStep("done");
      haptic.success();
      onSuccess?.();
    } else if (paymentQuery.data.status === "failed") {
      setStep("failed");
      setError(t("contribute.failed", "Payment failed. Try again."));
      haptic.error();
    }
  }, [paymentQuery.data, onSuccess, t]);

  function handleSubmit() {
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 1000 || amt > 5_000_000) {
      setError(t("contribute.amountError", "Enter an amount between TZS 1,000 and TZS 5,000,000."));
      return;
    }
    const normalized = normalizeTzPhone(phone);
    if (!normalized.valid) {
      setError(t("validation.invalidPhone", "Enter a valid Tanzanian phone number."));
      return;
    }
    mutation.mutate({
      goalId,
      amountTzs: Math.floor(amt),
      provider,
      phone: normalized.value,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
        <View className="rounded-t-3xl bg-background p-6" style={{ maxHeight: "90%" }}>
          <View className="mb-4 h-1 w-12 self-center rounded-full bg-border" />
          {step === "form" ? (
            <>
              <Text
                className="mb-4 text-foreground"
                style={{ fontFamily: "Geist-SemiBold", fontSize: 22 }}
              >
                {t("contribute.heading", "Contribute")}
              </Text>
              <View className="gap-4">
                <Input
                  label={t("contribute.amountLabel", "Amount (TZS)")}
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
                <View className="flex-row flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => {
                        haptic.light();
                        setAmount(String(q));
                      }}
                      className="rounded-full bg-muted px-3 py-1.5"
                    >
                      <Text className="text-xs font-medium text-foreground">
                        {formatTzs(q, locale)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View>
                  <Text className="mb-2 text-sm font-medium text-foreground">
                    {t("contribute.provider", "Mobile money")}
                  </Text>
                  <View className="flex-row gap-2">
                    {PROVIDERS.map((p) => (
                      <Pressable
                        key={p.key}
                        onPress={() => {
                          haptic.light();
                          setProvider(p.key);
                        }}
                        className={[
                          "flex-1 items-center rounded-2xl border py-3",
                          provider === p.key ? "border-primary bg-primary" : "border-border bg-muted",
                        ].join(" ")}
                      >
                        <Text
                          className={[
                            "text-xs font-semibold",
                            provider === p.key ? "text-primary-foreground" : "text-foreground",
                          ].join(" ")}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Input
                  label={t("contribute.phoneLabel", "Phone")}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  error={error ?? undefined}
                />

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Button
                      label={t("common.cancel", "Cancel")}
                      variant="outline"
                      fullWidth
                      onPress={onClose}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label={t("contribute.submit", "Send push")}
                      fullWidth
                      loading={mutation.isPending}
                      onPress={handleSubmit}
                    />
                  </View>
                </View>
              </View>
            </>
          ) : step === "pending" ? (
            <View className="items-center gap-3 py-6">
              <ActivityIndicator size="large" color="#1A2FB8" />
              <Text
                className="text-center text-foreground"
                style={{ fontFamily: "Geist-SemiBold", fontSize: 20 }}
              >
                {t("contribute.pendingHeading", "Check your phone")}
              </Text>
              <Text className="text-center text-sm text-muted-foreground">
                {t(
                  "contribute.pendingBody",
                  "Enter your PIN on the mobile money prompt to complete the payment.",
                )}
              </Text>
            </View>
          ) : step === "done" ? (
            <View className="items-center gap-3 py-6">
              <CheckCircle2 size={64} color="#22C55E" />
              <Text
                className="text-center text-foreground"
                style={{ fontFamily: "Geist-SemiBold", fontSize: 20 }}
              >
                {t("contribute.doneHeading", "Payment received")}
              </Text>
              {paymentQuery.data ? (
                <Text className="text-sm text-muted-foreground">
                  {formatTzs(paymentQuery.data.amountTzs, locale)}
                </Text>
              ) : null}
              <View className="mt-4 w-full">
                <Button label={t("common.close", "Close")} fullWidth onPress={onClose} />
              </View>
            </View>
          ) : (
            <View className="items-center gap-3 py-6">
              <XCircle size={64} color="#E74C3C" />
              <Text
                className="text-center text-foreground"
                style={{ fontFamily: "Geist-SemiBold", fontSize: 20 }}
              >
                {t("contribute.failedHeading", "Payment failed")}
              </Text>
              <Text className="text-center text-sm text-muted-foreground">
                {error ?? t("contribute.failed", "Try again.")}
              </Text>
              <View className="mt-4 w-full gap-2">
                <Button label={t("common.tryAgain", "Try again")} fullWidth onPress={() => setStep("form")} />
                <Button label={t("common.close", "Close")} variant="ghost" fullWidth onPress={onClose} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
