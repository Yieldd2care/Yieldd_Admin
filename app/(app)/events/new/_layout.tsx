import { Stack } from 'expo-router';

export default function EventSetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="cost" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="fields" />
      <Stack.Screen name="templates" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
