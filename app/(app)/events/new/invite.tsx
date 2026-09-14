import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { useEvent } from '../../../../hooks/useEvents';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { CheckIcon, CloseIcon, ContactsIcon, PlusIcon, UsersIcon, WhatsAppIcon } from '../../../../components/ui/icons';
import { useEventDraftStore, type DraftRep as Rep } from '../../../../stores/useEventDraftStore';
import { useSessionStore } from '../../../../stores/useSessionStore';
import { KeyboardSafe } from '../../../../components/app/KeyboardSafe';
import { PhoneChoiceSheet } from '../../../../components/app/PhoneChoiceSheet';
import { pickContact, type PickedNumber } from '../../../../lib/contactPicker';
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
  /**
   * This screen is step 3 of the wizard AND the "+ Invite" button in Settings →
   * Team, and the difference has to be explicit.
   *
   * It used to read the event id straight out of the create-event draft. Inside
   * the wizard that is right. Opened from Settings it is not: the draft holds
   * whatever event a wizard was last opened on, so an invite sent from Settings
   * was attached to a stale event — or, once a wizard had been finished and the
   * draft cleared, silently to no event at all. `scope=team` says out loud that
   * this invite belongs to the organisation and not to any event.
   */
  const { scope, eventId: eventIdParam } = useLocalSearchParams<{
    scope?: string;
    eventId?: string;
  }>();
  const editingOne = Boolean(eventIdParam);
  // Both cases mean "not the wizard": invited from Settings for the
  // organisation, or invited onto one named event from that event's own screen.
  const standalone = scope === 'team' || editingOne;

  const savedReps = useEventDraftStore((s) => s.invitedReps);
  const draftEventName = useEventDraftStore((s) => s.name);
  const draftEventId = useEventDraftStore((s) => s.eventId);
  const { data: namedEvent } = useEvent(editingOne ? eventIdParam : undefined);

  const eventId = editingOne ? (eventIdParam as string) : scope === 'team' ? null : draftEventId;
  // Naming a stale event in the WhatsApp invite is worse than the generic
  // wording `inviteMessage` falls back to, so the name follows the same rule.
  const eventName = editingOne ? namedEvent?.name : scope === 'team' ? undefined : draftEventName;
  const user = useSessionStore((s) => s.user);

  const [reps, setReps] = useState<Rep[]>(
    savedReps.length ? savedReps : [{ id: 'r0', name: '', phone: '' }]
  );
  const [invites, setInvites] = useState<Invite[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Which row is choosing between a contact's several numbers, and what from. */
  const [chooser, setChooser] = useState<{
    repId: string;
    name: string;
    numbers: PickedNumber[];
  } | null>(null);
  /**
   * Which row is waiting on the picker.
   *
   * Without this a double-tap opens the picker twice, and on Android the
   * second call rejects with ContactPickingInProgressException — so the admin
   * would be shown a failure message for a picker that is about to work.
   */
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  /**
   * What the picker did to a row, kept per row and shown under it.
   *
   * Not a toast: "which number did it take?" has to be answerable ten seconds
   * later, while the admin is looking at four rows and deciding whether to send.
   */
  const [pickNote, setPickNote] = useState<Record<string, string>>({});

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
  const noteFor = (id: string, text: string | null) =>
    setPickNote((prev) => {
      if (text) return { ...prev, [id]: text };
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const removeRep = (id: string) => {
    setReps((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
    // Prune the note with the row, or a later row minted on the same id
    // inherits an explanation about somebody else.
    noteFor(id, null);
  };

  /**
   * Fill a row from the phone's own contacts.
   *
   * It FILLS the two fields rather than bypassing them: whatever comes across
   * lands in the same boxes a typed invite uses, so the admin can read it and
   * correct it before anything is created. The number goes in exactly as the
   * contact stores it, because that is what a typed number does too — the one
   * normalisation this flow has runs later, in createInvites.
   */
  const pickFor = async (repId: string) => {
    if (pickingFor) return;
    setPickingFor(repId);
    const outcome = await pickContact().finally(() => setPickingFor(null));

    if (!outcome.ok) {
      // Backing out of the picker leaves the row exactly as it was: no
      // setReps, no note, no error. Achieved by doing nothing at all.
      if (outcome.reason === 'cancelled') return;
      setError(outcome.message);
      return;
    }

    setError(null);
    const { name, numbers } = outcome;

    if (numbers.length === 0) {
      // The name is still worth having; a blank phone field the admin fills
      // in is honest, where a guessed number would not be.
      updateRep(repId, { name });
      noteFor(repId, `${name || 'That contact'} has no number saved — type it in.`);
      return;
    }

    if (numbers.length === 1) {
      updateRep(repId, { name, phone: numbers[0].number });
      noteFor(repId, `Took the ${numbers[0].label} number.`);
      return;
    }

    /**
     * Several numbers: write NOTHING yet, not even the name.
     *
     * Taking the first and letting it be changed would put a number the admin
     * never chose into the field, looking accepted. Writing nothing also makes
     * dismissing the sheet identical to cancelling the picker — the row is
     * untouched either way, because it was never touched.
     */
    setChooser({ repId, name, numbers });
  };

  const chooseNumber = (entry: PickedNumber) => {
    if (!chooser) return;
    updateRep(chooser.repId, { name: chooser.name, phone: entry.number });
    noteFor(chooser.repId, `${chooser.numbers.length} numbers saved — took the ${entry.label}.`);
    setChooser(null);
  };

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
      // Only the wizard's own draft gets written back. Invites raised from
      // Settings are not part of any event being created, and writing them here
      // would show them as already invited on the next event someone starts.
      if (!standalone) useEventDraftStore.getState().setInvitedReps([...savedReps, ...ready]);
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

  // Opened from Settings there is no step 4 to go to — pushing one would drop
  // someone who only wanted to invite a rep into the middle of a wizard.
  const goNext = () => (standalone ? router.back() : router.push('/(app)/events/new/fields'));

  const pendingToSend = invites.filter((i) => !sent[i.id]).length;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      {standalone ? (
        <ScreenHeader
          title={
            editingOne ? (namedEvent?.name ? `${namedEvent.name} — reps` : 'Invite reps') : 'Invite a rep'
          }
        />
      ) : (
        <WizardHeader title="Bring your team in" step={3} />
      )}
      <KeyboardSafe>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
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
            <View key={rep.id} className="mb-3">
              <View className="flex-row gap-[10px]">
                <RNTextInput
                  className="flex-[1.3] border border-hairline rounded-md h-[50px] px-[14px] text-[14px] font-regular text-navy bg-white"
                  placeholder="Full name"
                  placeholderTextColor="#97A3B8"
                  value={rep.name}
                  onChangeText={(v) => updateRep(rep.id, { name: v })}
                  autoCapitalize="words"
                />
                <View className="flex-1">
                  <RNTextInput
                    className="w-full border border-hairline rounded-md h-[50px] px-[14px] text-[14px] font-regular text-navy bg-white"
                    placeholder="Phone number"
                    placeholderTextColor="#97A3B8"
                    value={rep.phone}
                    onChangeText={(v) => {
                      updateRep(rep.id, { phone: v });
                      // Clear the note here and NOT inside updateRep, which the
                      // picker itself calls — doing it there would wipe the note
                      // in the same tick it was written.
                      noteFor(rep.id, null);
                    }}
                    keyboardType="phone-pad"
                  />
                </View>
                <Pressable
                  onPress={() => removeRep(rep.id)}
                  className="w-[50px] h-[50px] rounded-md bg-white border border-hairline items-center justify-center"
                >
                  <CloseIcon />
                </Pressable>
              </View>

              {/*
                A LABELLED BUTTON, not an icon tucked inside the phone field.

                It was a 15px grey ContactsIcon sitting at the right edge of the
                input. Reported 2026-09-14: nobody could tell it was a button,
                let alone that it opened the phone's contacts. Grey is this
                app's placeholder colour, so it read as decoration inside an
                empty field rather than as something to press.

                Moved out and given words. It costs a row about 34dp of height,
                which is why it was inside the field in the first place — but a
                control nobody presses saves no space at all, it just fails
                quietly. The bordered pill and the gold icon both say "tap me"
                the way the rest of this app does.
              */}
              {Platform.OS !== 'web' ? (
                <Pressable
                  onPress={() => pickFor(rep.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Choose this rep from your phone contacts"
                  className={`flex-row items-center gap-[7px] self-start mt-[7px] px-[11px] py-[7px] rounded-full border border-hairline bg-white active:opacity-70 ${
                    pickingFor === rep.id ? 'opacity-50' : ''
                  }`}
                >
                  <ContactsIcon size={14} color="#F4B000" />
                  <Typography className="text-[12.5px] font-bold text-navy">
                    {pickingFor === rep.id ? 'Opening contacts…' : 'Pick from my contacts'}
                  </Typography>
                </Pressable>
              ) : null}

              {pickNote[rep.id] ? (
                <Typography className="text-[11.5px] text-slate mt-[6px] ml-[2px]">
                  {pickNote[rep.id]}
                </Typography>
              ) : null}
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
            <Button label={standalone ? 'Done' : 'Continue'} onPress={goNext} className="w-full" />
          )}
          <Pressable onPress={goNext}>
            <Typography className="text-[13px] font-semibold text-slate">
              {standalone
                ? 'Done'
                : readyCount > 0
                  ? 'Skip for now'
                  : pendingToSend > 0
                    ? `Continue — ${pendingToSend} still to send`
                    : 'Skip for now'}
            </Typography>
          </Pressable>
        </View>
      </KeyboardSafe>

      {/*
        Dismissing this writes nothing, because nothing was written on the way
        in — so backing out here and backing out of the system picker leave the
        row in exactly the same state.
      */}
      <PhoneChoiceSheet
        visible={chooser !== null}
        name={chooser?.name ?? ''}
        numbers={chooser?.numbers ?? []}
        onSelect={chooseNumber}
        onClose={() => setChooser(null)}
      />
    </SafeAreaView>
  );
}
