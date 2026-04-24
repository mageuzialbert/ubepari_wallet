import { forwardRef } from "react";
import { Pressable, Text, View, ActivityIndicator, type PressableProps } from "react-native";
import { haptic } from "@/lib/haptics";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const variantCn: Record<Variant, string> = {
  primary: "bg-primary active:opacity-90",
  secondary: "bg-secondary active:opacity-90",
  outline: "border border-border bg-transparent active:bg-muted",
  ghost: "bg-transparent active:bg-muted",
  destructive: "bg-destructive active:opacity-90",
};

const labelCn: Record<Variant, string> = {
  primary: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  outline: "text-foreground",
  ghost: "text-foreground",
  destructive: "text-white",
};

const sizeCn: Record<Size, string> = {
  sm: "h-9 px-4",
  md: "h-12 px-5",
  lg: "h-14 px-6",
};

const sizeLabel: Record<Size, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-base",
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  { label, variant = "primary", size = "md", loading, fullWidth, leftIcon, rightIcon, onPress, disabled, ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      onPress={(e) => {
        haptic.light();
        onPress?.(e);
      }}
      className={[
        "flex-row items-center justify-center rounded-full",
        variantCn[variant],
        sizeCn[size],
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-50" : "",
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "destructive" ? "white" : undefined} />
      ) : (
        <>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Text className={["font-semibold", labelCn[variant], sizeLabel[size]].join(" ")}>{label}</Text>
          {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
});
