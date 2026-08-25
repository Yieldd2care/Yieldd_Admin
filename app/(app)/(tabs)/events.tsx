import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../../../components/ui/Typography';
import { CalendarIcon } from '../../../components/ui/icons';

export default function EventsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section items-center justify-center px-10" edges={['top']}>
      <View className="w-14 h-14 rounded-full bg-surface items-center justify-center mb-4">
        <CalendarIcon size={24} color="#0B132B" strokeWidth={2} />
      </View>
      <Typography variant="heading-md" className="text-navy text-center">
        Event dashboards are coming soon
      </Typography>
      <Typography variant="body-md" className="text-slate text-center mt-2">
        This screen isn&apos;t designed yet &mdash; live counts and ROI will show up here.
      </Typography>
    </SafeAreaView>
  );
}
