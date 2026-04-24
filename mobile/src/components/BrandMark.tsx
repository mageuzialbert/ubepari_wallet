import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { brand } from "@/theme/tokens";

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 72 }: BrandMarkProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 256 256">
        <Rect width={256} height={256} rx={58} fill={brand.blueHex} />
        <Path
          d="M 136 212 L 136 112 Q 136 96 146 84 L 194 32 Q 200 26 200 34 L 200 196 Q 200 212 184 212 Z"
          fill="#ffffff"
        />
        <Path
          d="M 60 128 L 124 128 L 124 196 Q 124 212 108 212 L 76 212 Q 60 212 60 196 Z"
          fill={brand.cyanHex}
        />
      </Svg>
    </View>
  );
}
