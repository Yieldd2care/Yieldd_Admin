import { View } from 'react-native';

import { Typography } from '../ui/Typography';

const POINTS = [
  {
    n: '01',
    text: 'A pocket full of cards and a notebook of scribbles. By the time anyone types them into a sheet, the context is gone.',
  },
  {
    n: '02',
    text: 'The first message goes out days later, when the buyer has already spoken to competitors who replied the same evening.',
  },
  {
    n: '03',
    text: "Stall, travel, printing, people. Nobody can say what the event produced, so next year's budget is a guess.",
  },
];

export function ProblemSection() {
  return (
    <View className="bg-white px-8 pt-[52px] pb-[104px]">
      <View className="max-w-[1200px] w-full mx-auto">
        <View className="pb-9">
          <Typography variant="caption" className="text-gold">
            After the handshake
          </Typography>
          <Typography variant="display-lg" className="text-navy mt-4 max-w-[760px]">
            A stall costs lakhs. The leads leak out for free.
          </Typography>
        </View>
        <View className="flex-col md:flex-row gap-9">
          {POINTS.map((p) => (
            <View key={p.n} className="flex-1 flex-row gap-[18px]">
              <Typography className="text-[13px] font-bold text-blue pt-1">{p.n}</Typography>
              <Typography className="flex-1 text-[17px] text-slate leading-[1.7]">{p.text}</Typography>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
