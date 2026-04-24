import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { normalizeTzPhone } from "@/lib/phone";
import { requestPasswordReset } from "@/api/auth";
import { mapApiError } from "@/lib/errors";
import { haptic } from "@/lib/haptics";

export default function ResetRequest() {
  const router = useRouter();
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    const normalized = normalizeTzPhone(phone);
    if (!normalized.valid) {
      setError(t("validation.invalidPhone", "Enter a valid Tanzanian phone number."));
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(normalized.value);
      haptic.light();
      router.push({ pathname: "/(auth)/reset-confirm", params: { phone: normalized.value } });
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
            {t("reset.heading", "Reset your password")}
          </Text>
          <Text className="mt-2 mb-8 text-base text-muted-foreground">
            {t("reset.sub", "Enter your phone — we'll send a 6-digit code.")}
          </Text>
          <View className="gap-4">
            <Input
              label={t("signin.phoneLabel", "Phone number")}
              placeholder="07xx xxx xxx"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
              error={error ?? undefined}
            />
            <Button
              label={t("signin.sendCode", "Send code")}
              fullWidth
              size="lg"
              loading={loading}
              onPress={handleSend}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
