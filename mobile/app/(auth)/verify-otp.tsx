import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { verifyOtp, LEGAL_VERSION } from "@/api/auth";
import { useAuthStore } from "@/auth/auth-store";
import { haptic } from "@/lib/haptics";
import { mapApiError } from "@/lib/errors";
import { maskPhone } from "@/lib/phone";

export default function VerifyOtp() {
  const router = useRouter();
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);
  const params = useLocalSearchParams<{
    phone?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    flow?: string;
  }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleVerify(finalCode: string) {
    if (!params.phone) return;
    setError(null);
    setLoading(true);
    try {
      const { session, newUser } = await verifyOtp({
        phone: params.phone,
        code: finalCode,
        flow: (params.flow as "signup" | "login") ?? "login",
        firstName: params.firstName || undefined,
        lastName: params.lastName || undefined,
        email: params.email || undefined,
        acceptedTermsVersion: LEGAL_VERSION,
      });
      await signIn(session);
      haptic.success();
      if (newUser) {
        setDone(true);
      } else {
        router.replace("/(tabs)/store");
      }
    } catch (e) {
      setError(mapApiError(e));
      setCode("");
      haptic.error();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 p-6">
          <View className="flex-1 justify-center gap-3">
            <Text
              className="text-foreground"
              style={{ fontFamily: "Geist-SemiBold", fontSize: 32, letterSpacing: -0.5 }}
            >
              {t("signup.doneHeading", "You're in.")}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              {t(
                "signup.passwordSentBody",
                "We've texted your password. Save it somewhere safe — you can reset it anytime.",
              )}
            </Text>
          </View>
          <Button
            label={t("signup.finishKyc", "Continue to KYC")}
            fullWidth
            size="lg"
            onPress={() => router.replace("/kyc")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 80 }} keyboardShouldPersistTaps="handled">
          <Text
            className="text-foreground"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 32, letterSpacing: -0.5 }}
          >
            {t("verifyOtp.heading", "Enter your code")}
          </Text>
          <Text className="mt-2 mb-8 text-base text-muted-foreground">
            {t("verifyOtp.sent", "We sent a 6-digit code to")} {params.phone ? maskPhone(params.phone) : ""}
          </Text>

          <OtpInput value={code} onChange={setCode} onComplete={handleVerify} error={error ?? undefined} />

          <View className="mt-8">
            <Button
              label={t("verifyOtp.cta", "Verify")}
              fullWidth
              size="lg"
              loading={loading}
              disabled={code.length !== 6}
              onPress={() => handleVerify(code)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
