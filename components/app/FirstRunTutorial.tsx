import { useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { NavyGlowBackdrop } from './NavyGlowBackdrop';
import { CalendarIcon, CameraIcon, GridIcon, QrCodeIcon } from '../ui/icons';

/**
 * The first-run tutorial, shown once on Home (PENDING #33d).
 *
 * Four steps, in the order the user set on 2026-09-14 — create an event, scan
 * a card, all the leads in one place, your QR code. That order is the product's
 * own sequence, not a tour of the tab bar, which is why Events comes first even
 * though scanning is the thing people came for: there is nowhere to put a lead
 * until an event exists.
 *
 * The same four for everyone, also by decision. A rep sees it too — they are
 * the ones actually scanning — and the screen before this already sends a solo
 * account to its card editor, so nothing needs to branch.
 *
 * A <Modal> rather than an absolutely positioned overlay, so it covers the tab
 * bar. A tutorial the user can tap straight past is not shown once, it is shown
 * and ignored.
 *
 * NO SkipLink HERE, deliberately. That component navigates with
 * router.replace(homeRoute()), which is exactly right for an onboarding screen
 * and exactly wrong for an overlay that is already sitting on Home — it would
 * remount the screen underneath for no reason. The skip below does the one
 * thing it should: record, and close.
 *
 * On the styling: every difference between an active and an inactive step dot
 * is a plain colour or width. No shadow, ring, scale or gradient is toggled —
 * see AGENTS.md, and the header of app/(app)/onboarding/referral.tsx for what
 * that rule costs when it is broken.
 */

function Collage({ icon, tint }: { icon: ReactNode; tint: string }) {
  // Three stacked cards behind one icon tile: enough to read as "a few screens
  // of the app" without pretending to be screenshots that would go stale the
  // first time any of those screens is redesigned.
  return (
    <View className="items-center justify-center h-[168px]">
      <Svg width={230} height={168} viewBox="0 0 230 168" fill="none">
        <Rect x="24" y="34" width="78" height="104" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
        <Rect x="128" y="34" width="78" height="104" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
        <Rect x="36" y="50" width="54" height="6" rx="3" fill="rgba(255,255,255,0.20)" />
        <Rect x="36" y="64" width="38" height="6" rx="3" fill="rgba(255,255,255,0.13)" />
        <Rect x="140" y="50" width="54" height="6" rx="3" fill="rgba(255,255,255,0.20)" />
        <Rect x="140" y="64" width="38" height="6" rx="3" fill="rgba(255,255,255,0.13)" />
        <Rect x="36" y="104" width="46" height="6" rx="3" fill="rgba(255,255,255,0.13)" />
        <Rect x="140" y="104" width="46" height="6" rx="3" fill="rgba(255,255,255,0.13)" />
        <Rect x="63" y="22" width="104" height="124" rx="16" fill="#101C3E" stroke="rgba(255,255,255,0.28)" strokeWidth="1.75" />
        <Circle cx="115" cy="66" r="26" fill={tint} />
        <Rect x="85" y="106" width="60" height="7" rx="3.5" fill="rgba(255,255,255,0.26)" />
        <Rect x="97" y="122" width="36" height="7" rx="3.5" fill="rgba(255,255,255,0.15)" />
        <Path d="M115 40v0" stroke="none" />
      </Svg>
      <View className="absolute" style={{ top: 62, left: 0, right: 0, alignItems: 'center' }}>
        {icon}
      </View>
    </View>
  );
}

type Step = {
  title: string;
  body: string;
  icon: ReactNode;
  tint: string;
};

const STEPS: readonly Step[] = [
  {
    title: 'Start with an event',
    body: 'Create the show or expo you’re attending. Everything you capture gets filed under it, so one event’s leads never mix with another’s.',
    icon: <CalendarIcon size={26} color="#0B132B" strokeWidth={2} />,
    tint: '#F4B000',
  },
  {
    title: 'Scan a card',
    body: 'Tap the camera in the middle of the bar and photograph a business card. The details are read for you, and it works with no signal at all.',
    icon: <CameraIcon size={26} color="#0B132B" strokeWidth={2} />,
    tint: '#F4B000',
  },
  {
    title: 'Every lead in one place',
    body: 'Each card becomes a lead you can add notes and a voice memo to, then follow up by WhatsApp or email without leaving the app.',
    icon: <GridIcon size={24} color="#0B132B" strokeWidth={2} />,
    tint: '#F4B000',
  },
  {
    title: 'Hand out your own card',
    body: 'The QR tab is your digital card. Let someone scan it and they get your details instantly, with nothing to print and nothing to run out of.',
    icon: <QrCodeIcon size={26} color="#0B132B" strokeWidth={2} />,
    tint: '#F4B000',
  },
];

export function FirstRunTutorial({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const [step, setStep] = useState(0);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const next = () => {
    if (isLast) {
      onDone();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onDone}>
      <SafeAreaView className="flex-1 bg-navy" edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <NavyGlowBackdrop />

        <View className="flex-row justify-end px-5 pt-2">
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Skip the tour"
            className="px-4 py-2 active:opacity-60"
          >
            <Typography className="text-[12.5px] font-bold text-white/[0.62]">Skip</Typography>
          </Pressable>
        </View>

        <View className="flex-1 justify-center px-8">
          <Collage icon={current.icon} tint={current.tint} />

          <Typography className="mt-9 text-[12px] font-bold tracking-[0.14em] text-gold text-center">
            {`STEP ${step + 1} OF ${STEPS.length}`}
          </Typography>
          <Typography className="mt-3 text-[24px] leading-[1.25] font-extrabold text-white text-center tracking-[-0.01em]">
            {current.title}
          </Typography>
          <Typography className="mt-3 text-[13.5px] leading-[1.6] text-white/[0.62] text-center">
            {current.body}
          </Typography>
        </View>

        <View className="px-8 pb-6">
          <View className="flex-row items-center justify-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <View
                key={s.title}
                className={`h-[6px] rounded-full ${i === step ? 'w-6 bg-gold' : 'w-[6px] bg-white/[0.24]'}`}
              />
            ))}
          </View>

          <Button label={isLast ? 'Got it' : 'Next'} onPress={next} shape="pill" className="w-full" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
