import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { DashShell } from '../../../components/dash/DashShell';
import { EventSwitcher } from '../../../components/dash/EventSwitcher';
import { Cap, Empty, GoldButton, Panel, Pill, StatusChip, TempChip } from '../../../components/dash/primitives';
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
import type { StoredLead } from '../../../stores/useLeadsStore';

type Filter = 'all' | 'hot' | 'warm' | 'cold' | 'due' | 'note' | 'draft';
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
};

function isFilter(value: string | undefined): value is Filter {
  return value != null && value in FILTER_LABEL;
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
  const params = useLocalSearchParams<{ filter?: string }>();

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

  // The array comes out of the store; every count and slice is derived here.
  // Deriving inside the selector would allocate a new array per call and
  // re-render without end.
  const leads = useLeadsStore((s) => s.leads);

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
      if (digits.length >= 3 && l.phone?.replace(/\D/g, '').includes(digits)) return true;
      return false;
    };

    const rows = leads.filter((l) => byFilter(l) && bySearch(l));

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
  }, [leads, filter, query, sort]);

  // Any change to what is being shown puts you back on page one. Landing on
  // page 4 of a list that now has two pages is a blank screen with no
  // explanation.
  useEffect(() => {
    setPage(0);
  }, [filter, query, sort, pageSize]);

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
        return (
          <Pressable
            onPress={() => router.push(`/(dash)/leads/${lead.id}`)}
            className="flex-row items-center gap-[10px]"
          >
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
          </Pressable>
        );
      case 'company':
        return (
          <View className="min-w-0">
            <Typography className="text-[13px] font-medium text-navy" numberOfLines={1}>
              {lead.company || '—'}
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
            <Typography className="text-[13px] text-ink-muted">{lead.time || '—'}</Typography>
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
            {lead.dealValue != null ? `₹${lead.dealValue.toLocaleString('en-IN')}` : '—'}
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
      scope={<EventSwitcher />}
      actions={<GoldButton label="Export" onPress={() => router.push('/(dash)/export')} />}
    >
      {/* The toolbar sits outside the Panel on purpose: the Panel is
          `overflow-hidden` so its rounded corners clip the table, and a menu
          opened inside it would be clipped too. */}
      <View className="flex-row items-center gap-2 mb-3" style={{ zIndex: 20 }}>
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
      </View>

      {/* Only ever on screen while something is selected, and it says what it
          will act on rather than how many boxes are ticked. */}
      {picked.size ? (
        <View className="flex-row items-center gap-3 bg-navy rounded-md px-[18px] py-[12px] mb-3">
          <Typography className="text-[13px] font-bold text-white">
            {picked.size} {picked.size === 1 ? 'lead' : 'leads'} selected
          </Typography>
          <View className="flex-1" />
          <Pressable
            onPress={() => router.push('/(dash)/export')}
            className="bg-white/[0.14] rounded-sm px-[14px] py-[7px]"
          >
            <Typography className="text-[12.5px] font-bold text-white">Export these</Typography>
          </Pressable>
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

            {shown.map((lead, i) => (
              <View
                key={lead.id}
                className={`flex-row items-center px-5 py-[13px] ${
                  i === shown.length - 1 ? '' : 'border-b border-hairline'
                } ${picked.has(lead.id) ? 'bg-section' : 'bg-white'}`}
              >
                <View className="w-[34px]">
                  <Checkbox checked={picked.has(lead.id)} onPress={() => toggleOne(lead.id)} />
                </View>
                {visible.map((c) => (
                  <View key={c.key} style={{ flex: c.flex }} className="pr-3">
                    {cell(c.key, lead)}
                  </View>
                ))}
              </View>
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
