import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { ClockIcon, MicIcon, PhoneIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { useLeadsStore, type StoredLead } from '../../../stores/useLeadsStore';
import { useLeadActions } from '../../../hooks/useLeadActions';
import { useEvents } from '../../../hooks/useEvents';
import { followUpsDue, narrowToEvent, startOfDay } from '../../../lib/leadScope';

function dueLabel(followUpDate: string): { text: string; overdue: boolean } {
  const days = Math.round((startOfDay(new Date(followUpDate)) - startOfDay(new Date())) / 86400000);
  if (days === 0) return { text: 'Due today', overdue: false };
  if (days === 1) return { text: 'Due tomorrow', overdue: false };
  if (days > 1) return { text: `Due in ${days} days`, overdue: false };
  return { text: days === -1 ? '1 day overdue' : `${Math.abs(days)} days overdue`, overdue: true };
}

/**
 * This screen used to build its own `wa.me` link and its own message, and the
 * copies had drifted badly from the rest of the app:
 *
 *   - its `waDigits` was a bare `replace(/\D/g,'')` with no country-code
 *     repair, so a ten-digit Indian mobile — which is what is printed on most
 *     cards here — produced `wa.me/9820441720` and opened the wrong chat, or
 *     none at all. `whatsappDigits` prefixes `91`.
 *   - the message was the hardcoded line "following up on our conversation"
 *     rather than the event's own template, so a rep who had carefully written
 *     one never saw it used here.
 *   - nothing was recorded. Every WhatsApp opened from this screen was
 *     invisible in `message_sends`, which is what the send history and the
 *     follow-up counts are built from.
 *
 * `useLeadActions` does all three correctly and is what every other screen
 * uses, so this one uses it too.
 */
function FollowUpCard({ lead }: { lead: StoredLead }) {
  const { text: when, overdue } = dueLabel(lead.followUpDate as string);
  const { call, whatsapp } = useLeadActions(lead);

  return (
    <View className={`bg-white border rounded-2xl p-4 mb-3 ${overdue ? 'border-[#C23B3B]/[0.30]' : 'border-hairline'}`}>
      <Pressable
        onPress={() => router.push({ pathname: '/(app)/leads/[id]', params: { id: lead.id } })}
        className="flex-row items-center gap-[10px]"
      >
        <View className="w-[38px] h-[38px] rounded-[11px] bg-surface items-center justify-center">
          <Typography className="text-[14px] font-extrabold text-navy">{lead.initial}</Typography>
        </View>
        <View className="flex-1">
          <Typography className="text-[14.5px] font-bold text-navy">{lead.name}</Typography>
          <Typography className="text-[11.5px] text-slate mt-[1px]">
            {lead.company || 'No company'}
          </Typography>
        </View>
        <Typography className={`text-[11px] font-bold ${overdue ? 'text-[#C23B3B]' : 'text-slate'}`}>
          {when}
        </Typography>
      </Pressable>

      {/* The rep's own note. Nothing invented — a lead captured without one
          simply does not get this block. */}
      {lead.note?.trim() ? (
        <View className="flex-row gap-2 bg-section rounded-[10px] px-3 py-[11px] mt-3">
          <MicIcon size={13} color="#8A98B0" strokeWidth={2} />
          <Typography className="flex-1 text-[12.5px] font-medium text-navy" style={{ lineHeight: 18 }}>
            {lead.note}
          </Typography>
        </View>
      ) : null}

      <View className="flex-row gap-2 mt-[14px]">
        <Pressable
          onPress={call}
          className="flex-1 h-11 rounded-md bg-navy flex-row items-center justify-center gap-[7px]"
        >
          <PhoneIcon size={14} color="#fff" strokeWidth={2} />
          <Typography className="text-[13.5px] font-bold text-white">Call</Typography>
        </Pressable>
        <Pressable
          onPress={whatsapp}
          className="w-11 h-11 rounded-md bg-surface items-center justify-center"
        >
          <WhatsAppIcon size={16} color="#25D366" strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => router.push(`/(app)/(modals)/log-outcome?leadId=${lead.id}`)}
          className="w-11 h-11 rounded-md bg-surface items-center justify-center"
        >
          <ClockIcon size={16} strokeWidth={1.75} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TodaysFollowUpsScreen() {
  const allLeads = useLeadsStore((s) => s.leads);
  const isRefreshing = useLeadsStore((s) => s.isRefreshing);

  /**
   * Which show this list is narrowed to, when a counter on Home or on the leads
   * screen sent the rep here. Nothing means every show, which is what reaching
   * this screen from the icon row still does.
   *
   * Read from the route and kept there — this screen deliberately does NOT
   * touch `useLeadScopeStore`. That store is the leads tab's viewing scope, and
   * opening today's follow-ups must not narrow a list on another tab behind the
   * rep's back. See the header comment on `stores/useLeadScopeStore.ts` for why
   * the three "which event?" questions are kept apart.
   *
   * There is no `setParams` clear here, unlike the leads TAB, and that is not
   * an oversight. This is a pushed screen: every push mounts it fresh with
   * fresh params and leaving pops it, so a param cannot go stale. Clearing on
   * arrival would throw the scope away mid-visit.
   *
   * Resolved against the events this viewer can see rather than filtering on
   * the raw id, the same rule `useLeadScope` follows: an id that no longer
   * resolves reads as every show, never as an empty list with no way back. The
   * cost is that while events load the list shows every show for a moment and
   * then narrows — expected, and not worth a spinner over.
   */
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const { data: events } = useEvents();
  const scopedEvent = useMemo(
    () => (scope ? events?.find((e) => e.id === scope) : undefined),
    [events, scope]
  );

  // Soonest first, which is this screen's own order — not the newest-capture
  // rule the leads list sorts by. `followUpsDue` decides WHICH, never the order.
  const due = followUpsDue(narrowToEvent(allLeads, scopedEvent?.id ?? null)).sort((a, b) =>
    (a.followUpDate as string).localeCompare(b.followUpDate as string)
  );

  const today = startOfDay(new Date());

  const overdue = due.filter((l) => startOfDay(new Date(l.followUpDate as string)) < today);
  const dueToday = due.filter((l) => startOfDay(new Date(l.followUpDate as string)) === today);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Today's follow-ups"
        right={
          due.length ? (
            <View className="bg-gold rounded-full px-[11px] py-[5px]">
              <Typography className="text-[12px] font-extrabold text-navy">{due.length}</Typography>
            </View>
          ) : undefined
        }
      />

      {/*
        A narrowing the rep cannot see is the bug this scope exists to fix, not
        a feature of it — so when the list is cut down, it says whose it is and
        offers the way out. Clearing the param is the whole of "show all": the
        list widens on the next render.

        The row mounts or it does not. A subtree appearing is safe; what breaks
        NativeWind is an existing component gaining its first variable-backed
        class later in life, and this Pressable is a Pressable with a constant
        className from its own first render. See AGENTS.md.
      */}
      {scopedEvent ? (
        <View className="bg-white border-b border-hairline flex-row items-center justify-between gap-3 px-5 py-[10px]">
          <Typography
            className="text-[11px] font-bold text-slate tracking-[0.06em] flex-shrink"
            style={{ textTransform: 'uppercase' }}
            numberOfLines={1}
          >
            {[scopedEvent.name, scopedEvent.stallNumber ?? scopedEvent.city]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
          <Pressable
            onPress={() => router.setParams({ scope: '' })}
            accessibilityRole="button"
            accessibilityLabel={`Showing follow-ups from ${scopedEvent.name} only. Tap to show every event.`}
            className="rounded-full bg-surface px-3 py-[5px]"
          >
            <Typography className="text-[11px] font-bold text-navy">Show all</Typography>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerClassName="px-5 pt-[18px] pb-6 flex-grow"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => useLeadsStore.getState().refresh()}
          />
        }
      >
        {overdue.length ? (
          <>
            <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-[#C23B3B] mb-3" style={{ textTransform: 'uppercase' }}>
              Overdue &middot; {overdue.length}
            </Typography>
            {overdue.map((lead) => (
              <FollowUpCard key={lead.id} lead={lead} />
            ))}
          </>
        ) : null}

        {dueToday.length ? (
          <>
            <Typography
              className={`text-[10.5px] font-bold tracking-[0.12em] text-slate mb-3 ${overdue.length ? 'mt-5' : ''}`}
              style={{ textTransform: 'uppercase' }}
            >
              Today &middot; {dueToday.length}
            </Typography>
            {dueToday.map((lead) => (
              <FollowUpCard key={lead.id} lead={lead} />
            ))}
          </>
        ) : null}

        {!due.length ? (
          <View className="flex-1 items-center justify-center px-6 py-16">
            <View className="w-[62px] h-[62px] rounded-full bg-surface items-center justify-center">
              <ClockIcon size={26} strokeWidth={1.6} />
            </View>
            <Typography className="text-[17px] font-extrabold text-navy text-center mt-4">
              {scopedEvent ? 'Nothing due for this event' : 'Nothing due'}
            </Typography>
            {/* Scoped, "nothing due" on its own reads as nothing due anywhere,
                which may be untrue and is the sort of quiet narrowing that
                loses a rep their day. The row above still offers Show all. */}
            <Typography className="text-[13.5px] text-slate text-center mt-2 leading-[1.5] max-w-[280px]">
              {scopedEvent
                ? `No follow-ups are due at ${scopedEvent.name}. Other events may still have some — tap Show all.`
                : 'Set a follow-up date on a lead and it will appear here on the day.'}
            </Typography>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
