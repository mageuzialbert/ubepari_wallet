import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import PrimaryButton from '../components/PrimaryButton';
import { walletTopup, getWalletBalance } from '@/lib/api/wallet';
import { getPayment } from '@/lib/api/goals';
import { useAuthStore } from '@/state/auth';
import { normalizeTzPhone, formatPhoneDisplay } from '@/lib/phone';
import { formatTzs } from '@/lib/currency';
import { mapApiError } from '@/lib/errors';
import type { MnoProvider } from '@/types/api';

const PRESET_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];
const MIN_AMOUNT = 1_000;
const MAX_AMOUNT = 5_000_000;
const POLL_TIMEOUT_MS = 90_000;

const PROVIDER_IDS: MnoProvider[] = ['mpesa', 'tigopesa', 'airtelmoney'];

type PollState =
  | { kind: 'idle' }
  | { kind: 'pushing' }
  | { kind: 'awaiting'; paymentId: string; startedAt: number }
  | { kind: 'success'; amount: number }
  | { kind: 'failed'; message: string };

export default function AddFundsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const balanceQ = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: getWalletBalance,
  });

  const [provider, setProvider] = useState<MnoProvider>('mpesa');
  const [phone, setPhone] = useState(
    user?.phone ? formatPhoneDisplay(user.phone) : '',
  );
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [poll, setPoll] = useState<PollState>({ kind: 'idle' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveAmount = customInput.trim()
    ? parseInt(customInput.replace(/[^0-9]/g, ''), 10) || 0
    : selectedAmount ?? 0;

  const balance = balanceQ.data?.availableTzs ?? 0;

  // Poll the payment until success/failed/timeout while in awaiting state.
  const paymentQ = useQuery({
    queryKey: ['payment', poll.kind === 'awaiting' ? poll.paymentId : null],
    queryFn: () =>
      getPayment(
        poll.kind === 'awaiting' ? poll.paymentId : '',
      ),
    enabled: poll.kind === 'awaiting',
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (poll.kind !== 'awaiting' || !paymentQ.data) return;
    const elapsed = Date.now() - poll.startedAt;
    if (paymentQ.data.status === 'success') {
      setPoll({ kind: 'success', amount: effectiveAmount });
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    } else if (paymentQ.data.status === 'failed') {
      setPoll({
        kind: 'failed',
        message: t('addFunds.failGeneric'),
      });
    } else if (elapsed > POLL_TIMEOUT_MS) {
      setPoll({
        kind: 'failed',
        message: t('addFunds.failTimeout'),
      });
    }
  }, [paymentQ.data, poll, effectiveAmount, qc, t]);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!effectiveAmount || effectiveAmount < MIN_AMOUNT) {
      setErrorMsg(t('addFunds.errorMin', { amount: formatTzs(MIN_AMOUNT) }));
      return;
    }
    if (effectiveAmount > MAX_AMOUNT) {
      setErrorMsg(t('addFunds.errorMax', { amount: formatTzs(MAX_AMOUNT) }));
      return;
    }
    const normalized = normalizeTzPhone(phone);
    if (!normalized.valid) {
      setErrorMsg(t('addFunds.errorPhone'));
      return;
    }

    setPoll({ kind: 'pushing' });
    try {
      const res = await walletTopup({
        amountTzs: effectiveAmount,
        provider,
        phone: normalized.value,
      });
      setPoll({ kind: 'awaiting', paymentId: res.paymentId, startedAt: Date.now() });
    } catch (e) {
      setPoll({ kind: 'idle' });
      setErrorMsg(mapApiError(e));
    }
  };

  const closeAndRefresh = () => {
    setPoll({ kind: 'idle' });
    setSelectedAmount(null);
    setCustomInput('');
    void qc.invalidateQueries({ queryKey: ['wallet'] });
    router.back();
  };

  const isBusy = poll.kind === 'pushing' || poll.kind === 'awaiting';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('addFunds.title')}</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.balanceBanner}>
          <Text style={styles.balanceBannerLabel}>{t('addFunds.currentBalance')}</Text>
          <Text style={styles.balanceBannerValue}>{formatTzs(balance)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addFunds.payWith')}</Text>
          <View style={styles.providersRow}>
            {PROVIDER_IDS.map((id) => {
              const active = id === provider;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.providerChip, active && styles.providerChipActive]}
                  onPress={() => setProvider(id)}
                  disabled={isBusy}
                >
                  <Text style={[styles.providerLabel, active && styles.providerLabelActive]}>
                    {t(`addFunds.providers.${id}`)}
                  </Text>
                  <Text style={[styles.providerSub, active && styles.providerSubActive]}>
                    {t(`addFunds.providers.${id}Sub`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addFunds.phoneLabel')}</Text>
          <View style={[styles.inputWrap, isBusy && { opacity: 0.6 }]}>
            <Ionicons name="call-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder={t('login.phonePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoCorrect={false}
              autoCapitalize="none"
              editable={!isBusy}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addFunds.chooseAmount')}</Text>
          <View style={styles.presetsGrid}>
            {PRESET_AMOUNTS.map((amt) => {
              const isActive = selectedAmount === amt && !customInput;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[styles.presetChip, isActive && styles.presetChipActive]}
                  disabled={isBusy}
                  onPress={() => {
                    setSelectedAmount(amt);
                    setCustomInput('');
                  }}
                >
                  <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                    {formatTzs(amt)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('addFunds.customAmount')}</Text>
          <View style={[styles.inputWrap, customInput ? styles.inputWrapActive : null]}>
            <Text style={styles.inputPrefix}>TZS</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addFunds.customPlaceholder')}
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
        </View>

        {effectiveAmount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addFunds.amountToAdd')}</Text>
              <Text style={styles.summaryValue}>{formatTzs(effectiveAmount)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('addFunds.newBalance')}</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                {formatTzs(balance + effectiveAmount)}
              </Text>
            </View>
          </View>
        )}

        {errorMsg && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.noteText}>{t('addFunds.note')}</Text>
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          title={
            isBusy
              ? t('addFunds.ctaProcessing')
              : effectiveAmount > 0
              ? t('addFunds.ctaSend', { amount: formatTzs(effectiveAmount) })
              : t('addFunds.ctaIdle')
          }
          onPress={handleSubmit}
          disabled={effectiveAmount <= 0 || isBusy}
          size="lg"
        />
      </View>

      {/* Awaiting modal */}
      <Modal
        visible={poll.kind === 'pushing' || poll.kind === 'awaiting'}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.alertTitle}>{t('addFunds.approveTitle')}</Text>
            <Text style={styles.alertMessage}>
              {t('addFunds.approveBody', {
                phone:
                  formatPhoneDisplay(
                    normalizeTzPhone(phone).valid
                      ? normalizeTzPhone(phone).value
                      : phone,
                  ) || '',
              })}
            </Text>
            <Text style={styles.alertHint}>{t('addFunds.approveHint')}</Text>
          </View>
        </View>
      </Modal>

      {/* Success modal */}
      <Modal
        visible={poll.kind === 'success'}
        transparent
        animationType="fade"
        onRequestClose={closeAndRefresh}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconWrap, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            </View>
            <Text style={styles.alertTitle}>{t('addFunds.successTitle')}</Text>
            <Text style={styles.alertMessage}>
              {poll.kind === 'success'
                ? t('addFunds.successBody', { amount: formatTzs(poll.amount) })
                : ''}
            </Text>
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: Colors.success }]}
              onPress={closeAndRefresh}
            >
              <Text style={styles.alertBtnText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Failed modal */}
      <Modal
        visible={poll.kind === 'failed'}
        transparent
        animationType="fade"
        onRequestClose={() => setPoll({ kind: 'idle' })}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconWrap, { backgroundColor: Colors.errorLight }]}>
              <Ionicons name="close-circle" size={48} color={Colors.error} />
            </View>
            <Text style={styles.alertTitle}>{t('addFunds.failTitle')}</Text>
            <Text style={styles.alertMessage}>
              {poll.kind === 'failed' ? poll.message : ''}
            </Text>
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setPoll({ kind: 'idle' })}
            >
              <Text style={styles.alertBtnText}>{t('common.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 120, gap: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
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
  balanceBanner: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 20,
    gap: 4,
    alignItems: 'center',
  },
  balanceBannerLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  balanceBannerValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.white,
  },
  section: { gap: 12 },
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  providersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  providerChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  providerChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  providerLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  providerLabelActive: {
    color: Colors.primary,
  },
  providerSub: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  providerSubActive: {
    color: Colors.primaryLight,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetChip: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  presetChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12',
  },
  presetText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  presetTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.semiBold,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: Colors.white,
    gap: 10,
  },
  inputWrapActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  inputPrefix: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    padding: 0,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.errorLight,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    flex: 1,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
  alertHint: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
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
