import { useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../../../components/ui/Typography';
import { LeadRow } from '../../../components/app/LeadRow';
import { ChevronRightIcon, SearchIcon, WhatsAppIcon } from '../../../components/ui/icons';
import { useLeadsStore } from '../../../stores/useLeadsStore';

const FILTERS: { key: string; label: string; dot?: string }[] = [
  { key: 'All', label: 'All' },
  { key: 'Needs a note', label: 'Needs a note', dot: '#F4B000' },
  { key: 'Qualified', label: 'Qualified', dot: '#8A6100' },
  { key: 'Won', label: 'Won', dot: '#1F8A50' },
];

export default function LeadListScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('All');
  const [query, setQuery] = useState('');
  const allLeads = useLeadsStore((s) => s.leads);
  const leads = allLeads.filter((l) => l.syncStatus === 'synced');

  const needsNoteCount = leads.filter((l) => l.needsNote).length;
  const whatsappPendingCount = leads.filter((l) => l.status === 'New').length;

  const filtered = leads.filter((l) => {
    if (query && !l.name.toLowerCase().includes(query.toLowerCase()) && !l.company.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'Needs a note') return l.needsNote;
    if (filter === 'Qualified') return l.status === 'Qualified';
    if (filter === 'Won') return l.status === 'Won';
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="bg-white px-5 pt-[18px] pb-[18px]">
        <View className="flex-row items-center justify-between">
          <View>
            <Typography className="text-[26px] font-extrabold text-navy tracking-[-0.01em]">Leads</Typography>
            <Pressable className="flex-row items-center gap-[5px] mt-1">
              <Typography className="text-[11px] font-bold text-slate tracking-[0.06em]" style={{ textTransform: 'uppercase' }}>
                IMTEX 2026 &middot; B-42
              </Typography>
              <ChevronRightIcon size={11} color="#5A6B87" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        <View className="bg-navy-elevated rounded-[14px] mt-4 overflow-hidden">
          <View className="flex-row">
            <View className="flex-1 px-4 py-3">
              <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                This event
              </Typography>
              <Typography className="text-[16px] font-extrabold text-white mt-[3px]">{leads.length}</Typography>
            </View>
            <View className="w-px bg-white/[0.14]" />
            <View className="flex-1 px-4 py-3">
              <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                Follow-ups
              </Typography>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <View className="w-[6px] h-[6px] rounded-full bg-gold" />
                <Typography className="text-[13px] font-bold text-white">7 due</Typography>
              </View>
            </View>
          </View>
          <View className="h-px bg-white/[0.14]" />
          <View className="flex-row">
            <View className="flex-1 px-4 py-3">
              <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                Needs a note
              </Typography>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <View className="w-[6px] h-[6px] rounded-full bg-success" />
                <Typography className="text-[13px] font-bold text-white">{needsNoteCount}</Typography>
              </View>
            </View>
            <View className="w-px bg-white/[0.14]" />
            <View className="flex-1 px-4 py-3">
              <Typography className="text-[9.5px] font-bold tracking-[0.08em] text-white/45" style={{ textTransform: 'uppercase' }}>
                WhatsApp
              </Typography>
              <View className="flex-row items-center gap-[6px] mt-[5px]">
                <WhatsAppIcon size={11} color="#25D366" />
                <Typography className="text-[13px] font-bold text-white">{whatsappPendingCount} pending</Typography>
              </View>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2 bg-surface rounded-full px-[18px] py-3 mt-4">
          <SearchIcon />
          <RNTextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search leads"
            placeholderTextColor="#97A3B8"
            className="flex-1 text-[14px] text-navy"
          />
        </View>
      </View>

      {/* The ScrollView itself must stay free of className/style: NativeWind styling
          directly on a horizontal ScrollView makes descendant text glyphs not paint
          (both platforms). Visual styling lives on the wrapper View instead. */}
      <View className="bg-white border-b border-hairline">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5 py-[14px] gap-2">
          {FILTERS.map((f) => (
            <View key={f.key}>
              <Pressable
                onPress={() => setFilter(f.key)}
                className={`flex-row items-center rounded-full px-[14px] py-2 ${filter === f.key ? 'bg-navy' : 'bg-surface'}`}
              >
                {f.dot ? <View className="w-[6px] h-[6px] rounded-full mr-[7px]" style={{ backgroundColor: f.dot }} /> : null}
                <Typography className={`text-[12.5px] font-bold ${filter === f.key ? 'text-white' : 'text-navy'}`}>{f.label}</Typography>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pt-4 gap-3">
        {filtered.map((lead) => (
          <LeadRow key={lead.id} lead={lead} />
        ))}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
