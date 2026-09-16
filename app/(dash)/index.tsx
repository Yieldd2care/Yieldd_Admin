import { useMemo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../../components/dash/DashShell';
import { EventMultiPicker } from '../../components/dash/EventMultiPicker';
import {
  Cap,
  Empty,
  GhostButton,
  LinkRow,
  Panel,
  Row,
  SectionTitle,
  Stat,
  StatusChip,
  TaskRow,
} from '../../components/dash/primitives';
import { Hero, HeroKey, HeroMetric, HeroMetrics, HeroTitle } from '../../components/dash/hero';
import { CaptureMap } from '../../components/dash/CaptureMap';
import {
  Avatar,
  Donut,
  Icon,
  ICON,
  LegendTile,
  ProgressBar,
  type Slice,
} from '../../components/dash/controls';
import { Typography } from '../../components/ui/Typography';
import { useEventSelection } from '../../hooks/useEvents';
import {
  useEventSetStats,
  useEventStats,
  useLeaderboard,
} from '../../hooks/useEventStats';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { formatPaise } from '../../lib/db';
import { formatPercent } from '../../lib/roi';

/**
 * One colour per stage, used by the donut, its legend and anything else that
 * draws a stage. Declared once here rather than per-chart so a status can never
 * be one colour in the donut and another in a bar.
 */
const STAGE_COLOR: Record<string, string> = {
  New: '#B4C2D8',
  Contacted: '#1D3F8A',
  Qualified: '#F4B000',
  Won: '#4ED17F',
  Lost: '#E3E7EF',
};

/** Non-peak capture bars. Pale enough to recede, dark enough to be a bar. */
const BAR_IDLE = '#93A8CB';

/** The longest day strip worth drawing before it becomes a row of slivers. */
const MAX_DAY_CELLS = 7;


function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function isoDay(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DashHome() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);

  // Across-events totals, from their own server-side aggregate. Never N calls to
  // event_stats added up here: a rep can only read their own leads, so a
  // client-side sum would be a fraction of the truth with nothing to show for it.
  const { events, selectedIds, isAll: isAllEvents } = useEventSelection();
  const { data: setStats } = useEventSetStats(selectedIds);

  /**
   * Which single show the per-event panels are about.
   *
   * Taken from the picker's selection rather than from a control of its own,
   * because there is only one control on this screen. Pick one event and these
   * panels are that event; pick several and they follow the liveliest one in the
   * selection — named on screen, never left to be assumed.
   *
   * They cannot simply add up across a selection the way the hero does:
   * `event_hourly_capture` and `event_leaderboard` each take one event id, and
   * summing their results in the browser would repeat the mistake the comment
   * above warns about — a rep can only read their own rows, so the sum would be
   * a fraction wearing the label of a total. Widening those two to take a set of
   * ids is a migration, and until someone makes it these panels stay honestly
   * about one show and say which.
   */
  const event = useMemo(() => {
    const inSelection = events.filter((e) => selectedIds.includes(e.id));
    if (inSelection.length === 0) return undefined;
    return (
      inSelection.find((e) => e.status === 'live') ??
      [...inSelection].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0]
    );
  }, [events, selectedIds]);

  const { data: stats } = useEventStats(event?.id);
  const { data: board } = useLeaderboard(event?.id);

  // Selecting the array and deriving here, never inside the selector — a
  // selector that builds a new array on every call re-renders forever.
  const leads = useLeadsStore((s) => s.leads);
  const recent = useMemo(
    () => [...leads].sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1)).slice(0, 5),
    [leads]
  );

  /**
   * How the leads on this device came in.
   *
   * Device-side on purpose, and labelled as such: these are the rows this
   * browser can see, which for a rep is their own and for an admin is
   * everything synced so far. The money figures come from the server for
   * exactly the opposite reason — see `lib/api/eventStats.ts`.
   */
  const captureMix = useMemo(() => {
    const scanned = leads.filter((l) => l.source === 'card_scan').length;
    const typed = leads.length - scanned;
    const voiced = leads.filter((l) => l.hasVoice).length;
    return { scanned, typed, voiced };
  }, [leads]);

  /**
   * What the capture map plots.
   *
   * Follows the event picker rather than the single "liveliest event" the
   * panels above use: the map exists to be read ACROSS events and cities
   * (PENDING 43, decided 2026-09-15), so narrowing it to one show would remove
   * the only thing it is for. On the default All events it is every lead this
   * browser can see.
   */
  const mapLeads = useMemo(
    () => (isAllEvents ? leads : leads.filter((l) => selectedIds.includes(l.eventId))),
    [leads, isAllEvents, selectedIds]
  );

  const unsynced = useMemo(() => leads.filter((l) => l.syncStatus === 'draft').length, [leads]);
  const dueToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return leads.filter((l) => l.followUpDate && l.followUpDate <= today).length;
  }, [leads]);

  /**
   * The last seven days, counted from the leads this browser holds.
   *
   * An hourly chart answers "how is today going", which is the right question
   * standing at the stall - and it is the question the event dashboard still
   * answers. On Home it was almost always empty: the moment a show closes, or
   * on any day between shows, the panel said "nothing captured yet today" and
   * spent a third of the screen saying it.
   *
   * Device-side rather than server-side because there is no daily aggregate to
   * call - `event_hourly_capture` is today-only - so the panel says where the
   * count came from, the same way the capture mix does. The rows are scoped to
   * the picker, so a press belongs to the whole selection, not to one show.
   */
  const byDay = useMemo(() => {
    const days: { iso: string; label: string; long: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        iso: isoDay(d),
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        long: i === 0 ? 'today' : d.toLocaleDateString('en-IN', { weekday: 'long' }),
      });
    }
    const counts = new Map<string, number>();
    for (const l of mapLeads) {
      if (!l.capturedAt) continue;
      const when = new Date(l.capturedAt);
      if (Number.isNaN(when.getTime())) continue;
      const key = isoDay(when);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const peak = Math.max(1, ...days.map((d) => counts.get(d.iso) ?? 0));
    return days.map((d) => {
      const count = counts.get(d.iso) ?? 0;
      return { ...d, count, pct: (count / peak) * 100 };
    });
  }, [mapLeads]);

  const busiestDay = useMemo(
    () => byDay.reduce((a, b) => (b.count > a.count ? b : a), byDay[0]),
    [byDay]
  );


  /** Today in the browser's own timezone — the day the person is standing in. */
  const todayKey = useMemo(() => isoDay(new Date()), []);

  /**
   * The show's calendar, one cell per day.
   *
   * A trade show is a handful of days and "which day are we on" is the question
   * the strip answers, so the days are drawn rather than summarised. Past about
   * a week the cells become slivers and stop being readable, so a long run falls
   * back to the one sentence that still carries the answer.
   */
  const days = useMemo(() => {
    if (!event) return [];
    const start = new Date(`${event.startDate}T00:00:00`);
    const end = new Date(`${event.endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const out: { n: number; date: number; iso: string }[] = [];
    for (let i = 0; i < MAX_DAY_CELLS + 1; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > end) break;
      out.push({ n: i + 1, date: d.getDate(), iso: isoDay(d) });
    }
    return out;
  }, [event]);

  const dayStripFits = days.length > 0 && days.length <= MAX_DAY_CELLS;

  /**
   * Every chart on this page answers the same question — "which leads is that?"
   * — and they all answer it the same way, by opening the Leads screen already
   * narrowed to exactly those rows.
   *
   * Going to Leads rather than filtering in place is the point. A count on a
   * chart is not something you can act on; the rows behind it are. Leads is also
   * where searching, sorting, choosing columns and exporting already live, so
   * arriving there with the narrowing applied hands over the whole toolkit
   * instead of a smaller number on a dashboard.
   */
  /**
   * Where a money figure goes when you press it.
   *
   * The figures in the hero are the aggregate over the WHOLE selection, so with
   * several events picked they belong to no single show. Sending that press to
   * one event's ROI page landed on a different number than the one just clicked,
   * which reads as the link being wrong. With one event selected the two agree
   * and that event's ROI page is exactly right; with more than one, `/(dash)/roi`
   * is — the same screen at the wider scope, showing the combined return and the
   * show-by-show breakdown it is made of.
   */
  const openMoney = () =>
    router.push(selectedIds.length === 1 && event ? `/(dash)/events/${event.id}/roi` : '/(dash)/roi');

  type Focus = { status?: string; rep?: string; hour?: number; on?: string; filter?: string };

  /**
   * Open the Leads screen, narrowed to exactly what was clicked.
   *
   * Built as a query STRING, not as router.push({ pathname, params }) — the
   * object form silently dropped every key and the Leads screen showed the whole
   * list, which reads as the click having done nothing.
   *
   * `pinEvent` is the part that has to be right, and it is not a matter of
   * taste. Passing `event` does not filter on top of the picker, it REPLACES the
   * picker's selection with that one show (`leads/index.tsx`, the effect on
   * `params.event`). So it must follow where the number came from:
   *
   * - A figure drawn from `event_set_stats` covers the WHOLE selection. Pinning
   *   one event there shows fewer rows than the number just clicked, and quietly
   *   changes the picker underneath the person. Never pin those.
   * - A figure drawn from `event_stats`, `event_hourly_capture` or
   *   `event_leaderboard` is about ONE show. Those must always pin it, so the
   *   picker in the title bar agrees with the rows.
   *
   * The old single helper pinned on `!isAllEvents`, which got both wrong: with
   * two of four shows picked it narrowed a selection-wide total to one, and with
   * everything picked it left a single show's leaderboard unpinned.
   */
  const openLeadsIn = (focus: Focus, pinEvent: boolean) => {
    const query = new URLSearchParams();
    if (focus.status) query.set('status', focus.status);
    if (focus.rep) query.set('rep', focus.rep);
    if (focus.hour !== undefined) query.set('hour', String(focus.hour));
    if (focus.on) query.set('on', focus.on);
    if (focus.filter) query.set('filter', focus.filter);
    if (pinEvent && event) query.set('event', event.id);
    router.push(`/(dash)/leads?${query.toString()}`);
  };

  /** For numbers that cover the whole picker selection. */
  const openLeads = (focus: Focus) => openLeadsIn(focus, false);

  /** For numbers that belong to the one show the panels below are about. */
  const openEventLeads = (focus: Focus) => openLeadsIn(focus, true);

  /**
   * The pipeline follows the picker, not the one event below it.
   *
   * From `setStats`, the aggregate over the WHOLE selection, so "All events"
   * draws every show's stages and one show draws that show's. It used to read
   * `stats.pipeline` — a single event — so the donut stayed stuck on one name no
   * matter what the dropdown said. Unlike capture-by-hour and the leaderboard
   * this needs no migration: `event_set_stats` already returns a pipeline for a
   * set of ids.
   */
  const stages: Slice[] = useMemo(
    () =>
      (setStats?.pipeline ?? []).map((p) => ({
        key: p.status,
        label: p.status,
        value: p.count,
        color: STAGE_COLOR[p.status] ?? '#E3E7EF',
      })),
    [setStats?.pipeline]
  );

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // The database returns null money for a rep, so this is not a UI preference —
  // it is what this viewer is allowed to be told.
  const money = stats?.canSeeMoney ?? false;
  const setMoney = setStats?.canSeeMoney ?? false;
  const spend = stats?.spendPaise ?? 0;
  const won = stats?.wonValuePaise ?? 0;
  const open = Math.max(0, (stats?.expectedValuePaise ?? 0) - won);
  const scale = Math.max(spend, won + open, 1);
  const costCleared = Math.min(100, (spend / scale) * 100);

  /**
   * How much of the selection the money figures actually cover.
   *
   * An event nobody costed reports ₹0 rather than "unknown" — total_cost_paisa
   * is generated with coalesce(component, 0) — so its won deals would otherwise
   * count towards the return while contributing nothing to the spend it is
   * measured against. The aggregate leaves those events out of the ROI and says
   * how many it left out; saying nothing would make a flattering number look
   * like a complete one.
   */
  const pricedNote = useMemo(() => {
    if (!setStats?.canSeeMoney) return null;
    const priced = setStats.pricedEvents ?? 0;
    const total = setStats.eventsCounted;
    if (priced === total) return null;
    return `${priced} of ${total} events have a cost entered`;
  }, [setStats]);

  /**
   * Where pressing that note goes.
   *
   * Naming the gap without offering a way to close it just moves the work: the
   * only alternative is opening each event in turn to find the empty one. With
   * exactly one missing, go straight to its cost form; with several, the events
   * list is the only honest destination.
   */
  const fixCostHref = useMemo(() => {
    const missing = setStats?.unpricedEventIds ?? [];
    if (missing.length === 0) return null;
    return missing.length === 1 ? `/(dash)/events/${missing[0]}/edit` : '/(dash)/events';
  }, [setStats?.unpricedEventIds]);

  /**
   * Each row carries its own way in, because the three counts do not share a
   * scope. "Captured without a note" comes from `event_stats` — one show — so it
   * pins that show. The other two are counted from the leads on this device
   * across the whole selection, so pinning one show there would show fewer rows
   * than the number beside the label.
   */
  const tasks = [
    stats?.needsNote
      ? {
          key: 'note',
          icon: ICON.note,
          label: 'Captured without a note',
          body: 'No context on who they were',
          count: stats.needsNote,
          open: () => openEventLeads({ filter: 'note' }),
        }
      : null,
    dueToday
      ? {
          key: 'due',
          icon: ICON.clock,
          label: 'Follow-up due',
          body: 'Promised on or before today',
          count: dueToday,
          open: () => openLeads({ filter: 'due' }),
        }
      : null,
    unsynced
      ? {
          key: 'draft',
          icon: ICON.refresh,
          label: 'Not synced yet',
          body: 'Captured offline, still on a phone',
          count: unsynced,
          open: () => openLeads({ filter: 'draft' }),
        }
      : null,
  ].filter(Boolean) as { key: string; icon: string; label: string; body: string; count: number; open: () => void }[];

  const firstName = (user?.name ?? '').trim().split(' ')[0];

  return (
    // No `actions` in the title bar, deliberately. Exporting is its own screen in
    // the sidebar, and a gold button on Home pointed at it made the page's
    // loudest control "leave the page" — sitting right beside the event picker,
    // which is the one control on Home that actually matters.
    <DashShell title="Home" subtitle={today} scope={<EventMultiPicker />}>
      {!event ? (
        <Panel>
          <Empty
            title="No event yet"
            body="Create an event on the phone app and everything captured at it shows up here."
          />
        </Panel>
      ) : (
        <>
          {/*
            The money story, before any card starts.

            This was three separate things: a row of equal tiles, a "Spend
            against return" panel and a sentence under it. They are one argument
            — what the show cost, what came back, how far ahead that leaves you —
            so they are now one object, on the inverted navy surface the brand
            already uses for the figures meant to be screenshotted and forwarded.
          */}
          <Hero>
            <View className="flex-row items-start gap-10">
              <View className="flex-1 min-w-0">
                <HeroTitle
                  title={firstName ? `${greetingFor(new Date().getHours())}, ${firstName}` : greetingFor(new Date().getHours())}
                  live={event.status === 'live'}
                  sub={`${event.name}${event.sub ? ` · ${event.sub}` : ''}${event.dayLabel ? ` · ${event.dayLabel}` : ''}`}
                />

                {/*
                  Spend against what came back, on one track.

                  The marker is where closed business has covered the cost. Two
                  stacked bars said the same thing in twice the space and never
                  showed the moment the show paid for itself.
                */}
                {money ? (
                  <View className="mt-6">
                    <View className="h-2 rounded-full bg-white/15 flex-row overflow-hidden">
                      <View style={{ width: `${(won / scale) * 100}%`, backgroundColor: '#4ED17F' }} />
                      <View style={{ width: `${(open / scale) * 100}%`, backgroundColor: '#F4B000' }} />
                    </View>
                    {/* Outside the track, which clips, so the marker keeps its full height. */}
                    <View className="h-0">
                      <View
                        className="absolute w-[2px] h-5 rounded-sm bg-white/90"
                        style={{ left: `${costCleared}%`, top: -14 }}
                      />
                    </View>

                    <View className="flex-row flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                      <HeroKey color="#4ED17F" label={`Won ${formatPaise(won)}`} />
                      <HeroKey color="#F4B000" label={`Still open ${formatPaise(open)}`} />
                      <HeroKey color="rgba(255,255,255,0.9)" label={`Cost cleared at ${formatPaise(spend)}`} rule />
                    </View>

                    <View className="flex-row items-center justify-between gap-4 mt-[14px]">
                      <Typography className="text-[12px] text-white/60 leading-[1.5] flex-1 min-w-0">
                        {won >= spend
                          ? `Closed business has already covered the cost of this show, with ${formatPaise(open)} still open.`
                          : `${formatPaise(spend - won)} of the cost is still to be recovered. ${formatPaise(open)} is open in qualified leads.`}
                      </Typography>
                      <Pressable
                        onPress={() => router.push(`/(dash)/events/${event.id}/roi`)}
                        className="flex-row items-center gap-[5px] shrink-0"
                      >
                        <Typography className="text-[12.5px] font-semibold text-gold">Full ROI report</Typography>
                        <Icon d={ICON.chevronRight} size={13} color="#F4B000" width={2.2} />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>

              <View className="flex-row gap-11 shrink-0">
                <HeroMetric
                  onPress={() => openLeads({})}
                  label="Leads captured"
                  value={String(setStats?.totalLeads ?? 0)}
                  note={
                    isAllEvents
                      ? `Across ${setStats?.eventsCounted ?? 0} ${setStats?.eventsCounted === 1 ? 'event' : 'events'}`
                      : 'This event'
                  }
                />
                {setMoney ? (
                  <>
                    {/*
                      Cost per lead appears ONLY while a single show is selected,
                      and that restriction is the whole point of it being here.

                      Blended across an ₹80,000 show and a ₹4,75,000 one it is
                      not a number anyone can act on — it invites exactly the
                      comparison it cannot support. Narrowed to one event it is
                      the most useful figure on the page, because the cost is
                      fixed before the doors open and the lead count climbs all
                      day, so it falls in front of you.
                    */}
                    {selectedIds.length === 1 ? (
                      <HeroMetric
                        onPress={openMoney}
                        label="Cost per lead"
                        value={formatPaise(stats?.costPerLeadPaise)}
                        note={`${formatPaise(stats?.spendPaise ?? 0)} spent on the stall`}
                      />
                    ) : (
                      <HeroMetric
                        onPress={openMoney}
                        label="Total spend"
                        value={formatPaise(setStats?.spendPaise)}
                        note={pricedNote ?? 'Across every event shown'}
                      />
                    )}
                    <HeroMetric
                      onPress={openMoney}
                      label="Return on spend"
                      value={formatPercent(setStats?.roiPercent ?? null)}
                      note={pricedNote ?? `${formatPaise(setStats?.wonValuePaise)} closed so far`}
                    />
                  </>
                ) : null}
              </View>
            </View>
          </Hero>

          {/* The warning above says a cost is missing; this is the way to go and
              enter it. Without it the only route is opening each event in turn
              until the empty one turns up. */}
          {pricedNote && fixCostHref ? (
            <View className="mt-[14px]">
              <LinkRow
                label={
                  setStats?.unpricedEventIds.length === 1
                    ? 'Add the missing event cost'
                    : `Add the missing cost for ${setStats?.unpricedEventIds.length} events`
                }
                onPress={() => router.push(fixCostHref as never)}
              />
            </View>
          ) : null}

          {/* The scope these counts obey, in words. The one thing that must
              never be guessed is how much of the year a figure covers. */}
          <View className="mt-6 mb-3">
            <Cap>{isAllEvents ? 'Across events' : 'This event'}</Cap>
          </View>

          <View className="flex-row gap-6 items-stretch">
            <View className="flex-[2.5] gap-6">
              <View className="flex-row gap-6">
                <Stat
                  label="Captured today"
                  value={String(setStats?.leadsToday ?? 0)}
                  // Shows in different cities do not share a day, so each one's
                  // own local date decides what counts as today and the totals
                  // are added. Said on screen rather than left to be assumed.
                  sub="Each event's own local day"
                  icon={<Icon d={ICON.trendUp} size={16} color="#0B132B" />}
                  onPress={() => openLeads({ on: todayKey })}
                />
                <Stat
                  label="Deals won"
                  value={String(setStats?.dealsWon ?? 0)}
                  sub={
                    setMoney
                      ? `${formatPaise(setStats?.wonValuePaise)} attributed`
                      : setStats?.conversionPercent != null
                        ? `${setStats.conversionPercent.toFixed(1)}% of leads`
                        : undefined
                  }
                  icon={<Icon d={ICON.award} size={16} color="#0B132B" />}
                  onPress={() => openLeads({ status: 'Won' })}
                />
                <Stat
                  label="Consent given"
                  value={String(setStats?.consentGiven ?? 0)}
                  sub="Agreed to a follow-up"
                  icon={<Icon d={ICON.check} size={16} color="#0B132B" />}
                  onPress={() => openLeads({ filter: 'consent' })}
                />
              </View>

              <View className="flex-row gap-6 items-stretch flex-1">
                {/* Habsy's donut counts where cards came from. Ours counts what
                    stage they reached, because a lead that never moves past New
                    is the thing worth seeing. How they came in is the small row
                    underneath. */}
                <Panel className="flex-[0.7] px-6 py-6">
                  <SectionTitle
                    title="Pipeline"
                    right={
                      <Typography className="text-[12px] text-slate font-medium flex-1 min-w-0 text-right" numberOfLines={1}>
                        {isAllEvents ? 'All events' : event.name}
                      </Typography>
                    }
                  />

                  <View className="flex-row items-center gap-4 mt-4">
                    <Donut
                      data={stages}
                      size={132}
                      thickness={22}
                      centerValue={String(setStats?.totalLeads ?? 0)}
                      centerLabel={setStats?.totalLeads === 1 ? 'lead' : 'leads'}
                      onSelect={(status) => openLeads({ status })}
                    />
                    {/* Each tile in its own row. LegendTile is `flex-1`, which in
                        a column parent would grow it vertically rather than
                        across. The tiles select too — the donut is a small
                        target, and a status you can read is an easier thing to
                        aim at than an arc. */}
                    <View className="flex-1 gap-[6px] min-w-0">
                      {stages.map((s) => (
                        <View key={s.key} className="flex-row">
                          <LegendTile slice={s} onPress={() => openLeads({ status: s.key })} />
                        </View>
                      ))}
                    </View>
                  </View>

                  <View className="mt-auto pt-[14px] border-t border-section">
                    <Typography className="text-[12px] text-slate leading-[1.5]">
                      How they came in: <Typography className="font-bold text-ink-muted">{captureMix.scanned}</Typography>{' '}
                      scanned, <Typography className="font-bold text-ink-muted">{captureMix.typed}</Typography> typed,{' '}
                      <Typography className="font-bold text-ink-muted">{captureMix.voiced}</Typography> by voice note.
                    </Typography>
                    <Typography className="text-[11px] text-label mt-[6px] leading-[1.45]">
                      Counted from what has synced to this browser.
                    </Typography>
                  </View>
                </Panel>

                <Panel className="flex-1 px-6 py-6">
                  <SectionTitle
                    title="Capture over the last 7 days"
                    right={
                      <Typography className="text-[12px] text-slate font-medium flex-1 min-w-0 text-right" numberOfLines={1}>
                        {isAllEvents ? 'All events' : event.name}
                      </Typography>
                    }
                  />
                  <Typography className="text-[13px] text-ink-muted leading-[1.55] mt-[6px]">
                    {busiestDay.count > 0
                      ? `Busiest ${busiestDay.long}, with ${busiestDay.count} ${
                          busiestDay.count === 1 ? 'lead' : 'leads'
                        }. Click a day to open its captures.`
                      : 'Nothing captured in the last seven days.'}
                  </Typography>

                  {/*
                    The whole column is the target, not just the coloured part. A
                    one-lead hour is a three-pixel stub; asking someone to hit
                    that is asking them not to bother. The empty space above it
                    means the same thing, so it clicks the same way.

                    An hour with nothing in it is not pressable at all — opening
                    an empty list is a worse answer than the bar staying put.

                    The top padding is headroom for the peak's value pill, so the
                    bars still use the full track and keep their true heights.
                  */}
                  <View className="mt-auto pt-[38px]">
                    {busiestDay.count === 0 ? (
                      <View className="h-[160px] items-center justify-center rounded-md bg-section">
                        <Typography className="text-[12.5px] text-slate">
                          The next capture will show up here.
                        </Typography>
                      </View>
                    ) : (
                    <View className="flex-row items-end gap-[14px] h-[160px]">
                      {byDay.map((b) => (
                        <Pressable
                          key={b.iso}
                          disabled={b.count === 0}
                          onPress={() => openLeads({ on: b.iso })}
                          className="flex-1 h-full justify-end items-center"
                        >
                          <View
                            className="w-full rounded-t-md"
                            style={{
                              height: `${Math.max(b.pct, 2)}%`,
                              backgroundColor:
                                b.count === 0 ? '#EEF1F7' : b.iso === busiestDay.iso ? '#F4B000' : BAR_IDLE,
                            }}
                          >
                            {b.iso === busiestDay.iso && b.count > 0 ? (
                              <View className="absolute items-center" style={{ bottom: '100%', left: -60, right: -60 }}>
                                <View className="rounded-full bg-navy-elevated px-3 py-[6px] mb-[9px]">
                                  <Typography className="text-[11px] font-bold text-white">
                                    {b.count} {b.count === 1 ? 'lead' : 'leads'}
                                  </Typography>
                                </View>
                              </View>
                            ) : null}
                          </View>
                        </Pressable>
                      ))}
                    </View>
                    )}
                    {busiestDay.count > 0 ? (
                      <>
                        <View className="h-px bg-hairline mt-[10px]" />
                        <View className="flex-row gap-[14px] mt-[9px]">
                          {byDay.map((b) => (
                            <Typography
                              key={b.iso}
                              className={`flex-1 text-[10.5px] font-semibold text-center ${
                                b.iso === todayKey ? 'text-navy' : 'text-label'
                              }`}
                            >
                              {b.iso === todayKey ? 'Today' : b.label}
                            </Typography>
                          ))}
                        </View>
                      </>
                    ) : null}
                  </View>
                </Panel>
              </View>
            </View>

            {/* The show itself: where it is, which day it is on, and what it is
                waiting on you for. One column, because these are the things you
                act on rather than read. */}
            <Panel className="flex-1 px-6 py-6">
              <SectionTitle
                title={event.name}
                onPress={() => router.push(`/(dash)/events/${event.id}`)}
                right={<StatusChip value={event.status} />}
              />
              <Typography className="text-[12px] text-slate font-medium mt-[5px]" numberOfLines={1}>
                {event.sub}
              </Typography>

              {dayStripFits ? (
                <View className="flex-row gap-2 mt-4">
                  {days.map((d) => {
                    const isToday = d.iso === todayKey;
                    return (
                      <Pressable
                        key={d.iso}
                        onPress={() => openEventLeads({ on: d.iso })}
                        className={`flex-1 h-14 rounded-md items-center justify-center gap-[3px] active:opacity-80 ${
                          isToday ? 'bg-navy' : 'bg-surface'
                        }`}
                      >
                        <Typography
                          className={`text-[10px] font-bold tracking-[0.06em] ${isToday ? 'text-white/60' : 'text-slate'}`}
                          style={{ textTransform: 'uppercase' }}
                        >
                          Day {d.n}
                        </Typography>
                        <Typography className={`text-[15px] font-extrabold ${isToday ? 'text-white' : 'text-navy'}`}>
                          {d.date}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              ) : event.dayLabel ? (
                <View className="mt-4 rounded-md bg-surface px-4 py-3">
                  <Typography className="text-[13px] font-semibold text-navy">{event.dayLabel}</Typography>
                </View>
              ) : null}

              <View className="mt-5 pt-1 border-t border-section">
                {tasks.length ? (
                  tasks.map((t, i) => (
                    <TaskRow
                      key={t.key}
                      icon={t.icon}
                      label={t.label}
                      body={t.body}
                      count={t.count}
                      last={i === tasks.length - 1}
                      onPress={t.open}
                    />
                  ))
                ) : (
                  <View className="py-5">
                    <Typography className="text-[13.5px] font-semibold text-navy">Nothing outstanding</Typography>
                    <Typography className="text-[12px] text-slate mt-[3px] leading-[1.5]">
                      Every lead has a note, nothing is overdue, and everything has synced.
                    </Typography>
                  </View>
                )}
              </View>

              {pricedNote && fixCostHref ? (
                <Pressable
                  onPress={() => router.push(fixCostHref as never)}
                  className="mt-auto flex-row items-center gap-3 rounded-md bg-surface px-[14px] py-[13px]"
                >
                  <Icon d={ICON.info} size={18} color="#5A6B87" />
                  <Typography className="flex-1 text-[12px] text-ink-muted leading-[1.45]">
                    {pricedNote}, so the rest sit outside every return figure above.
                  </Typography>
                </Pressable>
              ) : null}
            </Panel>
          </View>

          <View className="flex-row gap-6 items-stretch mt-6">
            <Panel className="flex-1 px-6 py-6">
              <SectionTitle
                title="Team today"
                right={
                  board?.length ? (
                    <Typography className="text-[12px] text-slate font-medium">
                      {board.reduce((n, r) => n + r.leadCount, 0)} leads
                    </Typography>
                  ) : undefined
                }
              />
              {board?.length ? (
                <View className="mt-3">
                  {board.slice(0, 5).map((r, i) => {
                    const top = board[0]?.leadCount || 1;
                    return (
                      // "Today" is in the panel's own title, so the click has to
                      // mean today too — landing on a rep's whole history after
                      // clicking a bar labelled today would be a different number
                      // than the one that was just pressed.
                      <Pressable
                        key={r.profileId}
                        disabled={r.leadCount === 0}
                        onPress={() => openEventLeads({ rep: r.profileId, on: todayKey })}
                        className="flex-row items-center gap-3 py-[7px]"
                      >
                        <Avatar name={r.name} size={30} tone={i === 0 ? 'gold' : 'surface'} />
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-baseline justify-between gap-2">
                            <Typography className="text-[13px] font-semibold text-navy flex-1 min-w-0" numberOfLines={1}>
                              {r.name}
                            </Typography>
                            <Typography className="text-[13px] font-bold text-navy">{r.leadCount}</Typography>
                          </View>
                          <View className="mt-[6px]">
                            <ProgressBar
                              pct={(r.leadCount / top) * 100}
                              color={i === 0 ? '#F4B000' : BAR_IDLE}
                              height={6}
                            />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Typography className="text-[13px] text-slate mt-4 leading-[1.5]">
                  The leaderboard is off for this event, or nobody has captured yet.
                </Typography>
              )}

              <View className="mt-auto pt-[14px] border-t border-section">
                {/* The full board for THIS show lives on its dashboard. Team is
                    the member list — who exists and what they can do — which is
                    a different question than who captured most today. */}
                <LinkRow
                  label="Open the full leaderboard"
                  onPress={() => router.push(`/(dash)/events/${event.id}`)}
                />
              </View>
            </Panel>

            <Panel className="flex-[2.5] overflow-hidden">
              <View className="px-6 py-[18px] flex-row items-center justify-between">
                <Typography className="text-[16.5px] font-bold text-navy tracking-tight">Recent leads</Typography>
                <GhostButton label="All leads" onPress={() => router.push('/(dash)/leads')} />
              </View>
              {recent.length ? (
                <>
                  <Row cols={[1.5, 1.3, 0.8, 0.6]} header cells={['Name', 'Company', 'Captured', 'Status']} />
                  {recent.map((l, i) => (
                    // The whole row, not just the name. A row that only responds
                    // on one word makes people hunt for the hit area.
                    <Pressable key={l.id} onPress={() => router.push(`/(dash)/leads/${l.id}`)} className="hover:bg-section">
                    <Row
                      cols={[1.5, 1.3, 0.8, 0.6]}
                      last={i === recent.length - 1}
                      cells={[
                        <View className="flex-row items-center gap-[10px]">
                          <Avatar name={l.name} size={30} tone="surface" />
                          <View className="flex-1 min-w-0">
                            <Typography className="text-[13.5px] font-semibold text-blue" numberOfLines={1}>
                              {l.name || 'Unnamed'}
                            </Typography>
                            {l.designation ? (
                              <Typography className="text-[11.5px] text-label" numberOfLines={1}>
                                {l.designation}
                              </Typography>
                            ) : null}
                          </View>
                        </View>,
                        l.company || '-',
                        <View>
                          <Typography className="text-[13px] text-ink-muted">{l.time || '-'}</Typography>
                          <Typography className="text-[11px] text-label">
                            {l.source === 'card_scan' ? 'Card scan' : 'Typed in'}
                          </Typography>
                        </View>,
                        <StatusChip value={l.status} />,
                      ]}
                    />
                    </Pressable>
                  ))}
                </>
              ) : (
                <Empty title="No leads yet" body="Leads captured on the phone appear here the moment they sync." />
              )}
            </Panel>
          </View>

          <View className="mt-6">
            <Panel className="overflow-hidden">
              <CaptureMap
                leads={mapLeads}
                total={mapLeads.length}
                onOpenLead={(id) => router.push(`/(dash)/leads/${id}`)}
              />
            </Panel>
          </View>
        </>
      )}
    </DashShell>
  );
}
