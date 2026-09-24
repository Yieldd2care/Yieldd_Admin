import { Pressable, View } from 'react-native';
import { router } from 'expo-router';

import { Typography } from '../ui/Typography';
import { CardThumb } from './CardThumb';
import { AlertCircleIcon, ContactsIcon, MailIcon, MicIcon, PhoneIcon, WhatsAppIcon } from '../ui/icons';
import { STATUS_DOT, STATUS_TEXT } from '../../data/leads';
import {
  cardNeedsAttention,
  displayCompany,
  displayInitial,
  displayName,
} from '../../lib/leadDisplay';
import { useLeadActions } from '../../hooks/useLeadActions';
import type { StoredLead } from '../../stores/useLeadsStore';

/**
 * One tappable action on a lead row.
 *
 * `disabled` dims rather than hides. A row whose icons change position from
 * lead to lead is harder to use at a stall than one where the email icon is
 * always third and sometimes grey.
 */
function RowAction({
  onPress,
  disabled,
  children,
  className = 'bg-surface',
  style,
}: {
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: { backgroundColor: string };
}) {
  return (
    <Pressable
      onPress={(e) => {
        // Without this the row's own onPress fires too and the lead detail
        // screen opens behind the dialer.
        e.stopPropagation();
        if (!disabled) onPress();
      }}
      className={`w-[30px] h-[30px] rounded-full items-center justify-center ${className} ${
        disabled ? 'opacity-35' : ''
      }`}
      style={style}
    >
      {children}
    </Pressable>
  );
}

/**
 * `cardUri` is passed in rather than looked up here.
 *
 * Signing a card URL is a network call, and a row that made its own would make
 * one per lead — a hundred round trips to draw one screen, on hall wifi. The
 * list signs them all in a single request and hands each row its answer. A row
 * rendered without the prop simply shows the initial, which is what a lead
 * typed in by hand shows anyway.
 */
export function LeadRow({ lead, cardUri = null }: { lead: StoredLead; cardUri?: string | null }) {
  // The same four actions the lead detail screen uses, including the send
  // record. These four buttons used to raise "isn't wired up yet" alerts.
  const { call, whatsapp, email, saveToContacts, savedToContacts, canCall, canWhatsApp, canEmail } =
    useLeadActions(lead);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/(app)/leads/[id]', params: { id: lead.id } })}
      className="flex-row items-center gap-3 bg-white border border-hairline rounded-2xl px-[14px] py-[13px]"
    >
      <CardThumb uri={cardUri} initial={displayInitial(lead)} size={36} radius={10} />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-[6px]">
          <View className={`w-[6px] h-[6px] rounded-full ${STATUS_DOT[lead.status]}`} />
          <Typography className="text-[13.5px] font-bold text-navy flex-shrink" numberOfLines={1}>
            {displayName(lead)}
          </Typography>
          {lead.hasVoice ? <MicIcon size={12} color="#8A98B0" strokeWidth={2} /> : null}
          {/* The card was photographed but could not be read, so this lead is
              carrying a photo, a voice note and event fields with nobody's name
              on them. It is real work, and the only way the rep finds out it
              needs typing up is if the list says so. */}
          {cardNeedsAttention(lead) ? (
            <View className="flex-row items-center gap-[3px] bg-gold/[0.16] rounded-full px-[6px] py-[2px]">
              <AlertCircleIcon size={9} color="#8A6100" strokeWidth={2.5} />
              <Typography className="text-[9px] font-bold text-[#8A6100]">CARD NOT READ</Typography>
            </View>
          ) : null}
          {/* Somebody at this event already had this number. A marker only —
              the row is already a Pressable into the detail screen, and there
              is no remove here or anywhere else in the list. */}
          {lead.duplicateOfLeadId ? (
            <View className="flex-row items-center gap-[3px] bg-gold/[0.16] rounded-full px-[6px] py-[2px]">
              <AlertCircleIcon size={9} color="#8A6100" strokeWidth={2.5} />
              <Typography className="text-[9px] font-bold text-[#8A6100]">DUPLICATE</Typography>
            </View>
          ) : null}
        </View>
        <View className="flex-row items-center gap-[6px] mt-[3px]">
          <Typography className={`text-[11px] font-bold flex-shrink-0 ${STATUS_TEXT[lead.status]}`} numberOfLines={1}>
            {lead.status}
          </Typography>
          <Typography className="text-[11px] text-slate/35 flex-shrink-0">&bull;</Typography>
          <Typography className="text-[11.5px] text-slate flex-shrink" numberOfLines={1}>
            {displayCompany(lead)} &middot; {lead.time}
          </Typography>
        </View>
      </View>
      <View className="flex-row items-center gap-[6px]">
        <RowAction onPress={() => void call()} disabled={!canCall}>
          <PhoneIcon size={14} color="#0B132B" />
        </RowAction>
        <RowAction
          onPress={() => void whatsapp()}
          disabled={!canWhatsApp}
          className=""
          style={{ backgroundColor: '#25D366' }}
        >
          <WhatsAppIcon size={14} color="#fff" />
        </RowAction>
        <RowAction onPress={() => void email()} disabled={!canEmail}>
          <MailIcon size={14} color="#0B132B" />
        </RowAction>
        <RowAction onPress={() => void saveToContacts()}>
          <ContactsIcon size={14} color={savedToContacts ? '#2E9C61' : '#0B132B'} />
        </RowAction>
      </View>
    </Pressable>
  );
}
