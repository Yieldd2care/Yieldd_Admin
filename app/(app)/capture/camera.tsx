import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Typography } from '../../../components/ui/Typography';
import { CloseIcon, FlashIcon } from '../../../components/ui/icons';
import { RadialGlow } from '../../../components/ui/RadialGlow';
import { useCaptureDraftStore } from '../../../stores/useCaptureDraftStore';

export default function CameraScreen() {
  const [flashOn, setFlashOn] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isProfileScan = mode === 'profile';

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const setImageUri = useCaptureDraftStore((s) => s.setImageUri);

  const capture = async () => {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (photo) setImageUri(photo.uri);
      router.push(isProfileScan ? '/(app)/card/scan-confirm' : '/(app)/capture/confirm');
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-[#05070d]" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-[#05070d] items-center justify-center px-8 gap-5">
        <Typography className="text-[15px] font-semibold text-white text-center">
          Camera access is needed to scan business cards
        </Typography>
        <Pressable onPress={requestPermission} className="bg-gold rounded-full px-6 py-3">
          <Typography className="text-[14px] font-bold text-navy">Grant permission</Typography>
        </Pressable>
        <Pressable onPress={() => router.replace(isProfileScan ? '/(app)/card/edit' : '/(app)/capture/manual')}>
          <Typography className="text-[13px] font-semibold text-white/[0.80]">Enter manually instead</Typography>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#05070d]">
      <CameraView ref={cameraRef} style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} facing="back" flash={flashOn ? 'on' : 'off'} />
      <RadialGlow color="#1D3F8A" size={600} style={{ top: -180, left: 30, opacity: 0.3 }} />

      <View className="flex-1 items-center justify-center">
        <View className="w-[322px] h-[203px] relative">
          {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <View
              key={corner}
              className="absolute w-7 h-7 border-gold"
              style={{
                borderTopWidth: corner === 'tl' || corner === 'tr' ? 3 : 0,
                borderBottomWidth: corner === 'bl' || corner === 'br' ? 3 : 0,
                borderLeftWidth: corner === 'tl' || corner === 'bl' ? 3 : 0,
                borderRightWidth: corner === 'tr' || corner === 'br' ? 3 : 0,
                top: corner === 'tl' || corner === 'tr' ? -3 : undefined,
                bottom: corner === 'bl' || corner === 'br' ? -3 : undefined,
                left: corner === 'tl' || corner === 'bl' ? -3 : undefined,
                right: corner === 'tr' || corner === 'br' ? -3 : undefined,
              }}
            />
          ))}
        </View>
        <View className="mt-8 bg-navy/[0.55] border border-white/[0.12] rounded-full px-[18px] py-[9px]">
          <Typography className="text-[12.5px] font-semibold text-white">Align the card within the frame</Typography>
        </View>
      </View>

      <View className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-5 pt-14">
        <Pressable onPress={() => router.back()} className="w-[38px] h-[38px] rounded-full bg-navy/[0.55] border border-white/[0.14] items-center justify-center">
          <CloseIcon size={14} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => setFlashOn((v) => !v)}
          className={`w-[38px] h-[38px] rounded-full border border-white/[0.14] items-center justify-center ${flashOn ? 'bg-gold' : 'bg-navy/[0.55]'}`}
        >
          <FlashIcon color={flashOn ? '#0B132B' : '#fff'} />
        </Pressable>
      </View>

      <View className="absolute left-0 right-0 bottom-0 items-center gap-[22px] pb-11">
        <View className="flex-row items-center justify-center gap-[52px] w-full">
          <View className="w-11 h-11" />
          <Pressable
            onPress={capture}
            disabled={capturing}
            className="w-[76px] h-[76px] rounded-full bg-white/[0.10] border-[3px] border-white items-center justify-center active:scale-95"
          >
            <View className={`w-[60px] h-[60px] rounded-full ${capturing ? 'bg-gold/[0.5]' : 'bg-gold'}`} />
          </Pressable>
          <View className="w-11 h-11" />
        </View>
        <Pressable onPress={() => router.replace(isProfileScan ? '/(app)/card/edit' : '/(app)/capture/manual')}>
          <Typography className="text-[13px] font-semibold text-white/[0.80]">Enter manually instead</Typography>
        </Pressable>
      </View>
    </View>
  );
}
