import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import type { Brand, UsageTag } from '@/types/api';

export type PriceBucket =
  | '0-2000000'
  | '2000000-4000000'
  | '4000000-6000000'
  | '6000000-99999999';

export type ShopFilters = {
  usage: UsageTag | null;
  brand: Brand | null;
  price: PriceBucket | null;
};

export const EMPTY_FILTERS: ShopFilters = {
  usage: null,
  brand: null,
  price: null,
};

const USAGE_OPTIONS: UsageTag[] = [
  'Gaming',
  'Design',
  'Coding',
  'Office',
  'Student',
  'Creator',
];

const BRAND_OPTIONS: Brand[] = [
  'Apple',
  'Dell',
  'HP',
  'Lenovo',
  'ASUS',
  'MSI',
  'Acer',
  'Custom',
];

const PRICE_BUCKETS: PriceBucket[] = [
  '0-2000000',
  '2000000-4000000',
  '4000000-6000000',
  '6000000-99999999',
];

export function activeFilterCount(filters: ShopFilters): number {
  let n = 0;
  if (filters.usage) n += 1;
  if (filters.brand) n += 1;
  if (filters.price) n += 1;
  return n;
}

export function bucketToRange(
  bucket: PriceBucket,
): { minPrice: number; maxPrice: number | undefined } {
  const [minStr, maxStr] = bucket.split('-');
  const min = Number(minStr);
  const max = Number(maxStr);
  return {
    minPrice: min,
    maxPrice: max === 99999999 ? undefined : max,
  };
}

interface FilterSheetProps {
  visible: boolean;
  filters: ShopFilters;
  onApply: (filters: ShopFilters) => void;
  onClose: () => void;
}

export default function FilterSheet({
  visible,
  filters,
  onApply,
  onClose,
}: FilterSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<ShopFilters>(filters);

  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const toggleUsage = (u: UsageTag) =>
    setDraft((d) => ({ ...d, usage: d.usage === u ? null : u }));
  const toggleBrand = (b: Brand) =>
    setDraft((d) => ({ ...d, brand: d.brand === b ? null : b }));
  const togglePrice = (p: PriceBucket) =>
    setDraft((d) => ({ ...d, price: d.price === p ? null : p }));

  const renderChip = <T extends string>(
    value: T,
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={value}
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('shop.filters.title')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {t('shop.filters.usageLabel')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {USAGE_OPTIONS.map((u) =>
                  renderChip(
                    u,
                    t(`shop.filters.${u}`),
                    draft.usage === u,
                    () => toggleUsage(u),
                  ),
                )}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {t('shop.filters.brandLabel')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {BRAND_OPTIONS.map((b) =>
                  renderChip(b, b, draft.brand === b, () => toggleBrand(b)),
                )}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {t('shop.filters.priceLabel')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {PRICE_BUCKETS.map((p) =>
                  renderChip(
                    p,
                    t(`shop.filters.priceBuckets.${p}`),
                    draft.price === p,
                    () => togglePrice(p),
                  ),
                )}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnGhost]}
              onPress={() => setDraft(EMPTY_FILTERS)}
              activeOpacity={0.7}
            >
              <Text style={styles.footerBtnGhostText}>
                {t('shop.filters.clearAll')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary]}
              onPress={() => onApply(draft)}
              activeOpacity={0.8}
            >
              <Text style={styles.footerBtnPrimaryText}>
                {t('shop.filters.apply')}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    paddingRight: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnGhost: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footerBtnGhostText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  footerBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  footerBtnPrimaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
});
