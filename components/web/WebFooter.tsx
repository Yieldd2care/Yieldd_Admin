import { Linking, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { FOCUS } from './primitives/focus';
import { BrandLockup } from '../ui/BrandLockup';
import { FacebookIcon, InstagramIcon, LinkedInIcon } from '../ui/icons';
import { SOCIAL_ACCOUNTS } from '../../lib/social';

/**
 * The footer.
 *
 * Keeps the brand lockup — this is a navy surface, which is the one place the
 * white-wordmark asset in assets/brand is correct.
 *
 * The chip row above the columns is the reference's; the social row is
 * Yieldd's own and the reference has no equivalent, so it stays.
 */

const TOPIC_CHIPS = [
  'Card scan',
  'Voice notes',
  'Offline capture',
  'Duplicate check',
  'Lead scoring',
  'WhatsApp follow-up',
  'Event ROI',
  'Excel export',
];

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

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

function FooterLink({ label }: { label: string }) {
  const target = LINK_TARGETS[label];
  return (
    <Pressable
      onPress={target ? () => router.push(target) : undefined}
      className={target ? FOCUS : undefined}
      accessibilityRole={target ? 'link' : undefined}
    >
      <Text
        className={`${BODY} text-[14px] text-white/[0.70] hover:text-white transition-colors duration-200`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <View className="flex-1 min-w-[140px]">
      <Text
        className={`${BODY} [font-weight:800] text-[11.5px] tracking-[0.1em] uppercase text-white/[0.45]`}
      >
        {title}
      </Text>
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
    <Pressable
      className={`flex-row items-center gap-[11px] mt-3 px-4 py-[10px] border border-white/[0.28] rounded-md bg-white/[0.04] hover:border-gold hover:bg-gold/[0.08] transition-all duration-200 ${FOCUS}`}
    >
      <Svg width={22} height={24} viewBox="0 0 24 26">
        <Path d="M2.3 1.1a1.9 1.9 0 0 0-.6 1.4v21a1.9 1.9 0 0 0 .6 1.4l11-11.9z" fill="#F4B000" />
        <Path d="M2.3 1.1 15.5 8.6l-2.2 4.4z" fill="#FFFFFF" opacity={0.9} />
        <Path d="M2.3 24.9 13.3 13l2.2 4.4z" fill="#FFFFFF" opacity={0.55} />
        <Path d="M15.5 8.6l6.3 3.6a1.5 1.5 0 0 1 0 2.6l-6.3 3.6-2.2-4.4z" fill="#FFC53D" />
      </Svg>
      <View>
        <Text
          className={`${BODY} [font-weight:600] text-[9.5px] tracking-[0.14em] text-white/[0.75]`}
        >
          GET IT ON
        </Text>
        <Text className={`${BODY} [font-weight:700] text-[15px] text-white mt-px`}>
          Google Play
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The social accounts, as icon buttons.
 *
 * `Linking.openURL` rather than an anchor, because this footer renders through
 * react-native-web and the same component is used on the legal pages. A real
 * new tab is what people expect from a footer icon, and `_blank` is what
 * openURL gives on web.
 */
function SocialRow() {
  return (
    <View className="flex-row items-center gap-3 mt-5">
      {SOCIAL_ACCOUNTS.map((account) => {
        const Icon =
          account.key === 'instagram'
            ? InstagramIcon
            : account.key === 'facebook'
              ? FacebookIcon
              : LinkedInIcon;

        return (
          <Pressable
            key={account.key}
            onPress={() => void Linking.openURL(account.url)}
            // `aria-label` because the button has no text — a screen reader
            // otherwise announces three unlabelled buttons in a row.
            aria-label={`Yieldd on ${account.label}`}
            className={`w-10 h-10 rounded-full border border-white/[0.28] bg-white/[0.04] items-center justify-center hover:border-gold hover:bg-gold/[0.10] transition-all duration-200 ${FOCUS}`}
          >
            <Icon size={17} color="#FFFFFF" />
          </Pressable>
        );
      })}
    </View>
  );
}

interface Props {
  onLogoPress?: () => void;
}

export function WebFooter({ onLogoPress }: Props) {
  // Computed, not written down. A hardcoded year is correct for exactly one
  // year and then quietly wrong on every page of the site.
  const year = new Date().getFullYear();

  return (
    <View className="bg-navy border-t border-white/[0.12]">
      <View className="max-w-[1200px] w-full mx-auto px-5 md:px-8 pt-14">
        <View className="flex-row flex-wrap justify-center gap-[8px]">
          {TOPIC_CHIPS.map((chip) => (
            <View
              key={chip}
              className="rounded-full bg-white/[0.07] border border-white/[0.10] px-[13px] py-[7px]"
            >
              <Text className={`${BODY} [font-weight:600] text-[12px] text-white/[0.72]`}>
                {chip}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="max-w-[1200px] w-full mx-auto px-5 md:px-8 pt-12 pb-10 flex-col md:flex-row gap-10 md:gap-12">
        <View className="flex-1 md:max-w-[280px]">
          <Pressable onPress={onLogoPress} className={FOCUS}>
            <BrandLockup size="md" />
          </Pressable>
          <Text className={`${BODY} text-[15px] leading-[1.7] text-white/[0.70] mt-[18px]`}>
            Lead capture, enrichment and follow-up for teams that sell at exhibitions and in the
            field.
          </Text>
          <Text
            className={`${BODY} [font-weight:600] text-[11.5px] tracking-[0.14em] text-white/[0.55] mt-4`}
          >
            IOS · ANDROID · WEB
          </Text>
          <SocialRow />
        </View>

        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Company" links={COMPANY_LINKS} />

        <View className="flex-1 min-w-[160px]">
          <Text
            className={`${BODY} [font-weight:800] text-[11.5px] tracking-[0.1em] uppercase text-white/[0.45]`}
          >
            Contact
          </Text>
          <View className="gap-[14px] mt-[18px]">
            <View>
              <Text className={`${BODY} text-[12.5px] text-white/[0.70]`}>Support and sales</Text>
              <Text className={`${BODY} [font-weight:600] text-[16px] text-gold`}>
                care@yieldd.co
              </Text>
            </View>
            <View className="pt-[6px]">
              <Text
                className={`${BODY} [font-weight:600] text-[15px] leading-[1.45] text-white`}
              >
                Find Yieldd on Google Play
              </Text>
              <PlayBadge />
              <Text className={`${BODY} text-[12.5px] text-white/[0.70] mt-[10px]`}>
                iOS coming shortly
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="border-t border-white/[0.12]">
        <View className="max-w-[1200px] w-full mx-auto px-5 md:px-8 py-[22px] flex-col md:flex-row items-center justify-between gap-5">
          <Text className={`${BODY} text-[12.5px] text-white/[0.55] text-center`}>
            Yieldd is a product by Growth Saga. © {year} Growth Saga. All rights reserved.
          </Text>
          <Text className={`${BODY} text-[12.5px] text-white/[0.55]`}>care@yieldd.co</Text>
        </View>
      </View>
    </View>
  );
}
