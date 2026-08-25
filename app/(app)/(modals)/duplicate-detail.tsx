import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';

export default function DuplicateDetailModal() {
  return (
    <SheetShell>
      <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate" style={{ textTransform: 'uppercase' }}>
        Already at this event
      </Typography>

      <View className="flex-row items-center gap-3 mt-3">
        <View className="w-11 h-11 rounded-xl bg-surface items-center justify-center">
          <Typography className="text-[16px] font-extrabold text-navy">A</Typography>
        </View>
        <View>
          <Typography className="text-[15px] font-bold text-navy">Captured by Amit Shah</Typography>
          <Typography className="text-[12px] text-slate mt-[2px]">2 days ago &middot; Day 1, 3:40 PM</Typography>
        </View>
      </View>

      <View className="bg-section rounded-md px-4 py-3 mt-[18px]">
        <Typography className="text-[22px] font-extrabold text-gold" style={{ lineHeight: 12 }}>
          &ldquo;
        </Typography>
        <Typography className="text-[14px] text-navy font-medium mt-[6px]" style={{ lineHeight: 21.7 }}>
          Northline is evaluating three vendors for their new plant line &mdash; wants a formal quote with lead times by next week.
        </Typography>
      </View>

      <View className="gap-[10px] mt-6">
        <Pressable
          onPress={() => router.back()}
          className="h-[52px] rounded-md bg-gold items-center justify-center"
        >
          <Typography className="text-[15px] font-bold text-navy">Continue with new capture</Typography>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/(app)/(tabs)/leads')}
          className="h-[52px] rounded-md bg-white border border-hairline items-center justify-center"
        >
          <Typography className="text-[15px] font-bold text-navy">Merge into existing lead</Typography>
        </Pressable>
      </View>
    </SheetShell>
  );
}
