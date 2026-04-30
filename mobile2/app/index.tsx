import { Redirect } from 'expo-router';

/**
 * App entry — always boots through the splash screen, which awaits
 * auth/onboarding hydration and routes accordingly.
 */
export default function Index() {
  return <Redirect href="/(auth)/splash" />;
}
