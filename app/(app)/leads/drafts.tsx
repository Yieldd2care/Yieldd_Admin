import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Network from 'expo-network';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { EditIcon, MicIcon, WifiIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';
import { useSessionStore } from '../../../stores/useSessionStore';

export default function DraftsScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const allLeads = useLeadsStore((s) => s.leads);
  const drafts = allLeads.filter((l) => l.syncStatus === 'draft');
  const blocked = allLeads.filter((l) => l.syncError);
  const syncDrafts = useLeadsStore((s) => s.syncDrafts);
  const isSyncing = useLeadsStore((s) => s.isSyncing);
  const userId = useSessionStore((s) => s.user?.id);

  useEffect(() => {
    let mounted = true;
    const checkConnectivity = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) {
          setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
        }
      } catch {
        // keep the last known value
      }
    };
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <ScreenHeader title="Drafts" />

      <View
        className={`flex-row items-center gap-[10px] mx-5 mt-4 rounded-2xl px-4 py-[14px] ${
          isOnline ? 'bg-success/[0.12]' : 'bg-gold/[0.14]'
        }`}
      >
        <View className={`w-9 h-9 rounded-full items-center justify-center ${isOnline ? 'bg-success/[0.18]' : 'bg-gold/[0.2]'}`}>
          <WifiIcon color={isOnline ? '#2E9C61' : '#8A6100'} />
        </View>
        <View className="flex-1">
          <Typography className={`text-[13px] font-bold ${isOnline ? 'text-[#2E9C61]' : 'text-[#8A6100]'}`}>
            {isOnline ? "You're back online" : "You're offline"}
          </Typography>
          <Typography className="text-[11.5px] text-slate mt-[1px]">
            {isOnline
              ? drafts.length > 0
                ? 'Drafts sync automatically — tap to sync now'
                : 'All caught up, nothing pending'
              : 'Scanned leads are saved here until you reconnect'}
          </Typography>
        </View>
        {isOnline && drafts.length > 0 ? (
          <Pressable
            onPress={() => syncDrafts(userId)}
            disabled={isSyncing}
            className={`bg-navy rounded-full px-4 py-2 ${isSyncing ? 'opacity-60' : ''}`}
          >
            <Typography className="text-[12px] font-bold text-white">
              {isSyncing ? 'Syncing…' : 'Sync now'}
            </Typography>
          </Pressable>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pt-4 pb-10">
        {/* A lead the server refused for good — usually the rep was taken off
            the event. Retrying forever would just hide it, so it is shown. */}
        {blocked.map((lead) => (
          <View
            key={lead.id}
            className="bg-white border border-[#C23B3B]/[0.35] rounded-2xl px-4 py-[14px] mb-3"
          >
            <Typography className="text-[14px] font-bold text-navy">{lead.name}</Typography>
            <Typography className="text-[12px] text-[#A32E2E] mt-[3px] leading-[1.45]">
              {lead.syncError}
            </Typography>
          </View>
        ))}

        {drafts.length === 0 ? (
          <View className="items-center pt-16">
            <View className="w-14 h-14 rounded-full bg-surface items-center justify-center">
              <EditIcon size={22} color="#5A6B87" strokeWidth={1.75} />
            </View>
            <Typography className="text-[14px] font-semibold text-navy mt-4">No drafts</Typography>
            <Typography className="text-[12.5px] text-slate mt-1 text-center">
              Leads scanned while offline will show up here
            </Typography>
          </View>
        ) : (
          drafts.map((lead) => (
            <View key={lead.id} className="flex-row items-center gap-3 bg-white border border-hairline rounded-2xl px-4 py-[14px] mb-3 relative">
              <View className="absolute right-[14px] top-[14px] bg-gold/[0.16] rounded-full px-[8px] py-[2px]">
                <Typography className="text-[9.5px] font-bold text-[#8A6100]">DRAFT</Typography>
              </View>
              <View className="w-10 h-10 rounded-[11px] bg-surface items-center justify-center">
                <Typography className="text-[14.5px] font-extrabold text-navy">{lead.initial}</Typography>
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-[6px]">
                  <Typography className="text-[14.5px] font-bold text-navy">{lead.name}</Typography>
                  {lead.hasVoice ? <MicIcon size={13} color="#8A98B0" strokeWidth={2} /> : null}
                </View>
                <Typography className="text-[12px] text-slate mt-[1px]">{lead.company || 'No company'} &middot; {lead.time}</Typography>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
