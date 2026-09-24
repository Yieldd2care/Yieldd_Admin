import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { FOCUS } from './primitives/focus';
import { CloseIcon } from '../ui/icons';

/**
 * The floating pill header.
 *
 * It is painted by app/(web)/index.tsx AFTER the ScrollView, inside a
 * click-through absolute wrapper, so the hero scrolls up underneath it. The
 * reference gets the same overlap with `margin-top:-94px` because its header
 * is in flow; ours never is, so no negative margin is involved.
 *
 * That wrapper has no fixed height, deliberately. Putting the nav inside a
 * `h-[94px]` box would clip the mobile drawer the moment it opened. Here the
 * drawer is a sibling of the pill inside the same auto-height column, so it
 * can be as tall as it likes.
 *
 * Note the links sit immediately after the logo with `mr-auto`, pushing the
 * buttons to the far right. That is the reference's arrangement — the nav is
 * left-aligned, not centred.
 */

/**
 * The pill is light, as the reference's is, and the real brand lockup sits on
 * a navy plate inside it.
 *
 * The plate is not decoration. Every lockup in assets/brand is
 * light-on-transparent - yieldd-lockup-transparent.png has a navy rectangle
 * baked in despite its name - so the white wordmark has nothing to read
 * against on a light pill. Giving the artwork its own dark ground is what lets
 * the shipped logo be used as-is, rather than rebuilt out of type.
 *
 * Two earlier attempts are worth not repeating: a navy pill, which vanished
 * into the navy hero; and setting the wordmark as text, which stopped using
 * the actual logo file.
 */

const LOCKUP = require('../../assets/brand/transparenet secondary logo.png');
/** 2172x724 in the source file. */
const LOCKUP_ASPECT = 2172 / 724;
const LOCKUP_HEIGHT = 32;

const LINKS: { key: string; label: string }[] = [
  { key: 'how', label: 'How it works' },
  { key: 'features', label: 'Features' },
  { key: 'roi', label: 'Event ROI' },
  { key: 'industries', label: 'Industries' },
  { key: 'faq', label: 'FAQ' },
];

const LINK_TEXT =
  '[font-family:Figtree,system-ui,sans-serif] [font-weight:500] text-[14px] text-slate hover:text-navy transition-colors duration-200';

const BTN_TEXT =
  '[font-family:Figtree,system-ui,sans-serif] [font-weight:700] text-[14px] text-navy';

interface Props {
  onNavigate: (key: string) => void;
}

/** Three bars, drawn — so nothing has to gain a rotate transform later. */
function MenuBars() {
  return (
    <View className="gap-[4px] items-center">
      <View className="w-[16px] h-[2px] rounded-full bg-white" />
      <View className="w-[16px] h-[2px] rounded-full bg-white" />
      <View className="w-[16px] h-[2px] rounded-full bg-white" />
    </View>
  );
}

export function WebNav({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);

  const go = (key: string) => {
    setOpen(false);
    onNavigate(key);
  };

  return (
    <View className="w-full items-center px-4 md:px-8 pt-[14px]">
      <View className="w-full max-w-[1200px]">
        <View className="flex-row items-center gap-6 rounded-full bg-surface border-[3px] border-white pl-[7px] pr-[7px] py-[7px] shadow-[0_12px_30px_rgba(4,12,30,0.42)]">
          <Pressable
            onPress={() => go('top')}
            className={`rounded-full bg-navy px-[20px] py-[9px] ${FOCUS}`}
            accessibilityRole="link"
            accessibilityLabel="Yieldd home"
          >
            <Image
              source={LOCKUP}
              style={{ height: LOCKUP_HEIGHT, width: LOCKUP_HEIGHT * LOCKUP_ASPECT }}
              resizeMode="contain"
            />
          </Pressable>

          <View className="hidden lg:flex flex-row items-center gap-[22px] mr-auto">
            {LINKS.map((link) => (
              <Pressable
                key={link.key}
                onPress={() => go(link.key)}
                className={FOCUS}
                accessibilityRole="link"
              >
                <Text className={LINK_TEXT}>{link.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Holds the buttons to the right once the links are hidden. */}
          <View className="flex-1 lg:hidden" />

          <View className="hidden lg:flex flex-row items-center gap-[8px]">
            <Pressable
              onPress={() => router.push('/(auth)')}
              className={`rounded-full bg-white hover:bg-white/80 px-[18px] py-[11px] transition-colors duration-200 ${FOCUS}`}
              accessibilityRole="link"
            >
              <Text className={BTN_TEXT}>Sign in</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(auth)')}
              className={`rounded-full bg-gold hover:bg-gold-hover px-[20px] py-[11px] transition-colors duration-200 ${FOCUS}`}
              accessibilityRole="link"
            >
              <Text className={BTN_TEXT}>Get started</Text>
            </Pressable>
          </View>

          {/* Equal width and height: a borderRadius this large on a non-square
              view gives a stadium, not a circle. */}
          <Pressable
            onPress={() => setOpen((v) => !v)}
            className={`lg:hidden w-[42px] h-[42px] rounded-full bg-navy items-center justify-center ${FOCUS}`}
            accessibilityRole="button"
            accessibilityLabel={open ? 'Close menu' : 'Open menu'}
            accessibilityState={{ expanded: open }}
          >
            {/* Swapping whole elements rather than toggling a rotate class on
                one. A transform gained after the first render is the
                documented trigger for the bogus navigation-context screen. */}
            {open ? <CloseIcon size={17} color="#FFFFFF" /> : <MenuBars />}
          </Pressable>
        </View>

        {open ? (
          <View className="lg:hidden mt-[10px] rounded-[22px] bg-white border border-hairline p-[10px] shadow-[0_18px_40px_rgba(7,22,51,0.18)]">
            {LINKS.map((link) => (
              <Pressable
                key={link.key}
                onPress={() => go(link.key)}
                className={`rounded-[14px] px-4 py-[13px] hover:bg-section transition-colors duration-200 ${FOCUS}`}
                accessibilityRole="link"
              >
                <Text className="[font-family:Figtree,system-ui,sans-serif] [font-weight:600] text-[15px] text-navy">
                  {link.label}
                </Text>
              </Pressable>
            ))}

            <View className="h-px bg-hairline my-[8px] mx-4" />

            <View className="flex-row gap-[8px] px-1 pb-1">
              <Pressable
                onPress={() => router.push('/(auth)')}
                className={`flex-1 rounded-full border border-hairline py-[13px] items-center ${FOCUS}`}
                accessibilityRole="link"
              >
                <Text className={BTN_TEXT}>Sign in</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(auth)')}
                className={`flex-1 rounded-full bg-gold py-[13px] items-center ${FOCUS}`}
                accessibilityRole="link"
              >
                <Text className={BTN_TEXT}>Get started</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
