import { useState } from 'react';
import { Linking, Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { CloseIcon, PlusIcon, UsersIcon, WhatsAppIcon } from '../../../../components/ui/icons';
import { useEventDraftStore, type DraftRep as Rep } from '../../../../stores/useEventDraftStore';

let nextId = 1;

export default function InviteRepsScreen() {
  const savedReps = useEventDraftStore((s) => s.invitedReps);
  const eventName = useEventDraftStore((s) => s.name);

  const [reps, setReps] = useState<Rep[]>(
    savedReps.length ? savedReps : [{ id: 'r0', name: '', phone: '' }]
  );

  const ready = reps.filter((r) => r.name.trim() && r.phone.trim());
  const readyCount = ready.length;

  const updateRep = (id: string, patch: Partial<Rep>) =>
    setReps((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRep = () => setReps((prev) => [...prev, { id: `r${nextId++}`, name: '', phone: '' }]);
  const removeRep = (id: string) => setReps((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  // Only the complete rows are recorded — a half-typed row is not an invite,
  // and the summary at the end must not count it as one.
  const commit = () => useEventDraftStore.getState().setInvitedReps(ready);

  const sendInvites = () => {
    commit();
    const message = eventName
      ? `You're invited to help capture leads on Yieldd for ${eventName}.`
      : `You're invited to help capture leads on Yieldd for our upcoming event.`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`).finally(() =>
      router.push('/(app)/events/new/fields')
    );
  };

  const skip = () => {
    commit();
    router.push('/(app)/events/new/fields');
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <WizardHeader title="Bring your team in" step={3} />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
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
          <Typography className="text-[12.5px] font-bold text-navy">{readyCount} invites ready to send</Typography>
        </View>
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 items-center gap-3">
        <Pressable
          onPress={sendInvites}
          className="w-full h-14 rounded-md items-center justify-center flex-row gap-[9px] bg-[#25D366] active:opacity-90"
        >
          <WhatsAppIcon size={16} color="#fff" />
          <Typography className="text-white font-bold text-base">Send invites via WhatsApp</Typography>
        </Pressable>
        <Pressable onPress={skip}>
          <Typography className="text-[13px] font-semibold text-slate">Skip for now</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
