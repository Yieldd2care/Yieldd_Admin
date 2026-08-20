import { View, type LayoutChangeEvent } from 'react-native';
import { MotiView } from 'moti';

import { Typography } from '../ui/Typography';
import { RadialGlow } from '../ui/RadialGlow';

const STATS = [
  { value: '30 sec', label: 'card to saved lead', accent: false },
  { value: '0 bars', label: 'signal required', accent: true },
  { value: '1 tap', label: 'brochure or quote sent', accent: false },
  { value: '₹684', label: 'cost per lead, live', accent: false },
];

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function ROISection({ onLayout }: Props) {
  return (
    <View onLayout={onLayout} className="relative bg-navy overflow-hidden px-8 py-28">
      <RadialGlow color="#1D3F8A" size={460} className="left-0 bottom-0" />
      <View className="max-w-[1200px] w-full mx-auto flex-col lg:flex-row gap-16 items-center">
        <View className="flex-1 w-full">
          <View className="flex-row items-center gap-[11px]">
            <MotiView
              className="w-2 h-2 rounded-full bg-gold"
              from={{ scale: 1, opacity: 1 }}
              animate={{ scale: 1.3, opacity: 0.6 }}
              transition={{ type: 'timing', duration: 1200, loop: true, repeatReverse: true }}
            />
            <Typography variant="caption" className="text-gold">
              Built for business leaders
            </Typography>
          </View>
          <Typography variant="display-lg" className="text-white mt-[18px]">
            You paid to get the lead. Know what it was{' '}
            <Typography variant="display-lg" className="text-gold">
              worth
            </Typography>
            .
          </Typography>
          <Typography variant="body-lg" className="text-white/[0.76] mt-[22px] max-w-[520px]">
            Every event holds its own venue, stall, dates, organiser and cost. Leads, lists and
            fields sit inside it, so the report writes itself. Next year you book the show that
            paid for itself and skip the one that didn&apos;t.
          </Typography>
        </View>
        <View className="flex-1 w-full gap-px rounded-lg overflow-hidden bg-white/[0.16]">
          <View className="flex-row gap-px">
            {STATS.slice(0, 2).map((s) => (
              <View key={s.label} className="flex-1 bg-navy px-6 py-[26px]">
                <Typography className={`text-[34px] font-extrabold tracking-tight leading-none ${s.accent ? 'text-gold' : 'text-white'}`}>
                  {s.value}
                </Typography>
                <Typography className="text-sm text-white/[0.60] mt-2">{s.label}</Typography>
              </View>
            ))}
          </View>
          <View className="flex-row gap-px">
            {STATS.slice(2, 4).map((s) => (
              <View key={s.label} className="flex-1 bg-navy px-6 py-[26px]">
                <Typography className={`text-[34px] font-extrabold tracking-tight leading-none ${s.accent ? 'text-gold' : 'text-white'}`}>
                  {s.value}
                </Typography>
                <Typography className="text-sm text-white/[0.60] mt-2">{s.label}</Typography>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
