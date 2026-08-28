import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import type { AuthMode } from './AuthTabs';

/**
 * The light segmented control the website has always used, on the white form.
 *
 * Kept separate from AuthTabs rather than made variant-driven: that one lives
 * on navy inside the mobile app and the two share nothing but their shape. The
 * `AuthMode` type IS shared, so the two screens cannot drift into different
 * vocabularies for the same two states.
 */
interface Props {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

export function AuthTabsWeb({ mode, onChange }: Props) {
  const isCreate = mode === 'create';

  return (
    <View className="flex-row gap-[6px] p-[5px] border border-hairline rounded-md bg-section">
      <Pressable
        onPress={() => onChange('create')}
        className={`flex-1 h-11 rounded-[9px] items-center justify-center transition-all duration-200 ${
          isCreate ? 'bg-navy' : 'bg-transparent'
        }`}
      >
        <Typography className={`text-[14.5px] font-semibold ${isCreate ? 'text-white' : 'text-slate'}`}>
          Create account
        </Typography>
      </Pressable>
      <Pressable
        onPress={() => onChange('signin')}
        className={`flex-1 h-11 rounded-[9px] items-center justify-center transition-all duration-200 ${
          !isCreate ? 'bg-navy' : 'bg-transparent'
        }`}
      >
        <Typography className={`text-[14.5px] font-semibold ${!isCreate ? 'text-white' : 'text-slate'}`}>
          Sign in
        </Typography>
      </Pressable>
    </View>
  );
}
