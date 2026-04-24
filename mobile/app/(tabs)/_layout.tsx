import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { Home, Target, MessageCircle, User } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { brand, palette } from "@/theme/tokens";

export default function TabsLayout() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? palette.dark : palette.light;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: scheme === "dark" ? brand.cyanHex : brand.blueHex,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontFamily: "Geist-Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="store/index"
        options={{
          title: t("nav.store", "Store"),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="goals/index"
        options={{
          title: t("nav.goals", "Goals"),
          tabBarIcon: ({ color, size }) => <Target color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assistant/index"
        options={{
          title: t("nav.aiTips", "AI Tips"),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t("nav.profile", "Profile"),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="store/[slug]" options={{ href: null }} />
      <Tabs.Screen name="goals/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
    </Tabs>
  );
}
