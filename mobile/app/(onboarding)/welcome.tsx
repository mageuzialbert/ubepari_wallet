import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/BrandMark";

export default function Welcome() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#1A2FB8" }}>
      <View className="flex-1 justify-between p-8">
        <View className="mt-12">
          <BrandMark size={64} />
          <Text className="mt-2 text-lg font-medium text-white/90">Ubepari Wallet</Text>
        </View>

        <View>
          <Text
            className="text-white"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 44, lineHeight: 48, letterSpacing: -1 }}
          >
            {t("hero.headingLine1", "Save up.")}
          </Text>
          <Text
            className="text-white"
            style={{ fontFamily: "Geist-SemiBold", fontSize: 44, lineHeight: 48, letterSpacing: -1 }}
          >
            {t("hero.headingLine2", "Own it.")}
          </Text>
          <Text className="mt-4 text-base leading-6 text-white/80">
            {t(
              "hero.subheading",
              "Pick a PC, set a target, and contribute bit by bit via mobile money. No interest, no deposit, no debt.",
            )}
          </Text>
        </View>

        <View className="gap-3">
          <Button
            label={t("header.getStarted", "Get started")}
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push("/(auth)/sign-up")}
            style={{ backgroundColor: "white" }}
          />
          <Button
            label={t("header.signIn", "Sign in")}
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => router.push("/(auth)/sign-in")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
