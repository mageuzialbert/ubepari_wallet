import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Fonts, FontSizes } from '../constants/typography';
import { formatTzs } from '@/lib/currency';
import type { Product } from '@/types/api';

interface ProductCardProps {
  product: Product;
  isActive?: boolean;
  onPress: () => void;
}

/**
 * ProductCard — displays a product tile in the Shop grid.
 */
export default function ProductCard({ product, isActive, onPress }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const firstImage = product.images?.[0];
  const ram = product.specs?.ram;
  const storage = product.specs?.storage;
  const showSpecs = ram || storage;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imgContainer}>
        {imgError || !firstImage ? (
          <View style={styles.imgFallback}>
            <Ionicons name="laptop-outline" size={40} color={Colors.textMuted} />
          </View>
        ) : (
          <Image
            source={{ uri: firstImage }}
            style={styles.img}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        )}
        {isActive && (
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>Active</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>

        {showSpecs ? (
          <Text style={styles.spec} numberOfLines={1}>
            {[ram, storage].filter(Boolean).join(' · ')}
          </Text>
        ) : (
          <Text style={styles.spec} numberOfLines={1}>
            {product.brand}
          </Text>
        )}

        <Text style={styles.price}>{formatTzs(product.priceTzs)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imgContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: Colors.surfaceAlt,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  info: {
    padding: 12,
    gap: 4,
  },
  name: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  spec: {
    fontFamily: Fonts.regular,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  price: {
    fontFamily: Fonts.bold,
    fontSize: FontSizes.base,
    color: Colors.primary,
    marginTop: 4,
  },
  activePill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activePillText: {
    fontFamily: Fonts.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.success,
  },
});
