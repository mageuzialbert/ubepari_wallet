import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import BalanceCarousel from '../../components/BalanceCarousel';
import QuickActionCard from '../../components/QuickActionCard';
import ProductCard from '../../components/ProductCard';
import InstallmentProgressCard from '../../components/InstallmentProgressCard';
import EmptyState from '../../components/EmptyState';
import { getWalletBalance } from '@/lib/api/wallet';
import { listGoals } from '@/lib/api/goals';
import { listProducts } from '@/lib/api/products';
import { useAuthStore } from '@/state/auth';
import { currentLocale } from '@/lib/locale';

function initialsOf(user: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!user) return 'U';
  const f = user.firstName?.[0] ?? '';
  const l = user.lastName?.[0] ?? '';
  return (f + l).toUpperCase() || 'U';
}

function fullNameOf(user: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!user) return 'there';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const balanceQ = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: getWalletBalance,
  });
  const goalsQ = useQuery({
    queryKey: ['goals'],
    queryFn: listGoals,
  });
  const productsQ = useQuery({
    queryKey: ['products', 'home', currentLocale()],
    queryFn: () => listProducts({ locale: currentLocale() }),
  });

  const activeGoals = useMemo(
    () => (goalsQ.data ?? []).filter((g) => g.status === 'active'),
    [goalsQ.data],
  );

  const forYou = useMemo(() => {
    const list = productsQ.data ?? [];
    const ownedSlugs = new Set(activeGoals.map((g) => g.productSlug));
    return list.filter((p) => !ownedSlugs.has(p.slug)).slice(0, 4);
  }, [productsQ.data, activeGoals]);

  const refreshing = balanceQ.isFetching || goalsQ.isFetching || productsQ.isFetching;
  const handleRefresh = () => {
    void qc.invalidateQueries({ queryKey: ['wallet'] });
    void qc.invalidateQueries({ queryKey: ['goals'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
  };

  const quickActions = [
    {
      icon: 'add-circle-outline' as const,
      label: t('home.addFunds'),
      color: Colors.success,
      onPress: () => router.push('/add-funds'),
    },
    {
      icon: 'storefront-outline' as const,
      label: t('home.shopPCs'),
      color: Colors.primary,
      onPress: () => router.push('/(tabs)/shop'),
    },
    {
      icon: 'receipt-outline' as const,
      label: t('home.myOrders'),
      color: Colors.warning,
      onPress: () => router.push('/(tabs)/orders'),
    },
    {
      icon: 'help-circle-outline' as const,
      label: t('home.support'),
      color: Colors.secondary,
      onPress: () => router.push('/chat'),
    },
  ];

  const firstName = user?.firstName ?? 'there';
  const balance = balanceQ.data?.availableTzs ?? 0;
  const kycPending = user && user.kycStatus !== 'approved';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{t('balance.hello', { name: firstName })} 👋</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={styles.avatarText}>{initialsOf(user)}</Text>
        </TouchableOpacity>
      </View>

      <BalanceCarousel
        available={balance}
        allocated={balanceQ.data?.allocatedTzs ?? 0}
        userName={fullNameOf(user)}
        onAddFunds={() => router.push('/add-funds')}
        onViewPlans={() => router.push('/(tabs)/orders')}
      />

      {kycPending && (
        <TouchableOpacity
          style={styles.kycBanner}
          onPress={() => router.push('/(auth)/kyc' as const)}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.kycTitle}>
              {user?.kycStatus === 'pending'
                ? t('home.kycPendingTitle')
                : t('home.kycVerifyTitle')}
            </Text>
            <Text style={styles.kycBody}>
              {user?.kycStatus === 'pending'
                ? t('home.kycPendingBody')
                : t('home.kycVerifyBody')}
            </Text>
          </View>
          <Text style={styles.kycCta}>
            {user?.kycStatus === 'pending' ? t('home.kycCtaStatus') : t('home.kycCtaVerify')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.label}
              icon={action.icon}
              label={action.label}
              color={action.color}
              onPress={action.onPress}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('home.activeInstallments')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {activeGoals.length === 0 ? (
          <EmptyState
            icon="time-outline"
            title={t('home.emptyTitle')}
            subtitle={t('home.emptySubtitle')}
          />
        ) : (
          <View style={styles.gap}>
            {activeGoals.slice(0, 3).map((g) => (
              <InstallmentProgressCard
                key={g.id}
                title={g.productName ?? g.productSlug}
                subtitle={g.reference}
                paid={g.contributedTzs}
                total={g.productPrice}
                compact
                onPress={() => router.push(`/installment/${g.id}` as const)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('home.forYou')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/shop')}>
            <Text style={styles.seeAll}>{t('common.viewAll')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.productGrid}>
          {forYou.map((p) => (
            <View key={p.slug} style={styles.productCard}>
              <ProductCard product={p} onPress={() => router.push(`/product/${p.slug}`)} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  date: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.warningLight,
    borderRadius: 12,
    padding: 14,
  },
  kycTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  kycBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  kycCta: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.warning,
  },
  section: { gap: 14 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  seeAll: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  gap: { gap: 12 },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  productCard: {
    width: '47%',
  },
});
