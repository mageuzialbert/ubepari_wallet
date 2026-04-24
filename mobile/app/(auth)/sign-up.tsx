import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { normalizeTzPhone } from "@/lib/phone";
import { sendOtp } from "@/api/auth";
import { haptic } from "@/lib/haptics";
import { mapApiError } from "@/lib/errors";
import { apiBaseUrl } from "@/api/client";

export default function SignUp() {
  const router = useRouter();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("validation.missingName", "Enter your first and last name."));
      return;
    }
    const normalized = normalizeTzPhone(phone);
    if (!normalized.valid) {
      setError(t("validation.invalidPhone", "Enter a valid Tanzanian phone number."));
      return;
    }
    if (!agreed) {
      setError(t("validation.consent", "Please accept the terms to continue."));
      return;
    }
    setLoading(true);
    try {
      await sendOtp(normalized.value);
      haptic.light();
      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          phone: normalized.value,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          flow: "signup",
        },
      });
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
            {t("signup.heading", "Create your account")}
          </Text>
          <Text className="mt-2 mb-6 text-base text-muted-foreground">
            {t("signup.subheading", "We'll text you a code to confirm your phone.")}
          </Text>

          <View className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label={t("signup.firstName", "First name")}
                  autoComplete="given-name"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View className="flex-1">
                <Input
                  label={t("signup.lastName", "Last name")}
                  autoComplete="family-name"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
            <Input
              label={t("signup.phone", "Phone number")}
              placeholder="07xx xxx xxx"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
            />
            <Input
              label={t("signup.emailOptional", "Email (optional)")}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Pressable
              onPress={() => {
                setAgreed((v) => !v);
                haptic.light();
              }}
              className="mt-2 flex-row items-start gap-3"
            >
              <View
                className={[
                  "mt-0.5 h-6 w-6 items-center justify-center rounded-md border",
                  agreed ? "border-primary bg-primary" : "border-border",
                ].join(" ")}
              >
                {agreed ? <Check size={16} color="white" /> : null}
              </View>
              <Text className="flex-1 text-sm leading-5 text-muted-foreground">
                {t("signup.consentPrefix", "I agree to the ")}
                <Text
                  className="text-primary"
                  onPress={() => Linking.openURL(`${apiBaseUrl()}/legal/terms`)}
                >
                  {t("signup.termsLink", "Terms")}
                </Text>
                {t("signup.consentAnd", ", ")}
                <Text
                  className="text-primary"
                  onPress={() => Linking.openURL(`${apiBaseUrl()}/legal/privacy`)}
                >
                  {t("signup.privacyLink", "Privacy Policy")}
                </Text>
                {t("signup.consentAndFinal", " and ")}
                <Text
                  className="text-primary"
                  onPress={() => Linking.openURL(`${apiBaseUrl()}/legal/hire-purchase-agreement`)}
                >
                  {t("signup.hireLink", "Hire-Purchase Agreement")}
                </Text>
                .
              </Text>
            </Pressable>

            {error ? <Text className="text-xs text-destructive">{error}</Text> : null}

            <Button
              label={t("signup.cta", "Create account")}
              fullWidth
              size="lg"
              loading={loading}
              onPress={handleSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
