import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/EmptyState';
import FilterSheet, {
  EMPTY_FILTERS,
  activeFilterCount,
  bucketToRange,
  type ShopFilters,
} from '../../components/FilterSheet';
import { listProducts } from '@/lib/api/products';
import { listGoals } from '@/lib/api/goals';
import { mapApiError } from '@/lib/errors';
import { currentLocale } from '@/lib/locale';

export default function ShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ShopFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filterCount = activeFilterCount(filters);

  const productsQ = useQuery({
    queryKey: [
      'products',
      filters.usage,
      filters.brand,
      filters.price,
      currentLocale(),
    ],
    queryFn: () => {
      const range = filters.price ? bucketToRange(filters.price) : undefined;
      return listProducts({
        usage: filters.usage ?? undefined,
        brand: filters.brand ?? undefined,
        minPrice: range?.minPrice,
        maxPrice: range?.maxPrice,
        locale: currentLocale(),
      });
    },
  });

  // Goals are used to decorate cards with an "Active" pill.
  const goalsQ = useQuery({
    queryKey: ['goals'],
    queryFn: listGoals,
  });

  const activeSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const g of goalsQ.data ?? []) {
      if (g.status === 'active') set.add(g.productSlug);
    }
    return set;
  }, [goalsQ.data]);

  const filtered = useMemo(() => {
    const list = productsQ.data ?? [];
    const q = search.trim().toLowerCase();
    let out = list;
    if (q) {
      out = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.specs?.cpu ?? '').toLowerCase().includes(q) ||
          (p.tagline ?? '').toLowerCase().includes(q),
      );
    }
    return [...out].sort((a, b) => a.name.localeCompare(b.name));
  }, [productsQ.data, search]);

  const refreshing = productsQ.isFetching;
  const filtersActive = filterCount > 0;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[0]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void qc.invalidateQueries({ queryKey: ['products'] });
            void qc.invalidateQueries({ queryKey: ['goals'] });
          }}
        />
      }
    >
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>{t('shop.title')}</Text>
        <Text style={styles.resultCount}>
          {t('shop.count', { count: filtered.length })}
        </Text>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons
              name="search"
              size={18}
              color={Colors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t('shop.searchPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
          </View>

          <TouchableOpacity
            style={[styles.filterBtn, filtersActive && styles.filterBtnActive]}
            onPress={() => setSheetOpen(true)}
            activeOpacity={0.7}
            accessibilityLabel={t('shop.filters.title')}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={filtersActive ? Colors.white : Colors.textPrimary}
            />
            {filterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {productsQ.isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : productsQ.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('shop.loadFailedTitle')}
          subtitle={mapApiError(productsQ.error)}
          actionLabel={t('common.tryAgain')}
          onAction={() => void qc.invalidateQueries({ queryKey: ['products'] })}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="laptop-outline"
          title={
            filtersActive
              ? t('shop.emptyFilteredTitle')
              : t('shop.emptyTitle')
          }
          subtitle={
            filtersActive
              ? t('shop.emptyFilteredSubtitle')
              : t('shop.emptySubtitle')
          }
          actionLabel={
            filtersActive ? t('shop.clearFiltersAction') : undefined
          }
          onAction={
            filtersActive ? () => setFilters(EMPTY_FILTERS) : undefined
          }
        />
      ) : (
        <View style={styles.grid}>
          {filtered.map((p) => (
            <View key={p.slug} style={styles.gridItem}>
              <ProductCard
                product={p}
                isActive={activeSlugs.has(p.slug)}
                onPress={() => router.push(`/product/${p.slug}`)}
              />
            </View>
          ))}
        </View>
      )}

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  topBar: {
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  pageTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  resultCount: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: -4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    padding: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  filterBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    color: Colors.white,
    lineHeight: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  gridItem: {
    width: '47%',
  },
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
});
