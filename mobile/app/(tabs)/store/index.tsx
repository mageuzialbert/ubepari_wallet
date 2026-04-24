import { useState } from "react";
import { View, Text, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";

import { ProductCard } from "@/components/ProductCard";
import { ProductFilters, type FilterState } from "@/components/ProductFilters";
import { listProducts } from "@/api/products";
import { currentLocale } from "@/i18n";

export default function Store() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>({});
  const locale = currentLocale();

  const query = useQuery({
    queryKey: ["products", filters, locale],
    queryFn: () => listProducts({ ...filters, locale }),
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2">
        <Text
          className="mb-1 text-foreground"
          style={{ fontFamily: "Geist-SemiBold", fontSize: 32, letterSpacing: -0.5 }}
        >
          {t("store.heading", "Store")}
        </Text>
        <Text className="mb-4 text-sm text-muted-foreground">
          {t("store.sub", "Find a PC you love, pick a term, start saving.")}
        </Text>
        <ProductFilters value={filters} onChange={setFilters} />
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlashList
          data={query.data ?? []}
          numColumns={2}
          keyExtractor={(p) => p.slug}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View style={{ padding: 6, flex: 1 }}>
              <ProductCard product={item} />
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-muted-foreground">
                {t("store.empty", "No products match these filters.")}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
