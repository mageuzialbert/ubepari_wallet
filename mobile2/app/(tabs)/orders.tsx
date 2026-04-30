import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import OrderCard from '../../components/OrderCard';
import EmptyState from '../../components/EmptyState';
import { listGoals } from '@/lib/api/goals';
import { mapApiError } from '@/lib/errors';

type Tab = 'active' | 'completed' | 'cancelled';

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('active');

  const goalsQ = useQuery({
    queryKey: ['goals'],
    queryFn: listGoals,
  });

  const { activeGoals, completedGoals, cancelledGoals } = useMemo(() => {
    const list = goalsQ.data ?? [];
    return {
      activeGoals: list.filter((g) => g.status === 'active'),
      completedGoals: list.filter((g) => g.status === 'completed'),
      cancelledGoals: list.filter((g) => g.status === 'cancelled'),
    };
  }, [goalsQ.data]);

  const data =
    tab === 'active'
      ? activeGoals
      : tab === 'completed'
      ? completedGoals
      : cancelledGoals;

  const tabLabel = (tabKey: Tab): string => {
    if (tabKey === 'active') {
      return activeGoals.length > 0
        ? t('orders.activeWithCount', { count: activeGoals.length })
        : t('orders.active');
    }
    if (tabKey === 'completed') {
      return completedGoals.length > 0
        ? t('orders.completedWithCount', { count: completedGoals.length })
        : t('orders.completed');
    }
    return cancelledGoals.length > 0
      ? t('orders.cancelledWithCount', { count: cancelledGoals.length })
      : t('orders.cancelled');
  };

  const emptyMeta = (): { icon: string; title: string; subtitle: string } => {
    if (tab === 'active') {
      return {
        icon: 'time-outline',
        title: t('orders.emptyActiveTitle'),
        subtitle: t('orders.emptyActiveSubtitle'),
      };
    }
    if (tab === 'completed') {
      return {
        icon: 'checkmark-done-outline',
        title: t('orders.emptyCompletedTitle'),
        subtitle: t('orders.emptyCompletedSubtitle'),
      };
    }
    return {
      icon: 'close-circle-outline',
      title: t('orders.emptyCancelledTitle'),
      subtitle: t('orders.emptyCancelledSubtitle'),
    };
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={goalsQ.isFetching}
          onRefresh={() => void qc.invalidateQueries({ queryKey: ['goals'] })}
        />
      }
    >
      <Text style={styles.pageTitle}>{t('orders.title')}</Text>

      <View style={styles.tabRow}>
        {(['active', 'completed', 'cancelled'] as Tab[]).map((tabKey) => (
          <TouchableOpacity
            key={tabKey}
            style={[styles.tabPill, tab === tabKey && styles.tabPillActive]}
            onPress={() => setTab(tabKey)}
          >
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabLabel(tabKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {goalsQ.isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : goalsQ.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('orders.loadFailedTitle')}
          subtitle={mapApiError(goalsQ.error)}
          actionLabel={t('common.tryAgain')}
          onAction={() => void qc.invalidateQueries({ queryKey: ['goals'] })}
        />
      ) : data.length === 0 ? (
        (() => {
          const meta = emptyMeta();
          return (
            <EmptyState
              icon={meta.icon as never}
              title={meta.title}
              subtitle={meta.subtitle}
              actionLabel={tab === 'active' ? t('orders.browseShop') : undefined}
              onAction={tab === 'active' ? () => router.push('/(tabs)/shop') : undefined}
            />
          );
        })()
      ) : (
        <View style={styles.list}>
          {data.map((g) => (
            <OrderCard
              key={g.id}
              title={g.productName ?? g.productSlug}
              subtitle={g.reference}
              imageUri={g.productImage ?? undefined}
              paid={g.contributedTzs}
              total={g.productPrice}
              status={g.status}
              onPress={() => router.push(`/installment/${g.id}` as const)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  pageTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.white,
    fontFamily: Fonts.semiBold,
  },
  list: { gap: 12 },
  loaderWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
});
