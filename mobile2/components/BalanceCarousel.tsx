import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { formatTzs } from '@/lib/currency';

interface BalanceCarouselProps {
  available: number;
  allocated: number;
  userName?: string;
  onAddFunds?: () => void;
  onViewPlans?: () => void;
}

const SCREEN_PADDING = 20;
const CARD_GAP = 12;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - SCREEN_PADDING * 2;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

type CardKind = 'available' | 'allocated';

type CardSpec = {
  kind: CardKind;
  greeting: string;
  label: string;
  value: number;
  ctaLabel: string;
  ctaIcon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  gradient: [string, string];
};

export default function BalanceCarousel({
  available,
  allocated,
  userName,
  onAddFunds,
  onViewPlans,
}: BalanceCarouselProps) {
  const [hidden, setHidden] = useState(true);
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<CardSpec>>(null);
  const { t } = useTranslation();

  const greeting = userName
    ? t('balance.hello', { name: userName.split(' ')[0] })
    : t('balance.wallet');

  const cards: CardSpec[] = [
    {
      kind: 'available',
      greeting,
      label: t('balance.available'),
      value: available,
      ctaLabel: t('balance.addFunds'),
      ctaIcon: 'add-circle-outline',
      onPress: onAddFunds,
      gradient: [Colors.cardGradientStart, Colors.cardGradientEnd],
    },
    {
      kind: 'allocated',
      greeting: t('balance.lockedShort'),
      label: t('balance.locked'),
      value: allocated,
      ctaLabel: t('balance.viewPlans'),
      ctaIcon: 'list-outline',
      onPress: onViewPlans,
      gradient: [Colors.primaryDark, Colors.primary],
    },
  ];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SNAP_INTERVAL);
    if (idx !== page) setPage(idx);
  };

  return (
    <View>
      <FlatList
        ref={listRef}
        data={cards}
        keyExtractor={(c) => c.kind}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        snapToAlignment="start"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingRight: SCREEN_PADDING }}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        renderItem={({ item }) => (
          <LinearGradient
            colors={item.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, { width: CARD_WIDTH }]}
          >
            <View style={styles.circleLarge} />
            <View style={styles.circleSmall} />

            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>{item.greeting}</Text>
                <Text style={styles.label}>{item.label}</Text>
              </View>
              {item.kind === 'available' && (
                <TouchableOpacity
                  onPress={() => setHidden((h) => !h)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={hidden ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="rgba(255,255,255,0.85)"
                  />
                </TouchableOpacity>
              )}
              {item.kind === 'allocated' && (
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.9)" />
                </View>
              )}
            </View>

            <Text style={styles.balance}>
              {item.kind === 'available' && hidden
                ? t('balance.hidden')
                : formatTzs(item.value)}
            </Text>

            {item.onPress && (
              <TouchableOpacity style={styles.addBtn} onPress={item.onPress}>
                <Ionicons name={item.ctaIcon} size={18} color={Colors.primary} />
                <Text style={styles.addBtnText}>{item.ctaLabel}</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        )}
      />

      <View style={styles.dots}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === page && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    minHeight: 180,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  circleLarge: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -50,
    right: -40,
  },
  circleSmall: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    right: 60,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  greeting: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  label: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  lockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.white,
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
});
