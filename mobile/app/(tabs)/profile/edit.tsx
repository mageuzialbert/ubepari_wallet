import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/auth/auth-store";
import { updateProfile } from "@/api/account";
import { mapApiError } from "@/lib/errors";
import { haptic } from "@/lib/haptics";

export default function EditProfile() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      await updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim() || undefined,
      });
      await refreshMe();
      haptic.success();
      router.back();
    } catch (e) {
      setError(mapApiError(e));
      haptic.error();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <Text
            className="mb-6 text-foreground"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 28 }}
          >
            {t("account.edit", "Edit profile")}
          </Text>
          <View className="gap-4">
            <Input
              label={t("signup.firstName", "First name")}
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
            />
            <Input
              label={t("signup.lastName", "Last name")}
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
            />
            <Input
              label={t("signup.emailOptional", "Email")}
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              error={error ?? undefined}
            />
            <Button
              label={t("common.save", "Save")}
              fullWidth
              size="lg"
              loading={loading}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
