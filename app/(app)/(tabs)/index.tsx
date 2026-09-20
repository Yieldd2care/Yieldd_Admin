import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { LeadRow } from '../../../components/app/LeadRow';
import { ProBadge, ProTileBadge } from '../../../components/app/ProLock';
import { FirstRunTutorial } from '../../../components/app/FirstRunTutorial';
import { markTutorialSeen } from '../../../lib/auth/tutorial';
import {
  BarChartIcon,
  BellIcon,
  ChevronRightIcon,
  ClockIcon,
  EditIcon,
  SearchIcon,
  TrendUpIcon,
  UsersIcon,
  WhatsAppIcon,
} from '../../../components/ui/icons';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useCurrentEventStore } from '../../../stores/useCurrentEventStore';
import { useCurrentEvent, useEvents } from '../../../hooks/useEvents';
import { AttentionDot } from '../../../hooks/useAttention';
import { useProGate } from '../../../hooks/usePlan';
import { useCardImages } from '../../../hooks/useCardImages';
import { whatsappDigits } from '../../../lib/messaging';
import { followUpsDue, leadsInScope, narrowToEvent } from '../../../lib/leadScope';

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const user = useSessionStore((s) => s.user);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? 'Y';
  const firstName = user?.name?.trim()?.split(' ')?.[0] ?? 'there';
  const allLeads = useLeadsStore((s) => s.leads);
  const syncedLeads = allLeads.filter((l) => l.syncStatus === 'synced');
  const draftCount = allLeads.filter((l) => l.syncStatus === 'draft').length;
  const RECENT_LEADS = syncedLeads.slice(0, 3);
  // Only the three on screen. Home shows a preview, so signing the whole
  // event's cards here would pay for a hundred links to draw three rows.
  const cardImageUri = useCardImages(RECENT_LEADS);
  const { data: events } = useEvents();
  const { event } = useCurrentEvent();

  // Counted from what is actually on the device, drafts included: a lead
  // captured offline still happened, and showing it only after it syncs makes
  // the number look like it went backwards.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const noon = new Date();
  noon.setHours(12, 0, 0, 0);

  const forThisEvent = allLeads.filter((l) => !event || !l.eventId || l.eventId === event.id);
  const capturedToday = forThisEvent.filter(
    (l) => new Date(l.capturedAt).getTime() >= startOfDay.getTime()
  );
  const capturedSinceNoon = capturedToday.filter(
    (l) => new Date(l.capturedAt).getTime() >= noon.getTime()
  ).length;

  /**
   * What the tiles below count — and the ONE thing they may count, because
   * every one of them is a door.
   *
   * `leadsInScope` is the function the leads list itself uses, called here
   * rather than reimplemented, so the figure on the tile and the list it opens
   * are the same question asked once. `forThisEvent` above cannot be it: it
   * keeps unsynced drafts and leads with no event, both of which the list
   * drops, so a tile built on it reads 12 and opens a list of 9.
   *
   * Drafts are not hidden by this — they have their own badge on the pencil
   * above, and "captured today" still counts them, which is the figure that
   * should.
   */
  const tileLeads = useMemo(
    () => leadsInScope(allLeads, event?.id ?? null),
    [allLeads, event]
  );

  /**
   * Carried to whichever screen a tile opens, so it lands on the show these
   * figures were counted for.
   *
   * `useCurrentEvent` falls back to the live show, then the next one due, then
   * the first — so `event` is undefined only when the rep has no events at all,
   * and then there is nothing to narrow to. That is why there is no "all"
   * sentinel: no param simply means the screen keeps its own scope.
   */
  const scopeParams = event ? { scope: event.id } : {};

  const NEEDS_NOTE_COUNT = tileLeads.filter((l) => l.needsNote).length;

  /**
   * Pending means nobody has opened a WhatsApp draft for this lead yet, which
   * is recorded the moment a rep taps the WhatsApp icon anywhere in the app.
   * The leads screen defines the same rule and the same exclusion for a lead
   * with no usable number; both have to agree, because this figure now opens
   * that list.
   */
  const whatsappSentIds = useLeadsStore((s) => s.whatsappSentIds);
  const whatsappSent = useMemo(() => new Set(whatsappSentIds), [whatsappSentIds]);
  const WHATSAPP_PENDING_COUNT = tileLeads.filter(
    (l) => Boolean(whatsappDigits(l.phone)) && !whatsappSent.has(l.id)
  ).length;

  /**
   * The odd one out, and deliberately so. This tile opens the follow-ups
   * screen, which shows unsynced drafts where the leads list does not — so it
   * counts `narrowToEvent` (the show narrowing on its own) rather than
   * `leadsInScope` (which would drop the drafts the screen is about to show).
   *
   * The date rule is `followUpsDue`, the same function that screen filters
   * with, so the number on this tile and the badge in its header cannot say
   * different things.
   */
  const followUpsDueCount = followUpsDue(
    narrowToEvent(allLeads, event?.id ?? null)
  ).length;
  const selectEvent = useCurrentEventStore((s) => s.selectEvent);
  const isAdmin = user?.role === 'admin';
  const { locked, gate } = useProGate();

  // The first-run tutorial (#33d). Driven off the profile rather than local
  // state, so force-quitting partway through brings it back rather than losing
  // it, and finishing it on one device settles it on every device.
  //
  // `user` can be null for a frame on a cold start; `=== false` rather than `!`
  // keeps it from flashing open before the profile has loaded.
  const showTutorial = user?.hasSeenTutorial === false;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <FirstRunTutorial visible={showTutorial} onDone={() => void markTutorialSeen()} />
      <View className="flex-row items-center justify-between px-5 pt-3">
        <Pressable onPress={() => router.push('/(app)/(tabs)/qr')} className="flex-row items-center gap-[10px]">
          <View className="w-[34px] h-[34px] rounded-md bg-gold items-center justify-center">
            <Typography className="text-[13.5px] font-extrabold text-navy">{initial}</Typography>
          </View>
          <View>
            <Typography className="text-[12px] text-slate">{timeGreeting()}</Typography>
            <Typography className="text-[16px] font-extrabold text-navy">{firstName}</Typography>
          </View>
        </Pressable>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/(app)/leads/drafts')}
            className="w-[34px] h-[34px] rounded-md bg-white border border-hairline items-center justify-center relative"
          >
            <EditIcon size={16} color="#0B132B" strokeWidth={1.75} />
            {draftCount > 0 ? (
              <View className="absolute -top-[5px] -right-[5px] min-w-[16px] h-[16px] px-[3px] rounded-full bg-gold items-center justify-center border-[1.5px] border-white">
                <Typography className="text-[9px] font-extrabold text-navy">{draftCount}</Typography>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => router.push('/(app)/notifications')}
            className="w-[34px] h-[34px] rounded-md bg-white border border-hairline items-center justify-center relative"
          >
            <BellIcon />
            {/* Was a bare View with no condition — lit permanently, so it
                announced unread notifications forever. Now it appears only when
                the screen behind it genuinely has something. */}
            <AttentionDot />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="mx-5 mt-3 bg-navy rounded-xl p-4">
          <View className="flex-row items-center gap-[6px]">
            {/* The dot means "this show is running right now" — showing it on an
                event that starts in March would be a lie the rep acts on. */}
            <View
              className={`w-[6px] h-[6px] rounded-full ${event?.status === 'live' ? 'bg-success' : 'bg-white/30'}`}
            />
            <Typography className="text-[12px] font-semibold text-white/60">
              {event
                ? [event.name, event.stallNumber ?? event.city].filter(Boolean).join(' · ')
                : 'No event selected'}
            </Typography>
          </View>
          <View className="flex-row items-center justify-between mt-[12px]">
            <View>
              <Typography className="text-[13px] text-white/60">Leads captured today</Typography>
              <View className="flex-row items-center gap-1 bg-gold/[0.14] self-start rounded-full px-[10px] py-[5px] mt-[10px]">
                <TrendUpIcon />
                <Typography className="text-[11.5px] font-bold text-gold">
                  +{capturedSinceNoon} since noon
                </Typography>
              </View>
            </View>
            <Typography className="text-[72px] leading-none font-extrabold tracking-[-0.03em] text-white">
              {capturedToday.length}
            </Typography>
          </View>
        </View>

        <View className="mx-5 mt-3">
          <Typography className="text-[11px] font-bold tracking-[0.06em] text-slate" style={{ textTransform: 'uppercase' }}>
            Your events
          </Typography>
          {/* No className on the ScrollView itself — with this project's
              NativeWind setup that makes descendant text reserve space and paint
              no glyphs. Spacing goes in contentContainerClassName. See AGENTS.md. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 mt-[8px]">
            {events?.map((e) => {
              const active = e.id === event?.id;
              return (
                <View key={e.id}>
                  <Pressable
                    onPress={() => selectEvent(e.id)}
                    className={`rounded-full px-4 py-2 ${active ? 'bg-navy' : 'bg-surface'}`}
                  >
                    <Typography
                      className={`text-[12.5px] font-bold ${active ? 'text-white' : 'text-navy'}`}
                    >
                      {e.name}
                    </Typography>
                  </Pressable>
                </View>
              );
            })}
            {isAdmin ? (
              <View>
                <Pressable onPress={() => router.push('/(app)/events/new')} className="border border-dashed border-hairline rounded-full px-4 py-2">
                  <Typography className="text-[12.5px] font-bold text-slate">
                    {events?.length ? '+ Add event' : '+ Create your first event'}
                  </Typography>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View className="flex-row justify-between mx-5 mt-3">
          {/*
            Follow-ups and Reports are Pro. Both tiles stay on screen for a Free
            rep, greyed and tagged PRO, rather than disappearing — the agreed
            rule, and the only version where someone can want what they cannot
            see. Tapping opens the explanation instead of the screen.

            The tag says the word rather than showing a padlock: a lock alone
            reads as "broken" or "ask your admin" as easily as it reads as
            something to buy. See `components/app/ProLock.tsx`.

            `opacity-60` carries no CSS variable, so toggling it is safe where a
            shadow or a transform would not be. See AGENTS.md.
          */}
          <Pressable
            onPress={() => {
              if (gate('follow-ups')) router.push('/(app)/follow-ups');
            }}
            className={`items-center gap-2 w-[80px] ${locked ? 'opacity-60' : ''}`}
          >
            <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
              <ClockIcon size={19} />
              {locked ? <ProTileBadge ringColor="#F5F7FB" /> : null}
            </View>
            <Typography className="text-[10.5px] font-bold text-navy text-center" numberOfLines={1}>Follow-ups</Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/(app)/(tabs)/leads')} className="items-center gap-2 w-[80px]">
            <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
              <UsersIcon size={19} />
            </View>
            <Typography className="text-[10.5px] font-bold text-navy text-center" numberOfLines={1}>All leads</Typography>
          </Pressable>
          {/*
            Search is the lead list's own search box, not a screen of its own.
            That list already filters on name and company, so the tile carries
            the rep there with the field focused rather than duplicating it.
          */}
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(app)/(tabs)/leads', params: { focus: 'search' } })
            }
            className="items-center gap-2 w-[80px]"
          >
            <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
              <SearchIcon size={19} color="#0B132B" strokeWidth={1.75} />
            </View>
            <Typography className="text-[10.5px] font-bold text-navy text-center" numberOfLines={1}>Search</Typography>
          </Pressable>
          <Pressable
            onPress={() => {
              // Every event's report, not the current one's. Which event is
              // selected up in the chip row decides where the next lead is
              // filed; it has no business deciding which show you are allowed
              // to look back at.
              if (gate('roi')) router.push('/(app)/events/reports');
            }}
            className={`items-center gap-2 w-[80px] ${locked ? 'opacity-60' : ''}`}
          >
            <View className="w-12 h-12 rounded-2xl bg-surface items-center justify-center">
              <BarChartIcon size={19} />
              {locked ? <ProTileBadge ringColor="#F5F7FB" /> : null}
            </View>
            <Typography className="text-[10.5px] font-bold text-navy text-center" numberOfLines={1}>Reports</Typography>
          </Pressable>
        </View>

        {/*
          Every cell is a door to the leads it counts. A rep who reads
          "22 pending" and cannot reach those 22 has been handed a number and
          nothing to do with it.

          Each one carries two things to the screen it opens: the matching pill
          as a `filter` param, and the show these figures were counted for as a
          `scope` param. That screen applies both and then clears them — see the
          comment there for why the clearing is what makes tapping the same
          counter twice work, and why a `scope` that stuck would be worse than
          the bug it fixes.

          `scope` narrows what is SHOWN and nothing else. It never reaches
          `useCurrentEventStore`, so tapping a tile cannot change where the next
          captured card is filed.

          A tile promises a number, so it has to hand over everything that
          decides the list: "This event" passes `filter: 'All'` because without
          it the screen keeps whichever pill the rep last chose by hand, and the
          screen clears its own search box on arrival for the same reason.

          Every cell is a Pressable on its FIRST render, never a View that
          becomes one later: that upgrade is what catches NativeWind mid-life
          and throws the bogus "Couldn't find a navigation context" red screen
          described in AGENTS.md.
        */}
        <View className="bg-navy-elevated rounded-[14px] mx-5 mt-3 overflow-hidden">
          <View className="flex-row">
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/(tabs)/leads',
                  params: { filter: 'All', ...scopeParams },
                })
              }
              className="flex-1 px-4 py-3"
            >
              <View className="flex-row items-center justify-between">
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  This event
                </Typography>
                <ChevronRightIcon size={10} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
              </View>
              <Typography className="text-[16px] font-extrabold text-white mt-[3px]">
                {tileLeads.length}
              </Typography>
            </Pressable>
            <View className="w-px bg-white/[0.14]" />
            {/*
              Paid, and gated here rather than on the screen — `gate` navigates
              when it refuses, which from a screen body would be a push during
              render. The count stays: a rep who can see "3 due" and is offered
              Pro on tapping is the version of this that sells anything.
            */}
            <Pressable
              onPress={() => {
                if (gate('follow-ups')) {
                  router.push({ pathname: '/(app)/follow-ups', params: scopeParams });
                }
              }}
              className="flex-1 px-4 py-3"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  Follow-ups
                </Typography>
                {locked ? <ProBadge tone="dark" /> : null}
                <View className="flex-1" />
                <ChevronRightIcon size={10} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
              </View>
              <View className={`flex-row items-center gap-[6px] mt-[5px] ${locked ? 'opacity-70' : ''}`}>
                <View className="w-[6px] h-[6px] rounded-full bg-gold" />
                <Typography className="text-[13px] font-bold text-white">{followUpsDueCount} due</Typography>
              </View>
            </Pressable>
          </View>
          <View className="h-px bg-white/[0.14]" />
          <View className="flex-row">
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/(tabs)/leads',
                  params: { filter: 'Needs a note', ...scopeParams },
                })
              }
              className="flex-1 px-4 py-3"
            >
              <View className="flex-row items-center justify-between">
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  Needs a note
                </Typography>
                <ChevronRightIcon size={10} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
              </View>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <View className="w-[6px] h-[6px] rounded-full bg-success" />
                <Typography className="text-[13px] font-bold text-white">{NEEDS_NOTE_COUNT}</Typography>
              </View>
            </Pressable>
            <View className="w-px bg-white/[0.14]" />
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/(tabs)/leads',
                  params: { filter: 'WhatsApp pending', ...scopeParams },
                })
              }
              className="flex-1 px-4 py-3"
            >
              <View className="flex-row items-center justify-between">
                <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                  WhatsApp
                </Typography>
                <ChevronRightIcon size={10} color="rgba(255,255,255,0.38)" strokeWidth={2.5} />
              </View>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <WhatsAppIcon size={11} color="#25D366" />
                <Typography className="text-[13px] font-bold text-white">{WHATSAPP_PENDING_COUNT} pending</Typography>
              </View>
            </Pressable>
          </View>
        </View>

        <View className="mx-5 mt-4">
          <View className="flex-row items-center justify-between">
            <Typography className="text-[15px] font-extrabold text-navy">Recent leads</Typography>
            <Pressable onPress={() => router.push('/(app)/(tabs)/leads')} className="flex-row items-center gap-[2px]">
              <Typography className="text-[12.5px] font-bold text-blue">See all</Typography>
              <ChevronRightIcon size={11} color="#1D3F8A" strokeWidth={2.5} />
            </Pressable>
          </View>
          <View className="mt-3 gap-[10px]">
            {RECENT_LEADS.map((lead) => (
              <LeadRow key={lead.id} lead={lead} cardUri={cardImageUri(lead)} />
            ))}
          </View>
        </View>

        <View className="h-[130px]" />
      </ScrollView>
    </SafeAreaView>
  );
}
