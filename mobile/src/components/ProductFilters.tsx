import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { haptic } from "@/lib/haptics";

export type FilterState = {
  usage?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
};

const USAGES = ["Gaming", "Design", "Coding", "Office", "Student", "Creator"] as const;
const BRANDS = ["Apple", "Dell", "HP", "Lenovo", "ASUS", "MSI", "Acer", "Custom"] as const;
const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "Under 2M", max: 2_000_000 },
  { label: "2M – 4M", min: 2_000_000, max: 4_000_000 },
  { label: "4M – 6M", min: 4_000_000, max: 6_000_000 },
  { label: "6M+", min: 6_000_000 },
];

type ChipProps = { label: string; active: boolean; onPress: () => void };
function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={() => {
        haptic.light();
        onPress();
      }}
      className={[
        "rounded-full border px-3 py-1.5",
        active ? "border-primary bg-primary" : "border-border bg-muted",
      ].join(" ")}
    >
      <Text
        className={[
          "text-xs font-medium",
          active ? "text-primary-foreground" : "text-foreground",
        ].join(" ")}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type ProductFiltersProps = {
  value: FilterState;
  onChange: (next: FilterState) => void;
};

export function ProductFilters({ value, onChange }: ProductFiltersProps) {
  const { t } = useTranslation();
  const [showBrands, setShowBrands] = useState(false);

  return (
    <View className="gap-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
        <Chip
          label={t("filters.all", "All")}
          active={!value.usage}
          onPress={() => onChange({ ...value, usage: undefined })}
        />
        {USAGES.map((u) => (
          <Chip
            key={u}
            label={u}
            active={value.usage === u}
            onPress={() => onChange({ ...value, usage: value.usage === u ? undefined : u })}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
        {PRICE_RANGES.map((p) => {
          const active = value.minPrice === p.min && value.maxPrice === p.max;
          return (
            <Chip
              key={p.label}
              label={p.label}
              active={active}
              onPress={() =>
                onChange({
                  ...value,
                  minPrice: active ? undefined : p.min,
                  maxPrice: active ? undefined : p.max,
                })
              }
            />
          );
        })}
        <Chip
          label={value.brand ?? t("filters.brand", "Brand")}
          active={!!value.brand}
          onPress={() => setShowBrands((v) => !v)}
        />
      </ScrollView>

      {showBrands ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
          {BRANDS.map((b) => (
            <Chip
              key={b}
              label={b}
              active={value.brand === b}
              onPress={() => onChange({ ...value, brand: value.brand === b ? undefined : b })}
            />
          ))}
        </ScrollView>
      ) : null}

      {(value.usage || value.brand || value.minPrice || value.maxPrice) ? (
        <Pressable
          onPress={() => onChange({})}
          className="self-start rounded-full bg-muted px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-muted-foreground">
            {t("filters.clear", "Clear filters")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
