import { useMemo, type ReactNode } from 'react';
import { View } from 'react-native';
import type { Href } from 'expo-router';

import {
  AlertCircleIcon,
  CalendarIcon,
  ClockIcon,
  EditIcon,
  RefreshIcon,
  UsersIcon,
} from '../components/ui/icons';
import { useLeadsStore } from '../stores/useLeadsStore';
import { useSessionStore } from '../stores/useSessionStore';
import { useEvents } from './useEvents';
import { usePendingInvites } from './useTeam';
import { eventDayPosition, parseEventDate } from '../lib/dates';

/**
 * What needs the signed-in person's attention right now — derived, not stored.
 *
 * WHY THERE IS NO READ/UNREAD ANYWHERE IN THIS:
 * there is no notifications table and no push infrastructure, so there is no
 * such thing here as an event that happened and was seen. What there IS is a
 * set of live conditions — a follow-up is overdue or it is not; a lead is
 * unsynced or it is not. Those cannot be "read", only resolved. Modelling them
 * as a message log would mean inventing state to keep, and the honest version
 * is more useful anyway: everything here is something to do, and it disappears
 * when it is done.
 *
 * It lives in a hook rather than in the screen because the bell on Home shows a
 * dot when this is non-empty. Two copies of the rule would eventually disagree,
 * and a dot that lights for something the screen does not list is exactly the
 * bug this replaced — the old dot had no condition on it at all and was lit
 * permanently.
 *
 * Everything is computed from data already loaded for other screens, so it
 * costs no extra requests and can never contradict the screen it links to.
 */
export type Attention = {
  id: string;
  icon: ReactNode;
  iconBg: string;
  title: string;
  description: string;
  /** Lower sorts first. Overdue work outranks upcoming work. */
  weight: number;
  urgent?: boolean;
  href: Href;
};

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function useAttention(): Attention[] {
  const leads = useLeadsStore((s) => s.leads);
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const { data: events } = useEvents();
  const { data: invites } = usePendingInvites();

  // Derived in a useMemo, never inside a zustand selector — a selector that
  // builds a new array re-renders forever.
  return useMemo<Attention[]>(() => {
    const out: Attention[] = [];
    const today = startOfToday();
    const open = (l: { status: string }) => l.status !== 'Won' && l.status !== 'Lost';

    // ---- follow-ups ----
    const overdue = leads.filter(
      (l) => l.followUpDate && new Date(l.followUpDate).getTime() < today && open(l)
    );
    const dueToday = leads.filter(
      (l) => l.followUpDate && new Date(l.followUpDate).getTime() === today && open(l)
    );

    if (overdue.length) {
      out.push({
        id: 'overdue',
        icon: <AlertCircleIcon size={17} color="#8A6100" strokeWidth={2} />,
        iconBg: 'bg-gold/[0.16]',
        title: `${plural(overdue.length, 'follow-up is', 'follow-ups are')} overdue`,
        description: 'The longer these sit, the colder they get.',
        weight: 0,
        urgent: true,
        href: '/(app)/follow-ups',
      });
    }
    if (dueToday.length) {
      out.push({
        id: 'due-today',
        icon: <ClockIcon size={17} color="#0B132B" strokeWidth={1.75} />,
        iconBg: 'bg-surface',
        title: `${plural(dueToday.length, 'follow-up', 'follow-ups')} due today`,
        description: 'Due today rather than overdue — still warm.',
        weight: 1,
        href: '/(app)/follow-ups',
      });
    }

    // ---- anything still only on this phone ----
    const unsynced = leads.filter((l) => l.syncStatus === 'draft' || l.pendingPatch);
    if (unsynced.length) {
      out.push({
        id: 'unsynced',
        icon: <RefreshIcon size={16} color="#0B132B" strokeWidth={1.75} />,
        iconBg: 'bg-surface',
        title: `${plural(unsynced.length, 'lead is', 'leads are')} waiting to sync`,
        // Never implies loss. A queued capture is safe on the device, and a rep
        // who thinks a lead evaporated stops trusting the app mid-show.
        description: 'Saved on this phone. They will go up when the signal returns.',
        weight: 2,
        href: '/(app)/leads/drafts',
      });
    }

    // ---- today's captures with nothing written on them ----
    const needsNote = leads.filter(
      (l) => new Date(l.capturedAt).getTime() >= today && !l.reviewedAt
    );
    if (needsNote.length) {
      out.push({
        id: 'review',
        icon: <EditIcon size={15} color="#0B132B" strokeWidth={1.75} />,
        iconBg: 'bg-surface',
        title: `${plural(needsNote.length, 'lead', 'leads')} from today need a note`,
        description: 'Four seconds at the stall is not enough to record why it mattered.',
        weight: 3,
        href: '/(app)/leads/review',
      });
    }

    // ---- events running now, or about to ----
    for (const event of events ?? []) {
      if (event.status === 'closed') continue;
      const position = eventDayPosition(event.startDate, event.endDate);
      if (position?.isCurrent) {
        out.push({
          id: `live-${event.id}`,
          icon: <CalendarIcon size={17} color="#1D3F8A" strokeWidth={1.75} />,
          iconBg: 'bg-blue/[0.12]',
          title: `${event.name} is on — day ${position.dayNumber} of ${position.totalDays}`,
          description: 'Live figures and the leaderboard are on the dashboard.',
          weight: 1,
          href: { pathname: '/(app)/events/[id]/dashboard', params: { id: event.id } },
        });
        continue;
      }
      const start = parseEventDate(event.startDate);
      if (!start) continue;
      const days = Math.round((start.getTime() - today) / 86_400_000);
      if (days > 0 && days <= 14) {
        out.push({
          id: `soon-${event.id}`,
          icon: <CalendarIcon size={17} color="#1D3F8A" strokeWidth={1.75} />,
          iconBg: 'bg-blue/[0.12]',
          title: `${event.name} starts in ${plural(days, 'day', 'days')}`,
          description:
            days <= 3
              ? 'Check the team, the custom fields and the follow-up templates before the doors open.'
              : 'Time to add the reps and set up what you capture.',
          weight: days <= 3 ? 2 : 5,
          href: { pathname: '/(app)/events/[id]/dashboard', params: { id: event.id } },
        });
      }
    }

    // ---- invites nobody has accepted ----
    // Admin-only because `invites_admin_all` means a rep can never read these —
    // the hook returns nothing for them, rather than this being hidden by choice.
    if (isAdmin && invites?.length) {
      out.push({
        id: 'invites',
        icon: <UsersIcon size={16} color="#0B132B" strokeWidth={1.75} />,
        iconBg: 'bg-surface',
        title: `${plural(invites.length, 'invite has', 'invites have')} not been accepted`,
        description: 'They cannot capture anything until they join.',
        weight: 4,
        href: '/(app)/settings/team',
      });
    }

    return out.sort((a, b) => a.weight - b.weight);
  }, [leads, events, invites, isAdmin]);
}

/**
 * The dot on the Home bell. Shown only when there is genuinely something —
 * it used to be hard-coded on, so it said "you have notifications" forever.
 */
export function AttentionDot() {
  const items = useAttention();
  if (!items.length) return null;
  return (
    <View className="absolute top-[6px] right-[6px] w-[7px] h-[7px] rounded-full bg-gold border-[1.5px] border-white" />
  );
}
