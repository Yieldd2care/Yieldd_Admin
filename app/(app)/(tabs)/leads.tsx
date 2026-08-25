import { useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ChevronRightIcon, MicIcon, SearchIcon } from '../../../components/ui/icons';

type Status = 'New' | 'Contacted' | 'Qualified' | 'Won';

const STATUS_CLASSES: Record<Status, string> = {
  New: 'bg-surface',
  Contacted: 'bg-blue/[0.10]',
  Qualified: 'bg-gold/[0.14]',
  Won: 'bg-success/[0.14]',
};

const STATUS_TEXT: Record<Status, string> = {
  New: 'text-slate',
  Contacted: 'text-blue',
  Qualified: 'text-[#8A6100]',
  Won: 'text-[#1F8A50]',
};

const LEADS: {
  id: string;
  initial: string;
  name: string;
  company: string;
  time: string;
  status: Status;
  hasVoice: boolean;
  needsNote: boolean;
}[] = [
  { id: '1', initial: 'R', name: 'Rajesh Menon', company: 'Northline Engineering', time: '4:12 PM', status: 'Qualified', hasVoice: true, needsNote: false },
  { id: '2', initial: 'S', name: 'Sneha Kulkarni', company: 'Vertex Industries', time: '3:40 PM', status: 'New', hasVoice: false, needsNote: true },
  { id: '3', initial: 'A', name: 'Amit Shah', company: 'Prime Fabtech', time: '3:05 PM', status: 'Contacted', hasVoice: true, needsNote: false },
  { id: '4', initial: 'K', name: 'Kavita Rao', company: 'Suntech Moulds', time: '2:48 PM', status: 'New', hasVoice: false, needsNote: true },
  { id: '5', initial: 'V', name: 'Vikram Nair', company: 'Delta Precision', time: '2:20 PM', status: 'Won', hasVoice: true, needsNote: false },
  { id: '6', initial: 'P', name: 'Priyanka Iyer', company: 'Orbit Castings', time: '1:55 PM', status: 'Qualified', hasVoice: false, needsNote: false },
  { id: '7', initial: 'D', name: 'Deepak Verma', company: 'Gharda Alloys', time: '1:10 PM', status: 'New', hasVoice: false, needsNote: true },
];

const FILTERS = ['All', 'Needs a note', 'Qualified', 'Won', 'Lost'] as const;

export default function LeadListScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [query, setQuery] = useState('');

  const filtered = LEADS.filter((l) => {
    if (query && !l.name.toLowerCase().includes(query.toLowerCase()) && !l.company.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'Needs a note') return l.needsNote;
    if (filter === 'Qualified') return l.status === 'Qualified';
    if (filter === 'Won') return l.status === 'Won';
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top']}>
      <View className="bg-white px-5 pt-[18px]">
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
        <View className="flex-row items-center gap-2 bg-surface rounded-md px-[14px] py-3 mt-[14px]">
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b border-hairline" contentContainerClassName="px-5 py-[14px] gap-2">
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            className={`rounded-full px-[14px] py-2 ${filter === f ? 'bg-navy' : 'bg-surface'}`}
          >
            <Typography className={`text-[12.5px] font-bold ${filter === f ? 'text-white' : 'text-navy'}`}>{f}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filtered.map((lead) => (
          <Pressable
            key={lead.id}
            onPress={() => router.push({ pathname: '/(app)/leads/[id]', params: { id: lead.id } })}
            className="flex-row items-center gap-3 px-5 py-[14px] border-b border-hairline bg-white relative"
          >
            {lead.needsNote ? <View className="absolute left-[12px] top-[12px] w-[7px] h-[7px] rounded-full bg-gold" /> : null}
            <View className="w-10 h-10 rounded-[11px] bg-surface items-center justify-center">
              <Typography className="text-[14.5px] font-extrabold text-navy">{lead.initial}</Typography>
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-[6px]">
                <Typography className="text-[14.5px] font-bold text-navy">{lead.name}</Typography>
                {lead.hasVoice ? <MicIcon size={13} color="#8A98B0" strokeWidth={2} /> : null}
              </View>
              <Typography className="text-[12px] text-slate mt-[1px]">{lead.company}</Typography>
            </View>
            <View className="items-end gap-[6px]">
              <Typography className="text-[11px] font-semibold text-slate">{lead.time}</Typography>
              <View className={`rounded-full px-[9px] py-[4px] ${STATUS_CLASSES[lead.status]}`}>
                <Typography className={`text-[10.5px] font-bold ${STATUS_TEXT[lead.status]}`}>{lead.status}</Typography>
              </View>
            </View>
          </Pressable>
        ))}
        <View className="h-24" />
      </ScrollView>
    </SafeAreaView>
  );
}
