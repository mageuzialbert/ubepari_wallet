import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../constants/colors';
import { Fonts, FontSizes } from '../../constants/typography';
import { submitKyc } from '@/lib/api/kyc';
import { useAuthStore } from '@/state/auth';
import { mapApiError } from '@/lib/errors';

type DocAsset = { uri: string; name: string; mimeType: string };

export default function KycScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  const [nida, setNida] = useState('');
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [workplace, setWorkplace] = useState('');
  const [doc, setDoc] = useState<DocAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pickImage = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError(t('kyc.permissionDenied'));
        return;
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
            });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setDoc({
        uri: asset.uri,
        name: asset.fileName ?? 'id.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    } catch (e) {
      setError(mapApiError(e));
    }
  };

  const pickPdf = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setDoc({
        uri: asset.uri,
        name: asset.name ?? 'id.pdf',
        mimeType: asset.mimeType ?? 'application/pdf',
      });
    } catch (e) {
      setError(mapApiError(e));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const cleanedNida = nida.replace(/[\s-]/g, '');
    if (!/^\d{20}$/.test(cleanedNida)) {
      setError(t('kyc.errorNida'));
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('kyc.errorName'));
      return;
    }
    if (!doc) {
      setError(t('kyc.errorDoc'));
      return;
    }
    setLoading(true);
    try {
      await submitKyc({
        nida: cleanedNida,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        workplace: workplace.trim() || undefined,
        document: doc,
      });
      await refreshMe();
      setDone(true);
    } catch (e) {
      setError(mapApiError(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.flex}>
        <StatusBar style="dark" />
        <View style={[styles.successWrap, { paddingTop: insets.top + 80 }]}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </View>
          <Text style={styles.successTitle}>{t('kyc.successTitle')}</Text>
          <Text style={styles.successBody}>{t('kyc.successBody')}</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{t('kyc.successCta')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status = user?.kycStatus ?? 'none';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('kyc.headerTitle')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('kyc.title')}</Text>
        <Text style={styles.subtitle}>{t('kyc.subtitle')}</Text>

        {status === 'rejected' && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={20} color={Colors.warning} />
            <Text style={styles.warningText}>{t('kyc.rejected')}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>{t('kyc.nidaLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={t('kyc.nidaPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={nida}
              onChangeText={setNida}
              keyboardType="number-pad"
              maxLength={28}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>{t('kyc.firstNameLabel')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={t('kyc.firstNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>{t('kyc.lastNameLabel')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={t('kyc.lastNamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('kyc.workplaceLabel')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={t('kyc.workplacePlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={workplace}
              onChangeText={setWorkplace}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('kyc.docLabel')}</Text>

          {doc?.uri && doc.mimeType.startsWith('image/') ? (
            <View style={styles.docPreview}>
              <Image source={{ uri: doc.uri }} style={styles.docImage} />
              <Text style={styles.docName}>{doc.name}</Text>
            </View>
          ) : doc ? (
            <View style={styles.docCard}>
              <Ionicons name="document-text-outline" size={24} color={Colors.textSecondary} />
              <Text style={styles.docName}>{doc.name}</Text>
            </View>
          ) : null}

          <View style={styles.row2}>
            <TouchableOpacity
              style={[styles.outlineBtn, { flex: 1 }]}
              onPress={() => pickImage('camera')}
              disabled={loading}
            >
              <Ionicons name="camera-outline" size={18} color={Colors.primary} />
              <Text style={styles.outlineText}>{t('kyc.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { flex: 1 }]}
              onPress={() => pickImage('library')}
              disabled={loading}
            >
              <Ionicons name="images-outline" size={18} color={Colors.primary} />
              <Text style={styles.outlineText}>{t('kyc.fromLibrary')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={pickPdf} disabled={loading} style={styles.pdfBtn}>
            <Ionicons name="document-attach-outline" size={16} color={Colors.primary} />
            <Text style={styles.pdfText}>{t('kyc.uploadPdf')}</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.btnText}>{t('kyc.submit')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('kyc.doThisLater')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  backBtn: { padding: 6 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
  },
  body: {
    paddingHorizontal: 24,
    paddingBottom: 80,
    gap: 18,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.warningLight,
    padding: 14,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  field: { gap: 7 },
  row2: { flexDirection: 'row', gap: 10 },
  label: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 14,
  },
  docPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  docImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  docName: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  outlineText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  pdfText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  errorText: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.sm,
    color: Colors.error,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: Fonts.medium,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  successWrap: {
    flex: 1,
    paddingHorizontal: 32,
    gap: 16,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  successBody: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
});
