import { Modal, Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { AlertCircleIcon } from '../ui/icons';
import { formatRelative } from '../../lib/dates';
import type { DuplicateMatch } from '../../lib/api/leads';

/**
 * "This person is already at this event. Save anyway?"
 *
 * The manual screen is the only capture path that can ask this BEFORE writing
 * anything, because it is the only one that knows the phone number while the
 * rep is still typing. The scan path finds out seconds later, from the card
 * reader, long after the lead has been queued — it asks afterwards, on the
 * saved screen, where the answer has to be Keep or Remove instead.
 *
 * ---------------------------------------------------------------------------
 * There is deliberately no Remove here
 *
 * Nothing has been written when this is on screen, so Cancel already achieves
 * everything a Remove could. Adding one would mean building a delete path for a
 * lead that does not exist. Nobody should "complete the symmetry" later.
 *
 * ---------------------------------------------------------------------------
 * A Modal, not `Alert.alert`
 *
 * `/capture/` is deliberately kept on web (lib/webRoutes.ts) because it needs a
 * camera and a microphone and there is no dashboard equivalent. react-native-web
 * ships Alert as `class Alert { static alert() {} }`, so an Alert here would be
 * a silent no-op in a browser — the lead would save with no warning at all.
 * Modal is implemented properly on both.
 */
export function DuplicateSaveConfirm({
  visible,
  match,
  isSelf,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  match: DuplicateMatch | null;
  isSelf: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!match) return null;

  const when = formatRelative(match.capturedAt);

  const title = isSelf
    ? 'You already captured this person'
    : `Already captured by ${match.capturedByName}`;

  const body = isSelf
    ? `You saved this contact ${when}. Saving again gives you two leads for the same person.`
    : `${when}, at this event. Saving will create a second lead for the same person.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(11,19,43,0.45)' }}
      >
        {/* Stops a tap inside the card reaching the backdrop above. */}
        <Pressable onPress={() => {}} className="w-full max-w-[420px] bg-white rounded-lg p-6">
          <View className="flex-row items-center gap-[10px]">
            <View className="w-[30px] h-[30px] rounded-full bg-gold items-center justify-center">
              <AlertCircleIcon size={16} color="#0B132B" strokeWidth={2.25} />
            </View>
            <Typography className="text-[17px] font-bold text-navy flex-1">{title}</Typography>
          </View>

          <Typography className="text-[13.5px] text-slate leading-[1.6] mt-3">{body}</Typography>

          <View className="flex-row gap-3 mt-6">
            <Pressable
              onPress={onConfirm}
              // Both branches carry the shadow and only the background moves.
              // A class list that gains its first shadow-* after the first
              // render is what throws the bogus navigation-context red screen.
              // Not destructive-red: nothing is being destroyed here.
              className="flex-1 rounded-md py-[13px] items-center bg-gold shadow-[0_10px_26px_rgba(244,176,0,0.34)]"
            >
              <Typography className="text-[13.5px] font-bold text-navy">Save anyway</Typography>
            </Pressable>

            <Pressable
              onPress={onCancel}
              className="flex-1 rounded-md py-[13px] items-center border border-hairline bg-white shadow-[0_10px_26px_rgba(244,176,0,0)]"
            >
              <Typography className="text-[13.5px] font-semibold text-navy">Cancel</Typography>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
