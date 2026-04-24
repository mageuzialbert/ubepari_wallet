import { useEffect, useRef, useState } from "react";
import { View, TextInput, Text, Pressable } from "react-native";

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
};

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  autoFocus = true,
}: OtpInputProps) {
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
  }, [value, length, onComplete]);

  return (
    <View>
      <Pressable onPress={() => ref.current?.focus()}>
        <View className="flex-row justify-between gap-2">
          {chars.map((ch, i) => {
            const isActive = focused && i === value.length;
            return (
              <View
                key={i}
                className={[
                  "h-14 flex-1 items-center justify-center rounded-xl border",
                  error
                    ? "border-destructive"
                    : isActive
                      ? "border-primary"
                      : "border-border",
                ].join(" ")}
              >
                <Text className="text-2xl font-semibold text-foreground">{ch}</Text>
              </View>
            );
          })}
        </View>
      </Pressable>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(next) => {
          const digits = next.replace(/\D/g, "").slice(0, length);
          onChange(digits);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        // Hide the actual field; we render our own cells above.
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
      />
      {error ? <Text className="mt-2 text-xs text-destructive">{error}</Text> : null}
    </View>
  );
}
