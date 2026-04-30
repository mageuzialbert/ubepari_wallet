import { Stack } from 'expo-router';

/**
 * Stack layout for the Profile tab — keeps `edit` and `delete` as sub-routes
 * so they don't appear as separate tabs in the bottom bar.
 */
export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="delete" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
