import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '../supabase';
import type { Enums, Tables } from '../db';
import { formatRelative } from '../dates';
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
  /**
   * Distinct people who opened their card link. Only an admin can see anyone
   * else's.
   *
   * Not QR scans — the QR carries a vCard, which the scanning phone decodes on
   * its own without ever reaching us. Someone who only hands out the QR at a
   * stand shows zero here, and that is correct rather than broken.
   */
  viewerCount: number | null;
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

/**
 * `Invited 2 days ago`, `Invited just now` — how long an invite has been sitting
 * there. The relative part is `formatRelative` in lib/dates.ts, so a component
 * can render "2 days ago" without importing the supabase client through here.
 */
export function relativeLabel(iso: string, prefix = 'Invited'): string {
  const relative = formatRelative(iso);
  return relative ? `${prefix} ${relative}` : prefix;
}

type CountsRow = {
  profile_id: string;
  lead_count: number | null;
  viewer_count: number | null;
};

/**
 * Everyone in the organisation.
 *
 * Both counts come from `team_counts()` rather than being worked out here. The
 * lead count used to be: select `captured_by` for every lead in the
 * organisation and reduce it in JavaScript — which PostgREST silently truncates
 * at 1000 rows, so the number was quietly a fraction of the truth on any busy
 * organisation. Counting in SQL is the only way a total can be trusted when RLS
 * decides what the client is allowed to see.
 *
 * The RPC returns a row per member and nulls the columns the caller may not
 * read, so `null` still means "you are not allowed to know" rather than "they
 * have captured nothing" — which is what the dash on the Team table draws.
 */
export async function fetchTeam(currentUserId: string, _isAdmin: boolean): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  const rows = data as ProfileRow[];

  const { data: countRows, error: countsError } = await supabase.rpc('team_counts');
  if (countsError) throw countsError;

  const counts = new Map<string, CountsRow>();
  for (const row of (countRows ?? []) as CountsRow[]) {
    counts.set(row.profile_id, row);
  }

  return rows.map((row) => {
    const isSelf = row.id === currentUserId;
    const seen = counts.get(row.id);
    const leadCount = seen?.lead_count ?? null;
    const viewerCount = seen?.viewer_count ?? null;

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
      viewerCount,
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
