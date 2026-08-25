import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../../../components/ui/Typography';
import { Button } from '../../../components/ui/Button';
import { ProfileIcon } from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';

export default function ProfileScreen() {
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <SafeAreaView className="flex-1 bg-section items-center px-8 pt-16" edges={['top']}>
      <View className="w-16 h-16 rounded-full bg-gold items-center justify-center mb-4">
        <ProfileIcon size={28} color="#0B132B" strokeWidth={2} />
      </View>
      <Typography variant="heading-lg" className="text-navy text-center">
        {user?.name ?? 'there'}
      </Typography>
      <Typography variant="body-md" className="text-slate text-center mt-1">
        {user?.company ?? ''}
      </Typography>
      <Typography variant="body-sm" className="text-label text-center mt-6 max-w-xs">
        Settings, billing and team management aren&apos;t designed yet.
      </Typography>
      <Button label="Sign out" variant="ghost" onPress={signOut} className="mt-10" />
    </SafeAreaView>
  );
}
