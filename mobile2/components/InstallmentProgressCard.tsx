import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { formatTzs } from '@/lib/currency';

interface InstallmentProgressCardProps {
  /** Display title — usually the product name */
  title: string;
  /** Subtitle line — usually the brand or reference */
  subtitle?: string;
  paid: number;
  total: number;
  onPress?: () => void;
  compact?: boolean;
}

/**
 * InstallmentProgressCard — shows paid / remaining amounts with a progress bar.
 */
export default function InstallmentProgressCard({
  title,
  subtitle,
  paid,
  total,
  onPress,
  compact = false,
}: InstallmentProgressCardProps) {
  const progress = total > 0 ? Math.min(paid / total, 1) : 0;
  const remaining = Math.max(total - paid, 0);
  const pct = Math.round(progress * 100);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pcName} numberOfLines={1}>
              {title}
            </Text>
            {!compact && subtitle && <Text style={styles.brand}>{subtitle}</Text>}
          </View>
        </View>
        <View style={styles.pctBadge}>
          <Text style={styles.pctText}>{pct}%</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>

      {!compact && (
        <View style={styles.amounts}>
          <View>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={styles.amountValue}>{formatTzs(paid)}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text style={[styles.amountValue, { color: Colors.error }]}>
              {formatTzs(remaining)}
            </Text>
          </View>
        </View>
      )}

      {compact && (
        <View style={styles.compactAmounts}>
          <Text style={styles.compactText}>
            {formatTzs(paid)} of {formatTzs(total)}
          </Text>
          {onPress && (
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pcName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  brand: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pctBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pctText: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  track: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 4,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: Colors.border,
  },
  amountLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  amountValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.success,
  },
  compactAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
});
