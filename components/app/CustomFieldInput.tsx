import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { TextInput } from '../ui/TextInput';
import { Toggle } from '../ui/Toggle';
import type { CustomFieldDef } from '../../stores/useEventFieldsStore';
import type { CustomFieldValue } from '../../data/leads';

export function isCustomFieldFilled(field: CustomFieldDef, value: CustomFieldValue | undefined) {
  if (field.type === 'Checkbox') return value === true;
  return typeof value === 'string' && value.trim().length > 0;
}

export function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDef;
  value: CustomFieldValue | undefined;
  onChange: (value: CustomFieldValue) => void;
}) {
  const label = `${field.name || 'Untitled field'}${field.required ? ' *' : ''}`;

  if (field.type === 'Checkbox') {
    return (
      <View className="flex-row items-center justify-between bg-white border border-hairline rounded-md px-4 py-[14px]">
        <Typography className="text-[13px] font-semibold text-navy flex-1 pr-3">{label}</Typography>
        <Toggle value={value === true} onValueChange={onChange} />
      </View>
    );
  }

  if (field.type === 'Dropdown' || field.type === 'Radio') {
    return (
      <View className="gap-[9px]">
        <Typography variant="body-sm" className="text-ink-muted">
          {label}
        </Typography>
        <View className="flex-row flex-wrap gap-2">
          {field.options.length === 0 ? (
            <Typography className="text-[12px] text-slate">No options set for this field yet.</Typography>
          ) : (
            field.options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => onChange(opt)}
                className={`px-3 py-[7px] rounded-full ${value === opt ? 'bg-gold' : 'bg-surface'}`}
              >
                <Typography className={`text-[12.5px] font-bold ${value === opt ? 'text-navy' : 'text-slate'}`}>
                  {opt}
                </Typography>
              </Pressable>
            ))
          )}
        </View>
      </View>
    );
  }

  return (
    <TextInput
      label={label}
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
      keyboardType={field.type === 'Number' ? 'number-pad' : 'default'}
    />
  );
}
