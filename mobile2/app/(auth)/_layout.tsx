import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="sign-in-otp" />
      <Stack.Screen name="forgot" />
      <Stack.Screen name="forgot-confirm" />
      <Stack.Screen name="kyc" />
    </Stack>
  );
}
