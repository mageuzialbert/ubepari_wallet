import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import BalanceCarousel from '../../components/BalanceCarousel';
import TransactionItem from '../../components/TransactionItem';
import EmptyState from '../../components/EmptyState';
import { getWalletBalance, listWalletEntries } from '@/lib/api/wallet';
import { formatWalletEntry } from '@/lib/wallet/format-entry';
import { formatTzs } from '@/lib/currency';
import { mapApiError } from '@/lib/errors';

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const balanceQ = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: getWalletBalance,
  });
  const entriesQ = useQuery({
    queryKey: ['wallet', 'entries', 50],
    queryFn: () => listWalletEntries(50),
  });

  const refreshing = balanceQ.isFetching || entriesQ.isFetching;

  const txns = useMemo(
    () => (entriesQ.data ?? []).map(formatWalletEntry),
    [entriesQ.data],
  );

  const totals = useMemo(() => {
    const deposits = txns
      .filter((t) => t.type === 'deposit')
      .reduce((s, t) => s + t.amount, 0);
    const paid = txns
      .filter((t) => t.type === 'payment')
      .reduce((s, t) => s + t.amount, 0);
    return { deposits, paid };
  }, [txns]);

  const balance = balanceQ.data?.availableTzs ?? 0;
  const allocated = balanceQ.data?.allocatedTzs ?? 0;

  const handleRefresh = () => {
    void qc.invalidateQueries({ queryKey: ['wallet'] });
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
        <View style={styles.headerBadge}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
          <Text style={styles.headerBadgeText}>{t('wallet.secured')}</Text>
        </View>
      </View>

      <BalanceCarousel
        available={balance}
        allocated={allocated}
        onAddFunds={() => router.push('/add-funds')}
        onViewPlans={() => router.push('/(tabs)/orders')}
      />

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="arrow-down-circle" size={22} color={Colors.success} />
          <Text style={styles.statValue}>{formatTzs(totals.deposits)}</Text>
          <Text style={styles.statLabel}>{t('wallet.totalIn')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Ionicons name="arrow-up-circle" size={22} color={Colors.error} />
          <Text style={styles.statValue}>{formatTzs(totals.paid)}</Text>
          <Text style={styles.statLabel}>{t('wallet.totalOut')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('wallet.history')}</Text>

        {balanceQ.isError || entriesQ.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t('wallet.loadFailedTitle')}
            subtitle={mapApiError(balanceQ.error ?? entriesQ.error)}
            actionLabel={t('common.tryAgain')}
            onAction={handleRefresh}
          />
        ) : entriesQ.isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : txns.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={t('wallet.emptyTitle')}
            subtitle={t('wallet.emptySubtitle')}
          />
        ) : (
          <View style={styles.txList}>
            {txns.map((txn) => (
              <TransactionItem key={txn.id} transaction={txn} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.xs,
    color: Colors.success,
  },
  allocatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    marginTop: -8,
  },
  allocatedLabel: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  allocatedValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  statsRow: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 50,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  txList: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  loaderWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});
