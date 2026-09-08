import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { ConfirmDialog } from '../../components/dash/ConfirmDialog';
import { Cap, Empty, GhostButton, GoldButton, Panel, Row, Stat, StatusChip } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { TextInput } from '../../components/ui/TextInput';
import { useCreateInvites, usePendingInvites, useRevokeInvite, useSetMemberStatus, useTeam } from '../../hooks/useTeam';
import { useOrganization } from '../../hooks/useOrganization';
import { useSessionStore } from '../../stores/useSessionStore';
import { inviteMessage, type Invite } from '../../lib/api/invites';
import { whatsappUrl } from '../../lib/messageText';

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

  return (
    <View className="border border-hairline rounded-md p-4 bg-section">
      <Typography className="text-[13.5px] font-semibold text-navy">{invite.fullName ?? 'Invited'}</Typography>
      <Typography className="text-[12px] text-slate mt-[2px]">{invite.phone ?? invite.email ?? ''}</Typography>

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

  const seatsUsed = members?.filter((m) => m.status === 'active').length ?? 0;
  // `seats` is already included + purchased; no need to add them again here.
  const seatsTotal = org?.seats ?? null;
  const overSeats = seatsTotal != null && seatsUsed > seatsTotal;

  const ready = rows.filter((r) => r.name.trim() && r.phone.trim());

  async function send() {
    if (!ready.length || createInvites.isPending) return;
    setError(null);
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
      subtitle={seatsUsed ? `${seatsUsed} active` : undefined}
      actions={
        isAdmin ? (
          <GoldButton label={open ? 'Close' : 'Invite member'} onPress={() => setOpen((o) => !o)} />
        ) : undefined
      }
    >
      <View className="flex-row gap-4 mb-4">
        <Panel className="flex-1 px-[22px] py-[18px] flex-row items-center justify-between">
          <View>
            <Cap>Seats used</Cap>
            <Typography className="text-[26px] font-extrabold text-navy mt-[5px]">
              {seatsUsed}
              {seatsTotal != null ? <Typography className="text-[16px] text-label font-semibold"> of {seatsTotal}</Typography> : null}
            </Typography>
          </View>
          {seatsTotal != null ? (
            <View className="w-[160px]">
              <View className="h-[8px] bg-surface rounded-full overflow-hidden">
                <View
                  className="h-full bg-gold rounded-full"
                  style={{ width: `${Math.min(100, (seatsUsed / Math.max(seatsTotal, 1)) * 100)}%` }}
                />
              </View>
              <Typography className="text-[11.5px] text-label mt-[7px] text-right">
                {overSeats ? `${seatsUsed - seatsTotal} over` : `${seatsTotal - seatsUsed} free`}
              </Typography>
            </View>
          ) : null}
        </Panel>
        <Stat label="Pending invites" value={String(invites?.length ?? 0)} sub="Not signed in yet" />
        <Stat
          label="Deactivated"
          value={String(members?.filter((m) => m.status === 'deactivated').length ?? 0)}
          sub="Kept, but cannot capture"
        />
      </View>

      {overSeats ? (
        <Panel className="px-[22px] py-4 mb-4" >
          <Typography className="text-[13px] text-[#8A6100] leading-[1.55]">
            You are using more seats than the plan includes. Nothing is blocked — this is a note, not a
            limit — but it is worth sorting out at renewal.
          </Typography>
        </Panel>
      ) : null}

      {open && isAdmin ? (
        <Panel className="p-[22px] mb-4">
          <Typography className="text-[17px] font-bold text-navy">Invite people</Typography>
          <Typography className="text-[12.5px] text-slate mt-1 leading-[1.55]">
            They join as reps. Each gets a one-time link that expires in 14 days.
          </Typography>

          <View className="gap-3 mt-[18px]">
            {rows.map((r, i) => (
              <View key={i} className="flex-row gap-3 items-end">
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
            ))}
          </View>

          <View className="flex-row gap-3 mt-4">
            <GhostButton label="Add another" onPress={() => setRows((rs) => [...rs, { name: '', phone: '' }])} />
            <GoldButton
              label={createInvites.isPending ? 'Creating…' : `Create ${ready.length || ''} invite${ready.length === 1 ? '' : 's'}`.trim()}
              disabled={!ready.length || createInvites.isPending}
              onPress={send}
            />
          </View>

          {error ? (
            <Typography className="text-[12.5px] font-semibold text-[#C23B3B] mt-3">{error}</Typography>
          ) : null}

          {created.length ? (
            <View className="gap-3 mt-5 pt-5 border-t border-hairline">
              <Cap>Created — now send them</Cap>
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
                    <View className="w-[34px] h-[34px] rounded-full bg-navy items-center justify-center">
                      <Typography className="text-[12px] font-bold text-white">{m.initial}</Typography>
                    </View>
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
                  m.email || '—',
                  m.phone || '—',
                  <StatusChip value={m.badge} />,
                  <StatusChip value={m.status} />,
                  <Typography className="text-[14px] font-bold text-navy">
                    {/* Null for a rep looking at someone else, never 0. */}
                    {m.leadCount != null ? String(m.leadCount) : '—'}
                  </Typography>,
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
                inv.phone || '—',
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
