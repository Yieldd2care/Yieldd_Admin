import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { DashShell } from '../../components/dash/DashShell';
import { ConfirmDialog } from '../../components/dash/ConfirmDialog';
import { Cap, Empty, GhostButton, GoldButton, Panel, Row, Stat, StatusChip } from '../../components/dash/primitives';
import { Avatar, Icon, ICON, ProgressBar } from '../../components/dash/controls';
import { Typography } from '../../components/ui/Typography';
import { TextInput } from '../../components/ui/TextInput';
import { useCreateInvites, usePendingInvites, useRevokeInvite, useSetMemberStatus, useTeam } from '../../hooks/useTeam';
import { useOrganization } from '../../hooks/useOrganization';
import { useSessionStore } from '../../stores/useSessionStore';
import { inviteMessage, type Invite } from '../../lib/api/invites';
import { whatsappUrl } from '../../lib/messageText';
import { describePhoneProblem } from '../../lib/phone';

const COLS = [1.3, 1.3, 1, 0.55, 0.6, 0.45, 0.75];

type DraftRow = { name: string; phone: string };

/** Copies text without any native module — `Clipboard` is not reliable here. */
async function copy(text: string): Promise<boolean> {
  try {
    await globalThis.navigator?.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * One created invite, with the two ways to deliver it.
 *
 * The WhatsApp button is a real anchor rather than a programmatic open. The
 * phone's invite screen calls `Linking.openURL` *after* awaiting the insert,
 * which in a browser runs outside the click gesture and is silently blocked —
 * and because the promise still resolves, the phone marks it "Sent" anyway.
 * An anchor inside the click cannot be blocked, and nothing here claims a
 * message was sent that was not.
 */
function InviteResult({ invite, from }: { invite: Invite; from?: string }) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const message = inviteMessage(invite, { from });
  /*
    The number is warned about again here, on the created invite, because
    `whatsappUrl` below will happily build `wa.me/123` out of a dial code and
    say nothing. This row is the last thing between the admin and a message
    addressed to nobody.
  */
  const problem = invite.phone ? describePhoneProblem(invite.phone) : null;

  return (
    <View className="border border-hairline rounded-md p-4 bg-section">
      <Typography className="text-[13.5px] font-semibold text-navy">{invite.fullName ?? 'Invited'}</Typography>
      <Typography className="text-[12px] text-slate mt-[2px]">{invite.phone ?? invite.email ?? ''}</Typography>
      {problem ? (
        <Typography className="text-[12px] font-semibold text-[#8A6100] mt-[4px] leading-[1.45]">
          {problem} The link still works, so you can send it another way.
        </Typography>
      ) : null}

      <View className="bg-white border border-hairline rounded-sm px-3 py-2 mt-3">
        <Typography className="text-[11.5px] text-ink-muted" numberOfLines={1}>
          {invite.url}
        </Typography>
      </View>

      <View className="flex-row gap-2 mt-3">
        <a
          href={whatsappUrl(invite.phone, message)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none' }}
        >
          <View className="bg-gold rounded-sm px-4 py-[9px] shadow-[0_10px_26px_rgba(244,176,0,0.34)]">
            <Typography className="text-[12.5px] font-bold text-navy">Send on WhatsApp</Typography>
          </View>
        </a>
        <Pressable
          onPress={async () => setCopied((await copy(invite.url)) ? 'link' : null)}
          className="border border-hairline bg-white rounded-sm px-4 py-[9px]"
        >
          <Typography className="text-[12.5px] font-semibold text-navy">
            {copied === 'link' ? 'Link copied' : 'Copy link'}
          </Typography>
        </Pressable>
        <Pressable
          onPress={async () => setCopied((await copy(message)) ? 'message' : null)}
          className="border border-hairline bg-white rounded-sm px-4 py-[9px]"
        >
          <Typography className="text-[12.5px] font-semibold text-navy">
            {copied === 'message' ? 'Message copied' : 'Copy message'}
          </Typography>
        </Pressable>
      </View>

      <Typography className="text-[11.5px] text-label mt-[10px]">
        The link works once and expires in 14 days.
      </Typography>
    </View>
  );
}

export default function DashTeam() {
  const router = useRouter();
  /** Today in the browser’s own timezone — the day the person is standing in. */
  const todayKey = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const { data: members, isLoading } = useTeam();
  const { data: invites } = usePendingInvites();
  const { data: org } = useOrganization();
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const me = useSessionStore((s) => s.user);

  const createInvites = useCreateInvites();
  const setStatus = useSetMemberStatus();
  const revoke = useRevokeInvite();

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([{ name: '', phone: '' }]);
  const [created, setCreated] = useState<Invite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: 'deactivate' | 'restore'; id: string; name: string }
    | { kind: 'revoke'; id: string; name: string }
    | null
  >(null);

  /**
   * Seats in use, matching `seats_in_use()` in the database exactly.
   *
   * A pending invite holds a seat — that is what makes the limit land here,
   * on the admin, rather than on an invitee weeks later at signup. A
   * deactivated member holds none, which is what makes "deactivate someone to
   * free a seat" a true instruction.
   *
   * `usePendingInvites` already filters to pending; a rep cannot read invites
   * at all, so this is only ever a complete number for the admin who needs it.
   */
  const activeMembers = members?.filter((m) => m.status === 'active').length ?? 0;
  const pendingInvites = invites?.length ?? 0;
  const seatsUsed = activeMembers + pendingInvites;
  // `seats` is already included + purchased; no need to add them again here.
  const seatsTotal = org?.seats ?? null;
  const overSeats = seatsTotal != null && seatsUsed > seatsTotal;
  const seatsFree = seatsTotal != null ? Math.max(0, seatsTotal - seatsUsed) : null;

  // Still "both boxes have something in them". An odd-looking number is warned
  // about on its own row and created anyway (decision on PENDING 52): nothing
  // that sends today stops sending, so neither this count nor the Create button
  // knows about the warning.
  const ready = rows.filter((r) => r.name.trim() && r.phone.trim());
  // The database refuses this too (migration 20260910100000). Checking here as
  // well is not belt-and-braces for its own sake: it turns a round trip and a
  // raised exception into a sentence the admin can read before they type.
  const wouldExceed = seatsFree != null && ready.length > seatsFree;

  async function send() {
    if (!ready.length || createInvites.isPending) return;
    setError(null);
    if (wouldExceed) {
      setError(
        seatsFree === 0
          ? 'Every seat is taken. Deactivate a member, revoke a pending invite, or add seats before inviting anyone else.'
          : `Only ${seatsFree} ${seatsFree === 1 ? 'seat is' : 'seats are'} free, and you have ${ready.length} people ready. Remove ${ready.length - seatsFree} of them, or add seats.`
      );
      return;
    }
    try {
      const made = await createInvites.mutateAsync({ reps: ready.map((r) => ({ name: r.name, phone: r.phone })) });
      setCreated(made);
      setRows([{ name: '', phone: '' }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Those invites did not go through.');
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    try {
      if (confirm.kind === 'revoke') {
        await revoke.mutateAsync(confirm.id);
      } else {
        await setStatus.mutateAsync({
          id: confirm.id,
          status: confirm.kind === 'deactivate' ? 'deactivated' : 'active',
        });
      }
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't go through.");
      setConfirm(null);
    }
  }

  return (
    <DashShell
      title="Team"
      subtitle={activeMembers ? `${activeMembers} active` : undefined}
      actions={
        isAdmin ? (
          <GoldButton label={open ? 'Close' : 'Invite member'} onPress={() => setOpen((o) => !o)} />
        ) : undefined
      }
    >
      {/* Seats across the full width, above everything.
          Two reasons it is a banner rather than one tile in a row of three.
          It is the only figure on this screen with a ceiling, so it is the
          only one that can stop you doing something — and the sentence that
          says how many are left is also the sentence that offers the invite,
          which is the whole point of putting it here. */}
      {seatsTotal != null ? (
        <Panel className="px-[22px] py-[18px] mb-4 flex-row items-center gap-6">
          <View className="w-[42px] h-[42px] rounded-md bg-surface items-center justify-center shrink-0">
            <Icon d={ICON.user} size={19} color="#1D3F8A" />
          </View>

          <View className="flex-1 min-w-0">
            <Typography className="text-[15px] font-bold text-navy">
              {seatsUsed} of {seatsTotal} seats used
            </Typography>
            <Typography className="text-[12.5px] text-slate mt-[2px]">
              {overSeats
                ? `${seatsUsed - seatsTotal} over the plan, so nobody new can be invited`
                : seatsFree === 0
                  ? 'Every seat is taken. Free one up before inviting anyone else'
                  : `${seatsFree} ${seatsFree === 1 ? 'seat' : 'seats'} free`}
              {pendingInvites ? ` · ${activeMembers} joined, ${pendingInvites} invited` : ''}
            </Typography>
          </View>

          <View className="w-[220px] shrink-0">
            <ProgressBar
              pct={(seatsUsed / Math.max(seatsTotal, 1)) * 100}
              color={overSeats || seatsFree === 0 ? '#C4392E' : '#F4B000'}
            />
            <Typography className="text-[11.5px] text-label mt-[7px] text-right">
              {Math.round((seatsUsed / Math.max(seatsTotal, 1)) * 100)}%
            </Typography>
          </View>
        </Panel>
      ) : null}

      <View className="flex-row gap-4 mb-4">
        <Stat label="Active members" value={String(activeMembers)} sub="Signed in and capturing" />
        <Stat label="Pending invites" value={String(invites?.length ?? 0)} sub="Not signed in yet" />
        <Stat
          label="Deactivated"
          value={String(members?.filter((m) => m.status === 'deactivated').length ?? 0)}
          sub="Kept, but cannot capture"
        />
      </View>

      {/* Was a note saying "nothing is blocked". Since 20260910100000 it is a
          real limit, so the copy says what actually happens. */}
      {overSeats || seatsFree === 0 ? (
        <Panel className="px-[22px] py-4 mb-4">
          <Typography className="text-[13px] text-[#8A6100] leading-[1.55]">
            {overSeats
              ? 'You are using more seats than the plan includes. Everyone already here keeps working, and any invite already sent still works, but no new invite can go out until a seat is free.'
              : 'Every seat is in use. Deactivate a member, revoke a pending invite, or add seats before inviting anyone else.'}
          </Typography>
        </Panel>
      ) : null}

      {open && isAdmin ? (
        <Panel className="p-[22px] mb-4">
          <Typography className="text-[17px] font-bold text-navy">Invite people</Typography>
          <Typography className="text-[12.5px] text-slate mt-1 leading-[1.55]">
            They join as reps. Each gets a one-time link that expires in 14 days.
            {seatsFree != null
              ? seatsFree === 0
                ? ' You have no free seats, so nothing can be sent right now.'
                : ` You have ${seatsFree} free ${seatsFree === 1 ? 'seat' : 'seats'}, and an invite holds one until it is accepted or revoked.`
              : ''}
          </Typography>

          <View className="gap-3 mt-[18px]">
            {rows.map((r, i) => {
              // Answered on every keystroke, not on leaving the field: the
              // person is counting digits as they type and the reply belongs
              // there. An empty box is never warned about.
              const problem = describePhoneProblem(r.phone);
              return (
              <View key={i}>
                <View className="flex-row gap-3 items-end">
                  <View className="flex-1">
                    <TextInput
                      label={i === 0 ? 'Full name' : undefined}
                      placeholder="Aarti Kulkarni"
                      value={r.name}
                      onChangeText={(t) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, name: t } : x)))}
                    />
                  </View>
                  <View className="flex-1">
                    <TextInput
                      label={i === 0 ? 'Phone number' : undefined}
                      placeholder="+91 98204 41720"
                      value={r.phone}
                      keyboardType="phone-pad"
                      warn={problem !== null}
                      onChangeText={(t) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, phone: t } : x)))}
                    />
                  </View>
                  <Pressable
                    onPress={() => setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, j) => j !== i)))}
                    className="h-[52px] px-4 items-center justify-center border border-hairline rounded-md bg-white"
                  >
                    <Typography className="text-[13px] font-semibold text-slate">Remove</Typography>
                  </Pressable>
                </View>

                {/* On the row it belongs to, not a banner over the form: with
                    four rows up, a general warning names nobody. It never stops
                    the invite, it only says what looks wrong. */}
                {problem ? (
                  <Typography className="text-[12.5px] font-semibold text-[#8A6100] mt-2 leading-[1.5]">
                    {problem} You can still invite them.
                  </Typography>
                ) : null}
              </View>
              );
            })}
          </View>

          <View className="flex-row gap-3 mt-4">
            <GhostButton label="Add another" onPress={() => setRows((rs) => [...rs, { name: '', phone: '' }])} />
            <GoldButton
              label={createInvites.isPending ? 'Creating…' : `Create ${ready.length || ''} invite${ready.length === 1 ? '' : 's'}`.trim()}
              disabled={!ready.length || createInvites.isPending || wouldExceed}
              onPress={send}
            />
          </View>

          {/* The Create button is disabled while this is true, so the reason has
              to be on screen without a click — a dimmed button that explains
              nothing is the same dead end as a button that does nothing. */}
          {wouldExceed && seatsFree != null ? (
            <Typography className="text-[12.5px] font-semibold text-[#8A6100] mt-3 leading-[1.5]">
              {seatsFree === 0
                ? 'No free seats. Deactivate a member, revoke a pending invite, or add seats.'
                : `That is ${ready.length} people for ${seatsFree} free ${seatsFree === 1 ? 'seat' : 'seats'}. Remove ${ready.length - seatsFree}, or add seats.`}
            </Typography>
          ) : null}

          {error ? (
            <Typography className="text-[12.5px] font-semibold text-[#C23B3B] mt-3">{error}</Typography>
          ) : null}

          {created.length ? (
            <View className="gap-3 mt-5 pt-5 border-t border-hairline">
              <Cap>Created, now send them</Cap>
              {created.map((inv) => (
                <InviteResult key={inv.id} invite={inv} from={me?.name} />
              ))}
            </View>
          ) : null}
        </Panel>
      ) : null}

      <Panel className="overflow-hidden">
        {members?.length ? (
          <>
            <Row cols={COLS} header cells={['Member', 'Email', 'Phone', 'Role', 'Status', 'Leads', '']} />
            {members.map((m, i) => (
              <Row
                key={m.id}
                cols={COLS}
                last={i === members.length - 1}
                cells={[
                  <View className="flex-row items-center gap-[11px]">
                    <Avatar name={m.name} size={34} tone={m.status === 'deactivated' ? 'surface' : 'navy'} />
                    <View className="flex-1 min-w-0">
                      <Typography className="text-[13.5px] font-semibold text-navy" numberOfLines={1}>
                        {m.name}
                        {m.isSelf ? ' (you)' : ''}
                      </Typography>
                      {m.designation ? (
                        <Typography className="text-[11.5px] text-label" numberOfLines={1}>
                          {m.designation}
                        </Typography>
                      ) : null}
                    </View>
                  </View>,
                  m.email || '-',
                  m.phone || '-',
                  <StatusChip value={m.badge} />,
                  <StatusChip value={m.status} />,
                  /*
                    Opens what this person captured TODAY, not everything they
                    have ever captured. The number beside it is their running
                    total, so the two deliberately differ — the question being
                    answered by a click here is "what has she been doing at the
                    show", which is a today question.

                    Null for a rep looking at someone else, never 0 — and a
                    dash is not something to make pressable.
                  */
                  m.leadCount != null ? (
                    <Pressable
                      onPress={() =>
                        router.push(`/(dash)/leads?rep=${m.id}&on=${todayKey}`)
                      }
                    >
                      <Typography className="text-[14px] font-bold text-blue">{m.leadCount}</Typography>
                    </Pressable>
                  ) : (
                    <Typography className="text-[14px] font-bold text-navy">-</Typography>
                  ),
                  isAdmin && !m.isSelf ? (
                    <Pressable
                      onPress={() =>
                        setConfirm({
                          kind: m.status === 'deactivated' ? 'restore' : 'deactivate',
                          id: m.id,
                          name: m.name,
                        })
                      }
                      className="self-end px-3 py-[7px] rounded-sm border border-hairline bg-white"
                    >
                      <Typography className="text-[12.5px] font-semibold text-navy">
                        {m.status === 'deactivated' ? 'Restore' : 'Deactivate'}
                      </Typography>
                    </Pressable>
                  ) : (
                    <View />
                  ),
                ]}
              />
            ))}
          </>
        ) : (
          <Empty
            title={isLoading ? 'Loading team' : 'Just you so far'}
            body={isLoading ? 'One moment.' : 'Invite someone and they appear here once they sign in.'}
          />
        )}
      </Panel>

      {invites?.length ? (
        <Panel className="overflow-hidden mt-4">
          <View className="px-5 py-[18px] border-b border-hairline">
            <Typography className="text-[17px] font-bold text-navy">Waiting to join</Typography>
          </View>
          <Row cols={[1.3, 1.2, 1, 0.8]} header cells={['Name', 'Phone', 'Invited', '']} />
          {invites.map((inv, i) => (
            <Row
              key={inv.id}
              cols={[1.3, 1.2, 1, 0.8]}
              last={i === invites.length - 1}
              cells={[
                <Typography className="text-[13.5px] font-semibold text-navy">{inv.name}</Typography>,
                inv.phone || '-',
                inv.invitedLabel,
                <View className="flex-row gap-2 justify-end">
                  <Pressable
                    onPress={() => copy(inv.url)}
                    className="px-3 py-[7px] rounded-sm border border-hairline bg-white"
                  >
                    <Typography className="text-[12.5px] font-semibold text-navy">Copy link</Typography>
                  </Pressable>
                  {isAdmin ? (
                    <Pressable
                      onPress={() => setConfirm({ kind: 'revoke', id: inv.id, name: inv.name })}
                      className="px-3 py-[7px] rounded-sm border border-hairline bg-white"
                    >
                      <Typography className="text-[12.5px] font-semibold text-[#C23B3B]">Revoke</Typography>
                    </Pressable>
                  ) : null}
                </View>,
              ]}
            />
          ))}
        </Panel>
      ) : null}

      <ConfirmDialog
        visible={confirm !== null}
        destructive={confirm?.kind !== 'restore'}
        busy={setStatus.isPending || revoke.isPending}
        title={
          confirm?.kind === 'revoke'
            ? `Revoke ${confirm.name}'s invite?`
            : confirm?.kind === 'restore'
              ? `Restore ${confirm?.name}?`
              : `Deactivate ${confirm?.name}?`
        }
        body={
          confirm?.kind === 'revoke'
            ? 'Their link stops working. You can invite them again afterwards.'
            : confirm?.kind === 'restore'
              ? 'They can sign in and capture leads again. Their old leads are untouched.'
              : 'They keep their leads and their history, but cannot sign in or capture until restored.'
        }
        confirmLabel={confirm?.kind === 'revoke' ? 'Revoke' : confirm?.kind === 'restore' ? 'Restore' : 'Deactivate'}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </DashShell>
  );
}
