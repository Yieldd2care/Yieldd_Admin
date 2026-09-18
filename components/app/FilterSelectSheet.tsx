import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { CheckIcon } from '../ui/icons';

/**
 * Any number of choices out of a short list, taken in a sheet over the screen.
 *
 * A phone has no dropdown, so this is what a dropdown is here: the trigger
 * names the current choice and opening it slides the options up from the
 * bottom. Built on the same plain `Modal` as `CalendarSheet` and
 * `PhoneChoiceSheet`, which portals above everything including the floating
 * tab bar.
 *
 * MULTI-SELECT, SO IT DOES NOT CLOSE ON A TAP. Picking March and then June
 * means two taps, and a sheet that shut after the first would make the second
 * selection take three. Each tap applies immediately to the list behind, so
 * there is nothing to confirm and no way to lose a selection — "Done" only
 * closes, and so does the backdrop.
 *
 * An EMPTY selection is "all", and it has its own row at the top rather than
 * being expressed by unticking twelve things. That row is also the way back
 * from a selection that matches nothing.
 *
 * ⚠️ Deliberately NOT SheetShell — that is for `(modals)` ROUTES and its
 * backdrop calls `router.back()`. Opened from a tab screen that would pop the
 * tab rather than close the sheet.
 */

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** The real choices. The "all" row is added above them from `allLabel`. */
  options: FilterOption[];
  /** Empty means everything, which is what the "all" row shows as ticked. */
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  allLabel: string;
}

export function FilterSelectSheet({
  visible,
  onClose,
  title,
  options,
  selected,
  onToggle,
  onClear,
  allLabel,
}: Props) {
  const isAll = selected.length === 0;

  return (
    // `onRequestClose` is what makes the Android hardware back button close the
    // sheet rather than do nothing.
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-navy/[0.55]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[22px] px-6 pt-[10px] pb-8" style={{ maxHeight: '80%' }}>
          <View className="w-9 h-1 rounded-full bg-hairline self-center mb-[18px]" />

          <Typography className="text-[16px] font-bold text-navy">{title}</Typography>
          <Typography className="text-[12.5px] text-slate mt-[3px] mb-4">
            Pick as many as you like. The list updates as you go.
          </Typography>

          {/* A vertical ScrollView — twelve months do not fit on a small phone.
              Never a horizontal one with a className on it; that paints no
              glyphs with this project's NativeWind setup. See AGENTS.md. */}
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerClassName="pb-1">
            <Pressable
              onPress={onClear}
              accessibilityRole="button"
              accessibilityState={{ selected: isAll }}
              accessibilityLabel={allLabel}
              // Only plain background and border classes vary. A className that
              // gains its first shadow, ring or transform after the first
              // render is what makes NativeWind throw the bogus navigation
              // error described in AGENTS.md.
              className={`flex-row items-center justify-between border rounded-md px-4 py-3 mb-[10px] ${
                isAll ? 'border-gold bg-gold/[0.08]' : 'border-hairline bg-white'
              }`}
            >
              <Typography className="text-[14px] font-bold text-navy">{allLabel}</Typography>
              {isAll ? <CheckIcon size={15} color="#8A6100" strokeWidth={3} /> : null}
            </Pressable>

            {options.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onToggle(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={option.label}
                  className={`flex-row items-center justify-between border rounded-md px-4 py-3 mb-[10px] ${
                    isSelected ? 'border-gold bg-gold/[0.08]' : 'border-hairline bg-white'
                  }`}
                >
                  <Typography className="text-[14px] font-bold text-navy">{option.label}</Typography>
                  {isSelected ? <CheckIcon size={15} color="#8A6100" strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            className="bg-navy rounded-md px-4 py-[13px] items-center mt-2"
          >
            <Typography className="text-[13.5px] font-bold text-white">Done</Typography>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
