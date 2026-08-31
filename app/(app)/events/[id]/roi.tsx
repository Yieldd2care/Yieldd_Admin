import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Typography } from '../../../../components/ui/Typography';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { PdfIcon, ShareIcon } from '../../../../components/ui/icons';
import { useEvent } from '../../../../hooks/useEvents';
import { useEventStats } from '../../../../hooks/useEventStats';
import { formatPaise } from '../../../../lib/db';
import { formatPercent, type PipelineRow } from '../../../../lib/roi';
import { eventDayPosition, formatDateRange } from '../../../../lib/dates';
import type { EventStats } from '../../../../lib/api/eventStats';
import type { Event } from '../../../../types/event';

const STATUS_COLORS: Record<PipelineRow['status'], string> = {
  New: '#8A98B0',
  Contacted: '#1D3F8A',
  Qualified: '#F4B000',
  Won: '#4ED17F',
  Lost: '#C23B3B',
};

/** `Day 3 of 4 · Bengaluru`, or just the dates when the show is not running. */
function eventSubtitle(event: Event | null | undefined): string {
  if (!event) return '';
  const position = eventDayPosition(event.startDate, event.endDate);
  const day =
    position?.isCurrent
      ? `Day ${position.dayNumber} of ${position.totalDays}`
      : formatDateRange(event.startDate, event.endDate);
  return [day, event.city].filter(Boolean).join(' · ');
}

/**
 * The PDF an exhibitor takes to their finance team.
 *
 * It is built from exactly the same `stats` object the screen renders, so the
 * two can never disagree — the old version held its own copy of every figure
 * as a module constant.
 */
function buildRoiPdfHtml(event: Event, stats: EventStats): string {
  const title = [event.name, event.stallNumber].filter(Boolean).join(' · ');
  const rows = stats.pipeline
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 0;color:#0B132B;font-weight:600;">${p.status}</td>
        <td style="padding:8px 0;">
          <div style="background:#EEF1F7;border-radius:6px;height:8px;width:100%;overflow:hidden;">
            <div style="background:${STATUS_COLORS[p.status]};height:8px;width:${p.barWidth}%;"></div>
          </div>
        </td>
        <td style="padding:8px 0 8px 14px;color:#0B132B;font-weight:700;text-align:right;">${p.count}</td>
      </tr>`
    )
    .join('');

  const roi = formatPercent(stats.roiPercent, 'Not enough data');
  const spend = formatPaise(stats.spendPaise, { fallback: 'Not recorded' });
  const wonValue = formatPaise(stats.wonValuePaise, { fallback: '—' });
  const costPerLead = formatPaise(stats.costPerLeadPaise, { fallback: '—' });

  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; margin:0; padding:32px; color:#0B132B;">
        <div style="font-size:20px; font-weight:800;">${title}</div>
        <div style="font-size:13px; color:#5A6B87; margin-top:2px;">${eventSubtitle(event)}</div>

        <div style="background:#0B132B; border-radius:16px; padding:24px; margin-top:20px; color:#fff;">
          <div style="font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.6);">Return on investment</div>
          <div style="font-size:40px; font-weight:800; margin-top:6px;">${roi}</div>
          <div style="font-size:12px; color:rgba(255,255,255,0.55); margin-top:6px;">${wonValue} won against ${spend} spent</div>
          <div style="height:1px; background:rgba(255,255,255,0.12); margin:16px 0;"></div>
          <div style="display:flex; justify-content:space-between; font-size:13px;">
            <span style="color:rgba(255,255,255,0.55);">Cost per lead</span>
            <span style="font-weight:700;">${costPerLead}</span>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-top:16px;">
          <div style="flex:1; border:1px solid #E3E7EF; border-radius:16px; padding:14px;">
            <div style="font-size:22px; font-weight:800;">${stats.totalLeads}</div>
            <div style="font-size:12px; color:#5A6B87; margin-top:2px;">Total leads</div>
          </div>
          <div style="flex:1; border:1px solid #E3E7EF; border-radius:16px; padding:14px;">
            <div style="font-size:22px; font-weight:800;">${stats.dealsWon}</div>
            <div style="font-size:12px; color:#5A6B87; margin-top:2px;">Deals won</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #E3E7EF; border-radius:8px; padding:14px 16px; margin-top:12px;">
          <span style="font-size:13px; color:#5A6B87;">Event cost</span>
          <span style="font-size:15px; font-weight:700;">${spend}</span>
        </div>

        <div style="font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#5A6B87; margin-top:24px; margin-bottom:10px;">
          Pipeline by status
        </div>
        <table style="width:100%; border:1px solid #E3E7EF; border-radius:16px; padding:16px; border-collapse:collapse;">
          ${rows}
        </table>

        <div style="font-size:10px; color:#97A3B8; margin-top:24px;">
          ROI is (value won − event cost) ÷ event cost. Only deals marked Won count towards it.
        </div>
      </body>
    </html>`;
}

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
                  onPress={() => router.push('/(app)/events/new/cost')}
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
              onPress={() => router.push('/(app)/events/new/cost')}
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
