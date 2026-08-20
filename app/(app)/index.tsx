import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { useSessionStore } from '../../stores/useSessionStore';

export default function AppHomePlaceholder() {
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <SafeAreaView className="flex-1 bg-navy items-center justify-center px-8 gap-4">
      <Typography variant="caption" className="text-gold">
        Signed in
      </Typography>
      <Typography variant="heading-lg" className="text-white text-center">
        Welcome, {user?.name ?? 'there'}.
      </Typography>
      <Typography variant="body-md" className="text-white/[0.70] text-center max-w-sm">
        The rest of the app (capture, leads, dashboards) isn&apos;t built yet — this is a
        placeholder so the sign-in flow has somewhere real to land.
      </Typography>
      <View className="mt-4">
        <Button label="Sign out" variant="secondary" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}
