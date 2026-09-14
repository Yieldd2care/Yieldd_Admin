import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../../components/dash/DashShell';
import { EventSwitcher } from '../../components/dash/EventSwitcher';
import { EventMultiPicker, SelectionSummary } from '../../components/dash/EventMultiPicker';
import { Cap, Empty, GhostButton, GoldButton, Panel, Row, StatusChip } from '../../components/dash/primitives';
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
import { useCurrentEvent, useEventSelection } from '../../hooks/useEvents';
import {
  useEventSetStats,
  useEventStats,
  useHourlyCapture,
  useLeaderboard,
} from '../../hooks/useEventStats';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { formatPaise } from '../../lib/db';
import { formatPercent } from '../../lib/roi';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const STAGE_COLOR: Record<string, string> = {
  New: '#C3CDDF',
  Contacted: '#1D3F8A',
  Qualified: '#F4B000',
  Won: '#4ED17F',
  Lost: '#E3E7EF',
};

function hourLabel(h: number) {
  if (h === 12) return '12';
  return h > 12 ? String(h - 12) : String(h);
}

/**
 * A headline number.
 *
 * `hero` is used exactly once per screen. Cost per lead earns it here because
 * it is the only figure on the page that moves on its own: the event's cost is
 * fixed before the doors open and the lead count climbs all day, so the number
 * falls in front of you. Every other tile is a count that only changes when
 * someone does something.
 */
function Metric({
  label,
  value,
  sub,
  hero = false,
  locked = false,
}: {
  label: string;
  value: string;
  sub?: string;
  hero?: boolean;
  locked?: boolean;
}) {
  return (
    <Panel className={`flex-1 px-5 py-[18px] ${hero ? 'border-gold' : ''}`}>
      <Cap>{label}</Cap>
      <Typography
        className={`font-extrabold mt-[6px] tracking-tight ${hero ? 'text-[32px] text-navy' : 'text-[28px] text-navy'} ${
          locked ? 'text-label' : ''
        }`}
      >
        {value}
      </Typography>
      {sub ? <Typography className="text-[12px] text-slate font-medium mt-[2px]">{sub}</Typography> : null}
    </Panel>
  );
}

/**
 * One row in "Needs you".
 *
 * These were four stat tiles. A count of leads captured without a note is not
 * a measurement, it is a job — so each one is a button that opens Leads
 * already filtered to exactly those rows, and the whole panel disappears when
 * there is nothing left to do.
 */
