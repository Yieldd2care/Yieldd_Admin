import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../components/ui/Typography';

function ForkOption({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 border border-hairline hover:border-gold rounded-lg p-7 gap-2 bg-white transition-all duration-200 hover:shadow-[0_20px_40px_rgba(11,19,43,0.12)]"
    >
      <Typography variant="heading-md" className="text-navy">
        {title}
      </Typography>
      <Typography variant="body-md" className="text-slate">
        {description}
      </Typography>
    </Pressable>
  );
}

export default function ForkScreen() {
  const choose = () => router.replace('/(app)');

  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
      <View className="w-full max-w-[640px] gap-10">
        <View className="gap-3">
          <Typography variant="caption" className="text-gold">
            One quick question
          </Typography>
          <Typography variant="display-md" className="text-navy">
            Setting this up for a team, or just yourself?
          </Typography>
        </View>
        <View className="flex-col lg:flex-row gap-4">
          <ForkOption
            title="For my team"
            description="Create an event, invite reps, and see live results across everyone."
            onPress={choose}
          />
          <ForkOption
            title="Just me"
            description="Build your digital card and start capturing leads right away."
            onPress={choose}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
