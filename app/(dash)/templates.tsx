import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { Cap, Empty, Panel, Pill } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { useTemplates } from '../../hooks/useMessageTemplates';

/**
 * The six tokens the sender actually replaces. Anything else in double braces
 * goes out as literal text, which is what made two invented ones ship once —
 * so the list is shown rather than left to memory.
 */
const TOKENS = ['{{name}}', '{{company}}', '{{event}}', '{{stall}}', '{{sender}}', '{{senderCompany}}'];

export default function DashTemplates() {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const { data: templates, isLoading } = useTemplates(channel);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = templates?.find((t) => t.id === selectedId) ?? templates?.[0];

  return (
    <DashShell title="Templates" subtitle="Follow-up messages">
      <View className="flex-row gap-2 mb-4">
        <Pill label="WhatsApp" active={channel === 'whatsapp'} onPress={() => setChannel('whatsapp')} />
        <Pill label="Email" active={channel === 'email'} onPress={() => setChannel('email')} />
      </View>

      {templates?.length ? (
        <View className="flex-row gap-4">
          <View className="flex-1 gap-3">
            {templates.map((t) => {
              const on = t.id === selected?.id;
              return (
                <Pressable key={t.id} onPress={() => setSelectedId(t.id)}>
                  <Panel className={`px-5 py-[18px] ${on ? 'border-gold' : ''}`}>
                    <View className="flex-row items-center justify-between">
                      <Typography className="text-[14.5px] font-bold text-navy" numberOfLines={1}>
                        {t.name}
                      </Typography>
                      {t.isDefault ? (
                        <View className="rounded-full px-[9px] py-[4px]" style={{ backgroundColor: '#FFF6E0' }}>
                          <Typography className="text-[10.5px] font-bold" style={{ color: '#8A6100' }}>
                            Default
                          </Typography>
                        </View>
                      ) : null}
                    </View>
                    <Typography className="text-[12.5px] text-slate mt-[7px] leading-[1.55]" numberOfLines={2}>
                      {t.body}
                    </Typography>
                    {t.attachment ? (
                      <Typography className="text-[11.5px] text-label mt-[10px]" numberOfLines={1}>
                        {t.attachment.name}
                      </Typography>
                    ) : null}
                  </Panel>
                </Pressable>
              );
            })}
          </View>

          <Panel className="flex-[1.15] p-6">
            <Typography className="text-[17px] font-bold text-navy">{selected?.name}</Typography>
            <Typography className="text-[12.5px] text-slate mt-1">
              {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
              {selected?.isDefault ? ' · default for this channel' : ''}
            </Typography>

            {selected?.subject ? (
              <View className="mt-4">
                <Cap>Subject</Cap>
                <Typography className="text-[13.5px] text-navy mt-[5px]">{selected.subject}</Typography>
              </View>
            ) : null}

            <View className="bg-section border border-hairline rounded-md p-[18px] mt-[18px]">
              <Typography className="text-[13.5px] text-navy leading-[1.75]">{selected?.body}</Typography>
            </View>

            <View className="mt-5">
              <Cap>Tokens that get replaced</Cap>
              <View className="flex-row flex-wrap gap-[7px] mt-[10px]">
                {TOKENS.map((t) => (
                  <View key={t} className="bg-surface rounded-sm px-[11px] py-[6px]">
                    <Typography className="text-[11.5px] font-semibold text-ink-muted">{t}</Typography>
                  </View>
                ))}
              </View>
              <Typography className="text-[11.5px] text-label mt-[11px] leading-[1.55]">
                Anything else in double braces is sent as literal text.
              </Typography>
            </View>
          </Panel>
        </View>
      ) : (
        <Panel>
          <Empty
            title={isLoading ? 'Loading templates' : 'No templates yet'}
            body={
              isLoading
                ? 'One moment.'
                : 'Templates are written in the phone app, under Settings. They are shared across the whole organisation.'
            }
          />
        </Panel>
      )}
    </DashShell>
  );
}
