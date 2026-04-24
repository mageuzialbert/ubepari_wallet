import { useState } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Camera, FileUp, CheckCircle2 } from "lucide-react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { submitKyc } from "@/api/kyc";
import { useAuthStore } from "@/auth/auth-store";
import { mapApiError } from "@/lib/errors";
import { haptic } from "@/lib/haptics";

type DocAsset = { uri: string; name: string; mimeType: string };

export default function Kyc() {
  const router = useRouter();
  const { t } = useTranslation();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const user = useAuthStore((s) => s.user);
  const [nida, setNida] = useState("");
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [workplace, setWorkplace] = useState("");
  const [doc, setDoc] = useState<DocAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function pickImage(source: "camera" | "library") {
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.8,
          });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setDoc({
      uri: asset.uri,
      name: asset.fileName ?? "id.jpg",
      mimeType: asset.mimeType ?? "image/jpeg",
    });
    haptic.light();
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setDoc({
      uri: asset.uri,
      name: asset.name ?? "id.pdf",
      mimeType: asset.mimeType ?? "application/pdf",
    });
    haptic.light();
  }

  async function handleSubmit() {
    setError(null);
    const cleanedNida = nida.replace(/[\s-]/g, "");
    if (!/^\d{20}$/.test(cleanedNida)) {
      setError(t("validation.invalidNida", "NIDA number must be 20 digits."));
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("validation.missingName", "Enter your first and last name."));
      return;
    }
    if (!doc) {
      setError(t("validation.missingDoc", "Attach a photo or PDF of your ID."));
      return;
    }
    setLoading(true);
    try {
      await submitKyc({
        nida: cleanedNida,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        workplace: workplace.trim() || undefined,
        document: doc,
      });
      await refreshMe();
      haptic.success();
      setDone(true);
    } catch (e) {
      setError(mapApiError(e));
      haptic.error();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-4 p-8">
          <CheckCircle2 size={64} color="#22C55E" />
          <Text
            className="text-center text-foreground"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 28 }}
          >
            {t("kyc.submittedHeading", "KYC submitted")}
          </Text>
          <Text className="text-center text-base text-muted-foreground">
            {t("kyc.submittedBody", "We'll review your documents. You'll get an SMS once you're verified.")}
          </Text>
          <View className="mt-6 w-full">
            <Button
              label={t("common.continue", "Continue")}
              fullWidth
              size="lg"
              onPress={() => router.replace("/(tabs)/store")}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text
            className="text-foreground"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 28, letterSpacing: -0.5 }}
          >
            {t("kyc.heading", "Verify your identity")}
          </Text>
          <Text className="mt-2 mb-6 text-base text-muted-foreground">
            {t(
              "kyc.sub",
              "We need your NIDA and ID photo before you can save toward a PC. It takes under a minute.",
            )}
          </Text>

          <View className="gap-4">
            <Input
              label={t("kyc.nidaLabel", "NIDA number")}
              placeholder="00000000-00000-00000-00"
              keyboardType="number-pad"
              value={nida}
              onChangeText={setNida}
              maxLength={28}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label={t("signup.firstName", "Legal first name")}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View className="flex-1">
                <Input
                  label={t("signup.lastName", "Legal last name")}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
            <Input
              label={t("kyc.workplaceLabel", "Workplace (optional)")}
              value={workplace}
              onChangeText={setWorkplace}
            />

            <Text className="mt-2 text-sm font-medium text-foreground">
              {t("kyc.docLabel", "Photo of your ID")}
            </Text>
            {doc?.uri && doc.mimeType.startsWith("image/") ? (
              <Card className="items-center p-2">
                <Image source={{ uri: doc.uri }} style={{ width: "100%", height: 200, borderRadius: 14 }} />
                <Text className="mt-2 text-xs text-muted-foreground">{doc.name}</Text>
              </Card>
            ) : doc ? (
              <Card>
                <Text className="text-sm text-foreground">{doc.name}</Text>
              </Card>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label={t("kyc.takePhoto", "Take photo")}
                  variant="outline"
                  fullWidth
                  leftIcon={<Camera size={16} color="#1a1a1a" />}
                  onPress={() => pickImage("camera")}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={t("kyc.choosePhoto", "From library")}
                  variant="outline"
                  fullWidth
                  onPress={() => pickImage("library")}
                />
              </View>
            </View>
            <Pressable onPress={pickPdf} className="flex-row items-center justify-center gap-2 py-2">
              <FileUp size={14} color="#1A2FB8" />
              <Text className="text-sm text-primary">{t("kyc.orPdf", "Or upload a PDF")}</Text>
            </Pressable>

            {error ? <Text className="text-xs text-destructive">{error}</Text> : null}

            <Button
              label={t("kyc.submit", "Submit for review")}
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
