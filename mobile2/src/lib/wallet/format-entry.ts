import { t } from '@/i18n';
import type { WalletEntry } from '@/types/api';

export type FormattedEntry = {
  id: string;
  type: 'deposit' | 'payment';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  reference: string;
};

const KNOWN_KEYS = new Set([
  'topup',
  'topup_refund',
  'allocate_out',
  'allocate_in',
  'contribution',
  'goal_completed',
  'goal_cancelled',
  'goal_cancelled_refund',
  'manual_credit',
  'manual_debit',
]);

export function formatWalletEntry(entry: WalletEntry): FormattedEntry {
  const goalRef =
    typeof entry.noteParams?.goalReference === 'string'
      ? (entry.noteParams.goalReference as string)
      : null;
  const refLabel = goalRef ? ` · ${goalRef}` : '';

  const baseKey = KNOWN_KEYS.has(entry.noteKey) ? entry.noteKey : 'default';
  const description = `${t(`wallet.entry.${baseKey}`)}${baseKey !== 'default' && baseKey !== 'topup' && baseKey !== 'topup_refund' ? refLabel : ''}`;

  const isPositive =
    (entry.kind === 'credit' && entry.bucket === 'available') ||
    (entry.kind === 'credit' && entry.bucket === 'allocated' && entry.noteKey === 'contribution');

  return {
    id: entry.id,
    type: isPositive ? 'deposit' : 'payment',
    amount: entry.amountTzs,
    date: entry.createdAt,
    status: 'completed',
    description,
    reference: goalRef ?? entry.id.slice(0, 8).toUpperCase(),
  };
}
