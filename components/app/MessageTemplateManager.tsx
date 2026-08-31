import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput as RNTextInput, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { FileIcon, MailIcon, PlusIcon, WhatsAppIcon } from '../ui/icons';
import { describeTemplateError, type MessageChannel, type MessageTemplate } from '../../lib/api/messageTemplates';
import { useTemplateMutations, useTemplates } from '../../hooks/useMessageTemplates';
import { useSessionStore } from '../../stores/useSessionStore';

/**
 * The organisation's follow-up messages — the ones actually sent.
 *
 * This used to read and write a device-local zustand store seeded with two
 * examples, while every WhatsApp and email send read `message_templates` from
 * the database. A rep could rewrite their message here, watch it save, and
 * change nothing about what the customer received. It now edits the real table.
 *
 * ATTACHMENTS: the "Attach a file" picker is gone. It stored a device-local
 * file URI that never left the phone, and nothing could have sent it anyway —
 * a `wa.me` link and a `mailto:` cannot carry a file, which is the cost of the
 * deep-link approach chosen in 3.4/3.5 to avoid the WhatsApp Business API. The
 * table's attachment columns and the `template-attachments` bucket are still
 * there for when there is a real way to deliver one; an attachment already on a
 * template is shown, read-only, rather than silently disappearing.
 */

function formatFileSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MergeFieldText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <Typography className={className}>
      {parts.map((part, i) =>
        part.startsWith('{{') ? (
          <Typography key={i} className="font-bold text-navy bg-gold/[0.16] px-[5px] rounded">
            {part}
          </Typography>
        ) : (
          part
        )
      )}
    </Typography>
  );
}

