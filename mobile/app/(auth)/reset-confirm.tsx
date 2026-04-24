import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { confirmPasswordReset } from "@/api/auth";
import { useAuthStore } from "@/auth/auth-store";
import { mapApiError } from "@/lib/errors";
import { haptic } from "@/lib/haptics";
import { maskPhone } from "@/lib/phone";

export default function ResetConfirm() {
  const router = useRouter();
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!phone) return;
    setError(null);
    if (code.length !== 6) {
      setError(t("validation.wrongCode", "Enter the 6-digit code we sent you."));
      return;
    }
    if (password.length < 8) {
      setError(t("validation.weakPassword", "Password must be at least 8 characters."));
      return;
    }
    setLoading(true);
    try {
      const { session } = await confirmPasswordReset(phone, code, password);
      await signIn(session);
      haptic.success();
      router.replace("/(tabs)/store");
    } catch (e) {
      setError(mapApiError(e));
      haptic.error();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 80 }} keyboardShouldPersistTaps="handled">
          <Text
            className="text-foreground"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 32, letterSpacing: -0.5 }}
          >
            {t("reset.confirmHeading", "New password")}
          </Text>
          <Text className="mt-2 mb-8 text-base text-muted-foreground">
            {t("reset.confirmSub", "We sent a code to")} {phone ? maskPhone(phone) : ""}
          </Text>
          <View className="gap-5">
            <OtpInput value={code} onChange={setCode} error={undefined} autoFocus={false} />
            <Input
              label={t("reset.newPasswordLabel", "New password")}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              hint={t("reset.passwordHint", "At least 8 characters.")}
              error={error ?? undefined}
            />
            <Button
              label={t("reset.cta", "Update password")}
              fullWidth
              size="lg"
              loading={loading}
              onPress={handleConfirm}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
