import { useState } from 'react';
import { Alert, Pressable, TextInput as RNTextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { Typography } from '../ui/Typography';
import { CloseIcon, FileIcon, MailIcon, PlusIcon, WhatsAppIcon } from '../ui/icons';
import {
  useTemplatesStore,
  type MessageChannel,
  type MessageTemplate,
  type TemplateAttachment,
} from '../../stores/useTemplatesStore';

function formatFileSize(bytes?: number) {
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
}: {
  channel: MessageChannel;
  template: MessageTemplate;
  startInEdit: boolean;
  onSave: (patch: { name: string; subject?: string; body: string; attachment?: TemplateAttachment }) => void;
  onRemove: () => void;
  onSetDefault: () => void;
}) {
  const [editing, setEditing] = useState(startInEdit);
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject ?? '');
  const [body, setBody] = useState(template.body);
  const [attachment, setAttachment] = useState<TemplateAttachment | undefined>(template.attachment);

  const save = () => {
    if (!name.trim() || !body.trim()) {
      Alert.alert('Add a name and message', 'Both fields are needed before this template can be saved.');
      return;
    }
    onSave({
      name: name.trim(),
      subject: channel === 'email' ? subject.trim() : undefined,
      body: body.trim(),
      attachment,
    });
    setEditing(false);
  };

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setAttachment({ name: asset.name, uri: asset.uri, size: asset.size, mimeType: asset.mimeType });
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

      {editing || attachment ? (
        <View className="mt-3">
          {attachment ? (
            <View className="flex-row items-center gap-[10px] border border-hairline rounded-lg px-3 py-[10px]">
              <View className="w-8 h-8 rounded-[9px] bg-surface items-center justify-center">
                <FileIcon size={15} />
              </View>
              <View className="flex-1 min-w-0">
                <Typography className="text-[12.5px] font-bold text-navy" numberOfLines={1}>
                  {attachment.name}
                </Typography>
                {attachment.size ? (
                  <Typography className="text-[11px] text-slate mt-[1px]">{formatFileSize(attachment.size)}</Typography>
                ) : null}
              </View>
              {editing ? (
                <Pressable onPress={() => setAttachment(undefined)} className="w-7 h-7 items-center justify-center">
                  <CloseIcon size={13} color="#97A3B8" />
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Pressable
              onPress={pickAttachment}
              className="flex-row items-center gap-2 border-[1.5px] border-dashed border-hairline rounded-lg px-4 py-[12px]"
            >
              <PlusIcon />
              <Typography className="text-[13px] font-bold text-gold">Attach a file</Typography>
            </Pressable>
          )}
        </View>
      ) : null}

      <View className="flex-row items-center gap-[18px] mt-3 pt-3 border-t border-section">
        <Pressable onPress={editing ? save : () => setEditing(true)}>
          <Typography className="text-[12px] font-bold text-gold">{editing ? 'Save' : 'Edit'}</Typography>
        </Pressable>
        <Pressable onPress={confirmRemove}>
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
  const templates = useTemplatesStore((s) => (channel === 'whatsapp' ? s.whatsappTemplates : s.emailTemplates));
  const addTemplate = useTemplatesStore((s) => s.addTemplate);
  const updateTemplate = useTemplatesStore((s) => s.updateTemplate);
  const removeTemplate = useTemplatesStore((s) => s.removeTemplate);
  const setDefaultTemplate = useTemplatesStore((s) => s.setDefaultTemplate);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const addNew = () => {
    const id = addTemplate(channel, {
      name: '',
      subject: channel === 'email' ? '' : undefined,
      body: '',
    });
    setJustAddedId(id);
  };

  return (
    <View>
      <Typography className="text-[13px] leading-[1.55] text-slate mt-[14px] mb-4">{intro}</Typography>

      {templates.map((t) => (
        <TemplateCard
          key={t.id}
          channel={channel}
          template={t}
          startInEdit={t.id === justAddedId}
          onSave={(patch) => {
            updateTemplate(channel, t.id, patch);
            if (t.id === justAddedId) setJustAddedId(null);
          }}
          onRemove={() => removeTemplate(channel, t.id)}
          onSetDefault={() => setDefaultTemplate(channel, t.id)}
        />
      ))}

      <Pressable
        onPress={addNew}
        className="flex-row items-center gap-2 border-[1.5px] border-dashed border-hairline rounded-lg px-4 py-[14px]"
      >
        <PlusIcon />
        <Typography className="text-[13.5px] font-bold text-gold">{addLabel}</Typography>
      </Pressable>
    </View>
  );
}