function Task({
  label,
  body,
  count,
  onPress,
  last = false,
}: {
  label: string;
  body: string;
  count: number;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-[14px] px-[22px] py-[14px] ${last ? '' : 'border-b border-hairline'}`}
    >
      <View className="w-[38px] h-[38px] rounded-md bg-surface items-center justify-center shrink-0">
        <Typography className="text-[14px] font-extrabold text-navy">{count}</Typography>
      </View>
      <View className="flex-1 min-w-0">
        <Typography className="text-[13.5px] font-bold text-navy">{label}</Typography>
        <Typography className="text-[12px] text-slate mt-[1px]" numberOfLines={1}>
          {body}
        </Typography>
      </View>
      <Icon d={ICON.chevronRight} size={15} color="#97A3B8" />
    </Pressable>
  );
}

export default function DashHome() {
  const router = useRouter();
  const { event } = useCurrentEvent();
  const { data: stats } = useEventStats(event?.id);
  const { data: hourly } = useHourlyCapture(event?.id);
  const { data: board } = useLeaderboard(event?.id);

  // Across-events totals, from their own server-side aggregate. Never N calls to
  // event_stats added up here: a rep can only read their own leads, so a
  // client-side sum would be a fraction of the truth with nothing to show for it.
  const { selectedIds } = useEventSelection();
  const { data: setStats } = useEventSetStats(selectedIds);

  // Selecting the array and deriving here, never inside the selector — a
  // selector that builds a new array on every call re-renders forever.
  const leads = useLeadsStore((s) => s.leads);
  const recent = useMemo(
    () => [...leads].sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1)).slice(0, 6),
    [leads]
  );

  /**
   * How the leads on this device came in.
   *
   * Device-side on purpose, and labelled as such: these are the rows this
   * browser can see, which for a rep is their own and for an admin is
   * everything synced so far. The money figures above come from the server for
   * exactly the opposite reason — see `lib/api/eventStats.ts`.
   */
  const captureMix = useMemo(() => {
    const scanned = leads.filter((l) => l.source === 'card_scan').length;
    const typed = leads.length - scanned;
    const voiced = leads.filter((l) => l.hasVoice).length;
    return { scanned, typed, voiced };
  }, [leads]);

  const unsynced = useMemo(() => leads.filter((l) => l.syncStatus === 'draft').length, [leads]);
  const dueToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return leads.filter((l) => l.followUpDate && l.followUpDate <= today).length;
  }, [leads]);

  const byHour = useMemo(() => {
    const map = new Map((hourly ?? []).map((h) => [h.hour, h.count]));
    const counts = HOURS.map((h) => map.get(h) ?? 0);
    const peak = Math.max(1, ...counts);
    return HOURS.map((h, i) => ({ hour: h, count: counts[i], pct: (counts[i] / peak) * 100 }));
  }, [hourly]);

  const busiest = useMemo(() => byHour.reduce((a, b) => (b.count > a.count ? b : a), byHour[0]), [byHour]);

  const stages: Slice[] = useMemo(
    () =>
      (stats?.pipeline ?? []).map((p) => ({
        key: p.status,
        label: p.status,
        value: p.count,
        color: STAGE_COLOR[p.status] ?? '#E3E7EF',
      })),
    [stats?.pipeline]
  );

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // The database returns null money for a rep, so this is not a UI preference
  // — it is what this viewer is allowed to be told.
  const money = stats?.canSeeMoney ?? false;
  const spend = stats?.spendPaise ?? 0;
  const won = stats?.wonValuePaise ?? 0;
  const open = Math.max(0, (stats?.expectedValuePaise ?? 0) - won);
  const scale = Math.max(spend, won + open, 1);

  const setMoney = setStats?.canSeeMoney ?? false;

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

  const tasks = [
    stats?.needsNote
      ? {
          key: 'note',
          label: 'Captured without a note',
          body: 'No context on who they were or what they wanted',
          count: stats.needsNote,
          href: '/(dash)/leads?filter=note',
        }
      : null,
    dueToday
      ? {
          key: 'due',
          label: 'Follow-up due',
          body: 'Promised a call or a message on or before today',
          count: dueToday,
          href: '/(dash)/leads?filter=due',
        }
      : null,
    unsynced
      ? {
          key: 'draft',
          label: 'Not synced yet',
          body: 'Captured offline and still only on a phone',
          count: unsynced,
          href: '/(dash)/leads?filter=draft',
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; body: string; count: number; href: string }[];

  return (
    <DashShell
      title="Home"
      subtitle={today}
      scope={<EventSwitcher />}
      actions={<GoldButton label="Export leads" onPress={() => router.push('/(dash)/export')} />}
    >
      {!event ? (
        <Panel>
          <Empty
            title="No event yet"
            body="Create an event on the phone app and everything captured at it shows up here."
          />
        </Panel>
      ) : (
        <>
          {/* Across several shows at once. Everything below this block is scoped
              to the one event in the title bar; this block is scoped to the
              picker beside it, and both say so in words, because the one thing
              a reader must never have to guess is how much of the year the
              number in front of them covers. */}
          <View className="mb-6">
            <View className="flex-row items-end justify-between mb-3 gap-4">
              <View className="min-w-0">
                <Cap>Across events</Cap>
                <View className="mt-[5px]">
                  <SelectionSummary />
                </View>
              </View>
              <EventMultiPicker />
            </View>

            <View className="flex-row gap-4">
              <Metric
                label="Leads captured"
                value={String(setStats?.totalLeads ?? 0)}
                sub={`${setStats?.eventsCounted ?? 0} ${
                  setStats?.eventsCounted === 1 ? 'event' : 'events'
                }`}
                hero
              />
              <Metric
                label="Captured today"
                value={String(setStats?.leadsToday ?? 0)}
                // Shows in different cities do not share a day, so each one's
                // own local date decides what counts as today and the totals
                // are added. Said on screen rather than left to be assumed.
                sub="Each event's own local day"
              />
              <Metric
                label="Deals won"
                value={String(setStats?.dealsWon ?? 0)}
                sub={
                  setMoney
                    ? formatPaise(setStats?.wonValuePaise)
                    : setStats?.conversionPercent != null
                      ? `${setStats.conversionPercent.toFixed(1)}% of leads`
                      : undefined
                }
              />
              {setMoney ? (
                <>
                  <Metric
                    label="Total spend"
                    value={formatPaise(setStats?.spendPaise)}
                    sub={pricedNote ?? 'Across every event shown'}
                  />
                  <Metric
                    label="Return"
                    value={formatPercent(setStats?.roiPercent ?? null)}
                    // Deliberately no cost-per-lead tile here. A blended figure
                    // spanning an ₹80,000 show and a ₹4,75,000 one is not a
                    // number anyone can act on, and putting it on Home invites
                    // exactly that comparison.
                    sub={pricedNote ?? 'Won value against spend'}
                  />
                </>
              ) : (
                <Metric
                  label="Consent given"
                  value={String(setStats?.consentGiven ?? 0)}
                  sub="Agreed to a follow-up"
                />
              )}
            </View>
          </View>

          <View className="mb-3">
            <Cap>This event</Cap>
            <Typography className="text-[12px] text-slate font-medium mt-[4px]" numberOfLines={1}>
              {event.name}
            </Typography>
          </View>

          <View className="flex-row gap-4">
            {money ? (
              <Metric
                label="Cost per lead"
                value={formatPaise(stats?.costPerLeadPaise)}
                sub={`${formatPaise(spend)} spent · ${stats?.totalLeads ?? 0} leads`}
                hero
              />
            ) : (
              <Metric
                label="Captured today"
                value={String(stats?.leadsToday ?? 0)}
                sub="At this event"
                hero
              />
            )}
            <Metric
              label="Leads captured"
              value={String(stats?.totalLeads ?? 0)}
              sub={`${stats?.leadsToday ?? 0} today`}
            />
            <Metric
              label="Deals won"
              value={String(stats?.dealsWon ?? 0)}
              sub={
                money
                  ? formatPaise(won)
                  : stats?.conversionPercent != null
                    ? `${stats.conversionPercent.toFixed(1)}% of leads`
                    : undefined
              }
            />
            <Metric
              label={money ? 'Return' : 'Consent given'}
              value={
                money
                  ? stats?.roiPercent != null
                    ? `${stats.roiPercent > 0 ? '+' : ''}${Math.round(stats.roiPercent)}%`
                    : '—'
                  : String(stats?.consentGiven ?? 0)
              }
              sub={money ? 'Won value against spend' : 'Agreed to a follow-up'}
            />
          </View>

          {/* Spend against what came back. Habsy has no equivalent because a
              card database has no cost side — this is the whole reason the
              product exists, so it sits directly under the headline. */}
          {money ? (
            <Panel className="mt-4 px-[22px] py-5">
              <View className="flex-row items-center justify-between">
                <Typography className="text-[17px] font-bold text-navy">Spend against return</Typography>
                <Pressable onPress={() => router.push(`/(dash)/events/${event.id}/roi`)}>
                  <Typography className="text-[12.5px] font-semibold text-blue">Full ROI report</Typography>
                </Pressable>
              </View>

              <View className="mt-[18px] gap-[14px]">
                <View>
                  <View className="flex-row items-center justify-between mb-[7px]">
                    <Typography className="text-[12.5px] font-semibold text-slate">What this show cost</Typography>
                    <Typography className="text-[14px] font-extrabold text-navy">{formatPaise(spend)}</Typography>
                  </View>
                  <ProgressBar pct={(spend / scale) * 100} color="#C3CDDF" height={12} />
                </View>

                <View>
                  <View className="flex-row items-center justify-between mb-[7px]">
                    <Typography className="text-[12.5px] font-semibold text-slate">
                      Won, plus still open
                    </Typography>
                    <Typography className="text-[14px] font-extrabold text-navy">
                      {formatPaise(won)}
                      <Typography className="text-[12.5px] font-semibold text-label">
                        {open > 0 ? ` + ${formatPaise(open)} open` : ''}
                      </Typography>
                    </Typography>
                  </View>
                  <View className="flex-row h-[12px] rounded-full bg-surface overflow-hidden">
                    <View style={{ width: `${(won / scale) * 100}%`, backgroundColor: '#4ED17F' }} />
                    <View style={{ width: `${(open / scale) * 100}%`, backgroundColor: '#F4B000' }} />
                  </View>
                </View>
              </View>

              <Typography className="text-[12.5px] text-slate leading-[1.55] mt-4 pt-[14px] border-t border-hairline">
                {won >= spend
                  ? `Closed business has already covered the cost of this show, with ${formatPaise(open)} still open.`
                  : `${formatPaise(spend - won)} of the cost is still to be recovered. ${formatPaise(open)} is open in qualified leads.`}
              </Typography>
            </Panel>
          ) : null}

          <View className="flex-row gap-4 mt-4 items-start">
            <Panel className="flex-[1.5] px-[22px] py-5">
              <View className="flex-row items-center justify-between">
                <Typography className="text-[17px] font-bold text-navy">Capture by hour</Typography>
                <Typography className="text-[12px] text-slate font-medium">Today, 8am to 8pm</Typography>
              </View>
              <View className="flex-row items-end gap-[10px] h-[180px] mt-[22px]">
                {byHour.map((b) => (
                  <View key={b.hour} className="flex-1 h-full justify-end items-center gap-2">
                    <View
                      className="w-full rounded-t-md"
                      style={{
                        height: `${Math.max(b.pct, 2)}%`,
                        backgroundColor: b.count === 0 ? '#EEF1F7' : b.hour === busiest.hour ? '#F4B000' : '#1D3F8A',
                      }}
                    />
                    <Typography className="text-[10.5px] text-label font-semibold">{hourLabel(b.hour)}</Typography>
                  </View>
                ))}
              </View>
              <View className="mt-4 pt-[14px] border-t border-hairline">
                <Typography className="text-[12.5px] text-slate">
                  {busiest.count > 0
                    ? `Busiest hour was ${hourLabel(busiest.hour)}${busiest.hour < 12 ? 'am' : 'pm'} with ${busiest.count} leads.`
                    : 'Nothing captured yet today.'}
                </Typography>
              </View>
            </Panel>

            {/* Habsy's donut counts where cards came from. Ours counts what
                stage they reached, because a lead that never moves past New is
                the thing worth seeing. How they came in is the small row
                underneath. */}
            <Panel className="flex-1 px-[22px] py-5">
              <Typography className="text-[17px] font-bold text-navy">Pipeline</Typography>
              <View className="items-center mt-4">
                <Donut
                  data={stages}
                  centerValue={String(stats?.totalLeads ?? 0)}
                  centerLabel={stats?.totalLeads === 1 ? 'lead' : 'leads'}
                />
              </View>
              {/* Each tile in its own row. LegendTile is `flex-1`, which in a
                  column parent would grow it vertically rather than across. */}
              <View className="gap-2 mt-[18px]">
                {stages.map((s) => (
                  <View key={s.key} className="flex-row">
                    <LegendTile slice={s} />
                  </View>
                ))}
              </View>

              <View className="mt-[18px] pt-[14px] border-t border-hairline">
                <Cap>How they came in</Cap>
                <View className="flex-row flex-wrap gap-x-[14px] gap-y-1 mt-2">
                  <Typography className="text-[12.5px] text-slate">
                    <Typography className="font-bold text-navy">{captureMix.scanned}</Typography> scanned
                  </Typography>
                  <Typography className="text-[12.5px] text-slate">
                    <Typography className="font-bold text-navy">{captureMix.typed}</Typography> typed in
                  </Typography>
                  <Typography className="text-[12.5px] text-slate">
                    <Typography className="font-bold text-navy">{captureMix.voiced}</Typography> with a voice note
                  </Typography>
                </View>
                <Typography className="text-[11px] text-label mt-2 leading-[1.45]">
                  Counted from what has synced to this browser.
                </Typography>
              </View>
            </Panel>
          </View>

          <View className="flex-row gap-4 mt-4 items-start">
            <Panel className="flex-1 overflow-hidden">
              <View className="px-[22px] py-[18px] border-b border-hairline flex-row items-center justify-between">
                <Typography className="text-[17px] font-bold text-navy">Needs you</Typography>
                {tasks.length ? (
                  <Typography className="text-[12px] text-slate font-medium">
                    {tasks.reduce((n, t) => n + t.count, 0)} leads
                  </Typography>
                ) : null}
              </View>
              {tasks.length ? (
                tasks.map((t, i) => (
                  <Task
                    key={t.key}
                    label={t.label}
                    body={t.body}
                    count={t.count}
                    last={i === tasks.length - 1}
                    onPress={() => router.push(t.href as never)}
                  />
                ))
              ) : (
                <View className="px-[22px] py-[26px]">
                  <Typography className="text-[13.5px] font-bold text-navy">Nothing outstanding</Typography>
                  <Typography className="text-[12.5px] text-slate mt-[3px] leading-[1.5]">
                    Every lead has a note, nothing is overdue, and everything has synced.
                  </Typography>
                </View>
              )}
            </Panel>

            <Panel className="flex-1 px-[22px] py-5">
              <View className="flex-row items-center justify-between">
                <Typography className="text-[17px] font-bold text-navy">Team today</Typography>
                <Pressable onPress={() => router.push('/(dash)/team')}>
                  <Typography className="text-[12.5px] font-semibold text-blue">Manage</Typography>
                </Pressable>
              </View>
              {board?.length ? (
                <View className="mt-3">
                  {board.slice(0, 5).map((r, i) => {
                    const top = board[0]?.leadCount || 1;
                    return (
                      <View
                        key={r.profileId}
                        className={`py-[11px] ${i === Math.min(board.length, 5) - 1 ? '' : 'border-b border-hairline'}`}
                      >
                        <View className="flex-row items-center gap-3">
                          <Avatar name={r.name} size={28} tone={i === 0 ? 'gold' : 'surface'} />
                          <Typography className="flex-1 text-[13.5px] font-semibold text-navy" numberOfLines={1}>
                            {r.name}
                          </Typography>
                          <Typography className="text-[15px] font-extrabold text-navy">{r.leadCount}</Typography>
                        </View>
                        <View className="mt-[7px] ml-[40px]">
                          <ProgressBar
                            pct={(r.leadCount / top) * 100}
                            color={i === 0 ? '#F4B000' : '#C3CDDF'}
                            height={5}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Typography className="text-[13px] text-slate mt-4 leading-[1.5]">
                  The leaderboard is off for this event, or nobody has captured yet.
                </Typography>
              )}
            </Panel>
          </View>

          <Panel className="mt-4 overflow-hidden">
            <View className="px-[22px] py-[18px] border-b border-hairline flex-row items-center justify-between">
              <Typography className="text-[17px] font-bold text-navy">Recent leads</Typography>
              <GhostButton label="All leads" onPress={() => router.push('/(dash)/leads')} />
            </View>
            {recent.length ? (
              <>
                <Row cols={[1.5, 1.3, 0.8, 0.6]} header cells={['Name', 'Company', 'Captured', 'Status']} />
                {recent.map((l, i) => (
                  <Row
                    key={l.id}
                    cols={[1.5, 1.3, 0.8, 0.6]}
                    last={i === recent.length - 1}
                    cells={[
                      <Pressable
                        onPress={() => router.push(`/(dash)/leads/${l.id}`)}
                        className="flex-row items-center gap-[10px]"
                      >
                        <Avatar name={l.name} size={28} tone="surface" />
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
                      </Pressable>,
                      l.company || '—',
                      <View>
                        <Typography className="text-[13px] text-ink-muted">{l.time || '—'}</Typography>
                        <Typography className="text-[11px] text-label">
                          {l.source === 'card_scan' ? 'Card scan' : 'Typed in'}
                        </Typography>
                      </View>,
                      <StatusChip value={l.status} />,
                    ]}
                  />
                ))}
              </>
            ) : (
              <Empty title="No leads yet" body="Leads captured on the phone appear here the moment they sync." />
            )}
          </Panel>
        </>
      )}
    </DashShell>
  );
}
