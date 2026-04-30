import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import { getProduct } from '@/lib/api/products';
import { createGoal, listGoals } from '@/lib/api/goals';
import { useAuthStore } from '@/state/auth';
import { useRequireKyc } from '@/lib/auth/use-require-kyc';
import { currentLocale } from '@/lib/locale';
import { formatTzs } from '@/lib/currency';
import { mapApiError } from '@/lib/errors';
import type { GoalTerm } from '@/types/api';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = 280;

const TERM_OPTIONS: GoalTerm[] = [3, 6, 9, 12];

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const requireKyc = useRequireKyc();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const productQ = useQuery({
    queryKey: ['product', slug, currentLocale()],
    queryFn: () => getProduct(slug as string, currentLocale()),
    enabled: !!slug,
  });
  const goalsQ = useQuery({
    queryKey: ['goals'],
    queryFn: listGoals,
    enabled: !!user,
  });

  const product = productQ.data ?? null;
  const activeGoal = useMemo(
    () =>
      (goalsQ.data ?? []).find(
        (g) => g.productSlug === slug && g.status === 'active',
      ),
    [goalsQ.data, slug],
  );

  const [currentImg, setCurrentImg] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; term: GoalTerm }>({
    open: false,
    term: 6,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{ goalId: string; reference: string } | null>(
    null,
  );

  if (productQ.isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {productQ.isError ? mapApiError(productQ.error) : t('product.notFound')}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorBack}>{t('product.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleStartTap = () => {
    if (activeGoal) {
      router.push(`/installment/${activeGoal.id}` as const);
      return;
    }
    if (!requireKyc()) return;
    setConfirmModal({ open: true, term: 6 });
  };

  const handleConfirm = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const res = await createGoal({
        productSlug: product.slug,
        termMonths: confirmModal.term,
      });
      setConfirmModal({ open: false, term: confirmModal.term });
      void qc.invalidateQueries({ queryKey: ['goals'] });
      setSuccessModal({ goalId: res.goalId, reference: res.reference });
    } catch (e) {
      setCreateError(mapApiError(e));
    } finally {
      setCreating(false);
    }
  };

  const monthlyPreview = (term: GoalTerm) =>
    Math.ceil(product.priceTzs / term / 1000) * 1000;

  const specs = product.specs ?? ({} as typeof product.specs);
  const specItems: { label: string; value?: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { label: t('product.specProcessor'), value: specs.cpu, icon: 'hardware-chip-outline' },
    { label: t('product.specRam'), value: specs.ram, icon: 'server-outline' },
    { label: t('product.specStorage'), value: specs.storage, icon: 'save-outline' },
    { label: t('product.specDisplay'), value: specs.display, icon: 'tv-outline' },
    { label: t('product.specBrand'), value: product.brand, icon: 'star-outline' },
  ];

  const remaining = activeGoal ? product.priceTzs - activeGoal.contributedTzs : 0;

  return (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.carouselContainer}>
          <FlatList
            data={product.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentImg(idx);
            }}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => (
              <View style={styles.imgSlide}>
                {imgErrors[index] || !item ? (
                  <View style={styles.imgFallback}>
                    <Ionicons name="laptop-outline" size={60} color={Colors.textMuted} />
                    <Text style={styles.imgFallbackText}>{t('product.imageUnavailable')}</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: item }}
                    style={styles.img}
                    resizeMode="cover"
                    onError={() =>
                      setImgErrors((prev) => ({ ...prev, [index]: true }))
                    }
                  />
                )}
              </View>
            )}
          />

          {product.images.length > 1 && (
            <View style={styles.imgDots}>
              {product.images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.imgDot, i === currentImg && styles.imgDotActive]}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>{product.brand}</Text>
              <Text style={styles.name}>{product.name}</Text>
            </View>
            {product.usageTags?.[0] && (
              <View style={styles.conditionBadge}>
                <Text style={styles.conditionText}>{product.usageTags[0]}</Text>
              </View>
            )}
          </View>

          <Text style={styles.description}>{product.description ?? product.tagline}</Text>

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('product.price')}</Text>
              <Text style={styles.priceValue}>{formatTzs(product.priceTzs)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('product.monthly', { months: confirmModal.term })}</Text>
              <Text style={styles.monthlyValue}>
                {t('product.monthlyValue', { amount: formatTzs(monthlyPreview(confirmModal.term)) })}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{t('product.specs')}</Text>
          <View style={styles.specsCard}>
            {specItems
              .filter((s) => s.value)
              .map((spec, i, arr) => (
                <View
                  key={spec.label}
                  style={[styles.specRow, i < arr.length - 1 && styles.specBorder]}
                >
                  <View style={styles.specLeft}>
                    <View style={styles.specIconWrap}>
                      <Ionicons name={spec.icon} size={16} color={Colors.primary} />
                    </View>
                    <Text style={styles.specLabel}>{spec.label}</Text>
                  </View>
                  <Text style={styles.specValue}>{spec.value}</Text>
                </View>
              ))}
          </View>

          {activeGoal ? (
            <>
              <Text style={styles.sectionTitle}>{t('product.yourActivePlan')}</Text>
              <View style={styles.installCard}>
                <View style={styles.installRow}>
                  <Text style={styles.installLabel}>{t('product.reference')}</Text>
                  <Text style={styles.installValue}>{activeGoal.reference}</Text>
                </View>
                <View style={styles.installRow}>
                  <Text style={styles.installLabel}>{t('product.term')}</Text>
                  <Text style={styles.installValue}>
                    {t('product.termMonths', { count: activeGoal.targetMonths })}
                  </Text>
                </View>
                <View style={styles.installRow}>
                  <Text style={styles.installLabel}>{t('product.alreadyPaid')}</Text>
                  <Text style={[styles.installValue, { color: Colors.success }]}>
                    {formatTzs(activeGoal.contributedTzs)}
                  </Text>
                </View>
                <View style={styles.installRow}>
                  <Text style={styles.installLabel}>{t('product.remaining')}</Text>
                  <Text style={[styles.installValue, { color: Colors.error }]}>
                    {formatTzs(remaining)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{t('product.choosePlan')}</Text>
              <View style={styles.termsGrid}>
                {TERM_OPTIONS.map((opt) => {
                  const active = confirmModal.term === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.termChip, active && styles.termChipActive]}
                      onPress={() => setConfirmModal((c) => ({ ...c, term: opt }))}
                    >
                      <Text style={[styles.termTitle, active && styles.termTitleActive]}>
                        {t('product.termMonths', { count: opt })}
                      </Text>
                      <Text style={[styles.termSub, active && styles.termSubActive]}>
                        {t('product.monthlyShort', { amount: formatTzs(monthlyPreview(opt)) })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          title={
            activeGoal
              ? t('product.ctaContinue', { remaining: formatTzs(remaining) })
              : t('product.ctaStart', { months: confirmModal.term })
          }
          onPress={handleStartTap}
          size="lg"
        />
      </View>

      {/* Confirm modal */}
      <Modal visible={confirmModal.open} transparent animationType="fade" onRequestClose={() => setConfirmModal({ ...confirmModal, open: false })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.infoLight }]}>
              <Ionicons name="information-circle-outline" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{t('product.confirmTitle', { months: confirmModal.term })}</Text>
            <Text style={styles.modalBody}>
              {t('product.confirmBody', {
                name: product.name,
                total: formatTzs(product.priceTzs),
                monthly: formatTzs(monthlyPreview(confirmModal.term)),
              })}
            </Text>
            {createError && <Text style={styles.errorInline}>{createError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setConfirmModal({ ...confirmModal, open: false })}
                disabled={creating}
              >
                <Text style={styles.modalBtnSecondaryText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleConfirm}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>{t('product.confirmStart')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success modal */}
      <Modal
        visible={!!successModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#e6f9ef' }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color={Colors.success} />
            </View>
            <Text style={styles.modalTitle}>{t('product.successTitle')}</Text>
            <Text style={styles.modalBody}>
              {t('product.successBody', { reference: successModal?.reference ?? '' })}
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnPrimary, { flex: 0, width: '100%' }]}
              onPress={() => {
                const id = successModal?.goalId;
                setSuccessModal(null);
                if (id) router.replace(`/installment/${id}` as const);
              }}
            >
              <Text style={styles.modalBtnPrimaryText}>{t('product.viewPlan')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.background,
  },
  errorText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  errorBack: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  errorInline: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  carouselContainer: {
    position: 'relative',
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.surfaceAlt,
  },
  imgSlide: { width, height: IMAGE_HEIGHT },
  img: { width: '100%', height: '100%' },
  imgFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  imgFallbackText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  imgDots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  imgDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imgDotActive: {
    width: 18,
    backgroundColor: Colors.white,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 20, gap: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  brand: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  conditionBadge: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 20,
  },
  conditionText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  description: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginTop: -4,
  },
  priceCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  priceValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
  },
  monthlyValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.secondary,
  },
  priceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  specsCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  specBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  specLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  specValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    maxWidth: '50%',
    textAlign: 'right',
  },
  installCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  installRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  installLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  installValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  termsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  termChip: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    gap: 4,
  },
  termChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  termTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  termTitleActive: {
    color: Colors.primary,
  },
  termSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  termSubActive: {
    color: Colors.primaryLight,
  },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  modalBtnPrimaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
  modalBtnSecondary: {
    backgroundColor: Colors.surfaceAlt,
  },
  modalBtnSecondaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
});
