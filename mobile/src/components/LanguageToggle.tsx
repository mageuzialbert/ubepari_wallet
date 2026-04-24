import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { setLocale } from "@/i18n";
import { type Locale } from "@/i18n/config";
import { haptic } from "@/lib/haptics";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = (i18n.language ?? "en") as Locale;

  return (
    <View className="flex-row rounded-full border border-border bg-muted p-1">
      {(["en", "sw"] as const).map((l) => (
        <Pressable
          key={l}
          onPress={() => {
            haptic.light();
            setLocale(l);
          }}
          className={[
            "flex-1 items-center justify-center rounded-full py-2 px-4",
            current === l ? "bg-background" : "",
          ].join(" ")}
        >
          <Text
            className={[
              "text-sm font-medium",
              current === l ? "text-foreground" : "text-muted-foreground",
            ].join(" ")}
          >
            {l === "en" ? "English" : "Kiswahili"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
