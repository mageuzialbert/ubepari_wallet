import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { formatTzs } from '@/lib/currency';

export type Transaction = {
  id: string;
  type: 'deposit' | 'payment' | 'refund';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  reference?: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-TZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface TransactionItemProps {
  transaction: Transaction;
}

/**
 * TransactionItem — single row in the transaction history list.
 */
export default function TransactionItem({ transaction }: TransactionItemProps) {
  const isDeposit = transaction.type === 'deposit';
  const isRefund = transaction.type === 'refund';
  const isCredit = isDeposit || isRefund;

  const iconName: React.ComponentProps<typeof Ionicons>['name'] = isCredit
    ? 'arrow-down-circle'
    : 'arrow-up-circle';

  const iconColor = isCredit ? Colors.primary : Colors.error;
  const iconBg = isCredit ? Colors.infoLight : Colors.errorLight;
  const amountPrefix = isCredit ? '+' : '-';
  const amountColor = isCredit ? Colors.primary : Colors.error;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>

      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{formatTzs(transaction.amount)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  description: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  date: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
  },
});
