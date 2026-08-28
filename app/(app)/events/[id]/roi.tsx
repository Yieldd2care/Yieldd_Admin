import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Typography } from '../../../../components/ui/Typography';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { PdfIcon, ShareIcon } from '../../../../components/ui/icons';

const EVENT_NAME = 'IMTEX 2026 · B-42';
const EVENT_SUBTITLE = 'Day 3 of 4 · Bengaluru';
const ROI_PERCENT = 142;
const PIPELINE_VALUE_LABEL = '₹6,84,000';
const EVENT_SPEND_LABEL = '₹2,82,500';
const COST_PER_LEAD_LABEL = '₹684';
const TOTAL_LEADS = 413;
const DEALS_WON = 12;

const PIPELINE = [
  { name: 'New', pct: 100, value: '190', color: '#8A98B0' },
  { name: 'Contacted', pct: 68, value: '129', color: '#1D3F8A' },
  { name: 'Qualified', pct: 34, value: '64', color: '#F4B000' },
  { name: 'Won', pct: 6, value: '12', color: '#4ED17F' },
  { name: 'Lost', pct: 9, value: '18', color: '#C23B3B' },
];

function buildRoiPdfHtml() {
  const rows = PIPELINE.map(
    (p) => `
      <tr>
        <td style="padding:8px 0;color:#0B132B;font-weight:600;">${p.name}</td>
        <td style="padding:8px 0;">
          <div style="background:#EEF1F7;border-radius:6px;height:8px;width:100%;overflow:hidden;">
            <div style="background:${p.color};height:8px;width:${p.pct}%;"></div>
          </div>
        </td>
        <td style="padding:8px 0 8px 14px;color:#0B132B;font-weight:700;text-align:right;">${p.value}</td>
      </tr>`
  ).join('');

  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; margin:0; padding:32px; color:#0B132B;">
        <div style="font-size:20px; font-weight:800;">${EVENT_NAME}</div>
        <div style="font-size:13px; color:#5A6B87; margin-top:2px;">${EVENT_SUBTITLE}</div>

        <div style="background:#0B132B; border-radius:16px; padding:24px; margin-top:20px; color:#fff;">
          <div style="font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.6);">Return on investment</div>
          <div style="font-size:40px; font-weight:800; margin-top:6px;">${ROI_PERCENT}<span style="color:#F4B000; font-size:20px;">%</span></div>
          <div style="font-size:12px; color:rgba(255,255,255,0.55); margin-top:6px;">${PIPELINE_VALUE_LABEL} pipeline value against ${EVENT_SPEND_LABEL} spent</div>
          <div style="height:1px; background:rgba(255,255,255,0.12); margin:16px 0;"></div>
          <div style="display:flex; justify-content:space-between; font-size:13px;">
            <span style="color:rgba(255,255,255,0.55);">Cost per lead</span>
            <span style="font-weight:700;">${COST_PER_LEAD_LABEL}</span>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-top:16px;">
          <div style="flex:1; border:1px solid #E3E7EF; border-radius:16px; padding:14px;">
            <div style="font-size:22px; font-weight:800;">${TOTAL_LEADS}</div>
            <div style="font-size:12px; color:#5A6B87; margin-top:2px;">Total leads</div>
          </div>
          <div style="flex:1; border:1px solid #E3E7EF; border-radius:16px; padding:14px;">
            <div style="font-size:22px; font-weight:800;">${DEALS_WON}</div>
            <div style="font-size:12px; color:#5A6B87; margin-top:2px;">Deals won</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid #E3E7EF; border-radius:8px; padding:14px 16px; margin-top:12px;">
          <span style="font-size:13px; color:#5A6B87;">Event cost</span>
          <span style="font-size:15px; font-weight:700;">${EVENT_SPEND_LABEL}</span>
        </div>

        <div style="font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#5A6B87; margin-top:24px; margin-bottom:10px;">
          Pipeline by status
        </div>
        <table style="width:100%; border:1px solid #E3E7EF; border-radius:16px; padding:16px; border-collapse:collapse;">
          ${rows}
        </table>
      </body>
    </html>`;
}

export default function ROIDashboardScreen() {
  const captureAreaRef = useRef<View>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const shareAsImage = async () => {
    if (!captureAreaRef.current || savingImage) return;
    setSavingImage(true);
    try {
      const uri = await captureRef(captureAreaRef, { format: 'png', quality: 1 });
      const { status } = await MediaLibrary.requestPermissionsAsync();
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
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildRoiPdfHtml(), base64: false });
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

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="ROI dashboard" />

      <View ref={captureAreaRef} collapsable={false} className="flex-1 bg-section">
        <ScrollView contentContainerClassName="px-5 pt-[18px] pb-6" showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Typography className="text-[13.5px] font-bold text-navy">{EVENT_NAME}</Typography>
              <Typography className="text-[11.5px] text-slate mt-[1px]">{EVENT_SUBTITLE}</Typography>
            </View>
          </View>

          <View className="rounded-[20px] p-6 relative overflow-hidden" style={{ backgroundColor: '#0B132B' }}>
            <Typography className="text-[10px] font-bold tracking-[0.12em] text-white/[0.60]" style={{ textTransform: 'uppercase' }}>
              Return on investment
            </Typography>
            <View className="flex-row items-end gap-2 mt-[10px]">
              <Typography className="text-[52px] font-extrabold text-white tracking-[-0.02em]" style={{ lineHeight: 56 }}>
                {ROI_PERCENT}
              </Typography>
              <Typography className="text-[22px] font-extrabold text-gold pb-[6px]">%</Typography>
            </View>
            <Typography className="text-[12.5px] text-white/[0.55] mt-2">
              {PIPELINE_VALUE_LABEL} pipeline value against {EVENT_SPEND_LABEL} spent
            </Typography>
            <View className="h-px bg-white/[0.12] my-[18px]" />
            <View className="flex-row items-center justify-between">
              <Typography className="text-[12px] text-white/[0.55]">Cost per lead</Typography>
              <Typography className="text-[15px] font-bold text-white">{COST_PER_LEAD_LABEL}</Typography>
            </View>
          </View>

          <View className="flex-row gap-3 mt-4">
            <View className="flex-1 bg-white border border-hairline rounded-2xl p-[14px]">
              <Typography className="text-[22px] font-extrabold text-navy tracking-[-0.01em]">{TOTAL_LEADS}</Typography>
              <Typography className="text-[11.5px] text-slate mt-[3px]">Total leads</Typography>
            </View>
            <View className="flex-1 bg-white border border-hairline rounded-2xl p-[14px]">
              <Typography className="text-[22px] font-extrabold text-navy tracking-[-0.01em]">{DEALS_WON}</Typography>
              <Typography className="text-[11.5px] text-slate mt-[3px]">Deals won</Typography>
            </View>
          </View>

          <View className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[14px] mt-3">
            <Typography className="text-[12.5px] text-slate">Event cost</Typography>
            <View className="flex-row items-center gap-2">
              <Typography className="text-[15px] font-bold text-navy">{EVENT_SPEND_LABEL}</Typography>
              <Typography className="text-[12px] font-bold text-gold">Edit</Typography>
            </View>
          </View>

          <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mt-[22px] mb-3" style={{ textTransform: 'uppercase' }}>
            Pipeline by status
          </Typography>
          <View className="bg-white border border-hairline rounded-2xl p-4">
            {PIPELINE.map((p) => (
              <View key={p.name} className="flex-row items-center gap-[10px] mb-3">
                <View className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: p.color }} />
                <Typography className="w-[76px] text-[12px] font-semibold text-navy">{p.name}</Typography>
                <View className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                </View>
                <Typography className="w-[44px] text-right text-[12px] font-bold text-navy">{p.value}</Typography>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className="bg-white border-t border-hairline flex-row gap-[10px] px-5 pt-[14px] pb-6">
        <Pressable
          onPress={shareAsImage}
          disabled={savingImage}
          className={`flex-1 h-[52px] rounded-md bg-gold items-center justify-center flex-row gap-2 shadow-[0_10px_24px_rgba(244,176,0,0.28)] ${savingImage ? 'opacity-60' : ''}`}
        >
          {savingImage ? <ActivityIndicator size="small" color="#0B132B" /> : <ShareIcon size={15} color="#0B132B" />}
          <Typography className="text-[14.5px] font-bold text-navy">{savingImage ? 'Saving…' : 'Share as image'}</Typography>
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
