import { useCallback } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";

import { useAuthStore } from "@/state/auth";

/**
 * Pre-flight gate for actions that the backend rejects with `kyc_not_approved`.
 * Returns a function that returns true if the user can proceed; false if a
 * gating prompt was shown.
 */
export function useRequireKyc(): () => boolean {
  const user = useAuthStore((s) => s.user);

  return useCallback(() => {
    const status = user?.kycStatus ?? "none";
    if (status === "approved") return true;

    const title =
      status === "pending"
        ? "Verification in review"
        : status === "rejected"
        ? "Verification rejected"
        : "Verify your identity";
    const body =
      status === "pending"
        ? "Your KYC submission is being reviewed (usually within 24 hours). We'll notify you once it's approved."
        : status === "rejected"
        ? "Your last KYC submission was rejected. Submit a new one to continue."
        : "We need to verify your identity before you can use this feature.";

    Alert.alert(
      title,
      body,
      [
        { text: "Not now", style: "cancel" },
        status === "pending"
          ? { text: "OK", style: "default" }
          : {
              text: "Verify now",
              onPress: () => router.push("/(auth)/kyc" as const),
            },
      ],
      { cancelable: true },
    );
    return false;
  }, [user?.kycStatus]);
}
