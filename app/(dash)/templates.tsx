import { useEffect, useState } from 'react';
import { Pressable, TextInput as RNTextInput, View } from 'react-native';

import { DashShell } from '../../components/dash/DashShell';
import { ConfirmDialog } from '../../components/dash/ConfirmDialog';
import { Cap, Empty, GhostButton, GoldButton, Panel, Pill } from '../../components/dash/primitives';
import { Typography } from '../../components/ui/Typography';
import { TextInput } from '../../components/ui/TextInput';
import { useTemplates, useTemplateMutations } from '../../hooks/useMessageTemplates';
import { useSessionStore } from '../../stores/useSessionStore';
import { MERGE_FIELDS, unknownMergeTokens } from '../../lib/messageText';
import type { MessageTemplate } from '../../lib/api/messageTemplates';

/**
 * Read from MERGE_FIELDS rather than typed out here. A hand-written copy of
 * this list is exactly how `{{senderCompany}}` — which is not a real token —
 * came to be advertised on this screen; the real one is `{{sender_company}}`.
 * Anything else in double braces goes out as literal text.
 */
const TOKENS = MERGE_FIELDS;

export default function DashTemplates() {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const { data: templates, isLoading } = useTemplates(channel);
  const { create, update, remove, makeDefault } = useTemplateMutations(channel);
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MessageTemplate | null>(null);

  const selected = templates?.find((t) => t.id === selectedId) ?? templates?.[0];

  // Seeded from the template once it arrives, keyed on its id — re-seeding on
  // the object would wipe what someone is halfway through typing, because the
  // query hands back a fresh object on every refetch.
  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setSubject(selected.subject ?? '');
    setBody(selected.body);
    setEditing(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, channel]);

  // Anything in double braces that is not a real token ships as literal text.
  // Two invented ones reached customers once; this is what catches the third.
  const invented = unknownMergeTokens(`${body} ${subject}`);
  const canSave = name.trim() !== '' && body.trim() !== '' && !update.isPending;

  async function save() {
    if (!selected || !canSave) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: selected.id,
        name: name.trim(),
        // A WhatsApp template has no subject — the column is CHECK-constrained
        // to email only, so sending '' rather than null is rejected.
        subject: channel === 'email' ? subject.trim() || null : null,
        body,
      });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
    }
  }

  async function addNew() {
    setError(null);
    try {
      const made = await create.mutateAsync({
        name: 'New template',
        subject: channel === 'email' ? 'Great meeting you at {{event}}' : null,
        body: 'Hi {{name}}, great meeting you at {{event}}.',
      });
      setSelectedId(made.id);
      setEditing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.");
    }
  }

  return (
    <DashShell
      title="Templates"
      subtitle="The messages your follow-ups are built from"
      actions={isAdmin ? <GoldButton label="New template" disabled={create.isPending} onPress={addNew} /> : undefined}
    >
      <View className="flex-row gap-2 mb-4">
        <Pill label="WhatsApp" active={channel === 'whatsapp'} onPress={() => setChannel('whatsapp')} />
        <Pill label="Email" active={channel === 'email'} onPress={() => setChannel('email')} />
      </View>

      {templates?.length ? (
        <View className="flex-row gap-4 items-start">
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
                  </Panel>
                </Pressable>
              );
            })}
          </View>

          <Panel className="flex-[1.15] p-6">
            {editing ? (
              <View className="gap-[18px]">
                <TextInput label="Template name" value={name} onChangeText={setName} placeholder="Day-one follow-up" />
                {channel === 'email' ? (
                  <TextInput
                    label="Subject"
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Great meeting you at {{event}}"
                  />
                ) : null}
                <View className="gap-[7px]">
                  <Typography className="text-[13px] font-medium text-ink-muted">Message</Typography>
                  <RNTextInput
                    value={body}
                    onChangeText={setBody}
                    multiline
                    className="bg-white rounded-md px-4 py-3 text-[15px] text-navy border border-hairline"
                    style={{ minHeight: 180, textAlignVertical: 'top' }}
                    placeholder="Hi {{name}}, great meeting you at {{event}}."
                    placeholderTextColor="#97A3B8"
                  />
                </View>
              </View>
            ) : (
              <>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <Typography className="text-[17px] font-bold text-navy">{selected?.name}</Typography>
                    <Typography className="text-[12.5px] text-slate mt-1">
                      {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      {selected?.isDefault ? ' · default for this channel' : ''}
                    </Typography>
                  </View>
                </View>

                {selected?.subject ? (
                  <View className="mt-4">
                    <Cap>Subject</Cap>
                    <Typography className="text-[13.5px] text-navy mt-[5px]">{selected.subject}</Typography>
                  </View>
                ) : null}

                <View className="bg-section border border-hairline rounded-md p-[18px] mt-[18px]">
                  <Typography className="text-[13.5px] text-navy leading-[1.75]">{selected?.body}</Typography>
                </View>
              </>
            )}

            {invented.length && editing ? (
              <View className="bg-[#FFF6E0] border border-[#F0DFAE] rounded-md p-4 mt-4">
                <Typography className="text-[12.5px] font-bold" style={{ color: '#8A6100' }}>
                  {invented.length === 1 ? 'This is not a real token' : 'These are not real tokens'}
                </Typography>
                <Typography className="text-[12.5px] mt-1 leading-[1.55]" style={{ color: '#8A6100' }}>
                  {invented.join(', ')} will be sent to your lead exactly as written. Use one from the list
                  below instead.
                </Typography>
              </View>
            ) : null}

            <View className="mt-5">
              <Cap>Tokens that get replaced</Cap>
              <View className="gap-[6px] mt-[10px]">
                {TOKENS.map((f) => (
                  <View key={f.token} className="flex-row items-center gap-3">
                    <View className="bg-surface rounded-sm px-[11px] py-[6px]">
                      <Typography className="text-[11.5px] font-semibold text-ink-muted">{f.token}</Typography>
                    </View>
                    <Typography className="text-[12px] text-slate">{f.label}</Typography>
                  </View>
                ))}
              </View>
              <Typography className="text-[11.5px] text-label mt-[11px] leading-[1.55]">
                Anything else in double braces is sent as literal text.
              </Typography>
            </View>

            {error ? (
              <Typography className="text-[12.5px] font-semibold text-[#C23B3B] mt-4">{error}</Typography>
            ) : null}

            {isAdmin && selected ? (
              <View className="flex-row flex-wrap gap-2 mt-5 pt-5 border-t border-hairline">
                {editing ? (
                  <>
                    <GoldButton
                      label={update.isPending ? 'Saving…' : 'Save'}
                      disabled={!canSave}
                      onPress={save}
                    />
                    <GhostButton
                      label="Cancel"
                      onPress={() => {
                        setName(selected.name);
                        setSubject(selected.subject ?? '');
                        setBody(selected.body);
                        setEditing(false);
                        setError(null);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <GoldButton label="Edit" onPress={() => setEditing(true)} />
                    {!selected.isDefault ? (
                      <GhostButton
                        label={makeDefault.isPending ? 'Setting…' : 'Set as default'}
                        onPress={() => makeDefault.mutate(selected.id)}
                      />
                    ) : null}
                    <GhostButton label="Delete" onPress={() => setConfirmDelete(selected)} />
                  </>
                )}
              </View>
            ) : null}

            {selected?.attachment ? (
              <Typography className="text-[11.5px] text-label mt-4 leading-[1.55]">
                {selected.attachment.name} is attached, but it is not sent with a WhatsApp or email deep
                link: the message carries text only.
              </Typography>
            ) : null}
          </Panel>
        </View>
      ) : (
        <Panel>
          <Empty
            title={isLoading ? 'Loading templates' : 'No templates yet'}
            body={
              isLoading
                ? 'One moment.'
                : isAdmin
                  ? 'Create one and every follow-up on this channel starts from it.'
                  : 'An admin writes these. They are shared across the whole organisation.'
            }
          />
        </Panel>
      )}

      <ConfirmDialog
        visible={confirmDelete !== null}
        destructive
        busy={remove.isPending}
        title={`Delete "${confirmDelete?.name}"?`}
        body="Follow-ups already sent are unaffected. Any event pointing at this template falls back to the default."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await remove.mutateAsync(confirmDelete.id);
            setSelectedId(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "That didn't delete.");
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </DashShell>
  );
}
