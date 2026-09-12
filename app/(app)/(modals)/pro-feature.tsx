import { Linking, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';
import { LockIcon } from '../../../components/ui/icons';
import { PRO_CONTACT_EMAIL, PRO_SITE_URL, proFeature } from '../../../lib/plan';

/**
 * What a rep sees when they press something their plan does not include.
 *
 * Three things, in this order, because that is the order the questions arrive
 * in: what is this, what can I do instead today, and how would I get it.
 *
 * It quotes no price and offers no way to pay. Both are deliberate — see the
 * header of lib/plan.ts. The old upgrade sheet does both and is wrong on both
 * counts; it is left alone here because replacing it is PENDING #27a and
 * depends on a pricing decision that has not been taken.
 *
 * "Email us" rather than "Buy now" is also simply the truthful button: the
 * website has no pricing section yet, so a link on its own would land someone
 * on the front page with their question unanswered.
 */
export default function ProFeatureSheet() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const detail = proFeature(feature);

  // An id that is not in the catalogue still gets a usable sheet rather than a
  // blank one. It should not happen, and a blank sheet would hide it if it did.
  const title = detail?.title ?? 'A paid feature';
  const what = detail?.what ?? 'This part of Yieldd is included in the paid plan.';

  return (
    <SheetShell>
      <View className="flex-row items-center gap-[9px]">
        <View className="w-7 h-7 rounded-full bg-surface items-center justify-center">
          <LockIcon size={14} color="#5A6B85" strokeWidth={2.2} />
        </View>
        <Typography className="text-[11.5px] font-extrabold text-slate" style={{ letterSpacing: 0.5 }}>
          PAID FEATURE
        </Typography>
      </View>

      <Typography
        className="text-[21px] font-extrabold text-navy tracking-[-0.01em] mt-3"
        style={{ lineHeight: 27 }}
      >
        {title}
      </Typography>

      <Typography className="text-[13.5px] text-slate mt-2" style={{ lineHeight: 20 }}>
        {what}
      </Typography>

      <Typography className="text-[13.5px] text-slate mt-[14px]" style={{ lineHeight: 20 }}>
        It is part of Yieldd Pro, and your account is on the free plan.
      </Typography>

      {detail ? (
        <View className="bg-section rounded-2xl px-[18px] py-4 mt-[18px]">
          <Typography className="text-[11.5px] font-extrabold text-slate" style={{ letterSpacing: 0.4 }}>
            ON FREE, TODAY
          </Typography>
          <Typography className="text-[13px] text-navy mt-[6px]" style={{ lineHeight: 19 }}>
            {detail.insteadOnFree}
          </Typography>
        </View>
      ) : null}

      <View className="gap-[10px] mt-[22px]">
        <Pressable
          onPress={() => void Linking.openURL(`mailto:${PRO_CONTACT_EMAIL}?subject=Yieldd%20Pro`)}
          className="h-[54px] rounded-md bg-gold items-center justify-center shadow-[0_10px_24px_rgba(244,176,0,0.30)]"
        >
          <Typography className="text-[15px] font-bold text-navy">Email us about Pro</Typography>
        </Pressable>
        <Pressable
          onPress={() => void Linking.openURL(PRO_SITE_URL)}
          className="h-[52px] rounded-md bg-white border border-hairline items-center justify-center"
        >
          <Typography className="text-[14px] font-bold text-navy">Open yieldd.co</Typography>
        </Pressable>
      </View>

      <Pressable onPress={() => router.back()} className="items-center mt-[14px]">
        <Typography className="text-[13px] font-bold text-slate">Not now</Typography>
      </Pressable>
    </SheetShell>
  );
}
