import { Redirect } from "expo-router";
import { useAuthStore, selectIsAuthed } from "@/auth/auth-store";

export default function Index() {
  const isAuthed = useAuthStore(selectIsAuthed);
  return <Redirect href={isAuthed ? "/(tabs)/store" : "/(onboarding)/welcome"} />;
}
