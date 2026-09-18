import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { KeyboardSafe } from './KeyboardSafe';

interface Props {
  children: ReactNode;
}

/**
 * The bottom sheet every modal is built on.
 *
 * The keyboard handling lives here rather than in each modal, because "the
 * deal value box is behind the keyboard" was reported against one sheet and was
 * true of all of them. One place to get right, seven screens fixed.
 *
 * Three parts, and all three are needed:
 *
 *   - `KeyboardSafe` lifts the sheet clear of the keyboard, on both platforms.
 *     It used to do nothing on Android, on the assumption that the window
 *     resizes itself; SDK 57's edge-to-edge broke that, and the reasoning now
 *     lives in KeyboardSafe's own docblock. The padding is applied inside this
 *     component's background, so the dim overlay stays full-bleed and only the
 *     white sheet rises.
 *   - The sheet is capped at 88% of the screen and scrolls inside that. A sheet
 *     taller than the space left above the keyboard cannot be lifted into view;
 *     it has to scroll.
 *   - `keyboardShouldPersistTaps="handled"` so Confirm works on the first tap
 *     rather than the second. The default swallows that tap to dismiss the
 *     keyboard, which reads as a dead button.
 */
export function SheetShell({ children }: Props) {
  return (
    <KeyboardSafe className="flex-1 justify-end bg-navy/[0.55]">
      {/* Tap-outside-to-close. Kept above the sheet in source order so it does
          not sit over the content. */}
      <Pressable className="flex-1" onPress={() => router.back()} />
      <View className="bg-white rounded-t-[22px] px-6 pt-[10px]" style={{ maxHeight: '88%' }}>
        <View className="w-9 h-1 rounded-full bg-hairline self-center mb-[18px]" />
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-8"
        >
          {children}
        </ScrollView>
      </View>
    </KeyboardSafe>
  );
}
