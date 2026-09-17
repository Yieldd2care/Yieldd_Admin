import { memo, useEffect, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { MapPinIcon } from '../ui/icons';
import { NavyGlowBackdrop } from '../app/NavyGlowBackdrop';
import {
  LOCATION_NOTICE_OPTIONAL,
  LOCATION_NOTICE_SCOPE,
  LOCATION_NOTICE_TITLE,
  LOCATION_NOTICE_WHY,
} from '../../lib/captureConsent';
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
 * A <Modal> rather than an absolutely positioned overlay, for the reason
 * FirstRunTutorial gives: something the rep can tap straight past has not been
 * shown, it has been ignored. Deliberately NOT SheetShell - that is for
 * `(modals)` routes and its backdrop calls router.back(), which from inside a
 * capture flow would drop the rep out of the capture instead of closing this.
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
    <Modal
      visible={phase === 'show'}
      animationType="fade"
      transparent={false}
      onRequestClose={dismiss}
    >
      <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
        <NavyGlowBackdrop />

        <View className="flex-1 justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-gold/[0.14] items-center justify-center self-center">
            <MapPinIcon size={28} color="#F4B000" strokeWidth={1.75} />
          </View>

          <Typography className="mt-8 text-[23px] leading-[1.28] font-extrabold text-white text-center tracking-[-0.01em]">
            {LOCATION_NOTICE_TITLE}
          </Typography>
          <Typography className="mt-4 text-[14px] leading-[1.6] text-white/[0.72] text-center">
            {LOCATION_NOTICE_WHY}
          </Typography>
          <Typography className="mt-5 text-[13px] leading-[1.6] text-white/[0.55] text-center">
            {LOCATION_NOTICE_SCOPE}
          </Typography>
          <Typography className="mt-3 text-[13px] leading-[1.6] text-white/[0.55] text-center">
            {LOCATION_NOTICE_OPTIONAL}
          </Typography>
        </View>

        {/* Both buttons carry their full class list from the first render - the
            shared Button's variants are constant and only opacity moves. See
            AGENTS.md on what a shadow appearing later costs. */}
        <View className="px-8 pb-6 gap-2">
          <Button label="Continue" onPress={accept} shape="pill" className="w-full" />
          <Button label="No thanks" variant="ghost" onPress={decline} shape="pill" className="w-full" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export const CaptureLocationNotice = memo(CaptureLocationNoticeInner);
