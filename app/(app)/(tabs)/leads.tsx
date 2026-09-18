import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, RefreshControl, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { LeadRow } from '../../../components/app/LeadRow';
import { LeadScopeSheet } from '../../../components/shared/LeadScopeSheet';
import { ChevronDownIcon, ChevronRightIcon, SearchIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useLeadScope } from '../../../hooks/useEvents';
import { groupLeadsByEvent, leadsInScope } from '../../../lib/leadScope';
import { leadMatchesQuery } from '../../../lib/leadSearch';
import { whatsappDigits } from '../../../lib/messaging';
import { useCardImages } from '../../../hooks/useCardImages';

// `Lost` belongs here: the status sheet offers it, so without a filter a lost
// lead can be set and then never found again.
//
// `WhatsApp pending` belongs here for a different reason: the "WhatsApp N
// pending" figure on Home and at the top of this screen is now tappable, and a
// number you can tap has to land on the people it counts.
const FILTERS: { key: string; label: string; dot?: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'WhatsApp pending', label: 'WhatsApp pending', dot: '#25D366' },
  { key: 'Needs a note', label: 'Needs a note', dot: '#F4B000' },
  { key: 'Qualified', label: 'Qualified', dot: '#8A6100' },
  { key: 'Won', label: 'Won', dot: '#1F8A50' },
  { key: 'Lost', label: 'Lost', dot: '#C23B3B' },
];

