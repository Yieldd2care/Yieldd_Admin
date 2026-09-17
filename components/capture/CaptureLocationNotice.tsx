import { memo, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { LOCATION_NOTICE } from '../../lib/captureConsent';
import {
  captureLocationDisclosure,
  primeCaptureLocation,
  setCaptureLocationChoice,
} from '../../lib/location';

/**
 * The prominent disclosure Google Play requires before the location prompt.
 *
 * Shown once per install, in front of the OS dialog rather than after it: the
 * policy is about the rep knowing what is taken and why BEFORE they are asked,
 * and standing in a camera screen does not make that obvious on its own. iOS has
 * carried its purpose string since this feature shipped; Android had nothing,
 * and that is the thing a reviewer can reject for.
 *
 * A SMALL CENTRED DIALOG, not a full screen, and that is the point of it.
 *
 * This was a full-bleed takeover first, which was a mistake: a screen that
 * stops everything to explain itself reads as a bigger, stranger request than
 * it is, and the rep meeting it is standing in a hall wanting to scan a card.
 * Play asks the disclosure to be prominent - in the app, in front of the
 * prompt, needing an affirmative tap - and a dialog is all of that, which is
 * why Play's own guidance draws one. The ordinary shape is what makes an
 * ordinary request look ordinary. Modelled on components/dash/ConfirmDialog.
 *
 * A <Modal> rather than an absolutely positioned overlay, for the reason
 * FirstRunTutorial gives: something the rep can tap straight past has not been
 * shown, it has been ignored. Deliberately NOT SheetShell - that is for
 * `(modals)` routes and its backdrop calls router.back(), which from inside a
 * capture flow would drop the rep out of the capture instead of closing this.
 *
 * The card is white against the dark capture screens on purpose: the Android
 * permission dialog that follows a Continue is light, so this reads as the
 * first half of one exchange rather than a screen of ours in front of one of
 * theirs.
 *
 * NOTHING HERE IS ON THE CAPTURE PATH. The screens behind this keep their own
 * `primeCaptureLocation()` call untouched and go on saving leads at the same
 * speed whether this has been answered, refused or never seen: a capture never
 * waits for a fix, and a lead with no location is a normal lead. This component
 * only explains and records.
 *
 * React.memo, and the screens pass nothing but a stable boolean, because
 * manual.tsx is a ScrollView of TextInputs and AGENTS.md is explicit about what
 * a re-rendering tree costs on a screen like that. BEWARE: memo is shallow. Add
 * an `onDone={() => ...}` or any inline object here and every keystroke in that
 * form re-renders this component again - pass primitives only, or wrap the
 * handler in useCallback at the call site.
 */

type Props = {
  /**
   * Whether the screen is ready for this.
   *
   * Exists to keep two permission dialogs from stacking: camera.tsx passes
   * false until the OS camera prompt is out of the way, so the rep answers one
   * question at a time.
   */
  enabled?: boolean;
};

/**
 * `checking` is the initial state, and it has to be.
 *
 * Reading the stored answer is asynchronous, so a component that started at
 * "show" would put this dialog in front of every rep who consented weeks ago for
 * the frame or two before storage answers - and that read queues behind the
 * leads store rehydrating, which on a phone carrying a show's worth of unsynced
 * leads is not a single frame. The tutorial's own `=== false` guard on Home is
 * the same bug, already solved once.
 */
type Phase = 'checking' | 'show' | 'hidden';

function CaptureLocationNoticeInner({ enabled = true }: Props) {
  const [phase, setPhase] = useState<Phase>('checking');

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    // The rep can leave a capture screen faster than storage answers - backing
    // out of the camera is one tap - so the answer is dropped rather than set
    // on a component that is no longer mounted.
    let cancelled = false;
    void captureLocationDisclosure().then((show) => {
      if (!cancelled) setPhase(show ? 'show' : 'hidden');
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const accept = () => {
    setPhase('hidden');
    setCaptureLocationChoice('allowed');
    // Start looking immediately. This is what puts the OS prompt straight after
    // the explanation, which is the order the policy is about, and it recovers
    // the head start the screen's own prime could not take while the answer was
    // still unknown.
    primeCaptureLocation();
  };

  const decline = () => {
    setPhase('hidden');
    setCaptureLocationChoice('declined');
  };

  /**
   * The Android hardware back button, which RN requires a handler for.
   *
   * Records NOTHING, on purpose. Treating a back tap as a refusal would turn a
   * stray gesture into an opt-out no screen in the app can undo; treating it as
   * consent would be worse. It closes for this run - `captureLocationDisclosure`
   * has already marked the question as offered - and asks once more next time
   * the app is opened. Leaving it unhandled is not an option either: that is a
   * dialog the rep cannot dismiss, standing between them and a capture.
   */
  const dismiss = () => setPhase('hidden');

  // After the hooks, never before: `enabled` changes at runtime on camera.tsx
  // as the permission resolves, so an early return above them would be a
  // conditional-hooks violation that only ever fires on that screen.
  if (Platform.OS === 'web') return null;

  return (
    <Modal visible={phase === 'show'} transparent animationType="fade" onRequestClose={dismiss}>
      {/* A plain View, NOT a Pressable that cancels.
          ConfirmDialog's backdrop calls onCancel, and copying that here would
          make a stray tap beside the card a PERMANENT opt-out - this dialog's
          no is remembered forever, where a confirm dialog's is not. The rep
          picks one of the two buttons, or backs out with the hardware key,
          which records nothing. */}
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(11,19,43,0.55)' }}
      >
        <View className="w-full max-w-[400px] bg-white rounded-lg px-6 py-[22px]">
          <Typography className="text-[15px] leading-[1.55] text-navy">
            {LOCATION_NOTICE}
          </Typography>

          {/* Every class here is static - no state toggles a shadow, ring or
              scale into existence after the first render. See AGENTS.md. */}
          <View className="flex-row gap-3 mt-[22px]">
            <Pressable
              onPress={accept}
              accessibilityRole="button"
              className="flex-1 rounded-md py-[13px] items-center bg-gold shadow-[0_10px_26px_rgba(244,176,0,0.34)]"
            >
              <Typography className="text-[13.5px] font-bold text-navy">Continue</Typography>
            </Pressable>

            <Pressable
              onPress={decline}
              accessibilityRole="button"
              className="flex-1 rounded-md py-[13px] items-center border border-hairline bg-white"
            >
              <Typography className="text-[13.5px] font-semibold text-navy">No thanks</Typography>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const CaptureLocationNotice = memo(CaptureLocationNoticeInner);
