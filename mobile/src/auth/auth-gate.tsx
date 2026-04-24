import { useEffect } from "react";
import { useSegments, useRouter } from "expo-router";
import { useAuthStore, selectIsAuthed } from "./auth-store";
import { setUnauthorizedHandler } from "@/api/client";

const PUBLIC_GROUPS = new Set(["(auth)", "(onboarding)", "legal"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore(selectIsAuthed);
  const signOut = useAuthStore((s) => s.signOut);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut().catch(() => {});
    });
  }, [signOut]);

  useEffect(() => {
    if (!hydrated) return;
    const rootSegment = segments[0] as string | undefined;
    const inPublic = !rootSegment || PUBLIC_GROUPS.has(rootSegment);

    if (!isAuthed && !inPublic) {
      router.replace("/(auth)/sign-in");
    } else if (isAuthed && rootSegment === "(auth)") {
      router.replace("/(tabs)/store");
    } else if (isAuthed && rootSegment === "(onboarding)") {
      router.replace("/(tabs)/store");
    }
  }, [hydrated, isAuthed, segments, router]);

  return <>{children}</>;
}
