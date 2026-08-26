import { Stack } from 'expo-router';

export default function CardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="share" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      <Stack.Screen name="first-scan" />
    </Stack>
  );
}
