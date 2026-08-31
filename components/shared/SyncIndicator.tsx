import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { AlertCircleIcon, RefreshIcon } from '../ui/icons';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { formatRelative } from '../../lib/dates';

/**
 * What is still on this phone and not yet on the server.
 *
 * MVP_PLAN: *"sync is invisible unless it fails."* So the banner form of this
 * renders NOTHING when everything is up to date — a permanent green "Synced"
 * badge trains people to ignore it, and then it is ignored on the one day it
 * matters. The Settings row is the exception: someone who opened Settings to
 * check on sync deserves an answer even when the answer is "nothing pending".
 *
 * Never says "saved" or "lost". A queued capture is safe on the device; the
 * copy has to carry that, because a rep who thinks a lead evaporated will stop
 * trusting the app in the middle of a show.
 */
export function useSyncState() {
  const leads = useLeadsStore((s) => s.leads);
  const isSyncing = useLeadsStore((s) => s.isSyncing);
  const lastSyncedAt = useLeadsStore((s) => s.lastSyncedAt);

  // Derived with useMemo, NOT inside the selector — a selector that builds a
  // new array or object every call re-renders forever.
  return useMemo(() => {
    let pending = 0;
    let failed = 0;
    for (const lead of leads) {
      if (lead.syncStatus === 'draft' || lead.pendingPatch) pending += 1;
      if (lead.syncError) failed += 1;
    }
    return { pending, failed, isSyncing, lastSyncedAt };
  }, [leads, isSyncing, lastSyncedAt]);
}

function useSyncNow() {
  const userId = useSessionStore((s) => s.user?.id);
  const [running, setRunning] = useState(false);

  return {
    running,
    run: async () => {
      if (running) return;
      setRunning(true);
      try {
        await useLeadsStore.getState().syncDrafts(userId);
        await useLeadsStore.getState().refresh();
      } finally {
        setRunning(false);
      }
    },
  };
}

/**
 * The banner. Renders null when there is nothing to say.
 *
 * Put it above content on the capture and lead screens — the places a rep is
 * standing when the hall wifi gives out.
 */
export function SyncIndicator({ className = '' }: { className?: string }) {
  const { pending, failed, isSyncing } = useSyncState();
  const { running, run } = useSyncNow();

  if (!pending && !failed) return null;

  const busy = isSyncing || running;
  const troubled = failed > 0;

  return (
    <Pressable
      onPress={() => void run()}
      disabled={busy}
      className={`flex-row items-center gap-[10px] rounded-md px-[14px] py-3 ${
        troubled ? 'bg-gold/[0.10] border border-gold/[0.35]' : 'bg-navy/[0.04] border border-hairline'
      } ${className}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#F4B000" />
      ) : (
        <AlertCircleIcon size={15} color={troubled ? '#8A6100' : '#5A6B87'} strokeWidth={2} />
      )}
      <View className="flex-1">
        <Typography className="text-[12.5px] font-bold text-navy">
          {busy
            ? 'Syncing…'
            : troubled
              ? `${failed} ${failed === 1 ? 'lead' : 'leads'} couldn't be sent`
              : `${pending} ${pending === 1 ? 'lead' : 'leads'} waiting to sync`}
        </Typography>
        <Typography className="text-[11.5px] text-slate mt-[1px]" style={{ lineHeight: 16 }}>
          {busy
            ? 'Nothing is lost while this runs.'
            : 'Saved on this phone. Tap to try again.'}
        </Typography>
      </View>
    </Pressable>
  );
}

/**
 * The Settings row: always renders, and always tells the truth.
 *
 * The old version was a hardcoded green "Synced" with a "Sync now" label that
 * had no onPress at all — it looked like a button, and did nothing.
 */
export function SyncStatusRow() {
  const { pending, failed, isSyncing, lastSyncedAt } = useSyncState();
  const { running, run } = useSyncNow();

  const busy = isSyncing || running;
  const clean = pending === 0 && failed === 0;
  const when = formatRelative(lastSyncedAt);

  return (
    <View className="flex-row items-center gap-[10px]">
      <View className="flex-row items-center gap-[5px]">
        <View
          className={`w-[6px] h-[6px] rounded-full ${
            busy ? 'bg-gold' : failed ? 'bg-[#C23B3B]' : clean ? 'bg-success' : 'bg-gold'
          }`}
        />
        <Typography
          className={`text-[12px] font-bold ${
            busy ? 'text-gold' : failed ? 'text-[#C23B3B]' : clean ? 'text-[#2E9C61]' : 'text-gold'
          }`}
        >
          {busy
            ? 'Syncing…'
            : failed
              ? `${failed} failed`
              : pending
                ? `${pending} waiting`
                : when
                  ? `Synced ${when}`
                  : 'Synced'}
        </Typography>
      </View>
      <Pressable onPress={() => void run()} disabled={busy} className="flex-row items-center gap-1">
        <RefreshIcon size={13} color={busy ? '#97A3B8' : '#F4B000'} />
        <Typography className={`text-[11.5px] font-bold ${busy ? 'text-slate' : 'text-gold'}`}>
          Sync now
        </Typography>
      </Pressable>
    </View>
  );
}
