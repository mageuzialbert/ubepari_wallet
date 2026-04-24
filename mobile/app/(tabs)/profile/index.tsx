import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ChevronRight, FileText, Lock, LogOut, User as UserIcon, BadgeCheck } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuthStore } from "@/auth/auth-store";
import { maskPhone } from "@/lib/phone";
import { apiBaseUrl } from "@/api/client";
import { unregisterPushToken } from "@/lib/push";

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const initials =
    (user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "");
  const kycLabel: Record<string, string> = {
    none: t("account.kyc.none", "Not started"),
    pending: t("account.kyc.pending", "In review"),
    approved: t("account.kyc.approved", "Verified"),
    rejected: t("account.kyc.rejected", "Action needed"),
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text
          className="mb-6 text-foreground"
          style={{ fontFamily: "Geist-SemiBold", fontSize: 32, letterSpacing: -0.5 }}
        >
          {t("nav.profile", "Profile")}
        </Text>

        <Card className="mb-6 flex-row items-center gap-4">
          <View
            className="h-14 w-14 items-center justify-center rounded-full bg-primary"
          >
            <Text className="text-xl font-semibold text-primary-foreground">
              {initials || <UserIcon size={24} color="white" />}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground">
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {user?.phone ? maskPhone(user.phone) : ""}
            </Text>
            <View className="mt-2 flex-row gap-2">
              <View className="flex-row items-center gap-1 rounded-full bg-muted px-2 py-1">
                <BadgeCheck size={12} color="#8E8E93" />
                <Text className="text-xs text-muted-foreground">
                  {kycLabel[user?.kycStatus ?? "none"]}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        <Text className="mb-2 px-1 text-xs uppercase tracking-wider text-muted-foreground">
          {t("account.languageHeading", "Language")}
        </Text>
        <LanguageToggle />

        <Text className="mb-2 mt-6 px-1 text-xs uppercase tracking-wider text-muted-foreground">
          {t("account.sectionAccount", "Account")}
        </Text>
        <Card className="p-0">
          <MenuItem
            label={t("account.edit", "Edit profile")}
            icon={<UserIcon size={18} color="#8E8E93" />}
            onPress={() => router.push("/(tabs)/profile/edit")}
          />
          <Separator />
          <MenuItem
            label={t("account.kyc.title", "KYC verification")}
            icon={<BadgeCheck size={18} color="#8E8E93" />}
            onPress={() => router.push("/kyc")}
          />
        </Card>

        <Text className="mb-2 mt-6 px-1 text-xs uppercase tracking-wider text-muted-foreground">
          {t("account.sectionLegal", "Legal")}
        </Text>
        <Card className="p-0">
          <MenuItem
            label={t("footer.privacy", "Privacy")}
            icon={<Lock size={18} color="#8E8E93" />}
            onPress={() => router.push(`/legal/privacy`)}
          />
          <Separator />
          <MenuItem
            label={t("footer.terms", "Terms of service")}
            icon={<FileText size={18} color="#8E8E93" />}
            onPress={() => router.push(`/legal/terms`)}
          />
        </Card>

        <View className="mt-8">
          <Button
            label={t("header.signOut", "Sign out")}
            variant="outline"
            fullWidth
            leftIcon={<LogOut size={16} color="#1a1a1a" />}
            onPress={async () => {
              await unregisterPushToken().catch(() => {});
              await signOut();
              router.replace("/(onboarding)/welcome");
            }}
          />
        </View>

        <Text className="mt-6 text-center text-xs text-muted-foreground">
          {apiBaseUrl().replace(/^https?:\/\//, "")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-5 py-4 active:bg-muted"
    >
      <View className="flex-row items-center gap-3">
        {icon}
        <Text className="text-base text-foreground">{label}</Text>
      </View>
      <ChevronRight size={18} color="#8E8E93" />
    </Pressable>
  );
}

function Separator() {
  return <View className="mx-5 h-px bg-border" />;
}
