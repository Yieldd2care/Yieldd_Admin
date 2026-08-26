import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { AlertCircleIcon, CheckIcon, CloseIcon, WhatsAppIcon } from '../../../components/ui/icons';

export default function PaymentFailureScreen() {
  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <View className="items-end px-5 pt-3">
        <Pressable onPress={() => router.back()} className="w-[34px] h-[34px] rounded-md bg-surface items-center justify-center">
          <CloseIcon />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="w-[72px] h-[72px] rounded-full bg-surface items-center justify-center">
          <AlertCircleIcon size={30} color="#5A6B87" strokeWidth={1.75} />
        </View>
        <Typography className="text-[20px] font-bold text-navy text-center mt-[22px]">Payment didn&apos;t go through</Typography>
        <Typography className="text-[13.5px] text-slate text-center mt-2" style={{ lineHeight: 20 }}>
          Your bank or network dropped the connection before it confirmed. This happens more often on venue Wi-Fi.
        </Typography>

        <View className="flex-row items-start gap-[10px] bg-success/[0.08] border border-success/[0.25] rounded-md px-4 py-[14px] mt-[22px]">
          <CheckIcon size={15} color="#2E9C61" strokeWidth={2} />
          <Typography className="flex-1 text-[12.5px] text-navy font-medium" style={{ lineHeight: 19 }}>
            <Typography className="font-bold">Nothing was lost.</Typography> No money was taken, and your leads are all still saved and syncing normally.
          </Typography>
        </View>

        <View className="w-full gap-[10px] mt-[26px]">
          <Pressable
            onPress={() => router.replace('/(app)/(modals)/upgrade')}
            className="h-[54px] rounded-md bg-gold items-center justify-center shadow-[0_10px_24px_rgba(244,176,0,0.30)]"
          >
            <Typography className="text-[15px] font-bold text-navy">Try again</Typography>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/(app)/(modals)/upgrade')}
            className="h-[50px] rounded-md bg-white border border-hairline items-center justify-center"
          >
            <Typography className="text-[14px] font-bold text-navy">Switch payment method</Typography>
          </Pressable>
          <Pressable
            onPress={() => Alert.alert('Contact sales', "Messaging sales isn't wired up yet.")}
            className="h-[50px] rounded-md bg-white border border-hairline items-center justify-center flex-row gap-2"
          >
            <WhatsAppIcon size={16} color="#25D366" />
            <Typography className="text-[14px] font-bold text-navy">Contact sales</Typography>
          </Pressable>
        </View>
        <Pressable onPress={() => router.replace('/(app)/(tabs)')} className="mt-4">
          <Typography className="text-[13px] font-bold text-slate">Not now</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
