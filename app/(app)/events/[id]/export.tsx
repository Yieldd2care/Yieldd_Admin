import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { CheckIcon, FileIcon } from '../../../../components/ui/icons';

const SCOPES = ['This event · IMTEX 2026', 'Custom date range', 'Only Won leads'] as const;
const FIELDS = ['Name, company, designation', 'Phone & email', 'Status & follow-up date', 'Deal value', 'Voice note transcript'];

export default function ExportScreen() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]>(SCOPES[0]);
  const [fields, setFields] = useState<Record<string, boolean>>({
    'Name, company, designation': true,
    'Phone & email': true,
    'Status & follow-up date': true,
    'Deal value': false,
    'Voice note transcript': false,
  });

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Export leads" />

      <ScrollView contentContainerClassName="px-5 pt-5 pb-6" showsVerticalScrollIndicator={false}>
        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mb-3" style={{ textTransform: 'uppercase' }}>
          Scope
        </Typography>
        <View className="gap-2 mb-6">
          {SCOPES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setScope(s)}
              className={`border-[1.5px] rounded-md px-[15px] py-[13px] ${scope === s ? 'border-gold bg-gold/[0.06]' : 'border-hairline'}`}
            >
              <Typography className="text-[13.5px] font-semibold text-navy">{s}</Typography>
            </Pressable>
          ))}
        </View>

        <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mb-3" style={{ textTransform: 'uppercase' }}>
          Fields to include
        </Typography>
        <View className="bg-white border border-hairline rounded-2xl px-4 mb-6">
          {FIELDS.map((f, i) => (
            <Pressable
              key={f}
              onPress={() => setFields((s) => ({ ...s, [f]: !s[f] }))}
              className={`flex-row items-center justify-between py-[13px] ${i < FIELDS.length - 1 ? 'border-b border-section' : ''}`}
            >
              <Typography className="text-[13.5px] font-semibold text-navy">{f}</Typography>
              <View className={`w-5 h-5 rounded-[6px] items-center justify-center ${fields[f] ? 'bg-gold' : 'bg-surface border-[1.5px] border-hairline'}`}>
                {fields[f] ? <CheckIcon size={11} color="#0B132B" strokeWidth={3} /> : null}
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
          <View>
            <Typography className="text-[13.5px] font-bold text-navy">Excel (.xlsx)</Typography>
            <Typography className="text-[11.5px] text-slate mt-[1px]">Opens directly in the format this team already uses</Typography>
          </View>
        </View>
      </ScrollView>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Pressable
          onPress={() => router.back()}
          className="h-[54px] rounded-md bg-gold items-center justify-center shadow-[0_10px_24px_rgba(244,176,0,0.30)]"
        >
          <Typography className="text-[16px] font-bold text-navy">Generate export</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
