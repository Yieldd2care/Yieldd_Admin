import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Typography } from '../../../../components/ui/Typography';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { DateField } from '../../../../components/app/DateField';
import { CheckIcon, FileIcon } from '../../../../components/ui/icons';
import { useEvent } from '../../../../hooks/useEvents';
import { fetchEventFields } from '../../../../lib/api/eventFields';
import {
  buildLeadsCsv,
  DEFAULT_COLUMNS,
  type ExportColumns,
  type ExportScope,
} from '../../../../lib/api/exportLeads';
import { csvFilename } from '../../../../lib/csv';

type ScopeKind = 'event' | 'range' | 'won';

const FIELD_ROWS: { key: keyof ExportColumns; label: string }[] = [
  { key: 'identity', label: 'Name, company, designation' },
  { key: 'contact', label: 'Phone & email' },
  { key: 'statusAndFollowUp', label: 'Status, follow-up date & note' },
  { key: 'dealValue', label: 'Deal value' },
  { key: 'transcript', label: 'Voice note transcript' },
  { key: 'customFields', label: 'Your custom fields' },
];

export default function ExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const { data: event } = useEvent(eventId || undefined);

  const [scope, setScope] = useState<ScopeKind>('event');
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [columns, setColumns] = useState<ExportColumns>(DEFAULT_COLUMNS);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);

  // The labels for the custom-field columns, so a header is "Budget range"
  // rather than a UUID.
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetchEventFields(eventId)
      .then((defs) => {
        if (!cancelled) {
          setFieldLabels(Object.fromEntries(defs.map((d) => [d.id, d.name])));
        }
      })
      .catch(() => {
        /* Headers fall back to the raw key. */
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const scopes: { kind: ScopeKind; label: string }[] = [
    { kind: 'event', label: event ? `This event · ${event.name}` : 'This event' },
    { kind: 'range', label: 'Custom date range' },
    { kind: 'won', label: 'Only Won leads' },
  ];

  const rangeReady = scope !== 'range' || (from !== null && to !== null);
  const anyColumn = Object.values(columns).some(Boolean);

  const generate = async () => {
    if (isBusy || !rangeReady || !anyColumn) return;
    setIsBusy(true);

    try {
      const selection: ExportScope =
        scope === 'event'
          ? { kind: 'event', eventId }
          : scope === 'won'
            ? { kind: 'won', eventId }
            : {
                kind: 'range',
                eventId,
                from: (from as Date).toISOString(),
                // The whole of the last day, not up to midnight at its start.
                to: new Date((to as Date).setHours(23, 59, 59, 999)).toISOString(),
              };

      const { csv, rowCount } = await buildLeadsCsv(selection, columns, fieldLabels);

      if (!rowCount) {
        Alert.alert('Nothing to export', 'No leads match that selection.');
        return;
      }

      const name = csvFilename(event?.name ?? 'Leads');

      if (Platform.OS === 'web') {
        // A browser has no filesystem to write to; the download is the share.
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = globalThis.URL.createObjectURL(blob);
        const link = globalThis.document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        globalThis.URL.revokeObjectURL(url);
        return;
      }

      const directory = new Directory(Paths.cache, 'exports');
      if (!directory.exists) directory.create({ intermediates: true });
      const file = new File(directory, name);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: `${rowCount} lead${rowCount === 1 ? '' : 's'}`,
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Saved', `${rowCount} leads written to ${name}.`);
      }
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Export leads" />

      <ScrollView contentContainerClassName="px-5 pt-5 pb-6" showsVerticalScrollIndicator={false}>
        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mb-3" style={{ textTransform: 'uppercase' }}>
          Scope
        </Typography>
        <View className="gap-2 mb-6">
          {scopes.map((s) => (
            <Pressable
              key={s.kind}
              onPress={() => setScope(s.kind)}
              className={`border-[1.5px] rounded-md px-[15px] py-[13px] ${scope === s.kind ? 'border-gold bg-gold/[0.06]' : 'border-hairline'}`}
            >
              <Typography className="text-[13.5px] font-semibold text-navy">{s.label}</Typography>
            </Pressable>
          ))}

          {scope === 'range' ? (
            <View className="flex-row gap-3 mt-1">
              <View className="flex-1">
                <DateField label="From" value={from} placeholder="Start" onChange={setFrom} />
              </View>
              <View className="flex-1">
                <DateField label="To" value={to} placeholder="End" minDate={from} onChange={setTo} />
              </View>
            </View>
          ) : null}
        </View>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mb-3" style={{ textTransform: 'uppercase' }}>
          Fields to include
        </Typography>
        <View className="bg-white border border-hairline rounded-2xl px-4 mb-6">
          {FIELD_ROWS.map((row, i) => (
            <Pressable
              key={row.key}
              onPress={() => setColumns((c) => ({ ...c, [row.key]: !c[row.key] }))}
              className={`flex-row items-center justify-between py-[13px] ${i < FIELD_ROWS.length - 1 ? 'border-b border-section' : ''}`}
            >
              <Typography className="text-[13.5px] font-semibold text-navy">{row.label}</Typography>
              <View
                className={`w-5 h-5 rounded-[6px] items-center justify-center ${columns[row.key] ? 'bg-gold' : 'bg-surface border-[1.5px] border-hairline'}`}
              >
                {columns[row.key] ? <CheckIcon size={11} color="#0B132B" strokeWidth={3} /> : null}
              </View>
            </Pressable>
          ))}
        </View>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mb-3" style={{ textTransform: 'uppercase' }}>
          Format
        </Typography>
        <View className="flex-row items-center gap-3 bg-white border-[1.5px] border-gold rounded-md px-4 py-[14px]">
          <View className="w-9 h-9 rounded-[9px] items-center justify-center bg-[#2E8C40]/[0.10]">
            <FileIcon />
          </View>
          <View className="flex-1">
            <Typography className="text-[13.5px] font-bold text-navy">CSV (.csv)</Typography>
            <Typography className="text-[11.5px] text-slate mt-[1px] leading-[1.45]">
              Opens straight into Excel, Google Sheets or Tally. Hindi and Marathi names come
              through correctly.
            </Typography>
          </View>
        </View>
      </ScrollView>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Pressable
          onPress={generate}
          disabled={isBusy || !rangeReady || !anyColumn}
          className={`h-[54px] rounded-md items-center justify-center flex-row gap-2 ${
            isBusy || !rangeReady || !anyColumn
              ? 'bg-surface'
              : 'bg-gold shadow-[0_10px_24px_rgba(244,176,0,0.30)]'
          }`}
        >
          {isBusy ? <ActivityIndicator size="small" color="#0B132B" /> : null}
          <Typography
            className={`text-[16px] font-bold ${isBusy || !rangeReady || !anyColumn ? 'text-slate' : 'text-navy'}`}
          >
            {isBusy ? 'Gathering leads…' : 'Generate export'}
          </Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
