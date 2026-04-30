import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { formatTzs } from '@/lib/currency';

interface OrderCardProps {
  title: string;
  subtitle?: string;
  imageUri?: string | null;
  paid: number;
  total: number;
  status: 'active' | 'completed' | 'cancelled';
  onPress?: () => void;
}

/**
 * OrderCard — displays a single order/plan row in the Orders list.
 */
export default function OrderCard({
  title,
  subtitle,
  imageUri,
  paid,
  total,
  status,
  onPress,
}: OrderCardProps) {
  const [imgError, setImgError] = useState(false);
  const progress = total > 0 ? Math.min(paid / total, 1) : 1;
  const statusLabel =
    status === 'completed' ? 'Paid' : status === 'cancelled' ? 'Cancelled' : 'Active';
  const pillBg =
    status === 'completed'
      ? Colors.successLight
      : status === 'cancelled'
      ? Colors.errorLight
      : Colors.infoLight;
  const pillColor =
    status === 'completed'
      ? Colors.success
      : status === 'cancelled'
      ? Colors.error
      : Colors.primary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.thumb}>
        {imgError || !imageUri ? (
          <Ionicons name="laptop-outline" size={28} color={Colors.textMuted} />
        ) : (
          <Image
            source={{ uri: imageUri }}
            style={styles.thumbImg}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
            <Text style={[styles.statusText, { color: pillColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.price}>
          {subtitle ? `${subtitle} · ` : ''}
          {formatTzs(total)}
        </Text>

        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]}
          />
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
  },
  price: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  track: {
    height: 5,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 3,
  },
});
