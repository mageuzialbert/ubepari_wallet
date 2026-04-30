import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import PrimaryButton from '../../components/PrimaryButton';
import {
  cancelGoal,
  getGoalDetail,
  getPayment,
  receiptUrl,
  topupGoal,
} from '@/lib/api/goals';
import { allocateToGoal, getWalletBalance } from '@/lib/api/wallet';
import { tokenStorage } from '@/lib/auth/token-storage';
import { useAuthStore } from '@/state/auth';
import { useRequireKyc } from '@/lib/auth/use-require-kyc';
import { formatTzs } from '@/lib/currency';
import { mapApiError, errorCode } from '@/lib/errors';
import { normalizeTzPhone, formatPhoneDisplay } from '@/lib/phone';
import type { MnoProvider } from '@/types/api';

type PayMode = 'wallet' | 'mno';
type PayState =
  | { kind: 'idle' }
  | { kind: 'allocating' }
  | { kind: 'pushing' }
  | { kind: 'awaiting'; paymentId: string; startedAt: number }
  | { kind: 'success'; amount: number; goalCompleted?: boolean }
  | { kind: 'failed'; message: string };

const PROVIDERS: { id: MnoProvider; label: string }[] = [
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'tigopesa', label: 'Tigo Pesa' },
  { id: 'airtelmoney', label: 'Airtel Money' },
];

