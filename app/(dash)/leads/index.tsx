import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DashShell } from '../../../components/dash/DashShell';
import { Hero, HeroMetric, HeroMetrics, HeroTitle } from '../../../components/dash/hero';
import { EventMultiPicker } from '../../../components/dash/EventMultiPicker';
import { Cap, Empty, Panel, Pill, StatusChip, TempChip } from '../../../components/dash/primitives';
import {
  Avatar,
  Checkbox,
  Icon,
  ICON,
  Menu,
  MenuItem,
  MenuToggle,
  Pagination,
  SearchField,
} from '../../../components/dash/controls';
import { Typography } from '../../../components/ui/Typography';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useTeam } from '../../../hooks/useTeam';
import { useEventSelection } from '../../../hooks/useEvents';
import type { StoredLead } from '../../../stores/useLeadsStore';

type Filter = 'all' | 'hot' | 'warm' | 'cold' | 'due' | 'note' | 'draft' | 'consent';
type SortKey = 'newest' | 'oldest' | 'name' | 'value';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name', label: 'Name A–Z' },
  { key: 'value', label: 'Deal value' },
];

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Every column the table can show, with its flex weight.
 *
 * `locked` columns cannot be switched off — a row with no name is not a row.
 * The rest are the admin's choice, because what matters at a machine-tools
 * show (designation, company) is not what matters when chasing quotes (deal
 * value, follow-up date).
 */
const COLUMNS = [
  { key: 'person', label: 'Person', flex: 1.5, locked: true },
  { key: 'company', label: 'Company', flex: 1.25, locked: false },
  { key: 'contact', label: 'Contact', flex: 1.45, locked: false },
  { key: 'captured', label: 'Captured', flex: 0.85, locked: false },
  { key: 'temperature', label: 'Temp', flex: 0.55, locked: false },
  { key: 'status', label: 'Status', flex: 0.6, locked: false },
  { key: 'value', label: 'Deal value', flex: 0.75, locked: false },
] as const;

type ColumnKey = (typeof COLUMNS)[number]['key'];

const DEFAULT_COLUMNS: ColumnKey[] = ['person', 'company', 'contact', 'captured', 'temperature', 'status', 'value'];

const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
  due: 'Follow-up due',
  note: 'Needs note',
  draft: 'Not synced',
  consent: 'Consent given',
};

function isFilter(value: string | undefined): value is Filter {
  return value != null && value in FILTER_LABEL;
}

/**
 * A narrowing arrived at by clicking something on another screen.
 *
 * Kept apart from the `filter` pills above rather than folded into them, and
 * the reason is that these are open-ended. `status` is whatever stages exist,
 * `rep` is a user id, `hour` is any of twelve — turning each into a pill would
 * put thirty buttons on a row meant for seven, and most of them would read
 * zero. So the pills stay the fixed vocabulary of the screen and this rides on
 * top of them, as one chip that says what it is and removes itself in a click.
 *
 * `on` is a plain yyyy-mm-dd, compared against the local date rather than the
 * stored timestamp's UTC day — a lead captured at 9pm in Ahmedabad is still
 * today's lead to the person who captured it.
 */
type Focus = { status?: string; rep?: string; hour?: number; on?: string };

