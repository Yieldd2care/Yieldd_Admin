import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CheckIcon, MailIcon, WhatsAppIcon } from '../../../components/ui/icons';

const LEADS = [
  { initial: 'R', name: 'Rajesh Menon', company: 'Northline Engineering' },
  { initial: 'S', name: 'Sneha Kulkarni', company: 'Vertex Industries' },
  { initial: 'A', name: 'Amit Shah', company: 'Prime Fabtech' },
  { initial: 'K', name: 'Kavita Rao', company: 'Suntech Moulds' },
];

export default function BulkSendScreen() {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [selected, setSelected] = useState<Record<string, boolean>>({ Rajesh: true, Sneha: true, Amit: false, Kavita: true });

  const selectedCount = Object.values(selected).filter(Boolean).length + 5;

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader
        title="Bulk send"
        right={
          <View className="bg-navy rounded-full px-3 py-[6px]">
            <Typography className="text-[12px] font-extrabold text-white">{selectedCount} selected</Typography>
          </View>
        }
      />

      <View className="flex-row gap-2 bg-white border-b border-hairline px-5 py-[14px]">
        <Pressable
          onPress={() => setChannel('whatsapp')}
          className={`flex-1 h-[42px] rounded-full border-[1.5px] flex-row items-center justify-center gap-[7px] ${channel === 'whatsapp' ? 'bg-navy border-navy' : 'border-hairline'}`}
        >
          <WhatsAppIcon size={14} color={channel === 'whatsapp' ? '#fff' : '#25D366'} />
          <Typography className={`text-[12.5px] font-bold ${channel === 'whatsapp' ? 'text-white' : 'text-navy'}`}>WhatsApp</Typography>
        </Pressable>
        <Pressable
          onPress={() => setChannel('email')}
          className={`flex-1 h-[42px] rounded-full border-[1.5px] flex-row items-center justify-center gap-[7px] ${channel === 'email' ? 'bg-navy border-navy' : 'border-hairline'}`}
        >
          <MailIcon size={14} color={channel === 'email' ? '#fff' : '#5A6B87'} />
          <Typography className={`text-[12.5px] font-bold ${channel === 'email' ? 'text-white' : 'text-navy'}`}>Email</Typography>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pt-[14px] pb-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white border border-hairline rounded-2xl p-[14px] mb-4">
          <Typography className="text-[10px] font-bold tracking-[0.12em] text-slate mb-2" style={{ textTransform: 'uppercase' }}>
            Message preview
          </Typography>
          <View className="bg-section rounded-[10px] px-[13px] py-[11px]">
            <Typography className="text-[12.5px] text-navy" style={{ lineHeight: 19 }}>
              Hi Rajesh, great meeting you at IMTEX 2026. Sharing our brochure &mdash; let us know if you&apos;d like a quote.
            </Typography>
          </View>
          <Typography className="text-[11.5px] font-bold text-gold mt-2">Edit this message</Typography>
        </View>

        {LEADS.map((lead) => {
          const key = lead.name.split(' ')[0];
          const isSelected = selected[key];
          return (
            <Pressable
              key={key}
              onPress={() => setSelected((s) => ({ ...s, [key]: !s[key] }))}
              className="flex-row items-center gap-3 py-3 border-b border-hairline"
            >
              <View className={`w-[22px] h-[22px] rounded-[7px] items-center justify-center ${isSelected ? 'bg-gold' : 'bg-white border-[1.5px] border-hairline'}`}>
                {isSelected ? <CheckIcon size={12} color="#0B132B" strokeWidth={3} /> : null}
              </View>
              <View className={`w-9 h-9 rounded-[10px] items-center justify-center ${isSelected ? 'bg-surface' : 'bg-surface opacity-50'}`}>
                <Typography className="text-[13px] font-extrabold text-navy">{lead.initial}</Typography>
              </View>
              <View>
                <Typography className={`text-[13.5px] font-bold ${isSelected ? 'text-navy' : 'text-slate'}`}>{lead.name}</Typography>
                <Typography className="text-[11.5px] text-slate mt-[1px]">{lead.company}</Typography>
              </View>
            </Pressable>
          );
        })}
        <Typography className="text-[12px] font-semibold text-slate text-center pt-[14px]">
          + 5 more selected, scroll to review
        </Typography>
      </ScrollView>

      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Pressable
          onPress={() => router.push('/(app)/leads/send-queue')}
          className="h-[54px] rounded-md bg-gold items-center justify-center shadow-[0_10px_24px_rgba(244,176,0,0.30)]"
        >
          <Typography className="text-[16px] font-bold text-navy">Start sending &middot; {selectedCount} leads</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
