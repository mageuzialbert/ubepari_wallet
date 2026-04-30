import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ViewStyle,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Background color override */
  bg?: string;
  /** Remove default horizontal padding */
  noPadding?: boolean;
  style?: ViewStyle;
}

/**
 * ScreenContainer — wraps every screen in SafeAreaView with consistent
 * background color, status bar, and padding.
 */
export default function ScreenContainer({
  children,
  bg = Colors.background,
  noPadding = false,
  style,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />
      <View
        style={[
          styles.container,
          { backgroundColor: bg },
          noPadding && styles.noPadding,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noPadding: {
    paddingHorizontal: 0,
  },
});
