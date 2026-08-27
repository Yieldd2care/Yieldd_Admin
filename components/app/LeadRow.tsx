import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { ContactsIcon, MailIcon, MicIcon, PhoneIcon, WhatsAppIcon } from '../ui/icons';
import { STATUS_DOT, STATUS_TEXT } from '../../data/leads';
import type { StoredLead } from '../../stores/useLeadsStore';

function leadActionStub(action: string, name: string) {
  Alert.alert(action, `${action} isn't wired up for ${name} yet.`);
}

export function LeadRow({ lead }: { lead: StoredLead }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/leads/[id]', params: { id: lead.id } })}
      className="flex-row items-center gap-3 bg-white border border-hairline rounded-2xl px-[14px] py-[13px]"
    >
      <View className="w-9 h-9 rounded-[10px] bg-surface items-center justify-center">
        <Typography className="text-[13px] font-extrabold text-navy">{lead.initial}</Typography>
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-[6px]">
          <View className={`w-[6px] h-[6px] rounded-full ${STATUS_DOT[lead.status]}`} />
          <Typography className="text-[13.5px] font-bold text-navy flex-shrink" numberOfLines={1}>
            {lead.name}
          </Typography>
          {lead.hasVoice ? <MicIcon size={12} color="#8A98B0" strokeWidth={2} /> : null}
        </View>
        <View className="flex-row items-center gap-[6px] mt-[3px]">
          <Typography className={`text-[11px] font-bold flex-shrink-0 ${STATUS_TEXT[lead.status]}`} numberOfLines={1}>
            {lead.status}
          </Typography>
          <Typography className="text-[11px] text-slate/35 flex-shrink-0">&bull;</Typography>
          <Typography className="text-[11.5px] text-slate flex-shrink" numberOfLines={1}>
            {lead.company} &middot; {lead.time}
          </Typography>
        </View>
      </View>
      <View className="flex-row items-center gap-[6px]">
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            leadActionStub('Call', lead.name);
          }}
          className="w-[30px] h-[30px] rounded-full bg-surface items-center justify-center"
        >
          <PhoneIcon size={14} color="#0B132B" />
        </Pressable>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            leadActionStub('WhatsApp', lead.name);
          }}
          className="w-[30px] h-[30px] rounded-full items-center justify-center"
          style={{ backgroundColor: '#25D366' }}
        >
          <WhatsAppIcon size={14} color="#fff" />
        </Pressable>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            leadActionStub('Email', lead.name);
          }}
          className="w-[30px] h-[30px] rounded-full bg-surface items-center justify-center"
        >
          <MailIcon size={14} color="#0B132B" />
        </Pressable>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            leadActionStub('Save contact', lead.name);
          }}
          className="w-[30px] h-[30px] rounded-full bg-surface items-center justify-center"
        >
          <ContactsIcon size={14} color="#0B132B" />
        </Pressable>
      </View>
    </Pressable>
  );
}
