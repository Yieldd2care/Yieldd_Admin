import { useState, type Ref } from 'react';
import { Pressable, TextInput as RNTextInput, View, type TextInputProps } from 'react-native';

import { EyeIcon, EyeOffIcon } from '../ui/icons';

/**
 * The reveal toggle lives here, not at the call sites.
 *
 * Every password box on a phone screen is one of these — both fields on the
 * reset screen and the one on sign-in/sign-up — so putting it here is what
 * stops the next password field from shipping without an eye on it. Nothing
 * opts in: passing `secureTextEntry` is the opt-in, and a field that is not a
 * password renders exactly the bare input it always did.
 */
export function AuthPillInput({
  className = '',
  secureTextEntry,
  ref,
  ...rest
}: TextInputProps & { className?: string; ref?: Ref<RNTextInput> }) {
  const [revealed, setRevealed] = useState(false);

  // Constant for the life of the component — every call site passes a literal.
  // That matters: the tree shape below branches on it, and a value that could
  // flip would swap a View in and out from under the input and lose focus.
  const isPassword = secureTextEntry === true;

  const field = (
    <RNTextInput
      ref={ref}
      // `pr-[52px]` keeps the typed text from running under the eye. It is only
      // applied on a password field so the other inputs keep their symmetry.
      className={`w-full h-[52px] rounded-full bg-white px-[22px] text-[14.5px] font-regular text-navy ${
        isPassword ? 'pr-[52px]' : ''
      } ${className}`}
      placeholderTextColor="#97A3B8"
      secureTextEntry={isPassword && !revealed}
      {...rest}
    />
  );

  if (!isPassword) return field;

  return (
    <View className="w-full relative">
      {field}
      {/*
        Full height of the pill and 44 wide, so the tap target clears the
        minimum without the icon itself having to grow.

        `accessibilityRole="button"` and a state-dependent label, because a
        sighted user reads the toggle from the icon and a screen reader user
        has only this.
      */}
      <Pressable
        onPress={() => setRevealed((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
        hitSlop={6}
        className="absolute right-[8px] top-0 h-[52px] w-11 items-center justify-center"
      >
        {revealed ? (
          <EyeOffIcon size={19} color="#5A6B85" strokeWidth={1.75} />
        ) : (
          <EyeIcon size={19} color="#5A6B85" strokeWidth={1.75} />
        )}
      </Pressable>
    </View>
  );
}
