import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { TextInput } from '../../../components/ui/TextInput';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { AlertCircleIcon } from '../../../components/ui/icons';
import {
  deleteAccount,
  previewAccountDeletion,
  type DeletionPreview,
} from '../../../lib/api/deleteAccount';

/**
 * Deleting your account.
 *
 * The screen's whole job is to make sure nobody is surprised. What goes is not
 * the same for everyone — a rep hands their leads to an admin, the last admin
 * takes the entire organisation with them — so the numbers are fetched from
 * the server and spelled out before the button will do anything.
 *
 * Typing DELETE is not decoration. Both stores require this to be reachable in
 * the app, which means it sits two taps from a screen people open to change
 * their name, and it cannot go off on a mis-tap.
 */
export default function DeleteAccountScreen() {
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewAccountDeletion().then((result) => {
      if (cancelled) return;
      if (result.ok) setPreview(result.preview);
      else setLoadError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const armed = confirm.trim().toUpperCase() === 'DELETE' && !isDeleting && Boolean(preview);

  const onDelete = () => {
    if (!armed || !preview) return;

    const scope =
      preview.mode === 'org'
        ? `This deletes ${preview.organizationName ?? 'your organisation'} entirely — every event, every lead, and ${preview.membersDeleted} other team ${preview.membersDeleted === 1 ? 'account' : 'accounts'}.`
        : 'This deletes your account. Your leads stay with your organisation.';

    Alert.alert('Delete account?', `${scope}\n\nThis cannot be undone.`, [
      { text: 'Keep my account', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          const result = await deleteAccount(confirm);
          setIsDeleting(false);

          if (!result.ok) {
            Alert.alert("Couldn't delete", result.message);
            return;
          }

          // Said plainly rather than buried, because someone who just asked to
          // be erased deserves to know a file was left behind.
          const trailing = result.storageFailures?.length
            ? '\n\nSome uploaded files could not be removed automatically. Email care@yieldd.co and we will finish it.'
            : '';

          Alert.alert('Account deleted', `Your account is gone.${trailing}`, [
            { text: 'OK', onPress: () => router.replace('/(auth)') },
          ]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Delete account" />

      <ScrollView contentContainerClassName="px-5 pt-6 pb-10" showsVerticalScrollIndicator={false}>
        {loadError ? (
          <View className="bg-white border border-hairline rounded-2xl px-4 py-5">
            <Typography className="text-[13.5px] text-slate">{loadError}</Typography>
          </View>
        ) : !preview ? (
          <View className="items-center py-16">
            <ActivityIndicator />
            <Typography className="text-[13px] text-slate mt-3">
              Checking what this would delete…
            </Typography>
          </View>
        ) : (
          <>
            <View className="flex-row gap-3 bg-[#FDECEC] border border-[#F0C4C4] rounded-2xl px-4 py-4">
              <AlertCircleIcon size={17} color="#C23B3B" />
              <Typography className="flex-1 text-[13.5px] leading-[1.55] text-[#8E2B2B] font-semibold">
                {preview.mode === 'org'
                  ? 'You are the only admin, so deleting your account deletes the whole organisation.'
                  : 'Your leads will stay with your organisation and move to an admin.'}
              </Typography>
            </View>

            <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-6 mb-[10px]" style={{ textTransform: 'uppercase' }}>
              What goes
            </Typography>

            <View className="bg-white border border-hairline rounded-2xl px-4 py-1">
              <DeleteRow label="Your login and profile" value="Deleted" />
              {preview.mode === 'org' ? (
                <>
                  <DeleteRow label={preview.organizationName ?? 'Your organisation'} value="Deleted" />
                  <DeleteRow label="Events" value={`${preview.eventsDeleted} deleted`} />
                  <DeleteRow label="Leads" value={`${preview.leadsAffected} deleted`} />
                  <DeleteRow
                    label="Other team accounts"
                    value={`${preview.membersDeleted} deleted`}
                  />
                  <DeleteRow label="Card photos and voice notes" value="Deleted" isLast />
                </>
              ) : (
                <>
                  <DeleteRow label="Your digital business card" value="Deleted" />
                  <DeleteRow
                    label="Leads you captured"
                    value={`${preview.leadsAffected} handed to an admin`}
                  />
                  <DeleteRow label="Your organisation" value="Untouched" isLast />
                </>
              )}
            </View>

            <Typography className="text-[13px] leading-[1.6] text-slate mt-5">
              {preview.mode === 'org'
                ? 'Export your leads first if you want to keep them — once this is done there is nothing to export from.'
                : 'This cannot be undone. You would need a fresh invite from your admin to come back.'}
            </Typography>

            <Typography className="text-[10.5px] font-bold tracking-[0.12em] text-slate mt-7 mb-[10px]" style={{ textTransform: 'uppercase' }}>
              Confirm
            </Typography>
            <TextInput
              label="Type DELETE to continue"
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Pressable
              onPress={onDelete}
              disabled={!armed}
              className={`h-14 rounded-md items-center justify-center flex-row gap-2 mt-6 ${
                armed ? 'bg-[#C23B3B]' : 'bg-[#C23B3B]/[0.35]'
              }`}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Typography className="text-[15px] font-bold text-white">
                  Delete my account
                </Typography>
              )}
            </Pressable>

            <Pressable onPress={() => router.back()} className="items-center py-4 mt-1">
              <Typography className="text-[13.5px] font-semibold text-navy">
                Keep my account
              </Typography>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DeleteRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-[13px] ${isLast ? '' : 'border-b border-hairline'}`}
    >
      <Typography className="flex-1 text-[13.5px] text-navy pr-3">{label}</Typography>
      <Typography className="text-[12.5px] font-semibold text-slate">{value}</Typography>
    </View>
  );
}
