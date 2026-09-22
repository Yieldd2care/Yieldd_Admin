import { Text } from 'react-native';

import { AutoGrid } from './primitives/AutoGrid';
import { Section } from './primitives/Section';
import { WebCard } from './primitives/WebCard';

/**
 * Four claims, as separate lifted cards.
 *
 * Previously one bordered four-cell bar pulled up over the hero with `-mt-11`.
 * That overlap is gone: the hero now ends with its own light strip, with the
 * product mock hanging into it, and a card pulled upward would land on top of
 * the mock.
 *
 * The tone is `section` rather than white so the band continues the strip the
 * hero finishes on without a seam appearing underneath the mock.
 */

const STATS = [
  { value: '10x faster', label: 'lead capture at the booth' },
  { value: '70% less', label: 'manual typing after the show' },
  { value: 'Never lose', label: 'a card or a conversation' },
  { value: 'Same-day', label: 'follow-up, every lead' },
];

export function StatStrip() {
  return (
    <Section tone="section" pad="md">
      <AutoGrid min={210} gap={16}>
        {STATS.map((stat) => (
          <WebCard key={stat.value} pad="md" className="h-full">
            <Text className="[font-family:Figtree,system-ui,sans-serif] [font-weight:800] text-[clamp(24px,2.4vw,32px)] leading-[1.1] tracking-[-0.02em] text-navy">
              {stat.value}
            </Text>
            <Text className="[font-family:Figtree,system-ui,sans-serif] text-[14px] leading-[1.5] text-slate mt-[8px]">
              {stat.label}
            </Text>
          </WebCard>
        ))}
      </AutoGrid>
    </Section>
  );
}
