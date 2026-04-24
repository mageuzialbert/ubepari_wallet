import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { brand } from "@/theme/tokens";

type Props = {
  progress: number; // 0..1
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
};

export function GoalProgressRing({ progress, size = 180, stroke = 14, children }: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const dashOffset = c * (1 - clamped);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={brand.blueHex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={dashOffset}
          fill="transparent"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View className="items-center">
        {children ?? (
          <Text className="text-3xl font-semibold text-foreground">
            {Math.round(clamped * 100)}%
          </Text>
        )}
      </View>
    </View>
  );
}
