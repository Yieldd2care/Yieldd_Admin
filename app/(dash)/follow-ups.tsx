import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { Empty, Panel, Pill, Row, SectionTitle, Stat, TempChip } from '../../components/dash/primitives';
import { Hero, HeroMetric, HeroMetrics, HeroTitle } from '../../components/dash/hero';
import { Icon, ICON } from '../../components/dash/controls';
import { Typography } from '../../components/ui/Typography';
import { useLeadsStore, type StoredLead } from '../../stores/useLeadsStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useLeadActions } from '../../hooks/useLeadActions';

const COLS = [1.25, 1.15, 1, 0.5, 1.5];

/** Days from today: negative is overdue. */
function daysOut(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso + 'T00:00:00').getTime() - today.getTime()) / 86_400_000);
}

function whenLabel(n: number) {
  if (n < -1) return { text: `Overdue by ${Math.abs(n)} days`, color: '#C4392E' };
  if (n === -1) return { text: 'Overdue by 1 day', color: '#C4392E' };
  if (n === 0) return { text: 'Due today', color: '#F4B000' };
  if (n === 1) return { text: 'Due tomorrow', color: '#5A6B87' };
  return { text: `Due in ${n} days`, color: '#5A6B87' };
}

async function copy(text: string) {
  try {
    await globalThis.navigator?.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * One row's actions.
 *
 * Built on `useLeadActions`, not on the phone's Follow-ups screen. That screen
 * has its own `waDigits()` which is a bare `replace(/\D/g,'')` with no country
 * code repair — a ten-digit Indian mobile becomes `wa.me/9820441720`, the wrong
 * chat — and it records no send at all, so every WhatsApp opened from it is
 * invisible in `message_sends`. The hook does both correctly.
 *
 * WhatsApp is a real anchor rather than a click handler: a programmatic
 * `window.open` is popup-blocked once anything is awaited before it, and the
 * blocked call still resolves, so the UI would claim a send that never left.
 */
function FollowUpRow({
  lead,
  onError,
  onDone,
}: {
  lead: StoredLead;
  onError: (title: string, message: string) => void;
  onDone: (lead: StoredLead) => void;
}) {
  const actions = useLeadActions(lead, { onError });
  const [copied, setCopied] = useState(false);
  const n = daysOut(lead.followUpDate as string);
  const w = whenLabel(n);

  return (
    <Row
      cols={COLS}
      cells={[
        <View>
          <Typography className="text-[13.5px] font-semibold text-navy" numberOfLines={1}>
            {lead.name || 'Unnamed'}
          </Typography>
          <Typography className="text-[11.5px] text-label" numberOfLines={1}>
            {lead.phone || 'No number'}
          </Typography>
        </View>,
        lead.company || '-',
        <View className="flex-row items-center gap-[7px]">
          <View className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: w.color }} />
          <Typography className="text-[13px] font-semibold" style={{ color: w.color }}>
            {w.text}
          </Typography>
        </View>,
        <TempChip value={lead.temperature} />,
        <View className="flex-row gap-2 justify-end">
          {actions.canWhatsApp ? (
            <a
              href={actions.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
              onClick={() => actions.noteWhatsAppOpened()}
            >
              <View className="bg-gold rounded-sm px-[14px] py-[7px] shadow-[0_10px_26px_rgba(244,176,0,0.34)]">
                <Typography className="text-[12.5px] font-bold text-navy">WhatsApp</Typography>
              </View>
            </a>
          ) : null}
          <Pressable
            onPress={async () => {
              if (await copy(actions.whatsappText)) {
                setCopied(true);
                globalThis.setTimeout(() => setCopied(false), 2000);
              }
            }}
            className="border border-hairline bg-white rounded-sm px-[14px] py-[7px]"
          >
            <Typography className="text-[12.5px] font-semibold text-navy">
              {copied ? 'Copied' : 'Copy'}
            </Typography>
          </Pressable>
          <Pressable
            onPress={() => onDone(lead)}
            className="border border-hairline bg-white rounded-sm px-[14px] py-[7px]"
          >
            <Typography className="text-[12.5px] font-semibold text-slate">Done</Typography>
          </Pressable>
        </View>,
      ]}
    />
  );
}

type Filter = 'all' | 'overdue' | 'today';

export default function DashFollowUps() {
  const leads = useLeadsStore((s) => s.leads);
  const userId = useSessionStore((s) => s.user?.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);

  const due = useMemo(
    () =>
      leads
        .filter((l) => Boolean(l.followUpDate))
        .map((l) => ({ lead: l, n: daysOut(l.followUpDate as string) }))
        .sort((a, b) => a.n - b.n),
    [leads]
  );

  const overdue = useMemo(() => due.filter((d) => d.n < 0), [due]);
  const today = useMemo(() => due.filter((d) => d.n === 0), [due]);
  const shown = filter === 'overdue' ? overdue : filter === 'today' ? today : due;

  /**
   * Clearing the date is what marks it done. `editLead` only touches local
   * state — without `syncDrafts` the change never reaches the server. The
   * plumbing has always handled an explicit null; it simply had no button.
   */
  function markDone(lead: StoredLead) {
    useLeadsStore.getState().editLead(lead.id, { followUpDate: null });
    void useLeadsStore.getState().syncDrafts(userId);
  }

  return (
    <DashShell title="Follow-ups" subtitle={due.length ? `${due.length} scheduled` : undefined}>
      {/* The day's workload, before the list of it. Each number selects its own
          slice rather than navigating away — the rows are already on this page. */}
      <Hero>
        <View className="flex-row items-start gap-10">
          <View className="flex-1 min-w-0">
            <HeroTitle
              title={
                overdue.length
                  ? `${overdue.length} ${overdue.length === 1 ? 'promise is' : 'promises are'} late`
                  : due.length
                    ? 'Nothing is late'
                    : 'Nothing to chase'
              }
              sub={
                due.length
                  ? 'A follow-up is a promise with a date on it. Oldest first, because the oldest is the one going cold.'
                  : 'Set a follow-up date on a lead and it appears here.'
              }
            />
          </View>
          <HeroMetrics>
            <HeroMetric
              label="Overdue"
              value={String(overdue.length)}
              valueClassName={overdue.length ? 'text-[#FF8A80]' : 'text-white'}
              note={overdue.length ? 'Chase these first' : 'Nothing late'}
              onPress={() => setFilter('overdue')}
            />
            <HeroMetric
              label="Due today"
              value={String(today.length)}
              note="Before the day ends"
              onPress={() => setFilter('today')}
            />
            <HeroMetric
              label="Scheduled"
              value={String(due.length)}
              note="Across all events"
              onPress={() => setFilter('all')}
            />
          </HeroMetrics>
        </View>
      </Hero>

      <View className="flex-row gap-2 mt-6 mb-4">
        <Pill label={`All ${due.length}`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Pill
          label={`Overdue ${overdue.length}`}
          dot="#C4392E"
          active={filter === 'overdue'}
          onPress={() => setFilter('overdue')}
        />
        <Pill
          label={`Today ${today.length}`}
          dot="#F4B000"
          active={filter === 'today'}
          onPress={() => setFilter('today')}
        />
      </View>

      {error ? (
        <Panel className="px-5 py-4 mb-4">
          <Typography className="text-[13px] font-semibold text-[#C23B3B]">{error}</Typography>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden">
        <View className="px-6 py-[18px]">
          <SectionTitle
            title={filter === 'overdue' ? 'Overdue' : filter === 'today' ? 'Due today' : 'Everything scheduled'}
            right={
              <Typography className="text-[12px] text-slate font-medium">
                {shown.length} {shown.length === 1 ? 'lead' : 'leads'}
              </Typography>
            }
          />
        </View>
        {shown.length ? (
          <>
            <Row cols={COLS} header cells={['Lead', 'Company', 'When', 'Temp', '']} />
            {shown.map(({ lead }) => (
              <FollowUpRow
                key={lead.id}
                lead={lead}
                onError={(title, message) => setError(`${title}: ${message}`)}
                onDone={markDone}
              />
            ))}
          </>
        ) : (
          <Empty
            title={due.length ? 'Nothing in that filter' : 'Nothing to chase'}
            body={
              due.length
                ? 'Clear the filter to see everything scheduled.'
                : 'Set a follow-up date on a lead and it appears here, oldest first.'
            }
          />
        )}
      </Panel>

      <Panel className="px-6 py-[18px] mt-6 flex-row items-center gap-3">
        <Icon d={ICON.info} size={18} color="#5A6B87" />
        <Typography className="flex-1 text-[12.5px] text-slate leading-[1.6]">
          WhatsApp opens a chat with the message already written; you press send there. That is recorded
          as handed over, never as delivered. Nothing here can know whether it was read.
        </Typography>
      </Panel>
    </DashShell>
  );
}
