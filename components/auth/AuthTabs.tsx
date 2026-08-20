import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';

export type AuthMode = 'signup' | 'signin';

interface Props {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

export function AuthTabs({ mode, onChange }: Props) {
  return (
    <View className="flex-row gap-[6px] p-[5px] border border-hairline rounded-md bg-section">
      <Pressable
        onPress={() => onChange('signup')}
        className={`flex-1 h-11 rounded-[9px] items-center justify-center transition-all duration-200 ${
          mode === 'signup' ? 'bg-navy' : 'bg-transparent'
        }`}
      >
        <Typography
          className={`text-[14.5px] font-semibold ${mode === 'signup' ? 'text-white' : 'text-slate'}`}
        >
          Create account
        </Typography>
      </Pressable>
      <Pressable
        onPress={() => onChange('signin')}
        className={`flex-1 h-11 rounded-[9px] items-center justify-center transition-all duration-200 ${
          mode === 'signin' ? 'bg-navy' : 'bg-transparent'
        }`}
      >
        <Typography
          className={`text-[14.5px] font-semibold ${mode === 'signin' ? 'text-white' : 'text-slate'}`}
        >
          Sign in
        </Typography>
      </Pressable>
    </View>
  );
}
