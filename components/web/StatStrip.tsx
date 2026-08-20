import { View } from 'react-native';

import { Typography } from '../ui/Typography';

const STATS = [
  { value: '10x faster', label: 'lead capture at the booth' },
  { value: '70% less', label: 'manual typing after the show' },
  { value: 'Never lose', label: 'a card or a conversation' },
  { value: 'Same-day', label: 'follow-up, every lead' },
];

export function StatStrip() {
  return (
    <View className="bg-white px-8">
      <View className="max-w-[1200px] w-full mx-auto -mt-11 border border-hairline rounded-lg bg-white shadow-[0_18px_40px_rgba(11,19,43,0.10)] flex-col md:flex-row">
        {STATS.map((stat, i) => (
          <View
            key={stat.value}
            className={`flex-1 px-[30px] py-[26px] ${
              i < STATS.length - 1 ? 'border-b md:border-b-0 md:border-r border-surface' : ''
            }`}
          >
            <Typography className="text-[19px] font-extrabold tracking-tight text-navy">
              {stat.value}
            </Typography>
            <Typography className="text-[14.5px] text-slate mt-[3px]">{stat.label}</Typography>
          </View>
        ))}
      </View>
    </View>
  );
}
