import { Modal, Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';

/**
 * A confirmation the browser actually shows.
 *
 * `Alert.alert` cannot be used here. react-native-web ships it as
 * `class Alert { static alert() {} }` — an empty function — so every
 * confirmation copied from a phone screen silently does nothing and the
 * destructive action either never happens or happens with no warning at all.
 *
 * Built on `Modal`, which react-native-web does implement properly. The same
 * component `CalendarSheet` already relies on.
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(11,19,43,0.45)' }}
      >
        {/* Stops a click inside the card reaching the backdrop above. */}
        <Pressable onPress={() => {}} className="w-full max-w-[420px] bg-white rounded-lg p-6">
          <Typography className="text-[17px] font-bold text-navy">{title}</Typography>
          {body ? (
            <Typography className="text-[13.5px] text-slate leading-[1.6] mt-2">{body}</Typography>
          ) : null}

          <View className="flex-row gap-3 mt-6">
            <Pressable
              onPress={busy ? undefined : onConfirm}
              disabled={busy}
              // The shadow is present in both states and only opacity moves —
              // a class list that gains its first shadow-* after the first
              // render is what throws the bogus navigation-context error.
              className={`flex-1 rounded-md py-[13px] items-center shadow-[0_10px_26px_rgba(244,176,0,0.34)] ${
                destructive ? 'bg-[#C23B3B]' : 'bg-gold'
              } ${busy ? 'opacity-40' : ''}`}
            >
              <Typography
                className={`text-[13.5px] font-bold ${destructive ? 'text-white' : 'text-navy'}`}
              >
                {busy ? 'Working…' : confirmLabel}
              </Typography>
            </Pressable>

            <Pressable
              onPress={onCancel}
              className="flex-1 rounded-md py-[13px] items-center border border-hairline bg-white"
            >
              <Typography className="text-[13.5px] font-semibold text-navy">{cancelLabel}</Typography>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
