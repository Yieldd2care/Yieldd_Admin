import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';

export type AuthMode = 'create' | 'signin';

interface Props {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

export function AuthTabs({ mode, onChange }: Props) {
  const isCreate = mode === 'create';
  return (
    <View className="flex-row gap-[2px] bg-white/[0.08] rounded-full p-1">
      <Pressable
        onPress={() => onChange('create')}
        className={`flex-1 py-[11px] rounded-full items-center ${isCreate ? 'bg-gold' : ''}`}
      >
        <Typography className={`text-[13px] font-bold ${isCreate ? 'text-navy' : 'text-white/[0.65]'}`}>
          Create account
        </Typography>
      </Pressable>
      <Pressable
        onPress={() => onChange('signin')}
        className={`flex-1 py-[11px] rounded-full items-center ${!isCreate ? 'bg-gold' : ''}`}
      >
        <Typography className={`text-[13px] font-bold ${!isCreate ? 'text-navy' : 'text-white/[0.65]'}`}>
          Sign in
        </Typography>
      </Pressable>
    </View>
  );
}
