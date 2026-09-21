import { useEffect, useState } from 'react';
import { Modal, Pressable, TextInput as RNTextInput, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { KeyboardSafe } from './KeyboardSafe';
import { parseDealValueInput } from '../../lib/leadValue';

/**
 * Edits ONE thing: the amount on a lead that is already Qualified or Won
 * (PENDING 71). It deliberately does not touch status — that path stays in the
 * status-change modal, which is Pro-gated; a pencil that demands an upgrade to
 * fix a typo would be worse than no pencil.
 *
 * Built on the PhoneChoiceSheet pattern — a plain RN `Modal`, which portals to
 * its own native window and so works from inside the lead detail's ScrollView.
 *
 * ⚠️ Deliberately NOT SheetShell. That component is for `(modals)` ROUTES and
 * its backdrop calls `router.back()`, which from the lead detail would pop the
 * whole screen instead of closing the sheet. `onRequestClose` is what makes the
 * Android hardware back button close it.
 */

interface Props {
  visible: boolean;
  /** "Expected value" or "Deal value" — the row's own label, reused. */
  label: string;
  /** Rupees. Present whenever the sheet is reachable: the row that opens it
   *  only renders on a lead that carries a value. */
  initialValue: number | undefined;
  /** Rupees. Called only with a usable amount that actually changed. */
  onSave: (rupees: number) => void;
  onClose: () => void;
}

export function DealValueEditSheet({ visible, label, initialValue, onSave, onClose }: Props) {
  // Pre-filled, unlike the status flow's deliberate blank: that screen asks
  // for a NEW figure and a pre-filled one would be tapped past into the ROI
  // number. This one corrects an existing figure, and a typo fix needs the
  // typo visible.
  const [value, setValue] = useState('');
  useEffect(() => {
    if (visible) setValue(initialValue ? String(initialValue) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const amount = parseDealValueInput(value);
  const canSave = amount > 0;

  const save = () => {
    if (!canSave) return;
    // An unchanged amount writes nothing. Resending the same dealValue through
    // the pending patch would overwrite a concurrent edit of that field from
    // the dashboard — minimal patches are a correctness rule here.
    if (amount !== initialValue) onSave(amount);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* KeyboardSafe INSIDE the Modal: the sheet sits at the bottom, exactly
          where the keyboard lands, and the Modal's own window is not wrapped
          by the screen's layout. */}
      <KeyboardSafe>
        <View className="flex-1 justify-end bg-navy/[0.55]">
          <Pressable className="flex-1" onPress={onClose} />
          <View className="bg-white rounded-t-[22px] px-6 pt-[10px] pb-8">
            <View className="w-9 h-1 rounded-full bg-hairline self-center mb-[18px]" />

            <Typography className="text-[16px] font-bold text-navy">Edit {label.toLowerCase()}</Typography>
            <Typography className="text-[12.5px] text-slate mt-[3px] mb-4">
              Only the amount changes. The status stays as it is.
            </Typography>

            {/* Keep these classes in step with the deal-value modal's input.
                The zero-alpha shadow on the empty branch is deliberate: the
                variable must exist from the first render (see AGENTS.md). */}
            <View className={`flex-row items-center border-[1.5px] rounded-[14px] px-[18px] h-16 ${value ? 'border-gold shadow-[0_0_0_3px_rgba(244,176,0,0.14)]' : 'border-hairline shadow-[0_0_0_3px_rgba(244,176,0,0)]'}`}>
              <Typography className="text-[22px] font-bold text-slate mr-2">&#8377;</Typography>
              <RNTextInput
                value={value}
                onChangeText={setValue}
                keyboardType="number-pad"
                maxLength={10}
                autoFocus
                placeholder="0"
                placeholderTextColor="#97A3B8"
                className="flex-1 text-[26px] font-extrabold text-navy"
              />
            </View>

            {canSave ? null : (
              <Typography className="text-[12.5px] text-slate mt-[10px] leading-[1.5]">
                Enter the amount — a Qualified or Won lead can&rsquo;t have an empty value.
              </Typography>
            )}

            <View className="flex-row gap-[10px] mt-6">
              <Pressable onPress={onClose} className="flex-1 h-[52px] rounded-md bg-white border border-hairline items-center justify-center">
                <Typography className="text-[14px] font-bold text-navy">Cancel</Typography>
              </Pressable>
              <Pressable
                disabled={!canSave}
                onPress={save}
                className={`flex-[2] h-[52px] rounded-md items-center justify-center ${canSave ? 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.28)]' : 'bg-surface shadow-[0_10px_24px_rgba(244,176,0,0)]'}`}
              >
                <Typography className={`text-[15px] font-bold ${canSave ? 'text-navy' : 'text-slate'}`}>Save</Typography>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardSafe>
    </Modal>
  );
}