function localDay(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hourWord(h: number): string {
  const base = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${base}${h < 12 ? 'am' : 'pm'}`;
}

/** A line of contact detail with its icon, or nothing at all. */
function ContactLine({ icon, value }: { icon: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <View className="flex-row items-center gap-[6px]">
      <Icon d={icon} size={12} color="#97A3B8" />
      <Typography className="text-[12px] text-ink-muted" numberOfLines={1}>
        {value}
      </Typography>
    </View>
  );
}

export default function DashLeads() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    filter?: string;
    status?: string;
    rep?: string;
    hour?: string;
    on?: string;
    events?: string;
    event?: string;
  }>();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [columns, setColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Home links here with the filter already chosen — "12 captured without a
  // note" opens those twelve, not the whole list with a hint to go looking.
  useEffect(() => {
    if (isFilter(params.filter)) setFilter(params.filter);
  }, [params.filter]);

  /**
   * Read once into state rather than used straight off the URL, so the chip can
   * be cleared without a navigation. Clearing by rewriting the URL would put an
   * entry in the browser history for every dismissal, and Back would then walk
   * the person through their own filter changes instead of returning them to
   * the chart they came from.
   *
   * `one()` is not defensive padding: useLocalSearchParams hands back a string
   * for a key seen once and an ARRAY for a key seen twice, and a stale array
   * arriving here would compare against `l.status` as an object and quietly
   * match nothing — a filtered list showing everything, with no error anywhere.
   */
  const one = (v: string | string[] | undefined): string | undefined => {
    const value = Array.isArray(v) ? v[0] : v;
    return value?.trim() || undefined;
  };

  const [focus, setFocus] = useState<Focus>({});
  useEffect(() => {
    const hour = Number(one(params.hour));
    setFocus({
      status: one(params.status),
      rep: one(params.rep),
      hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : undefined,
      on: one(params.on),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.status, params.rep, params.hour, params.on, params.event]);

  const { data: team } = useTeam();
  const focusRepName = useMemo(
    () => team?.find((m) => m.id === focus.rep)?.name ?? null,
    [team, focus.rep]
  );


  /**
   * Which shows this table covers.
   *
   * The picker in the title bar used to be decoration here: it set the current
   * event and nothing on this screen ever read it, so changing the event left
   * every row exactly where it was. Now it is the scope, and "Every event"
   * genuinely means every event.
   */
  const { events: visibleEvents, selectedIds, setSelection } = useEventSelection();

  /**
   * Arriving from a chart points the picker at that chart's event.
   *
   * Without this the two could disagree — land here scoped to Gujarat from a
   * donut while the picker still says Auto Expo, and the table would be empty
   * for a reason nothing on screen explains. Setting the selection instead
   * keeps the control and the rows telling the same story.
   */
  useEffect(() => {
    const id = one(params.event);
    if (id) setSelection([id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.event]);

  /**
   * `?events=all` widens the picker to everything visible.
   *
   * The opposite of `?event=<id>`, and needed for the same reason: a figure that
   * counts every show has to still be true when you land here. Without it a
   * press on the events page's "Leads captured" dropped into whatever narrower
   * selection happened to be set, and showed fewer rows than the number pressed.
   */
  useEffect(() => {
    if (one(params.events) !== 'all') return;
    if (!visibleEvents.length) return;
    setSelection(visibleEvents.map((e) => e.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.events, visibleEvents.length]);


  /**
   * What the chip says. Built from every part that is set, so a click on a rep's
   * bar for today reads "Priya Sharma · today" rather than losing half of what
   * was asked for.
   */
  const focusLabel = useMemo(() => {
    const parts: string[] = [];
    if (focus.status) parts.push(focus.status);
    if (focus.rep) parts.push(focusRepName ?? 'One person');
    if (focus.hour !== undefined) parts.push(`captured ${hourWord(focus.hour)}`);
    if (focus.on) {
      parts.push(focus.on === localDay(new Date().toISOString()) ? 'today' : focus.on);
    }
    // No event here on purpose: the picker in the title bar is the event
    // control and already names it. Repeating it in a chip whose cross cannot
    // clear it would offer a button that does not do what it looks like.
    return parts.length ? parts.join(' · ') : null;
  }, [focus, focusRepName]);

  // The array comes out of the store; every count and slice is derived here.
  // Deriving inside the selector would allocate a new array per call and
  // re-render without end.
  const leadsAll = useLeadsStore((s) => s.leads);

  /**
   * Everything below this line works on the selected events only.
   *
   * Scoped once, here, rather than at each use — the pill counts, the search,
   * the pagination and the select-all checkbox all have to agree about what
   * "all" means, and the quickest way for them to disagree is for each to
   * decide separately.
   */
  const leads = useMemo(
    () => leadsAll.filter((l) => selectedIds.includes(l.eventId)),
    [leadsAll, selectedIds]
  );

  const counts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      all: leads.length,
      hot: leads.filter((l) => l.temperature === 'Hot').length,
      warm: leads.filter((l) => l.temperature === 'Warm').length,
      cold: leads.filter((l) => l.temperature === 'Cold').length,
      due: leads.filter((l) => l.followUpDate && l.followUpDate <= today).length,
      note: leads.filter((l) => l.needsNote).length,
      draft: leads.filter((l) => l.syncStatus === 'draft').length,
      consent: leads.filter((l) => l.consentGiven).length,
    };
  }, [leads]);

  const matched = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');

    const byFilter = (l: StoredLead) => {
      switch (filter) {
        case 'hot':
          return l.temperature === 'Hot';
        case 'warm':
          return l.temperature === 'Warm';
        case 'cold':
          return l.temperature === 'Cold';
        case 'due':
          return Boolean(l.followUpDate && l.followUpDate <= today);
        case 'note':
          return l.needsNote;
        case 'draft':
          return l.syncStatus === 'draft';
        // Reached from the dashboard's "Consent given" tile. Kept as a pill too
        // so the narrowing can be cleared and found again without going back.
        case 'consent':
          return Boolean(l.consentGiven);
        default:
          return true;
      }
    };

    const bySearch = (l: StoredLead) => {
      if (!q) return true;
      if (l.name?.toLowerCase().includes(q)) return true;
      if (l.company?.toLowerCase().includes(q)) return true;
      if (l.email?.toLowerCase().includes(q)) return true;
      if (l.designation?.toLowerCase().includes(q)) return true;
      // The extras are searchable too. A rep who typed a second number into a
      // lead and then searched for it would otherwise get nothing back, which
      // reads as "search is broken" rather than "search reads the first only".
      // The list ROW still shows the primary alone: a row stays one line.
      for (const address of l.extraEmails ?? []) {
        if (address.toLowerCase().includes(q)) return true;
      }
      for (const title of l.extraDesignations ?? []) {
        if (title.toLowerCase().includes(q)) return true;
      }
      if (digits.length >= 3) {
        for (const number of l.extraPhones ?? []) {
          if (number.replace(/\D/g, '').includes(digits)) return true;
        }
      }
      if (digits.length >= 3 && l.phone?.replace(/\D/g, '').includes(digits)) return true;
      return false;
    };

    /**
     * The narrowing that came in from a chart click.
     *
     * Every part is ANDed with the others and with the pills, so arriving from
     * "Priya's bar, today" and then pressing the Hot pill gives Priya's hot
     * leads from today — the pills keep working rather than silently competing
     * with something set on another screen.
     */
    const byFocus = (l: StoredLead) => {
      // No event test here: the picker already scoped `leads` to the selection,
      // and a chart click points the picker at its own event on the way in.
      if (focus.status && l.status !== focus.status) return false;
      if (focus.rep && l.capturedBy !== focus.rep) return false;
      if (focus.on && localDay(l.capturedAt) !== focus.on) return false;
      if (focus.hour !== undefined && new Date(l.capturedAt).getHours() !== focus.hour) return false;
      return true;
    };

    const rows = leads.filter((l) => byFilter(l) && byFocus(l) && bySearch(l));

    return [...rows].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.capturedAt < b.capturedAt ? -1 : 1;
        case 'name':
          return (a.name || '~').localeCompare(b.name || '~');
        case 'value':
          return (b.dealValue ?? 0) - (a.dealValue ?? 0);
        default:
          return a.capturedAt < b.capturedAt ? 1 : -1;
      }
    });
  }, [leads, filter, focus, query, sort]);

  // Any change to what is being shown puts you back on page one. Landing on
  // page 4 of a list that now has two pages is a blank screen with no
  // explanation.
  useEffect(() => {
    setPage(0);
  }, [filter, focus, query, sort, pageSize, selectedIds]);

  const shown = useMemo(
    () => matched.slice(page * pageSize, page * pageSize + pageSize),
    [matched, page, pageSize]
  );

  const visible = useMemo(() => COLUMNS.filter((c) => columns.includes(c.key)), [columns]);

  const pageIds = shown.map((l) => l.id);
  const allPicked = pageIds.length > 0 && pageIds.every((id) => picked.has(id));
  const somePicked = pageIds.some((id) => picked.has(id));

  function toggleAll() {
    setPicked((current) => {
      const next = new Set(current);
      if (allPicked) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cell(key: ColumnKey, lead: StoredLead) {
    switch (key) {
      case 'person':
        // No Pressable of its own any more — the whole row opens the lead. The
        // name stays blue because that is how anyone reading this table already
        // knows the row leads somewhere.
        return (
          <View className="flex-row items-center gap-[10px]">
            <Avatar name={lead.name} size={32} tone="surface" />
            <View className="flex-1 min-w-0">
              <Typography className="text-[13.5px] font-semibold text-blue" numberOfLines={1}>
                {lead.name || 'Unnamed'}
              </Typography>
              {lead.designation ? (
                <Typography className="text-[11.5px] text-label mt-[1px]" numberOfLines={1}>
                  {lead.designation}
                </Typography>
              ) : null}
            </View>
          </View>
        );
      case 'company':
        return (
          <View className="min-w-0">
            <Typography className="text-[13px] font-medium text-navy" numberOfLines={1}>
              {lead.company || '-'}
            </Typography>
            {lead.companyWebsite ? (
              <Typography className="text-[11.5px] text-label mt-[1px]" numberOfLines={1}>
                {lead.companyWebsite.replace(/^https?:\/\//, '')}
              </Typography>
            ) : null}
          </View>
        );
      case 'contact':
        return lead.email || lead.phone ? (
          <View className="gap-[3px] min-w-0">
            <ContactLine icon={ICON.mail} value={lead.email} />
            <ContactLine icon={ICON.phone} value={lead.phone} />
          </View>
        ) : (
          <Typography className="text-[13px] text-placeholder">Nothing captured</Typography>
        );
      case 'captured':
        return (
          <View>
            <Typography className="text-[13px] text-ink-muted">{lead.time || '-'}</Typography>
            <Typography className="text-[11px] text-label mt-[1px]">
              {lead.source === 'card_scan' ? 'Card scan' : 'Typed in'}
              {lead.hasVoice ? ' · voice' : ''}
            </Typography>
          </View>
        );
      case 'temperature':
        return <TempChip value={lead.temperature} />;
      case 'status':
        return <StatusChip value={lead.status} />;
      case 'value':
        return (
          <Typography className="text-[13px] font-bold text-navy">
            {lead.dealValue != null ? `₹${lead.dealValue.toLocaleString('en-IN')}` : '-'}
          </Typography>
        );
      default:
        return null;
    }
  }

  return (
    <DashShell
      title="Leads"
      subtitle={`${counts.all.toLocaleString('en-IN')} captured`}
      scope={<EventMultiPicker />}
    >
      {/* The shape of the list before the list itself. Each figure selects its
          own slice rather than navigating — the rows are already on this page,
          so leaving it to come back to it would be theatre. */}
      <Hero>
        <View className="flex-row items-start gap-10">
          <View className="flex-1 min-w-0">
            <HeroTitle
              title={`${counts.all.toLocaleString('en-IN')} ${counts.all === 1 ? 'lead' : 'leads'}`}
              sub={
                focus.status || focus.rep || focus.hour !== undefined || focus.on
                  ? 'Narrowed by what you clicked. Clear it to see everything again.'
                  : 'Everything captured across the events you can see, newest first.'
              }
            />
          </View>
          <HeroMetrics>
            <HeroMetric
              label="Hot"
              value={String(counts.hot)}
              note="Worth a call today"
              onPress={() => setFilter('hot')}
            />
            <HeroMetric
              label="Follow-up due"
              value={String(counts.due)}
              note="Promised on or before today"
              onPress={() => setFilter('due')}
            />
            <HeroMetric
              label="Needs a note"
              value={String(counts.note)}
              note="Captured without context"
              onPress={() => setFilter('note')}
            />
          </HeroMetrics>
        </View>
      </Hero>

      {/* The toolbar sits outside the Panel on purpose: the Panel is
          `overflow-hidden` so its rounded corners clip the table, and a menu
          opened inside it would be clipped too. */}
      <View className="flex-row items-center gap-2 mt-6 mb-3" style={{ zIndex: 20 }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search name, company, phone or email"
          width={330}
        />

        <View className="flex-1" />

        <Menu label={SORTS.find((s) => s.key === sort)?.label ?? 'Sort'} icon={ICON.filter} width={190}>
          {(close) =>
            SORTS.map((s) => (
              <MenuItem
                key={s.key}
                label={s.label}
                active={s.key === sort}
                onPress={() => {
                  setSort(s.key);
                  close();
                }}
              />
            ))
          }
        </Menu>

        <Menu label={`${pageSize} per page`} width={160}>
          {(close) =>
            PAGE_SIZES.map((n) => (
              <MenuItem
                key={n}
                label={`${n} per page`}
                active={n === pageSize}
                onPress={() => {
                  setPageSize(n);
                  close();
                }}
              />
            ))
          }
        </Menu>

        <Menu label="Columns" icon={ICON.columns} width={200}>
          {() =>
            COLUMNS.map((c) => (
              <MenuToggle
                key={c.key}
                label={c.label}
                locked={c.locked}
                on={columns.includes(c.key)}
                onPress={() =>
                  setColumns((current) =>
                    current.includes(c.key) ? current.filter((k) => k !== c.key) : [...current, c.key]
                  )
                }
              />
            ))
          }
        </Menu>
      </View>

      <View className="flex-row flex-wrap gap-2 mb-3">
        <Pill label={`All ${counts.all}`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Pill label={`Hot ${counts.hot}`} dot="#C4392E" active={filter === 'hot'} onPress={() => setFilter('hot')} />
        <Pill label={`Warm ${counts.warm}`} dot="#F4B000" active={filter === 'warm'} onPress={() => setFilter('warm')} />
        <Pill label={`Cold ${counts.cold}`} dot="#97A3B8" active={filter === 'cold'} onPress={() => setFilter('cold')} />
        <Pill label={`Follow-up due ${counts.due}`} active={filter === 'due'} onPress={() => setFilter('due')} />
        <Pill label={`Needs note ${counts.note}`} active={filter === 'note'} onPress={() => setFilter('note')} />
        <Pill label={`Not synced ${counts.draft}`} active={filter === 'draft'} onPress={() => setFilter('draft')} />
        <Pill
          label={`Consent given ${counts.consent}`}
          active={filter === 'consent'}
          onPress={() => setFilter('consent')}
        />
      </View>

      {/*
        What a click on a chart elsewhere narrowed this list to.

        Always visible while it applies, and always removable. A list that is
        quietly showing three of sixty rows is the worst state this screen can
        be in, because every count and every export taken from it is wrong in a
        way nothing on the page admits to.
      */}
      {focusLabel ? (
        <View className="flex-row items-center gap-[10px] mb-3">
          <Typography className="text-[12.5px] text-slate">Showing</Typography>
          <Pressable
            onPress={() => setFocus({})}
            className="flex-row items-center gap-[8px] bg-section border border-navy rounded-full pl-[13px] pr-[10px] py-[6px]"
          >
            <Typography className="text-[12.5px] font-bold text-navy">{focusLabel}</Typography>
            <Icon d={ICON.close} size={11} color="#5A6B87" width={2.2} />
          </Pressable>
          <Typography className="text-[12.5px] text-slate">
            {matched.length} {matched.length === 1 ? 'lead' : 'leads'}
          </Typography>
        </View>
      ) : null}

      {/* Only ever on screen while something is selected, and it says what it
          will act on rather than how many boxes are ticked. */}
      {picked.size ? (
        <View className="flex-row items-center gap-3 bg-navy rounded-md px-[18px] py-[12px] mb-3">
          <Typography className="text-[13px] font-bold text-white">
            {picked.size} {picked.size === 1 ? 'lead' : 'leads'} selected
          </Typography>
          <View className="flex-1" />
          <Pressable onPress={() => setPicked(new Set())} className="px-[10px] py-[7px]">
            <Typography className="text-[12.5px] font-semibold text-white/70">Clear</Typography>
          </Pressable>
        </View>
      ) : null}

      <Panel className="overflow-hidden">
        {shown.length ? (
          <>
            <View className="flex-row items-center bg-section px-5 py-[11px] border-b border-hairline">
              <View className="w-[34px]">
                <Checkbox checked={allPicked} indeterminate={!allPicked && somePicked} onPress={toggleAll} />
              </View>
              {visible.map((c) => (
                <View key={c.key} style={{ flex: c.flex }} className="pr-3">
                  <Cap>{c.label}</Cap>
                </View>
              ))}
            </View>

            {/*
              The whole row opens the lead, not just the name.

              Only backgrounds move between the two states here. A conditional
              class list that gains its first shadow-, ring-, scale- or gradient
              utility after the first render makes NativeWind try to upgrade the
              component mid-life, and the app then throws a red screen about a
              missing navigation context that has nothing to do with navigation.
              Plain colours carry no variables and are safe.

              The checkbox is the one thing inside a row that has its own press,
              and it stops the click there — see below. The far end of the row is
              the deal value, which is text.
            */}
            {shown.map((lead, i) => (
              <Pressable
                key={lead.id}
                onPress={() => router.push(`/(dash)/leads/${lead.id}`)}
                className={`flex-row items-center px-5 py-[13px] ${
                  i === shown.length - 1 ? '' : 'border-b border-hairline'
                } ${picked.has(lead.id) ? 'bg-section' : 'bg-white'}`}
              >
                <View className="w-[34px]">
                  <Checkbox
                    checked={picked.has(lead.id)}
                    onPress={(e) => {
                      // Without this the row's own onPress fires too and
                      // ticking a box also opens the lead.
                      e.stopPropagation();
                      toggleOne(lead.id);
                    }}
                  />
                </View>
                {visible.map((c) => (
                  <View key={c.key} style={{ flex: c.flex }} className="pr-3">
                    {cell(c.key, lead)}
                  </View>
                ))}
              </Pressable>
            ))}

            <Pagination page={page} pageSize={pageSize} total={matched.length} onPage={setPage} />
          </>
        ) : (
          <Empty
            title={
              counts.all === 0
                ? 'No leads yet'
                : query.trim()
                  ? `Nothing matches “${query.trim()}”`
                  : `Nothing is ${FILTER_LABEL[filter].toLowerCase()}`
            }
            body={
              counts.all === 0
                ? 'Leads captured on the phone appear here the moment they sync.'
                : 'Clear the search or pick a different filter to see everything again.'
            }
          />
        )}
      </Panel>
    </DashShell>
  );
}