function TemplateCard({
  channel,
  template,
  startInEdit,
  onSave,
  onRemove,
  onSetDefault,
  busy,
}: {
  channel: MessageChannel;
  template: MessageTemplate;
  startInEdit: boolean;
  onSave: (patch: { name: string; subject?: string | null; body: string }) => Promise<void>;
  onRemove: () => void;
  onSetDefault: () => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(startInEdit);
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject ?? '');
  const [body, setBody] = useState(template.body);
  const attachment = template.attachment;

  const save = async () => {
    if (!name.trim() || !body.trim()) {
      Alert.alert('Add a name and message', 'Both fields are needed before this template can be saved.');
      return;
    }
    await onSave({
      name: name.trim(),
      subject: channel === 'email' ? subject.trim() : null,
      body: body.trim(),
    });
    setEditing(false);
  };

  const confirmRemove = () => {
    Alert.alert('Delete template', `Delete "${template.name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onRemove },
    ]);
  };

  return (
    <View className="bg-white border border-hairline rounded-lg p-4 mb-[10px]">
      <View className="flex-row items-center gap-[10px] mb-3">
        {channel === 'whatsapp' ? <WhatsAppIcon size={17} color="#25D366" /> : <MailIcon size={17} color="#0B132B" strokeWidth={1.75} />}
        {editing ? (
          <RNTextInput
            className="flex-1 h-[36px] border border-hairline rounded-md px-3 text-[13px] font-bold text-navy"
            placeholder="Template name"
            placeholderTextColor="#97A3B8"
            value={name}
            onChangeText={setName}
          />
        ) : (
          <Typography className="flex-1 text-[13.5px] font-bold text-navy" numberOfLines={1}>
            {template.name}
          </Typography>
        )}
        {template.isDefault ? (
          <View className="bg-gold/[0.16] rounded-full px-[9px] py-[4px]">
            <Typography className="text-[10.5px] font-bold text-[#8A6100]">Default</Typography>
          </View>
        ) : !editing ? (
          <Pressable onPress={onSetDefault}>
            <Typography className="text-[11px] font-bold text-slate">Set default</Typography>
          </Pressable>
        ) : null}
      </View>

      {channel === 'email' ? (
        editing ? (
          <RNTextInput
            className="border border-hairline rounded-md px-3 h-[38px] text-[12.5px] font-bold text-navy mb-[8px]"
            placeholder="Subject line"
            placeholderTextColor="#97A3B8"
            value={subject}
            onChangeText={setSubject}
          />
        ) : template.subject ? (
          <MergeFieldText text={template.subject} className="text-[12.5px] font-bold text-navy mb-[6px]" />
        ) : null
      ) : null}

      {editing ? (
        <RNTextInput
          className="bg-section rounded-xl px-[14px] py-3 text-[13px] leading-[1.55] text-ink-muted"
          value={body}
          onChangeText={setBody}
          multiline
          placeholder="Message — use {{name}} and {{event}} to personalise"
          placeholderTextColor="#97A3B8"
        />
      ) : (
        <View className="bg-section rounded-xl px-[14px] py-3">
          <MergeFieldText text={template.body} className="text-[13px] leading-[1.55] text-ink-muted" />
        </View>
      )}

      {/* Read-only: an attachment already on the row is shown, but there is no
          way to send one, so there is no way to add one. See the note above. */}
      {attachment ? (
        <View className="mt-3">
          <View className="flex-row items-center gap-[10px] border border-hairline rounded-lg px-3 py-[10px]">
            <View className="w-8 h-8 rounded-[9px] bg-surface items-center justify-center">
              <FileIcon size={15} />
            </View>
            <View className="flex-1 min-w-0">
              <Typography className="text-[12.5px] font-bold text-navy" numberOfLines={1}>
                {attachment.name}
              </Typography>
              <Typography className="text-[11px] text-slate mt-[1px]">
                {[formatFileSize(attachment.sizeBytes), 'not sent with deep links']
                  .filter(Boolean)
                  .join(' · ')}
              </Typography>
            </View>
          </View>
        </View>
      ) : null}

      <View className="flex-row items-center gap-[18px] mt-3 pt-3 border-t border-section">
        <Pressable onPress={editing ? () => void save() : () => setEditing(true)} disabled={busy}>
          <Typography className={`text-[12px] font-bold ${busy ? 'text-slate' : 'text-gold'}`}>
            {editing ? (busy ? 'Saving…' : 'Save') : 'Edit'}
          </Typography>
        </Pressable>
        <Pressable onPress={confirmRemove} disabled={busy}>
          <Typography className="text-[12px] font-bold text-[#C23B3B]">Delete</Typography>
        </Pressable>
      </View>
    </View>
  );
}

interface Props {
  channel: MessageChannel;
  intro: string;
  addLabel: string;
}

export function MessageTemplateManager({ channel, intro, addLabel }: Props) {
  const { data: templates, isLoading } = useTemplates(channel);
  const { create, update, remove, makeDefault } = useTemplateMutations(channel);
  const isAdmin = useSessionStore((s) => s.user?.role === 'admin');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const busy = create.isPending || update.isPending || remove.isPending || makeDefault.isPending;

  // Templates are organisation-wide and admin-only to write. Saying so before
  // the tap beats a 42501 after it.
  const guard = () => {
    if (isAdmin) return true;
    Alert.alert('Admins only', 'Only an admin can change the message templates the team sends.');
    return false;
  };

  const fail = (err: unknown) => {
    const message =
      err && typeof err === 'object' && 'code' in err
        ? describeTemplateError(err as Parameters<typeof describeTemplateError>[0])
        : err instanceof Error
          ? err.message
          : 'Try again.';
    Alert.alert("Couldn't save that", message);
  };

  const addNew = async () => {
    if (!guard()) return;
    try {
      // Created with placeholder text rather than blank: the row has NOT NULL
      // name and body columns, so an empty draft cannot be persisted the way the
      // old local store allowed.
      const created = await create.mutateAsync({
        name: 'New template',
        subject: channel === 'email' ? 'Great meeting you at {{event}}' : null,
        body: 'Hi {{name}}, great meeting you at {{event}}.',
      });
      setJustAddedId(created.id);
    } catch (err) {
      fail(err);
    }
  };

  if (isLoading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator size="small" color="#F4B000" />
      </View>
    );
  }

  return (
    <View>
      <Typography className="text-[13px] leading-[1.55] text-slate mt-[14px] mb-4">{intro}</Typography>

      {templates?.length === 0 ? (
        <View className="bg-surface rounded-lg px-4 py-[14px] mb-[10px]">
          <Typography className="text-[12.5px] text-navy leading-[1.5]">
            No templates yet. Follow-ups fall back to a plain &ldquo;great meeting you&rdquo; message
            until you add one.
          </Typography>
        </View>
      ) : null}

      {templates?.map((t) => (
        <TemplateCard
          key={t.id}
          channel={channel}
          template={t}
          startInEdit={t.id === justAddedId}
          busy={busy}
          onSave={async (patch) => {
            if (!guard()) return;
            try {
              await update.mutateAsync({ id: t.id, ...patch });
              if (t.id === justAddedId) setJustAddedId(null);
            } catch (err) {
              fail(err);
            }
          }}
          onRemove={() => {
            if (!guard()) return;
            remove.mutate(t.id, { onError: fail });
          }}
          onSetDefault={() => {
            if (!guard()) return;
            makeDefault.mutate(t.id, { onError: fail });
          }}
        />
      ))}

      <Pressable
        onPress={() => void addNew()}
        disabled={busy}
        className="flex-row items-center gap-2 border-[1.5px] border-dashed border-hairline rounded-lg px-4 py-[14px]"
      >
        <PlusIcon />
        <Typography className="text-[13.5px] font-bold text-gold">{addLabel}</Typography>
      </Pressable>
    </View>
  );
}
