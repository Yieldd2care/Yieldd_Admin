import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Typography } from '../../../../components/ui/Typography';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { PdfIcon, ShareIcon } from '../../../../components/ui/icons';
import { useEvent } from '../../../../hooks/useEvents';
import { useEventStats } from '../../../../hooks/useEventStats';
import { buildRoiPdfHtml, eventSubtitle, PIPELINE_STATUS_COLORS as STATUS_COLORS } from '../../../../lib/roiPdf';
import { formatPaise } from '../../../../lib/db';
import { formatPercent } from '../../../../lib/roi';
import type { EventStats } from '../../../../lib/api/eventStats';
import type { Event } from '../../../../types/event';

export default function ROIDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event } = useEvent(eventId || undefined);
  const { data: stats, isLoading, error } = useEventStats(eventId || undefined);

  const captureAreaRef = useRef<View>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const shareAsImage = async () => {
    if (!captureAreaRef.current || savingImage) return;
    setSavingImage(true);
    try {
      const uri = await captureRef(captureAreaRef, { format: 'png', quality: 1 });
      // Write-only — see the same call on the card share screen. The dashboard
      // image is saved, never read back, so read access is not asked for.
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to save the dashboard image.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'The dashboard image has been saved to your photos.');
    } catch {
      Alert.alert('Something went wrong', "Couldn't save the image. Please try again.");
    } finally {
      setSavingImage(false);
    }
  };

  const downloadPdf = async () => {
    if (generatingPdf || !event || !stats) return;
    setGeneratingPdf(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildRoiPdfHtml(event, stats),
        base64: false,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save ROI dashboard PDF' });
      } else {
        Alert.alert('PDF ready', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Something went wrong', "Couldn't generate the PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
        <ScreenHeader title="ROI dashboard" />
        <View className="flex-1 items-center justify-center px-8">
          {error ? (
            <>
              <Typography className="text-[15px] font-bold text-navy text-center">
                Couldn&rsquo;t load this event
              </Typography>
              <Typography className="text-[13px] text-slate text-center mt-2 leading-[1.5]">
                You may be offline, or no longer on this event.
              </Typography>
            </>
          ) : (
            <ActivityIndicator color="#F4B000" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const hasSpend = stats.spendPaise != null && stats.spendPaise > 0;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="ROI dashboard" />

      <View ref={captureAreaRef} collapsable={false} className="flex-1 bg-section">
        <ScrollView contentContainerClassName="px-5 pt-[18px] pb-6" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Typography className="text-[13.5px] font-bold text-navy">
                {[event?.name, event?.stallNumber].filter(Boolean).join(' · ')}
              </Typography>
              <Typography className="text-[11.5px] text-slate mt-[1px]">{eventSubtitle(event)}</Typography>
            </View>
          </View>

          <View className="rounded-[20px] p-6 relative overflow-hidden" style={{ backgroundColor: '#0B132B' }}>
            <Typography className="text-[10px] font-bold tracking-[0.12em] text-white/[0.60]" style={{ textTransform: 'uppercase' }}>
              Return on investment
            </Typography>

            {/*
              Money is admin-only — `event_stats` returns null for a rep rather
              than trusting the client to hide it.
            */}
            {!stats.canSeeMoney ? (
              <Typography className="text-[14px] font-semibold text-white/[0.75] mt-3 leading-[1.5]">
                Event costs and deal values are visible to admins.
              </Typography>
            ) : !hasSpend ? (
              <>
                <Typography className="text-[20px] font-extrabold text-white mt-3 leading-[1.35]">
                  Add what this event cost
                </Typography>
                <Typography className="text-[12.5px] text-white/[0.55] mt-2 leading-[1.5]">
                  ROI and cost per lead need the event cost. Without it there is nothing to divide by.
                </Typography>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/(app)/events/new/cost', params: { eventId } })
                  }
                  className="self-start bg-gold rounded-full px-[14px] py-[9px] mt-4"
                >
                  <Typography className="text-[12.5px] font-bold text-navy">Add event cost</Typography>
                </Pressable>
              </>
            ) : (
              <>
                <View className="flex-row items-end gap-2 mt-[10px]">
                  <Typography
                    className="text-[52px] font-extrabold text-white tracking-[-0.02em]"
                    style={{ lineHeight: 56 }}
                  >
                    {formatPercent(stats.roiPercent).replace('%', '')}
                  </Typography>
                  <Typography className="text-[22px] font-extrabold text-gold pb-[6px]">%</Typography>
                </View>
                <Typography className="text-[12.5px] text-white/[0.55] mt-2">
                  {formatPaise(stats.wonValuePaise)} won against {formatPaise(stats.spendPaise)} spent
                </Typography>
                <View className="h-px bg-white/[0.12] my-[18px]" />
                <View className="flex-row items-center justify-between">
                  <Typography className="text-[12px] text-white/[0.55]">Cost per lead</Typography>
                  <Typography className="text-[15px] font-bold text-white">
                    {formatPaise(stats.costPerLeadPaise)}
                  </Typography>
                </View>
                {stats.dealsWon > 0 ? (
                  <View className="flex-row items-center justify-between mt-3">
                    <Typography className="text-[12px] text-white/[0.55]">Cost per deal won</Typography>
                    <Typography className="text-[15px] font-bold text-white">
                      {formatPaise(stats.costPerWonPaise)}
                    </Typography>
                  </View>
                ) : null}
              </>
            )}
          </View>

          <View className="flex-row gap-3 mt-4">
            <View className="flex-1 bg-white border border-hairline rounded-2xl p-[14px]">
              <Typography className="text-[22px] font-extrabold text-navy tracking-[-0.01em]">
                {stats.totalLeads}
              </Typography>
              <Typography className="text-[11.5px] text-slate mt-[3px]">Total leads</Typography>
            </View>
            <View className="flex-1 bg-white border border-hairline rounded-2xl p-[14px]">
              <Typography className="text-[22px] font-extrabold text-navy tracking-[-0.01em]">
                {stats.dealsWon}
              </Typography>
              <Typography className="text-[11.5px] text-slate mt-[3px]">
                Deals won · {formatPercent(stats.conversionPercent)}
              </Typography>
            </View>
          </View>

          {stats.canSeeMoney ? (
            <Pressable
              // The event id travels with the link. Without it this opened the
              // wizard's cost step, which saved onto the draft's event — not
              // the one this ROI screen is showing.
              onPress={() => router.push({ pathname: '/(app)/events/new/cost', params: { eventId } })}
              className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[14px] mt-3"
            >
              <Typography className="text-[12.5px] text-slate">Event cost</Typography>
              <View className="flex-row items-center gap-2">
                <Typography className="text-[15px] font-bold text-navy">
                  {formatPaise(stats.spendPaise, { fallback: 'Not added' })}
                </Typography>
                <Typography className="text-[12px] font-bold text-gold">Edit</Typography>
              </View>
            </Pressable>
          ) : null}

          {/* The pipeline this event produced, open and closed. Sits under the
              cost because that is the comparison an exhibitor is making: this
              is what we spent, this is what is on the table because of it.
              Not tappable — unlike the cost, it is not something you set. */}
          {stats.canSeeMoney ? (
            <View className="bg-white border border-hairline rounded-md px-4 py-[14px] mt-[10px]">
              <View className="flex-row items-center justify-between">
                <Typography className="text-[12.5px] text-slate">Expected deal value</Typography>
                <Typography className="text-[15px] font-bold text-navy">
                  {formatPaise(stats.expectedValuePaise, { fallback: '-' })}
                </Typography>
              </View>
              <Typography className="text-[11px] text-slate mt-[5px] leading-[1.45]">
                Qualified and won leads together. Lost deals are left out.
              </Typography>
            </View>
          ) : null}

          <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-3" style={{ textTransform: 'uppercase' }}>
            Pipeline by status
          </Typography>
          <View className="bg-white border border-hairline rounded-2xl p-4">
            {/*
              Five exclusive buckets, not a funnel: a lead is New *or*
              Contacted, so the counts sum to the total. Bars are scaled against
              the largest bucket. The old screen drew every bar as a fraction of
              `New`, which read as a conversion rate it never was.
            */}
            {stats.pipeline.map((p) => (
              <View key={p.status} className="flex-row items-center gap-[10px] mb-3">
                <View className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: STATUS_COLORS[p.status] }} />
                <Typography className="w-[76px] text-[12px] font-semibold text-navy">{p.status}</Typography>
                <View className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${p.barWidth}%`, backgroundColor: STATUS_COLORS[p.status] }}
                  />
                </View>
                <Typography className="w-[44px] text-right text-[12px] font-bold text-navy">{p.count}</Typography>
              </View>
            ))}
            {stats.totalLeads === 0 ? (
              <Typography className="text-[12.5px] text-slate text-center py-2">
                No leads captured for this event yet.
              </Typography>
            ) : null}
          </View>

          {stats.canSeeMoney && hasSpend ? (
            <Typography className="text-[10.5px] text-placeholder mt-4 leading-[1.5]">
              ROI is (value won &minus; event cost) &divide; event cost. Only deals marked Won count towards it.
            </Typography>
          ) : null}
        </ScrollView>
      </View>

      <View className="bg-white border-t border-hairline flex-row gap-[10px] px-5 pt-[14px] pb-6">
        <Pressable
          onPress={shareAsImage}
          disabled={savingImage}
          className={`flex-1 h-[52px] rounded-md bg-gold items-center justify-center flex-row gap-2 shadow-[0_10px_24px_rgba(244,176,0,0.28)] ${savingImage ? 'opacity-60' : ''}`}
        >
          {savingImage ? <ActivityIndicator size="small" color="#0B132B" /> : <ShareIcon size={15} color="#0B132B" />}
          <Typography className="text-[14.5px] font-bold text-navy">
            {savingImage ? 'Saving…' : 'Share as image'}
          </Typography>
        </Pressable>
        <Pressable
          onPress={downloadPdf}
          disabled={generatingPdf}
          className={`w-[52px] h-[52px] rounded-md bg-white border border-hairline items-center justify-center ${generatingPdf ? 'opacity-60' : ''}`}
        >
          {generatingPdf ? <ActivityIndicator size="small" color="#C23B3B" /> : <PdfIcon />}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
