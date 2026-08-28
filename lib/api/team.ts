import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '../supabase';
import type { Enums, Tables } from '../db';
import { inviteUrl } from './invites';

type ProfileRow = Tables<'profiles'>;
type InviteRow = Tables<'invites'>;

export type MemberBadge = Enums<'user_role'>; // 'admin' | 'rep'
export type MemberStatus = Enums<'member_status'>; // 'invited' | 'active' | 'deactivated'

export type TeamMember = {
  id: string;
  initial: string;
  name: string;
  /** The line under the name: their designation, their lead count, or why they are inactive. */
  role: string;
  badge: MemberBadge;
  phone: string;
  email: string;
  status: MemberStatus;
  designation: string | null;
  isSelf: boolean;
  /** Leads they have captured. Only an admin can see anyone else's. */
  leadCount: number | null;
};

export type PendingInvite = {
  id: string;
  initial: string;
  name: string;
  phone: string;
  email: string | null;
  invitedLabel: string;
  url: string;
};

export function describeTeamError(error: PostgrestError): string {
  if (error.code === '42501') return 'Only an admin can change who is on the team.';
  if (error.message?.includes('Only an admin can change a role')) {
    return 'Only an admin can change a role.';
  }
  if (__DEV__) console.warn('[team]', error);
  return "That didn't save. Check your connection and try again.";
}

function initialOf(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?';
}

/** `2 days ago`, `just now` — how long an invite has been sitting there. */
export function relativeLabel(iso: string, prefix = 'Invited'): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return prefix;
  const minutes = Math.round((Date.now() - then) / 60000);

  if (minutes < 1) return `${prefix} just now`;
  if (minutes < 60) return `${prefix} ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${prefix} ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${prefix} ${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Everyone in the organisation.
 *
 * Lead counts are a second query rather than an embed, because
 * `leads_select_own_or_admin` means a rep can only see their own — so for a rep
 * the count is `null` (unknown) rather than `0`, which would read as "Arjun has
 * captured nothing" when it actually means "you are not allowed to know".
 */
export async function fetchTeam(currentUserId: string, isAdmin: boolean): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = data as ProfileRow[];

  let counts = new Map<string, number>();
  if (isAdmin) {
    const { data: leadRows } = await supabase.from('leads').select('captured_by');
    if (leadRows) {
      counts = leadRows.reduce((map, row) => {
        const id = (row as { captured_by: string }).captured_by;
        map.set(id, (map.get(id) ?? 0) + 1);
        return map;
      }, new Map<string, number>());
    }
  }

  return rows.map((row) => {
    const isSelf = row.id === currentUserId;
    const leadCount = isAdmin || isSelf ? (counts.get(row.id) ?? 0) : null;

    return {
      id: row.id,
      initial: initialOf(row.full_name),
      name: row.full_name,
      role: memberSubtitle(row, isSelf, leadCount),
      badge: row.role,
      phone: row.phone ?? '',
      email: row.email,
      status: row.status,
      designation: row.designation,
      isSelf,
      leadCount,
    };
  });
}

function memberSubtitle(row: ProfileRow, isSelf: boolean, leadCount: number | null): string {
  if (row.status === 'deactivated') return 'Deactivated · leads retained';
  if (isSelf) return 'You';
  if (leadCount != null) {
    return `${leadCount} lead${leadCount === 1 ? '' : 's'} captured`;
  }
  return row.designation ?? (row.role === 'admin' ? 'Admin' : 'Rep');
}

export async function fetchPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // A rep cannot read invites at all (`invites_admin_all`). That is not a
  // failure worth surfacing — they simply have no pending list.
  if (error) return [];

  return (data as InviteRow[]).map((row) => ({
    id: row.id,
    initial: initialOf(row.full_name ?? row.email ?? '?'),
    name: row.full_name ?? row.email ?? 'Invited rep',
    phone: row.phone ?? '',
    email: row.email,
    invitedLabel: relativeLabel(row.created_at),
    url: inviteUrl(row.token),
  }));
}

/**
 * Takes someone's access away without touching their leads.
 *
 * `current_organization_id()` and `is_admin()` both check `status = 'active'`,
 * so this closes every door at once — no policy rewrites, no missed table. The
 * leads they captured stay exactly where they are, which is the promise the
 * settings screen makes.
 */
export async function setMemberStatus(
  profileId: string,
  status: Extract<MemberStatus, 'active' | 'deactivated'>
): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status }).eq('id', profileId);
  if (error) throw new Error(describeTeamError(error));
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('invites').update({ status: 'revoked' }).eq('id', inviteId);
  if (error) throw new Error(describeTeamError(error));
}
