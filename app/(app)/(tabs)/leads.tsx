import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, RefreshControl, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { LeadRow } from '../../../components/app/LeadRow';
import { ChevronRightIcon, SearchIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCurrentEvent } from '../../../hooks/useEvents';
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
  const { event } = useCurrentEvent();

  // Drafts are excluded here and shown on the drafts screen instead — a lead
  // the server has not accepted should not be counted in "this event".
  const leads = allLeads.filter(
    (l) => l.syncStatus === 'synced' && (!event || !l.eventId || l.eventId === event.id)
  );

  const needsNoteCount = leads.filter((l) => l.needsNote).length;

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
  const whatsappPendingCount = leads.filter(isWhatsAppPending).length;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const followUpsDue = leads.filter(
    (l) => l.followUpDate && new Date(l.followUpDate).getTime() <= today.getTime()
  ).length;

  /*
    Signed against the event's whole list, not the filtered one.
    `filtered` changes on every keystroke in the search box, and keying the
    request on the visible subset would re-sign every card as the rep types.
    The full list is stable, and one request covers every row they can reach.
  */
  const cardImageUri = useCardImages(leads);

  const filtered = leads.filter((l) => {
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
  });

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="bg-white px-5 pt-[18px] pb-[18px]">
        <View className="flex-row items-center justify-between">
          <View>
            <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Leads</Typography>
            <Pressable className="flex-row items-center gap-[5px] mt-1">
              <Typography className="text-[11px] font-bold text-slate tracking-[0.06em]" style={{ textTransform: 'uppercase' }}>
                {event
                  ? [event.name, event.stallNumber ?? event.city].filter(Boolean).join(' · ')
                  : 'No event selected'}
              </Typography>
              <ChevronRightIcon size={11} color="#5A6B87" strokeWidth={2.5} />
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
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  This event
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

      <ScrollView
        showsVerticalScrollIndicator={false}
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
              {leads.length ? 'Nothing matches that' : 'No leads yet'}
            </Typography>
            <Typography className="text-[13px] text-slate text-center mt-2 leading-[1.5] max-w-[260px]">
              {leads.length
                ? 'Try a different filter or clear the search.'
                : 'Scan a card or add someone by hand and they will appear here.'}
            </Typography>
          </View>
        ) : null}

        {filtered.map((lead) => (
          <LeadRow key={lead.id} lead={lead} cardUri={cardImageUri(lead)} />
        ))}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
