import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../../../../components/ui/Typography';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { CustomFieldsEditor } from '../../../../components/app/CustomFieldsEditor';

export default function EventCustomFieldsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Custom fields" />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
          Add or change what reps capture for this event, any time — even mid-show. Mark a field
          required and every rep has to fill it in before a lead saves.
        </Typography>
        <View>
          <CustomFieldsEditor />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
