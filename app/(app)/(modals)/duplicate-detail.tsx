import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { SheetShell } from '../../../components/app/SheetShell';
import { formatRelative } from '../../../lib/dates';

/**
 * The one sanctioned look at another rep's lead (TASKS.md 2.14, E4).
 *
 * Read-only, and narrow on purpose: who captured the contact, when, and what
 * they wrote. MVP_PLAN is explicit that reps do not browse each other's leads —
 * this is the single exception, and it exists so the second rep continues a
 * conversation instead of restarting one.
 *
 * Everything comes in as route params rather than being fetched again. The
 * banner has already told the rep there is a match; opening the sheet should not
 * be able to fail with a spinner and an error while they stand in front of the
 * customer. It also keeps the customer's phone number out of the URL, which
 * matters because this app is exported to the web.
 *
 * There is no "Merge into existing lead". The old mock had one and it merged
 * nothing. Making it real would need a SECOND security-definer write-door into
 * another rep's data — leads_update_own_or_admin blocks the write and
 * enforce_lead_update_rules() makes captured_by immutable. `duplicate_of_lead_id`
 * exists on the leads table for a link-not-merge feature to use later; it is
 * deliberately unused for now.
 */
export default function DuplicateDetailModal() {
  const params = useLocalSearchParams<{
    capturedByName?: string;
    capturedAt?: string;
    note?: string;
    voiceSummary?: string;
    isSelf?: string;
  }>();

  const isSelf = params.isSelf === '1';
  const name = params.capturedByName?.trim() ?? '';
  const when = formatRelative(params.capturedAt);
  // Params arrive as strings, so an absent value can show up as the literal
  // "null"/"undefined" rather than nothing.
  const clean = (value: string | undefined) =>
    !value || value === 'null' || value === 'undefined' ? '' : value.trim();
  const said = clean(params.note) || clean(params.voiceSummary);

  if (!name && !when) {
    return (
      <SheetShell>
        <Typography className="text-[15px] font-bold text-navy">
          That earlier capture is no longer available.
        </Typography>
        <Pressable
          onPress={() => router.back()}
          className="h-[52px] rounded-md bg-gold items-center justify-center mt-5"
        >
          <Typography className="text-[15px] font-bold text-navy">Close</Typography>
        </Pressable>
      </SheetShell>
    );
  }

  return (
    <SheetShell>
      <Typography
        className="text-[10px] font-bold tracking-[0.12em] text-slate"
        style={{ textTransform: 'uppercase' }}
      >
        {isSelf ? 'You already have this contact' : 'Already at this event'}
      </Typography>

      <View className="flex-row items-center gap-3 mt-3">
        <View className="w-11 h-11 rounded-xl bg-surface items-center justify-center">
          <Typography className="text-[16px] font-extrabold text-navy">
            {name[0]?.toUpperCase() ?? '?'}
          </Typography>
        </View>
        <View className="flex-1">
          <Typography className="text-[15px] font-bold text-navy">
            {isSelf ? 'Captured by you' : `Captured by ${name}`}
          </Typography>
          <Typography className="text-[12px] text-slate mt-[2px]">{when}</Typography>
        </View>
      </View>

      {said ? (
        <View className="bg-section rounded-md px-4 py-3 mt-[18px]">
          <Typography className="text-[22px] font-extrabold text-gold" style={{ lineHeight: 12 }}>
            &ldquo;
          </Typography>
          <Typography
            className="text-[14px] text-navy font-medium mt-[6px]"
            style={{ lineHeight: 21.7 }}
          >
            {said}
          </Typography>
        </View>
      ) : (
        <View className="bg-section rounded-md px-4 py-3 mt-[18px]">
          <Typography className="text-[13px] text-slate font-medium" style={{ lineHeight: 19 }}>
            No note was left on that capture.
          </Typography>
        </View>
      )}

      <Pressable
        onPress={() => router.back()}
        className="h-[52px] rounded-md bg-gold items-center justify-center mt-6"
      >
        <Typography className="text-[15px] font-bold text-navy">Continue with new capture</Typography>
      </Pressable>

      <Typography className="text-[11.5px] text-slate text-center mt-3" style={{ lineHeight: 17 }}>
        {isSelf
          ? 'That earlier capture is already in your leads.'
          : "This is everything Yieldd will show you about someone else's lead."}
      </Typography>
    </SheetShell>
  );
}