export default function LeadListScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('All');
  const [query, setQuery] = useState('');
  const [scoping, setScoping] = useState(false);

  /**
   * Home's Search tile lands here rather than on a search screen of its own,
   * because this is where searching already happens.
   *
   * The focus is deferred until the push animation has settled. Asking for it
   * during the transition is dropped on Android, which leaves the rep looking at
   * a list they asked to search with no keyboard and no idea why.
   */
  const searchRef = useRef<RNTextInput>(null);
  const { focus, filter: filterParam } = useLocalSearchParams<{
    focus?: string;
    filter?: string;
  }>();

  useEffect(() => {
    if (focus !== 'search') return;
    const handle = InteractionManager.runAfterInteractions(() => searchRef.current?.focus());
    return () => handle.cancel();
  }, [focus]);

  /**
   * Home's counters land here with the matching pill already chosen, so a rep
   * who taps "22 pending" sees those 22 and nothing else.
   *
   * The param is cleared the moment it has been applied, and that is the whole
   * trick. A route param persists on the tab, so without the clear: tapping the
   * same counter twice would do nothing the second time (the value never
   * changed, so the effect never re-runs), and coming back to the tab from the
   * tab bar days later would silently re-apply a filter the rep had since
   * cleared by hand. An empty string rather than `undefined`, because that is
   * removal under every router version rather than the string "undefined".
   */
  useEffect(() => {
    if (!filterParam) return;
    if (FILTERS.some((f) => f.key === filterParam)) setFilter(filterParam);
    router.setParams({ filter: '' });
  }, [filterParam]);

  const allLeads = useLeadsStore((s) => s.leads);
  const isRefreshing = useLeadsStore((s) => s.isRefreshing);
  const loadError = useLeadsStore((s) => s.loadError);
  /**
   * Which show this list is showing — VIEWING scope, and nothing else.
   *
   * Emphatically not `useCurrentEvent`. That answers "which show am I working
   * in" and decides where the next captured card is filed, so narrowing this
   * list to a show in March must never touch it: a rep who looks someone up
   * must not find the camera quietly filing new cards into March. See the
   * header comment on `stores/useLeadScopeStore.ts`.
   */
  const { events, scopedEvent, scopeToEvent } = useLeadScope();

  /**
   * The synced leads in scope, newest capture first.
   *
   * The rule itself lives in `lib/leadScope.ts` — the sort key and the section
   * order are both easy to get quietly wrong, and there they can be checked
   * without a renderer (`npm run verify:lead-scope`).
   *
   * Derived here with useMemo and never inside a zustand selector: a selector
   * that filters or sorts returns a new array on every call and re-renders
   * without end.
   */
  const leads = useMemo(
    () => leadsInScope(allLeads, scopedEvent?.id ?? null),
    [allLeads, scopedEvent]
  );

  const needsNoteCount = useMemo(() => leads.filter((l) => l.needsNote).length, [leads]);

  /**
   * Pending means: nobody has opened a WhatsApp draft for this lead yet.
   *
   * The ids come from `message_sends` — written the moment a rep taps the
   * WhatsApp icon on a lead row, the lead screen or the send queue. The app
   * cannot see whether they then pressed send inside WhatsApp, so "handed them
   * the draft" is as close to sent as anything here is allowed to claim.
   *
   * A lead with no usable number is excluded rather than counted forever: it is
   * not work anyone can do, and leaving it in means the figure never reaches
   * zero no matter how many people the rep messages.
   *
   * The Set is built here and not inside the selector — a selector that returns
   * a new object every call re-renders without end.
   */
  const whatsappSentIds = useLeadsStore((s) => s.whatsappSentIds);
  const whatsappSent = useMemo(() => new Set(whatsappSentIds), [whatsappSentIds]);
  const isWhatsAppPending = (l: (typeof leads)[number]) =>
    Boolean(whatsappDigits(l.phone)) && !whatsappSent.has(l.id);
  const whatsappPendingCount = useMemo(
    () => leads.filter(isWhatsAppPending).length,
    // `isWhatsAppPending` closes over `whatsappSent`, which is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, whatsappSent]
  );

  const followUpsDue = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return leads.filter(
      (l) => l.followUpDate && new Date(l.followUpDate).getTime() <= today.getTime()
    ).length;
  }, [leads]);

  /*
    Signed against the event's whole list, not the filtered one.
    `filtered` changes on every keystroke in the search box, and keying the
    request on the visible subset would re-sign every card as the rep types.
    The full list is stable, and one request covers every row they can reach.
  */
  const cardImageUri = useCardImages(leads);

  // Memoised because this now walks the whole organisation's leads rather than
  // one show's, and it re-runs on every keystroke in the search box.
  const filtered = useMemo(
    () =>
      leads.filter((l) => {
        if (!leadMatchesQuery(l, query)) return false;
        if (filter === 'WhatsApp pending') return isWhatsAppPending(l);
        if (filter === 'Needs a note') return l.needsNote;
        if (filter === 'Qualified') return l.status === 'Qualified';
        if (filter === 'Won') return l.status === 'Won';
        // The pill has been offered since the filter row was built and was never
        // wired to anything, so picking `Lost` fell through to `return true` and
        // showed the whole list — the one outcome the pill exists to prevent.
        if (filter === 'Lost') return l.status === 'Lost';
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, query, filter, whatsappSent]
  );

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  /**
   * The list broken into one section per show, each under its name.
   *
   * Only while the scope is all-events. Narrowed to one show there is nothing
   * to separate and the header at the top of the screen already names it, so
   * the list renders flat — `null` is that signal.
   *
   * Built from `filtered`, which is already newest-first, and a Map keeps
   * insertion order. So the show whose newest lead is newest comes first for
   * free: "newest first" still reads true top to bottom, and there is no second
   * sort to keep in step with the first one.
   *
   * A section only exists because a lead survived the filter, so an event with
   * nothing matching the search disappears instead of leaving an empty heading.
   */
  const sections = useMemo(
    () => (scopedEvent ? null : groupLeadsByEvent(filtered)),
    [filtered, scopedEvent]
  );

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="bg-white px-5 pt-[18px] pb-[18px]">
        <View className="flex-row items-center justify-between">
          {/*
            The name and the chevron open the scope sheet. This Pressable had no
            `onPress` at all — it looked like a picker and did nothing, which was
            the actual complaint behind this whole change.

            A chevron that points DOWN, not right: `EventContextBar` sets that
            convention — right means "this opens another screen", which is not
            what a sheet over the list does.
          */}
          <View className="flex-1 min-w-0">
            <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Leads</Typography>
            <Pressable
              onPress={() => setScoping(true)}
              accessibilityRole="button"
              accessibilityLabel={
                scopedEvent
                  ? `Showing leads from ${scopedEvent.name}. Tap to show a different event.`
                  : 'Showing leads from all events. Tap to narrow to one event.'
              }
              className="flex-row items-center gap-[5px] mt-1"
            >
              <Typography
                className="text-[11px] font-bold text-slate tracking-[0.06em] flex-shrink"
                style={{ textTransform: 'uppercase' }}
                numberOfLines={1}
              >
                {scopedEvent
                  ? [scopedEvent.name, scopedEvent.stallNumber ?? scopedEvent.city]
                      .filter(Boolean)
                      .join(' · ')
                  : 'All events'}
              </Typography>
              <ChevronDownIcon size={12} color="#5A6B87" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/*
          Each cell selects the pill that shows what it counts, rather than
          navigating: the list is already on screen, so the filter row moving is
          the whole answer. Follow-ups is the exception and is its own screen.

          Every cell is a Pressable on its FIRST render. Swapping a View for a
          Pressable later in a component's life is the NativeWind upgrade path
          that produces the bogus "Couldn't find a navigation context" red
          screen — see AGENTS.md.
        */}
        <View className="bg-navy-elevated rounded-[14px] mt-4 overflow-hidden">
          <View className="flex-row">
            <Pressable onPress={() => setFilter('All')} className="flex-1 px-4 py-3">
              <View className="flex-row items-center justify-between">
                {/*
                  Tracks the actual scope. All four figures in this box are
                  computed from the same `leads` array, so the moment the list
                  stopped being one event's they became all-events figures —
                  a label still saying "This event" would be a wrong number
                  with a confident caption. The other three cells read as
                  "…across whatever this one says".
                */}
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  {scopedEvent ? 'This event' : 'All events'}
                </Typography>
                <ChevronRightIcon size={10} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
              </View>
              <Typography className="text-[16px] font-extrabold text-white mt-[3px]">{leads.length}</Typography>
            </Pressable>
            <View className="w-px bg-white/[0.14]" />
            <Pressable onPress={() => router.push('/(app)/follow-ups')} className="flex-1 px-4 py-3">
              <View className="flex-row items-center justify-between">
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  Follow-ups
                </Typography>
                <ChevronRightIcon size={10} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
              </View>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <View className="w-[6px] h-[6px] rounded-full bg-gold" />
                <Typography className="text-[13px] font-bold text-white">{followUpsDue} due</Typography>
              </View>
            </Pressable>
          </View>
          <View className="h-px bg-white/[0.14]" />
          <View className="flex-row">
            <Pressable onPress={() => setFilter('Needs a note')} className="flex-1 px-4 py-3">
              <View className="flex-row items-center justify-between">
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  Needs a note
                </Typography>
                <ChevronRightIcon size={10} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
              </View>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <View className="w-[6px] h-[6px] rounded-full bg-success" />
                <Typography className="text-[13px] font-bold text-white">{needsNoteCount}</Typography>
              </View>
            </Pressable>
            <View className="w-px bg-white/[0.14]" />
            <Pressable onPress={() => setFilter('WhatsApp pending')} className="flex-1 px-4 py-3">
              <View className="flex-row items-center justify-between">
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  WhatsApp
                </Typography>
                <ChevronRightIcon size={10} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
              </View>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <WhatsAppIcon size={11} color="#25D366" />
                <Typography className="text-[13px] font-bold text-white">{whatsappPendingCount} pending</Typography>
              </View>
            </Pressable>
          </View>
        </View>

        {/*
          verify:keyboard exempt searching a list is not filling in a form
          — the field stays put and the results move.

          KeyboardSafe pads the bottom of the screen to lift a form clear of
          the keyboard. Here that would shrink the results list at exactly the
          moment the rep wants to read it, and the search box is in a fixed
          header well above the keyboard anyway. What this screen needed was
          `keyboardShouldPersistTaps` on the list below, so the first tap on a
          result opens it instead of being spent dismissing the keyboard (#69).
        */}
        <View className="flex-row items-center gap-2 bg-surface rounded-full px-[18px] py-3 mt-4">
          <SearchIcon />
          <RNTextInput
            ref={searchRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Name, company, number or email"
            placeholderTextColor="#97A3B8"
            returnKeyType="search"
            clearButtonMode="while-editing"
            className="flex-1 text-[14px] text-navy"
          />
        </View>
      </View>

      {/* The ScrollView itself must stay free of className/style: NativeWind styling
          directly on a horizontal ScrollView makes descendant text glyphs not paint
          (both platforms). Visual styling lives on the wrapper View instead. */}
      <View className="bg-white border-b border-hairline">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5 py-[14px] gap-2">
          {FILTERS.map((f) => (
            <View key={f.key}>
              <Pressable
                onPress={() => setFilter(f.key)}
                className={`flex-row items-center rounded-full px-[14px] py-2 ${filter === f.key ? 'bg-navy' : 'bg-surface'}`}
              >
                {f.dot ? <View className="w-[6px] h-[6px] rounded-full mr-[7px]" style={{ backgroundColor: f.dot }} /> : null}
                <Typography className={`text-[12.5px] font-bold ${filter === f.key ? 'text-white' : 'text-navy'}`}>{f.label}</Typography>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* `keyboardShouldPersistTaps` matters here because of the search box in
          the header above: the default is `never`, so with the keyboard open
          the first tap on a lead row is spent dismissing the keyboard and never
          reaches the row. It reads as a dead list, not as a dismissal (#69). */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="px-5 pt-4 gap-3 flex-grow"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => useLeadsStore.getState().refresh()}
          />
        }
      >
        {isRefreshing && !allLeads.length ? <ActivityIndicator color="#F4B000" /> : null}

        {loadError && !allLeads.length ? (
          <Typography className="text-[13px] text-slate text-center mt-10 leading-[1.5]">
            {loadError}
          </Typography>
        ) : null}

        {!isRefreshing && !filtered.length ? (
          <View className="items-center justify-center py-16 px-6">
            <Typography className="text-[15px] font-bold text-navy text-center">
              {leads.length
                ? 'Nothing matches that'
                : scopedEvent
                  ? 'No leads from this event'
                  : 'No leads yet'}
            </Typography>
            <Typography className="text-[13px] text-slate text-center mt-2 leading-[1.5] max-w-[260px]">
              {leads.length
                ? 'Try a different filter or clear the search.'
                : scopedEvent
                  ? 'Nothing was captured at this show, or it has not synced yet.'
                  : 'Scan a card or add someone by hand and they will appear here.'}
            </Typography>
            {/*
              A narrowed empty list must never be a dead end — the scope that
              emptied it is a line of small caps at the top of the screen, which
              is not where anyone looks when a list they expected is blank.
              Constant className, and a Pressable from its first render.
            */}
            {scopedEvent ? (
              <Pressable
                onPress={() => scopeToEvent(null)}
                accessibilityRole="button"
                accessibilityLabel="Show leads from all events"
                className="bg-surface rounded-full px-[14px] py-2 mt-4"
              >
                <Typography className="text-[12.5px] font-bold text-navy">Show all events</Typography>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/*
          Grouped by show while the scope is all-events, flat once it is
          narrowed. Without the headings a merged list gives no way to tell one
          show's leads from another's, since a row never names its event.

          The heading is a Pressable — and one from its first render, never a
          View that becomes one later — so the obvious gesture works: tapping
          "Auto Expo 2026" narrows the list to Auto Expo 2026.
        */}
        {sections
          ? sections.map((section) => (
              <View key={section.eventId} className="gap-3">
                <Pressable
                  onPress={() => scopeToEvent(section.eventId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Show only leads from ${
                    eventsById.get(section.eventId)?.name ?? 'this event'
                  }`}
                  className="flex-row items-center justify-between gap-3 pt-1"
                >
                  <Typography
                    className="text-[11px] font-bold text-slate tracking-[0.06em] flex-shrink"
                    style={{ textTransform: 'uppercase' }}
                    numberOfLines={1}
                  >
                    {/* Falls back rather than showing a raw id. An event the rep
                        can no longer see is the only way to reach this. */}
                    {eventsById.get(section.eventId)?.name ?? 'Other leads'}
                  </Typography>
                  <Typography className="text-[11px] font-bold text-slate/70">
                    {section.rows.length}
                  </Typography>
                </Pressable>
                {section.rows.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} cardUri={cardImageUri(lead)} />
                ))}
              </View>
            ))
          : filtered.map((lead) => (
              <LeadRow key={lead.id} lead={lead} cardUri={cardImageUri(lead)} />
            ))}
        <View className="h-24" />
      </ScrollView>

      <LeadScopeSheet visible={scoping} onClose={() => setScoping(false)} />
    </SafeAreaView>
  );
}
