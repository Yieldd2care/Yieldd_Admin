import { useMemo, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBeforeDay(a: Date, b: Date) {
  return !sameDay(a, b) && a.getTime() < b.getTime();
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface Props {
  visible: boolean;
  value?: Date | null;
  minDate?: Date | null;
  title?: string;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

export function CalendarSheet({ visible, value, minDate, title = 'Select date', onSelect, onClose }: Props) {
  const anchor = value ?? minDate ?? new Date();
  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = useMemo(() => new Date(), []);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-navy/[0.55]">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[22px] px-6 pt-[10px] pb-8">
          <View className="w-9 h-1 rounded-full bg-hairline self-center mb-[18px]" />

          <Typography className="text-[16px] font-bold text-navy mb-4">{title}</Typography>

          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={goPrevMonth} className="w-9 h-9 rounded-md bg-surface items-center justify-center">
              <ChevronLeftIcon size={16} />
            </Pressable>
            <Typography className="text-[14.5px] font-bold text-navy">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Typography>
            <Pressable onPress={goNextMonth} className="w-9 h-9 rounded-md bg-surface items-center justify-center">
              <ChevronRightIcon size={16} color="#0B132B" />
            </Pressable>
          </View>

          <View className="flex-row mb-1">
            {WEEKDAYS.map((w, i) => (
              <View key={`${w}-${i}`} style={{ width: `${100 / 7}%` }} className="items-center">
                <Typography className="text-[11px] font-bold text-slate">{w}</Typography>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {cells.map((date, i) => {
              if (!date) {
                return <View key={i} style={{ width: `${100 / 7}%` }} className="h-11" />;
              }
              const disabled = minDate ? isBeforeDay(date, minDate) : false;
              const selected = value ? sameDay(date, value) : false;
              const isToday = sameDay(date, today);
              return (
                <View key={i} style={{ width: `${100 / 7}%` }} className="h-11 items-center justify-center">
                  <Pressable
                    disabled={disabled}
                    onPress={() => onSelect(date)}
                    className={`w-9 h-9 rounded-full items-center justify-center ${selected ? 'bg-gold' : ''} ${
                      isToday && !selected ? 'border border-gold' : ''
                    }`}
                  >
                    <Typography
                      className="text-[13px] font-semibold text-navy"
                      style={disabled ? { opacity: 0.3 } : undefined}
                    >
                      {date.getDate()}
                    </Typography>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
