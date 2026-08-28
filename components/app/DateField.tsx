import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { CalendarIcon } from '../ui/icons';
import { CalendarSheet } from './CalendarSheet';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(d: Date) {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date | null;
  placeholder?: string;
}

export function DateField({ label, value, onChange, minDate, placeholder = 'Select date' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View className="gap-[7px]">
      <Typography variant="body-sm" className="text-ink-muted">
        {label}
      </Typography>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-[52px] bg-white rounded-md px-4 border border-hairline flex-row items-center justify-between"
      >
        <Typography className={`text-[15.5px] font-regular ${value ? 'text-navy' : 'text-placeholder'}`}>
          {value ? formatDate(value) : placeholder}
        </Typography>
        <CalendarIcon size={18} />
      </Pressable>

      <CalendarSheet
        visible={open}
        value={value}
        minDate={minDate}
        title={label}
        onSelect={(date) => {
          onChange(date);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
