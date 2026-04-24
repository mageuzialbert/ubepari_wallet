import { forwardRef } from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";

type InputProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, hint, error, leftAdornment, rightAdornment, className, ...rest },
  ref,
) {
  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-foreground">{label}</Text>
      ) : null}
      <View
        className={[
          "flex-row items-center rounded-xl border bg-background px-3",
          error ? "border-destructive" : "border-border",
        ].join(" ")}
      >
        {leftAdornment ? <View className="mr-2">{leftAdornment}</View> : null}
        <TextInput
          ref={ref}
          className={["h-12 flex-1 text-base text-foreground", className ?? ""].join(" ")}
          placeholderTextColor="#8E8E93"
          {...rest}
        />
        {rightAdornment ? <View className="ml-2">{rightAdornment}</View> : null}
      </View>
      {error ? (
        <Text className="mt-1 text-xs text-destructive">{error}</Text>
      ) : hint ? (
        <Text className="mt-1 text-xs text-muted-foreground">{hint}</Text>
      ) : null}
    </View>
  );
});
