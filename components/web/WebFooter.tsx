import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Typography } from '../ui/Typography';
import { BrandLockup } from '../ui/BrandLockup';

const PRODUCT_LINKS = ['How it works', 'Features', 'Event ROI', 'Industries', 'FAQ', 'Sign in'];
const COMPANY_LINKS = ['About Yieldd', 'Book a demo', 'Privacy policy', 'Terms of use'];

/**
 * Where each footer label goes. Labels not listed here have no page yet, and
 * are left inert rather than pointed at a URL that would 404 — a legal link
 * that 404s is an App Store rejection under 5.1.1, and was one until the
 * privacy and terms pages were added.
 */
const LINK_TARGETS: Record<string, string> = {
  'Sign in': '/(auth)',
  'Privacy policy': '/privacy',
  'Terms of use': '/terms',
};

function FooterLink({ label }: { label: string }) {
  const target = LINK_TARGETS[label];
  return (
    <Pressable onPress={target ? () => router.push(target) : undefined}>
      <Typography className="text-[15px] text-white/[0.70] hover:text-gold transition-colors duration-200">
        {label}
      </Typography>
    </Pressable>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <View className="flex-1 min-w-[140px]">
      <Typography className="text-[11.5px] font-bold tracking-[0.16em] uppercase text-white">
        {title}
      </Typography>
      <View className="gap-[11px] mt-[18px]">
        {links.map((l) => (
          <FooterLink key={l} label={l} />
        ))}
      </View>
    </View>
  );
}

function PlayBadge() {
  return (
    <Pressable className="flex-row items-center gap-[11px] mt-3 px-4 py-[10px] border border-white/[0.28] rounded-md bg-white/[0.04] hover:border-gold hover:bg-gold/[0.08] transition-all duration-200">
      <Svg width={22} height={24} viewBox="0 0 24 26">
        <Path d="M2.3 1.1a1.9 1.9 0 0 0-.6 1.4v21a1.9 1.9 0 0 0 .6 1.4l11-11.9z" fill="#F4B000" />
        <Path d="M2.3 1.1 15.5 8.6l-2.2 4.4z" fill="#FFFFFF" opacity={0.9} />
        <Path d="M2.3 24.9 13.3 13l2.2 4.4z" fill="#FFFFFF" opacity={0.55} />
        <Path d="M15.5 8.6l6.3 3.6a1.5 1.5 0 0 1 0 2.6l-6.3 3.6-2.2-4.4z" fill="#FFC53D" />
      </Svg>
      <View>
        <Typography className="text-[9.5px] font-semibold tracking-[0.14em] text-white/[0.75]">
          GET IT ON
        </Typography>
        <Typography className="text-[15px] font-bold text-white mt-px">Google Play</Typography>
      </View>
    </Pressable>
  );
}

interface Props {
  onLogoPress?: () => void;
}

export function WebFooter({ onLogoPress }: Props) {
  return (
    <View className="bg-navy border-t border-white/[0.12]">
      <View className="max-w-[1200px] w-full mx-auto px-8 pt-16 pb-10 flex-col md:flex-row gap-10 md:gap-12">
        <View className="flex-1 md:max-w-[280px]">
          <Pressable onPress={onLogoPress}>
            <BrandLockup size="md" />
          </Pressable>
          <Typography className="text-[15.5px] text-white/[0.70] mt-[18px] leading-[1.7]">
            Lead capture, enrichment and follow-up for teams that sell at exhibitions and in the
            field.
          </Typography>
          <Typography className="text-[11.5px] font-semibold tracking-[0.14em] text-white/[0.70] mt-4">
            IOS · ANDROID · WEB
          </Typography>
        </View>

        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Company" links={COMPANY_LINKS} />

        <View className="flex-1 min-w-[160px]">
          <Typography className="text-[11.5px] font-bold tracking-[0.16em] uppercase text-white">
            Contact
          </Typography>
          <View className="gap-[14px] mt-[18px]">
            <View>
              <Typography className="text-[12.5px] text-white/[0.70]">Support and sales</Typography>
              <Typography className="text-base font-semibold text-gold">care@yieldd.co</Typography>
            </View>
            <View className="pt-[6px]">
              <Typography className="text-[15px] font-semibold text-white leading-[1.45]">
                Find Yieldd on Google Play
              </Typography>
              <PlayBadge />
              <Typography className="text-[12.5px] text-white/[0.70] mt-[10px]">
                iOS coming shortly
              </Typography>
            </View>
          </View>
        </View>
      </View>

      <View className="border-t border-white/[0.12]">
        <View className="max-w-[1200px] w-full mx-auto px-8 py-[22px] flex-col md:flex-row items-center justify-between gap-5">
          <Typography className="text-[12.5px] text-white/[0.70]">
            Yieldd is a product by Growth Saga. © 2026 Growth Saga. All rights reserved.
          </Typography>
          <Typography className="text-[12.5px] text-white/[0.70]">care@yieldd.co</Typography>
        </View>
      </View>
    </View>
  );
}