const POLL_TIMEOUT_MS = 90_000;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-TZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function InstallmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const requireKyc = useRequireKyc();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const goalQ = useQuery({
    queryKey: ['goal', id],
    queryFn: () => getGoalDetail(id as string),
    enabled: !!id,
  });
  const balanceQ = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: getWalletBalance,
  });

  const [payOpen, setPayOpen] = useState(false);
  const [payMode, setPayMode] = useState<PayMode>('wallet');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [provider, setProvider] = useState<MnoProvider>('mpesa');
  const [phone, setPhone] = useState(
    user?.phone ? formatPhoneDisplay(user.phone) : '',
  );
  const [pay, setPay] = useState<PayState>({ kind: 'idle' });

  const paymentQ = useQuery({
    queryKey: ['payment', pay.kind === 'awaiting' ? pay.paymentId : null],
    queryFn: () =>
      getPayment(pay.kind === 'awaiting' ? pay.paymentId : ''),
    enabled: pay.kind === 'awaiting',
    refetchInterval: 3000,
  });

  const goal = goalQ.data?.goal;
  const productName = goalQ.data?.productName ?? goal?.productSlug ?? '';
  const productImage = goalQ.data?.productImage ?? null;
  const contributions = goalQ.data?.contributions ?? [];
  const remaining = goal ? Math.max(goal.productPrice - goal.contributedTzs, 0) : 0;
  const isComplete = goal?.status === 'completed';
  const isCancelled = goal?.status === 'cancelled';

  const monthlyAmount = useMemo(() => {
    if (!goal) return 0;
    return Math.ceil(goal.productPrice / goal.targetMonths / 1000) * 1000;
  }, [goal]);

  const payOptions = useMemo(() => {
    if (!goal) return [];
    const raw = [
      Math.floor(monthlyAmount * 0.5),
      monthlyAmount,
      monthlyAmount * 2,
      remaining,
    ];
    return raw
      .map((v) => Math.min(v, remaining))
      .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);
  }, [goal, monthlyAmount, remaining]);

  // Resolve polling result
  useEffect(() => {
    if (pay.kind !== 'awaiting' || !paymentQ.data) return;
    const elapsed = Date.now() - pay.startedAt;
    if (paymentQ.data.status === 'success') {
      setPay({ kind: 'success', amount: paymentQ.data.amount_tzs });
      void qc.invalidateQueries({ queryKey: ['goal', id] });
      void qc.invalidateQueries({ queryKey: ['goals'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    } else if (paymentQ.data.status === 'failed') {
      setPay({
        kind: 'failed',
        message: 'Payment was rejected or cancelled. Try again.',
      });
    } else if (elapsed > POLL_TIMEOUT_MS) {
      setPay({
        kind: 'failed',
        message:
          "We couldn't confirm the payment. If your phone was charged, refresh in a moment.",
      });
    }
  }, [paymentQ.data, pay, id, qc]);

  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => cancelGoal(id as string, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goal', id] });
      void qc.invalidateQueries({ queryKey: ['goals'] });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  if (goalQ.isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {goalQ.isError ? mapApiError(goalQ.error) : t('installment.loadFailed')}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorBack}>{t('product.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const walletBalance = balanceQ.data?.availableTzs ?? 0;
  const pct = goal.productPrice > 0
    ? Math.min(goal.contributedTzs / goal.productPrice, 1)
    : 0;
  const pctRound = Math.round(pct * 100);

  const effectiveAmount = customInput.trim()
    ? parseInt(customInput.replace(/[^0-9]/g, ''), 10) || 0
    : selectedAmount ?? 0;

  const closePayModal = () => {
    setPayOpen(false);
    setSelectedAmount(null);
    setCustomInput('');
  };

  const handlePay = async () => {
    if (!effectiveAmount || effectiveAmount < 1000) {
      setPay({ kind: 'failed', message: t('installment.modal.errorMin') });
      return;
    }
    if (effectiveAmount > remaining) {
      setPay({
        kind: 'failed',
        message: t('installment.modal.errorOver', { amount: formatTzs(remaining) }),
      });
      return;
    }
    if (!requireKyc()) return;

    if (payMode === 'wallet') {
      if (walletBalance < effectiveAmount) {
        setPay({
          kind: 'failed',
          message: t('installment.modal.errorInsufficient', {
            wallet: formatTzs(walletBalance),
            amount: formatTzs(effectiveAmount),
          }),
        });
        return;
      }
      setPay({ kind: 'allocating' });
      try {
        const res = await allocateToGoal({
          goalId: id as string,
          amountTzs: effectiveAmount,
        });
        void qc.invalidateQueries({ queryKey: ['goal', id] });
        void qc.invalidateQueries({ queryKey: ['goals'] });
        void qc.invalidateQueries({ queryKey: ['wallet'] });
        setPay({
          kind: 'success',
          amount: effectiveAmount,
          goalCompleted: res.completed,
        });
      } catch (e) {
        const code = errorCode(e);
        if (code === 'kyc_not_approved') {
          setPay({ kind: 'failed', message: t('installment.modal.errorKyc') });
        } else if (code === 'insufficient_available') {
          setPay({
            kind: 'failed',
            message: t('installment.modal.errorAddFunds'),
          });
        } else {
          setPay({ kind: 'failed', message: mapApiError(e) });
        }
      }
    } else {
      const normalized = normalizeTzPhone(phone);
      if (!normalized.valid) {
        setPay({ kind: 'failed', message: t('installment.modal.errorPhone') });
        return;
      }
      setPay({ kind: 'pushing' });
      try {
        const res = await topupGoal({
          goalId: id as string,
          amountTzs: effectiveAmount,
          provider,
          phone: normalized.value,
        });
        setPay({
          kind: 'awaiting',
          paymentId: res.paymentId,
          startedAt: Date.now(),
        });
      } catch (e) {
        setPay({ kind: 'failed', message: mapApiError(e) });
      }
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('installment.cancelTitle'),
      t('installment.cancelBody', { amount: formatTzs(goal.contributedTzs) }),
      [
        { text: t('installment.cancelKeep'), style: 'cancel' },
        {
          text: t('installment.cancelConfirm'),
          style: 'destructive',
          onPress: () => cancelMutation.mutate(undefined),
        },
      ],
    );
  };

  const handleReceipt = async () => {
    if (!goal.receiptNumber) return;
    try {
      const session = await tokenStorage.read();
      if (!session) return;
      const target =
        FileSystem.cacheDirectory + `receipt-${goal.reference}.pdf`;
      const dl = await FileSystem.downloadAsync(receiptUrl(id as string), target, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri, { mimeType: 'application/pdf' });
      }
    } catch (e) {
      Alert.alert(t('installment.receiptError'), mapApiError(e));
    }
  };

  const isBusy =
    pay.kind === 'allocating' || pay.kind === 'pushing' || pay.kind === 'awaiting';

  return (
    <>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('installment.title')}</Text>
          {goal.status === 'active' ? (
            <TouchableOpacity onPress={handleCancel} style={styles.headerAction}>
              <Ionicons name="ellipsis-horizontal" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <View style={styles.pcCard}>
          {productImage ? (
            <Image source={{ uri: productImage }} style={styles.pcImage} />
          ) : (
            <View style={styles.pcIconWrap}>
              <Ionicons name="laptop-outline" size={28} color={Colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.pcName}>{productName}</Text>
            <Text style={styles.pcBrand}>
              {goal.reference} · {t('product.termMonths', { count: goal.targetMonths })}
            </Text>
          </View>
          {isComplete && (
            <View style={styles.completeBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.completeBadgeText}>{t('installment.paid')}</Text>
            </View>
          )}
          {isCancelled && (
            <View style={[styles.completeBadge, { backgroundColor: Colors.errorLight }]}>
              <Text style={[styles.completeBadgeText, { color: Colors.error }]}>
                {t('installment.cancelled')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>{t('installment.progress')}</Text>
            <Text style={styles.progressPct}>{pctRound}%</Text>
          </View>

          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pctRound}%` }]} />
          </View>

          <View style={styles.amountsRow}>
            <View>
              <Text style={styles.amountLabel}>{t('installment.amountPaid')}</Text>
              <Text style={[styles.amountValue, { color: Colors.success }]}>
                {formatTzs(goal.contributedTzs)}
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.amountLabel}>{t('installment.amountTotal')}</Text>
              <Text style={styles.amountValue}>{formatTzs(goal.productPrice)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amountLabel}>{t('installment.amountRemaining')}</Text>
              <Text
                style={[
                  styles.amountValue,
                  { color: isComplete ? Colors.success : Colors.error },
                ]}
              >
                {isComplete ? t('installment.fullyPaid') : formatTzs(remaining)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{t('installment.details')}</Text>
          {[
            { label: t('installment.term'), value: t('product.termMonths', { count: goal.targetMonths }) },
            { label: t('installment.monthlyTarget'), value: formatTzs(goal.monthlyTarget) },
            { label: t('installment.walletBalance'), value: formatTzs(walletBalance) },
            {
              label: t('installment.status'),
              value:
                goal.status === 'active'
                  ? t('orders.statusActive')
                  : goal.status === 'completed'
                  ? t('orders.statusCompleted')
                  : t('orders.statusCancelled'),
            },
          ].map((item) => (
            <View key={item.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text style={styles.detailValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('installment.history')}</Text>
          {contributions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>{t('installment.noHistory')}</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {contributions.map((c) => (
                <View key={c.id} style={styles.historyItem}>
                  <View
                    style={[
                      styles.historyIconWrap,
                      c.status === 'failed' && { backgroundColor: Colors.errorLight },
                      c.status === 'pending' && { backgroundColor: Colors.warningLight },
                    ]}
                  >
                    <Ionicons
                      name={
                        c.status === 'success'
                          ? 'checkmark-circle'
                          : c.status === 'failed'
                          ? 'close-circle'
                          : 'time-outline'
                      }
                      size={18}
                      color={
                        c.status === 'success'
                          ? Colors.success
                          : c.status === 'failed'
                          ? Colors.error
                          : Colors.warning
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDesc}>
                      {t('installment.paymentLabel', {
                        provider:
                          c.provider === 'mpesa'
                            ? t('installment.providerLabelMpesa')
                            : c.provider === 'tigopesa'
                            ? t('installment.providerLabelTigo')
                            : c.provider === 'airtelmoney'
                            ? t('installment.providerLabelAirtel')
                            : t('installment.providerWallet'),
                      })}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(c.settledAt ?? c.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.historyAmount,
                      c.status === 'success' && { color: Colors.success },
                      c.status === 'failed' && { color: Colors.error },
                    ]}
                  >
                    {c.status === 'success' ? '+' : c.status === 'pending' ? '~' : '×'}
                    {formatTzs(c.amountTzs)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {isComplete && goal.receiptNumber && (
          <TouchableOpacity style={styles.receiptBtn} onPress={handleReceipt}>
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <Text style={styles.receiptText}>{t('installment.downloadReceipt')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!isComplete && !isCancelled && (
        <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.ctaBalance}>
            <Text style={styles.ctaBalanceLabel}>{t('installment.walletBalanceLabel')}</Text>
            <Text style={styles.ctaBalanceValue}>{formatTzs(walletBalance)}</Text>
          </View>
          <PrimaryButton
            title={t('installment.ctaPay')}
            onPress={() => {
              setPay({ kind: 'idle' });
              setPayOpen(true);
            }}
            size="lg"
          />
        </View>
      )}

      {/* Pay modal */}
      <Modal
        visible={payOpen}
        transparent
        animationType="slide"
        onRequestClose={closePayModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={isBusy ? undefined : closePayModal}
          />
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.modalTitle}>{t('installment.modal.title')}</Text>
            <Text style={styles.modalSub}>
              {t('installment.modal.summary', {
                remaining: formatTzs(remaining),
                wallet: formatTzs(walletBalance),
              })}
            </Text>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeChip, payMode === 'wallet' && styles.modeChipActive]}
                onPress={() => setPayMode('wallet')}
                disabled={isBusy}
              >
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color={payMode === 'wallet' ? Colors.white : Colors.textPrimary}
                />
                <Text
                  style={[
                    styles.modeChipText,
                    payMode === 'wallet' && styles.modeChipTextActive,
                  ]}
                >
                  {t('installment.modal.modeWallet')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, payMode === 'mno' && styles.modeChipActive]}
                onPress={() => setPayMode('mno')}
                disabled={isBusy}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={16}
                  color={payMode === 'mno' ? Colors.white : Colors.textPrimary}
                />
                <Text
                  style={[
                    styles.modeChipText,
                    payMode === 'mno' && styles.modeChipTextActive,
                  ]}
                >
                  {t('installment.modal.modeMno')}
                </Text>
              </TouchableOpacity>
            </View>

            {payMode === 'mno' && (
              <>
                <Text style={styles.modalOptions}>{t('installment.modal.provider')}</Text>
                <View style={styles.providersRow}>
                  {PROVIDERS.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.providerPill,
                        provider === p.id && styles.providerPillActive,
                      ]}
                      onPress={() => setProvider(p.id)}
                      disabled={isBusy}
                    >
                      <Text
                        style={[
                          styles.providerPillText,
                          provider === p.id && styles.providerPillTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalOptions}>{t('installment.modal.phone')}</Text>
                <View style={styles.customInputWrap}>
                  <Ionicons name="call-outline" size={16} color={Colors.textMuted} />
                  <TextInput
                    style={styles.customInput}
                    placeholder={t('login.phonePlaceholder')}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    editable={!isBusy}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </>
            )}

            <Text style={styles.modalOptions}>{t('installment.modal.chooseAmount')}</Text>
            <View style={styles.amountOptions}>
              {payOptions.map((amt) => {
                const isMonthly = amt === monthlyAmount;
                const isFull = amt === remaining && amt !== monthlyAmount;
                const label = isFull
                  ? t('installment.modal.labelFull')
                  : isMonthly
                  ? t('installment.modal.labelMonthly')
                  : amt < monthlyAmount
                  ? t('installment.modal.labelHalf')
                  : amt === monthlyAmount * 2
                  ? t('installment.modal.label2x')
                  : amt === monthlyAmount * 3
                  ? t('installment.modal.label3x')
                  : '';
                const active = selectedAmount === amt && !customInput;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[styles.amountChip, active && styles.amountChipActive]}
                    disabled={isBusy}
                    onPress={() => {
                      setSelectedAmount(amt);
                      setCustomInput('');
                    }}
                  >
                    <Text
                      style={[
                        styles.amountChipText,
                        active && styles.amountChipTextActive,
                      ]}
                    >
                      {formatTzs(amt)}
                    </Text>
                    {!!label && (
                      <Text
                        style={[
                          styles.amountChipLabel,
                          active && styles.amountChipLabelActive,
                        ]}
                      >
                        {label}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.modalOptions}>{t('installment.modal.customAmount')}</Text>
            <View
              style={[
                styles.customInputWrap,
                customInput ? styles.customInputWrapActive : null,
              ]}
            >
              <Text style={styles.customInputPrefix}>TZS</Text>
              <TextInput
                style={styles.customInput}
                placeholder={t('installment.modal.customPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={customInput}
                onChangeText={(t) => {
                  setCustomInput(t);
                  if (t) setSelectedAmount(null);
                }}
                editable={!isBusy}
              />
            </View>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 16 }]}>
              <PrimaryButton
                title={
                  isBusy
                    ? t('common.processing')
                    : effectiveAmount
                    ? payMode === 'wallet'
                      ? t('installment.modal.ctaWallet', { amount: formatTzs(effectiveAmount) })
                      : t('installment.modal.ctaMno', { amount: formatTzs(effectiveAmount) })
                    : t('installment.modal.ctaSelect')
                }
                onPress={handlePay}
                disabled={!effectiveAmount || isBusy}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Awaiting MNO callback */}
      <Modal
        visible={pay.kind === 'pushing' || pay.kind === 'awaiting' || pay.kind === 'allocating'}
        transparent
        animationType="fade"
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.alertTitle}>
              {pay.kind === 'allocating'
                ? t('installment.allocating')
                : t('installment.approveTitle')}
            </Text>
            {pay.kind !== 'allocating' && (
              <Text style={styles.alertMessage}>{t('installment.approveBody')}</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Success */}
      <Modal visible={pay.kind === 'success'} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconWrap, { backgroundColor: Colors.successLight }]}>
              <Ionicons
                name={pay.kind === 'success' && pay.goalCompleted ? 'trophy' : 'checkmark-circle'}
                size={42}
                color={Colors.success}
              />
            </View>
            <Text style={styles.alertTitle}>
              {pay.kind === 'success' && pay.goalCompleted
                ? t('installment.completeTitle')
                : t('installment.successTitle')}
            </Text>
            <Text style={styles.alertMessage}>
              {pay.kind === 'success'
                ? pay.goalCompleted
                  ? t('installment.completedBody', { amount: formatTzs(pay.amount) })
                  : t('installment.successBody', { amount: formatTzs(pay.amount) })
                : ''}
            </Text>
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: Colors.success }]}
              onPress={() => {
                setPay({ kind: 'idle' });
                closePayModal();
              }}
            >
              <Text style={styles.alertBtnText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Failed */}
      <Modal visible={pay.kind === 'failed'} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconWrap, { backgroundColor: Colors.errorLight }]}>
              <Ionicons name="close-circle" size={42} color={Colors.error} />
            </View>
            <Text style={styles.alertTitle}>{t('installment.failTitle')}</Text>
            <Text style={styles.alertMessage}>
              {pay.kind === 'failed' ? pay.message : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={[styles.alertBtn, { backgroundColor: Colors.surfaceAlt, flex: 1 }]}
                onPress={() => setPay({ kind: 'idle' })}
              >
                <Text style={[styles.alertBtnText, { color: Colors.textPrimary }]}>{t('common.close')}</Text>
              </TouchableOpacity>
              {payMode === 'wallet' && pay.kind === 'failed' &&
                pay.message === t('installment.modal.errorAddFunds') && (
                <TouchableOpacity
                  style={[styles.alertBtn, { backgroundColor: Colors.primary, flex: 1 }]}
                  onPress={() => {
                    setPay({ kind: 'idle' });
                    closePayModal();
                    router.push('/add-funds');
                  }}
                >
                  <Text style={styles.alertBtnText}>{t('addFunds.title')}</Text>
                </TouchableOpacity>
              )}
            </View>
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
  content: { paddingHorizontal: 20, gap: 16 },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  pcCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pcImage: { width: 52, height: 52, borderRadius: 8 },
  pcIconWrap: {
    width: 52,
    height: 52,
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
  pcBrand: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completeBadgeText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.success,
  },
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    gap: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  progressPct: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
  },
  track: {
    height: 10,
    backgroundColor: Colors.borderLight,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 5,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: 3,
  },
  amountValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  detailCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  detailTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  detailValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  historySection: { gap: 12 },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  emptyHistory: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  historyList: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDesc: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  historyDate: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  historyAmount: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  receiptText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  ctaBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaBalanceLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  ctaBalanceValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
  },
  modal: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  modalSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: -6,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeChipText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  modeChipTextActive: {
    color: Colors.white,
  },
  providersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  providerPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  providerPillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  providerPillText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  providerPillTextActive: {
    color: Colors.primary,
  },
  modalOptions: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  amountOptions: {
    gap: 10,
  },
  amountChip: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  amountChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  amountChipText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  amountChipTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.semiBold,
  },
  amountChipLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  amountChipLabelActive: {
    color: Colors.primary,
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    gap: 8,
  },
  customInputWrapActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  customInputPrefix: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  customInput: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    padding: 0,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  alertBox: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  alertIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  alertMessage: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertBtn: {
    marginTop: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertBtnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
});
