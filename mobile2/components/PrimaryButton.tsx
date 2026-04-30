import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

/**
 * PrimaryButton — reusable button with solid, outline, and ghost variants.
 */
export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'solid',
  size = 'md',
  style,
  textStyle,
  fullWidth = true,
}: PrimaryButtonProps) {
  const isSolid = variant === 'solid';
  const isOutline = variant === 'outline';

  const sizeStyle = {
    sm: { paddingVertical: 10, borderRadius: 8 },
    md: { paddingVertical: 15, borderRadius: 8 },
    lg: { paddingVertical: 18, borderRadius: 8 },
  }[size];

  const textSize = {
    sm: FontSizes.sm,
    md: FontSizes.base,
    lg: FontSizes.md,
  }[size];

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        sizeStyle,
        isSolid && styles.solid,
        isOutline && styles.outline,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isSolid ? Colors.white : Colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: textSize },
            isSolid && styles.textSolid,
            isOutline && styles.textOutline,
            variant === 'ghost' && styles.textGhost,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  solid: {
    backgroundColor: Colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.2,
  },
  textSolid: {
    color: Colors.white,
  },
  textOutline: {
    color: Colors.primary,
  },
  textGhost: {
    color: Colors.primary,
  },
});
