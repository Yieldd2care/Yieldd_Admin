import type { ReactNode } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { WebNav } from './WebNav';
import { WebFooter } from './WebFooter';

/**
 * The shell both legal pages sit in.
 *
 * These pages exist because two stores and one OAuth screen all refuse an app
 * whose privacy link 404s — and because the app already links to /privacy and
 * /terms from Settings, so those rows were dead until now.
 *
 * The nav's section links scroll the landing page, which has no meaning here,
 * so every one of them simply goes home rather than doing nothing under the
 * cursor.
 */

const goHome = () => router.push('/(web)');

export function LegalHeading({ children }: { children: ReactNode }) {
  return (
    <Typography className="text-[19px] font-bold text-white mt-11 mb-[14px] leading-snug">
      {children}
    </Typography>
  );
}

export function LegalText({ children }: { children: ReactNode }) {
  return (
    <Typography className="text-[15.5px] text-white/[0.74] leading-[1.75] mb-[14px]">
      {children}
    </Typography>
  );
}

/**
 * Inline emphasis inside a paragraph or bullet.
 *
 * Carries its own size because it is nested inside another Typography — a bare
 * `font-semibold` would fall back to the default body size and step down
 * mid-sentence.
 */
export function LegalStrong({ children }: { children: ReactNode }) {
  return <Typography className="text-[15.5px] font-semibold text-white">{children}</Typography>;
}

/** A bullet that keeps its marker beside the text rather than above it. */
export function LegalBullet({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row gap-[10px] mb-[10px] pl-1">
      <Typography className="text-[15.5px] text-gold leading-[1.75]">•</Typography>
      <Typography className="flex-1 text-[15.5px] text-white/[0.74] leading-[1.75]">
        {children}
      </Typography>
    </View>
  );
}

/** Used where a sentence has to be impossible to skim past. */
export function LegalCallout({ children }: { children: ReactNode }) {
  return (
    <View className="border-l-2 border-gold bg-white/[0.04] rounded-r-md px-5 py-4 my-5">
      <Typography className="text-[15px] text-white/[0.86] leading-[1.7]">{children}</Typography>
    </View>
  );
}

/**
 * Text, not Pressable. This sits inside a paragraph, and a Pressable nested in
 * a Text renders a div inside a span on web — the address would break out of
 * the line it belongs to. Text takes onPress directly and stays inline.
 */
export function LegalMail() {
  return (
    <Typography
      onPress={() => Linking.openURL('mailto:care@yieldd.co')}
      className="text-[15.5px] font-semibold text-gold leading-[1.75]"
    >
      care@yieldd.co
    </Typography>
  );
}

/** An inline link to another page on the site. Text, for the reason above. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Typography
      onPress={() => router.push(href)}
      className="text-[15.5px] font-semibold text-gold underline leading-[1.75]"
    >
      {children}
    </Typography>
  );
}

interface Props {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}

export function LegalPage({ title, updated, intro, children }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <WebNav onNavigate={goHome} />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="max-w-[820px] w-full mx-auto px-8 pt-14 pb-20">
          <Typography className="text-[11.5px] font-bold tracking-[0.16em] uppercase text-gold">
            Legal
          </Typography>
          <Typography
            variant="display-lg"
            className="text-white mt-3 md:text-[38px] md:leading-[1.1]"
          >
            {title}
          </Typography>
          <Typography className="text-[13px] text-white/[0.55] mt-4">
            Last updated {updated}
          </Typography>

          <Typography className="text-[17px] text-white/[0.82] leading-[1.7] mt-7">
            {intro}
          </Typography>

          <View className="h-px bg-white/[0.12] mt-9" />

          {children}
        </View>

        <WebFooter onLogoPress={goHome} />
      </ScrollView>
    </SafeAreaView>
  );
}
