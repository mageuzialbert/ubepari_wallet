import { View, type ViewProps } from "react-native";

type CardProps = ViewProps & {
  children: React.ReactNode;
};

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <View
      className={[
        "rounded-3xl border border-border bg-card p-5",
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {children}
    </View>
  );
}
