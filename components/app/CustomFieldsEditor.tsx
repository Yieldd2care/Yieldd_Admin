import { useState } from 'react';
import { Pressable, TextInput as RNTextInput, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { Toggle } from '../ui/Toggle';
import { CloseIcon, PlusIcon } from '../ui/icons';
import { useEventFieldsStore, type CustomFieldType } from '../../stores/useEventFieldsStore';

const TYPES: CustomFieldType[] = ['Text', 'Number', 'Dropdown', 'Radio', 'Checkbox'];
const NEEDS_OPTIONS: CustomFieldType[] = ['Dropdown', 'Radio'];
const MAX_CUSTOM_FIELDS = 5;

export function CustomFieldsEditor() {
  const customFields = useEventFieldsStore((s) => s.customFields);
  const addField = useEventFieldsStore((s) => s.addField);
  const updateField = useEventFieldsStore((s) => s.updateField);
  const removeField = useEventFieldsStore((s) => s.removeField);
  const addOption = useEventFieldsStore((s) => s.addOption);
  const removeOption = useEventFieldsStore((s) => s.removeOption);

  return (
    <View>
      <Typography variant="caption" className="text-slate mb-[10px]">
        Your own fields
      </Typography>

      {customFields.map((field) => (
        <View key={field.id} className="bg-white border border-hairline rounded-lg p-4 mb-[10px] gap-[10px]">
          <View className="flex-row items-center gap-2">
            <RNTextInput
              className="flex-1 h-[44px] border border-hairline rounded-md px-3 text-[13.5px] font-regular text-navy"
              placeholder="Field name (e.g. Budget range)"
              placeholderTextColor="#97A3B8"
              value={field.name}
              onChangeText={(v) => updateField(field.id, { name: v })}
            />
            <Pressable onPress={() => removeField(field.id)} className="w-[38px] h-[38px] items-center justify-center">
              <CloseIcon size={14} color="#97A3B8" />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => updateField(field.id, { type })}
                className={`px-3 py-[6px] rounded-full ${field.type === type ? 'bg-gold' : 'bg-surface'}`}
              >
                <Typography className={`text-[12px] font-bold ${field.type === type ? 'text-navy' : 'text-slate'}`}>
                  {type}
                </Typography>
              </Pressable>
            ))}
          </View>

          {NEEDS_OPTIONS.includes(field.type) ? (
            <OptionsEditor
              options={field.options}
              onAdd={(v) => addOption(field.id, v)}
              onRemove={(v) => removeOption(field.id, v)}
            />
          ) : null}

          <Pressable
            onPress={() => updateField(field.id, { required: !field.required })}
            className="flex-row items-center justify-between pt-[2px]"
          >
            <Typography className="text-[12.5px] font-semibold text-navy">Required</Typography>
            <Toggle value={field.required} onValueChange={(v) => updateField(field.id, { required: v })} />
          </Pressable>
        </View>
      ))}

      {customFields.length < MAX_CUSTOM_FIELDS ? (
        <Pressable
          onPress={addField}
          className="flex-row items-center gap-2 border-[1.5px] border-dashed border-hairline rounded-lg px-4 py-[14px]"
        >
          <PlusIcon />
          <Typography className="text-[13.5px] font-bold text-gold">Add a custom field</Typography>
        </Pressable>
      ) : null}
    </View>
  );
}

function OptionsEditor({
  options,
  onAdd,
  onRemove,
}: {
  options: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (draft.trim()) {
      onAdd(draft);
      setDraft('');
    }
  };

  return (
    <View className="gap-[8px]">
      {options.length ? (
        <View className="flex-row flex-wrap gap-[6px]">
          {options.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onRemove(opt)}
              className="flex-row items-center gap-1 bg-surface rounded-full pl-3 pr-2 py-[5px]"
            >
              <Typography className="text-[11.5px] font-semibold text-navy">{opt}</Typography>
              <CloseIcon size={11} color="#5A6B87" />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View className="flex-row items-center gap-2">
        <RNTextInput
          className="flex-1 h-[38px] border border-hairline rounded-md px-3 text-[13px] text-navy"
          placeholder="Add an option (e.g. Small)"
          placeholderTextColor="#97A3B8"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
        />
        <Pressable onPress={submit} className="w-[38px] h-[38px] rounded-md bg-surface items-center justify-center">
          <PlusIcon size={14} />
        </Pressable>
      </View>
    </View>
  );
}
