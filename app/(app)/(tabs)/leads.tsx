import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../../../components/ui/Typography';
import { UsersIcon } from '../../../components/ui/icons';

export default function LeadsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section items-center justify-center px-10" edges={['top']}>
      <View className="w-14 h-14 rounded-full bg-surface items-center justify-center mb-4">
        <UsersIcon size={24} />
      </View>
      <Typography variant="heading-md" className="text-navy text-center">
        Lead list is coming soon
      </Typography>
      <Typography variant="body-md" className="text-slate text-center mt-2">
        This screen isn&apos;t designed yet &mdash; captured leads will show up here.
      </Typography>
    </SafeAreaView>
  );
}
