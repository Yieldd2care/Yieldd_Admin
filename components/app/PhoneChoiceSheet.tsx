import { Modal, Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { isValidPhone } from '../../lib/phone';
import type { PickedNumber } from '../../lib/pickedContact';

/**
 * Which number, when a picked contact has more than one.
 *
 * Built on the CalendarSheet pattern — a plain RN `Modal`, which portals to its
 * own native window and so works from inside the invite screen's ScrollView and
 * KeyboardSafe without fighting either.
 *
 * ⚠️ Deliberately NOT SheetShell. That component is for `(modals)` ROUTES and
 * its backdrop calls `router.back()`, which from inside the invite screen would
 * pop the wizard step instead of closing the sheet.
 */

interface Props {
  visible: boolean;
  /** Whose numbers these are — the admin needs to know before choosing. */
  name: string;
  numbers: PickedNumber[];
  onSelect: (number: PickedNumber) => void;
  onClose: () => void;
}

export function PhoneChoiceSheet({ visible, name, numbers, onSelect, onClose }: Props) {
  return (
    // `onRequestClose` is what makes the Android hardware back button close the
    // sheet. Without it the button does nothing and the admin is stuck.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-navy/[0.55]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[22px] px-6 pt-[10px] pb-8">
          <View className="w-9 h-1 rounded-full bg-hairline self-center mb-[18px]" />

          <Typography className="text-[16px] font-bold text-navy">
            {name || 'That contact'} has {numbers.length} numbers
          </Typography>
          <Typography className="text-[12.5px] text-slate mt-[3px] mb-4">
            Pick the one to invite them on.
          </Typography>

          {/*
            A vertical list, never a horizontal ScrollView — a className on one
            of those paints no glyphs with this project's NativeWind setup. A
            contact never has enough numbers to need scrolling anyway.
          */}
          {numbers.map((entry) => {
            // A hint, never a filter. `isValidPhone` rejects extensions, pauses
            // and unicode hyphens, all of which appear in real address books,
            // so a number it dislikes stays fully selectable.
            const looksShort = !isValidPhone(entry.number);
            return (
              <Pressable
                key={`${entry.label}-${entry.number}`}
                onPress={() => onSelect(entry)}
                className="flex-row items-center gap-3 border border-hairline rounded-md px-4 py-3 mb-[10px]"
              >
                <View className="bg-surface rounded-full px-[10px] py-[3px]">
                  <Typography className="text-[11px] font-bold text-slate">{entry.label}</Typography>
                </View>
                <View className="flex-1">
                  <Typography className="text-[14px] font-bold text-navy">{entry.number}</Typography>
                  {looksShort ? (
                    <Typography className="text-[11.5px] text-slate mt-[2px]">
                      Looks short for a mobile number
                    </Typography>
                  ) : null}
                </View>
              </Pressable>
            );
          })}

          <Pressable onPress={onClose} className="py-3 items-center">
            <Typography className="text-[13px] font-semibold text-slate">Cancel</Typography>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
