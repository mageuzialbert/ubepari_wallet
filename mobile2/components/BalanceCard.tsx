import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { formatTzs } from '@/lib/currency';

interface BalanceCardProps {
  balance: number;
  onAddFunds?: () => void;
  userName?: string;
}

const { width } = Dimensions.get('window');

/**
 * BalanceCard — large gradient wallet balance card shown on Home & Wallet screens.
 */
export default function BalanceCard({
  balance,
  onAddFunds,
  userName,
}: BalanceCardProps) {
  const [hidden, setHidden] = useState(true);

  return (
    <LinearGradient
      colors={[Colors.cardGradientStart, Colors.cardGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Decorative circles */}
      <View style={styles.circleLarge} />
      <View style={styles.circleSmall} />

      {/* Top row */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>
            {userName ? `Hello, ${userName.split(' ')[0]}` : 'My Wallet'}
          </Text>
          <Text style={styles.label}>Available Balance</Text>
        </View>
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
      </View>

      {/* Balance */}
      <Text style={styles.balance}>
        {hidden ? 'TZS ••••••' : formatTzs(balance)}
      </Text>

      {/* Add funds button */}
      {onAddFunds && (
        <TouchableOpacity style={styles.addBtn} onPress={onAddFunds}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add Funds</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 24,
    marginHorizontal: 0,
    minHeight: 180,
    overflow: 'hidden',
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
});
