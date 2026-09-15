import { useState } from 'react';
import { Pressable, TextInput as RNTextInput, View, type TextInputProps } from 'react-native';

import { Typography } from './Typography';
import { EyeIcon, EyeOffIcon } from './icons';

interface Props extends TextInputProps {
  label?: string;
  className?: string;
  /**
   * Something about this value looks wrong, but it is still accepted — the
   * border turns amber and nothing else changes. The explanation belongs beside
   * the field, in the caller's own words; see the invite rows in
   * `app/(dash)/team.tsx`.
   */
  warn?: boolean;
}

/**
 * The browser's own reveal control is not dependable here — Safari shows none
 * at all and Chrome's appears only once the field has content and sits where
 * the focus ring is drawn — so the toggle is drawn rather than inherited. The
 * pill input on the phone screens carries its own copy of this for the same
 * reason the two auth forms are separate files: the layouts differ, the
 * behaviour does not.
 */
export function TextInput({ label, className = '', secureTextEntry, warn = false, ...rest }: Props) {
  const [revealed, setRevealed] = useState(false);

  // Constant per call site, which is what lets the tree branch on it safely.
  const isPassword = secureTextEntry === true;

  return (
    <View className="gap-[7px]">
      {label ? (
        <Typography variant="body-sm" className="text-ink-muted">
          {label}
        </Typography>
      ) : null}
      <View className="relative">
        <RNTextInput
          // The warning colour is swapped INSIDE this string rather than
          // appended by the caller: two `border-*` classes of equal specificity
          // are settled by the order Tailwind emits them, not the order they
          // appear here, so an appended override is a coin toss.
          className={`h-[52px] bg-white rounded-md px-4 text-[15.5px] font-regular text-navy border ${
            warn ? 'border-[#E4B44C]' : 'border-hairline'
          } focus:border-transparent focus:outline focus:outline-2 focus:outline-gold focus:outline-offset-2 ${
            isPassword ? 'pr-[46px]' : ''
          } ${className}`}
          placeholderTextColor="#97A3B8"
          secureTextEntry={isPassword && !revealed}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            // Inset by a pixel so the control never overlaps the focus outline
            // the field draws on itself.
            className="absolute right-px top-px h-[50px] w-11 items-center justify-center rounded-r-md"
          >
            {revealed ? (
              <EyeOffIcon size={19} color="#5A6B85" strokeWidth={1.75} />
            ) : (
              <EyeIcon size={19} color="#5A6B85" strokeWidth={1.75} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
