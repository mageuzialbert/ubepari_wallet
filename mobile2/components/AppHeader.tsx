import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';

interface AppHeaderProps {
  title: string;
  /** Show back arrow */
  showBack?: boolean;
  /** Custom right element */
  rightElement?: React.ReactNode;
  /** Override background color */
  bg?: string;
  /** Use light text (for dark backgrounds) */
  light?: boolean;
}

/**
 * AppHeader — top bar used across all screens.
 * Handles safe-area top inset automatically.
 */
export default function AppHeader({
  title,
  showBack = false,
  rightElement,
  bg = Colors.white,
  light = false,
}: AppHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const textColor = light ? Colors.white : Colors.textPrimary;
  const iconColor = light ? Colors.white : Colors.textPrimary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, paddingTop: insets.top + 8 },
      ]}
    >
      <View style={styles.row}>
        {/* Left — back button or spacer */}
        <View style={styles.side}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={iconColor}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center — title */}
        <Text
          style={[styles.title, { color: textColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Right — optional element */}
        <View style={[styles.side, styles.sideRight]}>
          {rightElement ?? null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  backBtn: {
    padding: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.md,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
  },
});
