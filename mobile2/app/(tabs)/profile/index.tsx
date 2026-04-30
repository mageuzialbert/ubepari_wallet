import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../../constants/colors';
import { Fonts, FontSizes } from '../../../constants/typography';
import PrimaryButton from '../../../components/PrimaryButton';
import { useAuthStore } from '@/state/auth';
import { getWalletBalance } from '@/lib/api/wallet';
import { listGoals } from '@/lib/api/goals';
import { formatTzs } from '@/lib/currency';
import { formatPhoneDisplay } from '@/lib/phone';
import { currentLocale, setLocale, type Locale } from '@/lib/locale';
import { apiBaseUrl } from '@/lib/api/client';

function openWeb(path: string) {
  const url = `${apiBaseUrl()}/${currentLocale()}${path}`;
  void WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    toolbarColor: '#172FAB',
    controlsColor: '#FFFFFF',
  });
}

type SettingItem = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value?: string;
  valueIcon?: {
    name: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
  };
  onPress?: () => void;
  destructive?: boolean;
};

function initialsOf(user: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!user) return 'U';
  const f = user.firstName?.[0] ?? '';
  const l = user.lastName?.[0] ?? '';
  return (f + l).toUpperCase() || 'U';
}

function fullNameOf(user: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!user) return 'Ubepari user';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Ubepari user';
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { t } = useTranslation();

  const balanceQ = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: getWalletBalance,
  });
  const goalsQ = useQuery({
    queryKey: ['goals'],
    queryFn: listGoals,
  });

  const [logoutModal, setLogoutModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [locale, setCurrLocale] = useState<Locale>(currentLocale());

  const balance = balanceQ.data?.availableTzs ?? 0;
  const activeGoals = (goalsQ.data ?? []).filter((g) => g.status === 'active').length;
  const totalGoals = (goalsQ.data ?? []).length;

  const handleLogout = () => setLogoutModal(true);

  const confirmLogout = async () => {
    setLogoutModal(false);
    await signOut();
    qc.clear();
    router.replace('/(auth)/splash');
  };

  const handleLanguageChange = async (next: Locale) => {
    setLangModal(false);
    if (next === locale) return;
    await setLocale(next);
    setCurrLocale(next);
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['goals'] });
  };

  const settingsGroups: { title: string; items: SettingItem[] }[] = [
    {
      title: t('profile.groupAccount'),
      items: [
        {
          label: t('profile.editProfile'),
          icon: 'person-outline',
          onPress: () => router.push('/(tabs)/profile/edit' as const),
        },
        {
          label: t('profile.verifyKyc'),
          icon: 'shield-checkmark-outline',
          value:
            user?.kycStatus === 'approved'
              ? undefined
              : user?.kycStatus === 'pending'
              ? t('profile.kycPending')
              : user?.kycStatus === 'rejected'
              ? t('profile.kycRejected')
              : t('profile.kycNone'),
          valueIcon:
            user?.kycStatus === 'approved'
              ? { name: 'checkmark-circle', color: Colors.success }
              : undefined,
          onPress: () => router.push('/(auth)/kyc' as const),
        },
        {
          label: t('profile.language'),
          icon: 'language-outline',
          value: locale === 'sw' ? t('profile.swahili') : t('profile.english'),
          onPress: () => setLangModal(true),
        },
      ],
    },
    {
      title: t('profile.groupPrivacy'),
      items: [
        {
          label: t('profile.exportData'),
          icon: 'download-outline',
          onPress: () =>
            Alert.alert(
              t('profile.exportComingSoon'),
              t('profile.exportComingSoonBody'),
            ),
        },
        {
          label: t('profile.deleteAccount'),
          icon: 'trash-outline',
          onPress: () => router.push('/(tabs)/profile/delete' as const),
          destructive: true,
        },
      ],
    },
    {
      title: t('profile.groupSupport'),
      items: [
        {
          label: t('profile.chatBepari'),
          icon: 'chatbubble-ellipses-outline',
          onPress: () => router.push('/chat'),
        },
        {
          label: t('profile.about'),
          icon: 'information-circle-outline',
          onPress: () => openWeb('/about'),
        },
        {
          label: t('profile.terms'),
          icon: 'document-text-outline',
          onPress: () => openWeb('/legal/terms'),
        },
        {
          label: t('profile.privacy'),
          icon: 'shield-outline',
          onPress: () => openWeb('/legal/privacy'),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>{t('profile.title')}</Text>

      <View style={styles.userCard}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarInitials}>{initialsOf(user)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {fullNameOf(user)}
            </Text>
            {user?.kycStatus === 'approved' && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={Colors.success}
                style={styles.verifiedTick}
              />
            )}
          </View>
          <Text style={styles.userPhone}>
            {user?.phone ? formatPhoneDisplay(user.phone) : ''}
          </Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>
        {user?.kycStatus !== 'approved' && (
          <View style={styles.memberBadge}>
            <Ionicons name="star" size={12} color={Colors.warning} />
            <Text style={styles.memberText}>{t('profile.member')}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{formatTzs(balance)}</Text>
          <Text style={styles.statLabel}>{t('profile.statWallet')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{activeGoals}</Text>
          <Text style={styles.statLabel}>{t('profile.statActivePlans')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{totalGoals}</Text>
          <Text style={styles.statLabel}>{t('profile.statAllTime')}</Text>
        </View>
      </View>

      {settingsGroups.map((group) => (
        <View key={group.title} style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.settingsCard}>
            {group.items.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.settingRow,
                  i < group.items.length - 1 && styles.settingBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View
                    style={[
                      styles.settingIconWrap,
                      item.destructive && {
                        backgroundColor: Colors.errorLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={item.destructive ? Colors.error : Colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.settingLabel,
                      item.destructive && { color: Colors.error },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  {item.valueIcon ? (
                    <Ionicons
                      name={item.valueIcon.name}
                      size={18}
                      color={item.valueIcon.color}
                    />
                  ) : item.value ? (
                    <Text style={styles.settingValue}>{item.value}</Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.logoutSection}>
        <PrimaryButton
          title={t('profile.logout')}
          onPress={handleLogout}
          variant="outline"
          size="lg"
        />
      </View>

      {/* Logout */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={30} color={Colors.error} />
            </View>
            <Text style={styles.modalTitle}>{t('profile.logoutTitle')}</Text>
            <Text style={styles.modalBody}>{t('profile.logoutBody')}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setLogoutModal(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDanger]}
                onPress={confirmLogout}
              >
                <Text style={styles.modalBtnDangerText}>{t('profile.logout')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language */}
      <Modal visible={langModal} transparent animationType="fade" onRequestClose={() => setLangModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile.languageTitle')}</Text>
            <View style={{ width: '100%', gap: 8 }}>
              {(['en', 'sw'] as Locale[]).map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[
                    styles.langOption,
                    locale === l && styles.langOptionActive,
                  ]}
                  onPress={() => handleLanguageChange(l)}
                >
                  <Text
                    style={[
                      styles.langOptionText,
                      locale === l && styles.langOptionTextActive,
                    ]}
                  >
                    {l === 'en' ? t('profile.english') : t('profile.swahili')}
                  </Text>
                  {locale === l && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  pageTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  verifiedTick: {
    marginLeft: 6,
  },
  userPhone: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  userEmail: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  memberText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.warning,
  },
  statsRow: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  statValue: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  settingsGroup: { gap: 8 },
  groupTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 2,
  },
  settingsCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
    flexGrow: 1,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingLabel: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  settingValue: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  logoutSection: {
    gap: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.lg,
    color: Colors.textPrimary,
  },
  modalBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: Colors.surfaceAlt,
  },
  modalBtnSecondaryText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  modalBtnDanger: {
    backgroundColor: Colors.error,
  },
  modalBtnDangerText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
  },
  langOptionActive: {
    backgroundColor: Colors.primary + '12',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  langOptionText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  langOptionTextActive: {
    color: Colors.primary,
  },
});
