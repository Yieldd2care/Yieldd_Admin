import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { CheckIcon, CloseIcon, PlusIcon, UsersIcon, WhatsAppIcon } from '../../../../components/ui/icons';
import { useEventDraftStore, type DraftRep as Rep } from '../../../../stores/useEventDraftStore';
import { useSessionStore } from '../../../../stores/useSessionStore';
import {
  createInvites,
  fetchEventInvites,
  inviteMessage,
  type Invite,
} from '../../../../lib/api/invites';

let nextId = 1;

/** wa.me wants bare digits — no plus, no spaces. */
function waDigits(phone: string | null): string {
  return (phone ?? '').replace(/\D/g, '');
}

export default function InviteRepsScreen() {
  const savedReps = useEventDraftStore((s) => s.invitedReps);
  const eventName = useEventDraftStore((s) => s.name);
  const eventId = useEventDraftStore((s) => s.eventId);
  const user = useSessionStore((s) => s.user);

  const [reps, setReps] = useState<Rep[]>(
    savedReps.length ? savedReps : [{ id: 'r0', name: '', phone: '' }]
  );
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invites already created for this event — coming back to the step must not
  // issue a second link to the same person.
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetchEventInvites(eventId)
      .then((rows) => {
        if (!cancelled) setInvites(rows.filter((i) => i.status === 'pending'));
      })
      .catch(() => {
        /* Showing nothing is the right failure here — the form below still works. */
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const ready = reps.filter((r) => r.name.trim() && r.phone.trim());
  const readyCount = ready.length;

  const updateRep = (id: string, patch: Partial<Rep>) =>
    setReps((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRep = () => setReps((prev) => [...prev, { id: `r${nextId++}`, name: '', phone: '' }]);
  const removeRep = (id: string) => setReps((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  /**
   * Every rep gets their own link.
   *
   * The old screen opened one WhatsApp message with no link in it at all, which
   * could not work: the token is what puts the new account into this
   * organisation as a rep, and a token is per person. One shared link would be
   * redeemed once and lock everyone else out.
   */
  const createAndKeep = async () => {
    if (!user || isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const fresh = await createInvites({
        organizationId: user.organizationId,
        invitedBy: user.id,
        eventId,
        reps: ready.map((r) => ({ name: r.name, phone: r.phone })),
      });
      setInvites((prev) => [...prev, ...fresh]);
      setReps([{ id: `r${nextId++}`, name: '', phone: '' }]);
      useEventDraftStore.getState().setInvitedReps([...savedReps, ...ready]);
      return fresh;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Those invites didn't send.");
      return undefined;
    } finally {
      setIsSaving(false);
    }
  };

  const sendOne = (invite: Invite) => {
    const message = inviteMessage(invite, { eventName, from: user?.name });
    const digits = waDigits(invite.phone);
    const url = digits
      ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    setSent((prev) => ({ ...prev, [invite.id]: true }));
    Linking.openURL(url).catch(() => setError('WhatsApp could not be opened on this device.'));
  };

  const createAndSend = async () => {
    const fresh = await createAndKeep();
    if (fresh?.length) sendOne(fresh[0]);
  };

  const goNext = () => router.push('/(app)/events/new/fields');

  const pendingToSend = invites.filter((i) => !sent[i.id]).length;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <WizardHeader title="Bring your team in" step={3} />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
        {invites.length ? (
          <View className="mb-5">
            <Typography variant="caption" className="text-slate mb-[10px]">
              Invited &mdash; each link is personal, so send them one by one
            </Typography>
            {invites.map((invite) => (
              <View
                key={invite.id}
                className="flex-row items-center gap-3 bg-white border border-hairline rounded-md px-4 py-3 mb-[10px]"
              >
                <View className="flex-1">
                  <Typography className="text-[14px] font-bold text-navy">
                    {invite.fullName ?? 'Invited rep'}
                  </Typography>
                  <Typography className="text-[12px] text-slate mt-[1px]">{invite.phone}</Typography>
                </View>
                <Pressable
                  onPress={() => sendOne(invite)}
                  className={`flex-row items-center gap-[6px] rounded-full px-[13px] py-[7px] ${
                    sent[invite.id] ? 'bg-surface' : 'bg-[#25D366]'
                  }`}
                >
                  {sent[invite.id] ? (
                    <CheckIcon size={12} color="#0B132B" />
                  ) : (
                    <WhatsAppIcon size={13} color="#fff" />
                  )}
                  <Typography
                    className={`text-[12px] font-bold ${sent[invite.id] ? 'text-navy' : 'text-white'}`}
                  >
                    {sent[invite.id] ? 'Sent' : 'Send'}
                  </Typography>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {reps.map((rep) => (
          <View key={rep.id} className="flex-row gap-[10px] mb-3">
            <RNTextInput
              className="flex-[1.3] border border-hairline rounded-md h-[50px] px-[14px] text-[14px] font-regular text-navy bg-white"
              placeholder="Full name"
              placeholderTextColor="#97A3B8"
              value={rep.name}
              onChangeText={(v) => updateRep(rep.id, { name: v })}
              autoCapitalize="words"
            />
            <RNTextInput
              className="flex-1 border border-hairline rounded-md h-[50px] px-[14px] text-[14px] font-regular text-navy bg-white"
              placeholder="Phone number"
              placeholderTextColor="#97A3B8"
              value={rep.phone}
              onChangeText={(v) => updateRep(rep.id, { phone: v })}
              keyboardType="phone-pad"
            />
            <Pressable
              onPress={() => removeRep(rep.id)}
              className="w-[50px] h-[50px] rounded-md bg-white border border-hairline items-center justify-center"
            >
              <CloseIcon />
            </Pressable>
          </View>
        ))}

        <Pressable onPress={addRep} className="flex-row items-center gap-2 py-3">
          <PlusIcon />
          <Typography className="text-[13.5px] font-bold text-gold">Add another</Typography>
        </Pressable>

        <View className="flex-row items-center gap-[6px] bg-surface rounded-full px-[14px] py-2 self-start mt-2">
          <UsersIcon size={13} />
          <Typography className="text-[12.5px] font-bold text-navy">
            {readyCount} invite{readyCount === 1 ? '' : 's'} ready to send
          </Typography>
        </View>

        {error ? (
          <Typography className="mt-4 text-[13px] font-semibold text-[#C23B3B] leading-[1.45]">
            {error}
          </Typography>
        ) : null}
      </ScrollView>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 items-center gap-3">
        {readyCount > 0 ? (
          <Pressable
            onPress={createAndSend}
            disabled={isSaving}
            className={`w-full h-14 rounded-md items-center justify-center flex-row gap-[9px] bg-[#25D366] active:opacity-90 ${
              isSaving ? 'opacity-60' : ''
            }`}
          >
            <WhatsAppIcon size={16} color="#fff" />
            <Typography className="text-white font-bold text-base">
              {isSaving ? 'Creating invites…' : 'Send invites via WhatsApp'}
            </Typography>
          </Pressable>
        ) : (
          <Button label="Continue" onPress={goNext} className="w-full" />
        )}
        <Pressable onPress={goNext}>
          <Typography className="text-[13px] font-semibold text-slate">
            {readyCount > 0
              ? 'Skip for now'
              : pendingToSend > 0
                ? `Continue — ${pendingToSend} still to send`
                : 'Skip for now'}
          </Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
