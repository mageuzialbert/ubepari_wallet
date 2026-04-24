import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, Pressable, ScrollView } from "react-native";
import { useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import { normalizeTzPhone } from "@/lib/phone";
import { sendOtp, verifyOtp, passwordLogin } from "@/api/auth";
import { useAuthStore } from "@/auth/auth-store";
import { haptic } from "@/lib/haptics";
import { mapApiError } from "@/lib/errors";

type Mode = "otp" | "password";
type OtpStep = "phone" | "code";

export default function SignIn() {
  const router = useRouter();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("otp");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<OtpStep>("phone");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = useAuthStore((s) => s.signIn);

  async function handleSendOtp() {
    setError(null);
    const normalized = normalizeTzPhone(phone);
    if (!normalized.valid) {
      setError(t("validation.invalidPhone", "Enter a valid Tanzanian phone number."));
      return;
    }
    setLoading(true);
    try {
      await sendOtp(normalized.value);
      setNormalizedPhone(normalized.value);
      setStep("code");
      haptic.light();
    } catch (e) {
      setError(mapApiError(e));
      haptic.error();
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(finalCode: string) {
    if (!normalizedPhone) return;
    setError(null);
    setLoading(true);
    try {
      const { session } = await verifyOtp({
        phone: normalizedPhone,
        code: finalCode,
        flow: "login",
      });
      const user = await signIn(session);
      haptic.success();
      if (user?.kycStatus === "none") router.replace("/kyc");
      else router.replace("/(tabs)/store");
    } catch (e) {
      setError(mapApiError(e));
      setCode("");
      haptic.error();
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin() {
    setError(null);
    const normalized = normalizeTzPhone(phone);
    if (!normalized.valid) {
      setError(t("validation.invalidPhone", "Enter a valid Tanzanian phone number."));
      return;
    }
    if (password.length < 1) {
      setError(t("validation.passwordRequired", "Enter your password."));
      return;
    }
    setLoading(true);
    try {
      const { session } = await passwordLogin(normalized.value, password);
      const user = await signIn(session);
      haptic.success();
      if (user?.kycStatus === "none") router.replace("/kyc");
      else router.replace("/(tabs)/store");
    } catch (e) {
      setError(mapApiError(e));
      haptic.error();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 80 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            className="text-foreground"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 32, letterSpacing: -0.5 }}
          >
            {t("signin.heading", "Welcome back")}
          </Text>
          <Text className="mt-2 mb-6 text-base text-muted-foreground">
            {t("signin.subheading", "Sign in to check your goals and keep saving.")}
          </Text>

          <View className="mb-6 flex-row rounded-full border border-border bg-muted p-1">
            {(["otp", "password"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
                className={[
                  "flex-1 items-center justify-center rounded-full py-2",
                  mode === m ? "bg-background" : "",
                ].join(" ")}
              >
                <Text
                  className={[
                    "text-sm font-medium",
                    mode === m ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {m === "otp" ? t("signin.otp", "SMS code") : t("signin.password", "Password")}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === "otp" && step === "phone" ? (
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
                onPress={handleSendOtp}
              />
            </View>
          ) : null}

          {mode === "otp" && step === "code" ? (
            <View className="gap-4">
              <Text className="text-sm text-muted-foreground">
                {t("signin.codeSent", "We sent a 6-digit code to")} {normalizedPhone}
              </Text>
              <OtpInput value={code} onChange={setCode} onComplete={handleVerifyOtp} error={error ?? undefined} />
              <Button
                label={t("signin.resend", "Resend code")}
                variant="ghost"
                fullWidth
                onPress={() => {
                  setStep("phone");
                  setCode("");
                }}
              />
            </View>
          ) : null}

          {mode === "password" ? (
            <View className="gap-4">
              <Input
                label={t("signin.phoneLabel", "Phone number")}
                placeholder="07xx xxx xxx"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
              />
              <Input
                label={t("signin.passwordLabel", "Password")}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                error={error ?? undefined}
              />
              <Button
                label={t("signin.signInCta", "Sign in")}
                fullWidth
                size="lg"
                loading={loading}
                onPress={handlePasswordLogin}
              />
              <Link href="/(auth)/reset-request" className="text-center text-sm text-primary">
                {t("signin.forgot", "Forgot password?")}
              </Link>
            </View>
          ) : null}

          <View className="mt-8 flex-row justify-center gap-1">
            <Text className="text-sm text-muted-foreground">
              {t("signin.noAccount", "No account yet?")}
            </Text>
            <Link href="/(auth)/sign-up" className="text-sm font-medium text-primary">
              {t("header.getStarted", "Get started")}
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
