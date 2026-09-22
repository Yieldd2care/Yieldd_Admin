import { Text, View, type LayoutChangeEvent } from 'react-native';

import { AutoGrid } from './primitives/AutoGrid';
import { ComparisonTable } from './primitives/ComparisonTable';
import { Mark } from './primitives/Mark';
import { Section } from './primitives/Section';
import { SectionHeader } from './primitives/SectionHeader';
import { WebCard } from './primitives/WebCard';

/**
 * What an event actually returned.
 *
 * This band used to be navy. It is light now because the page follows the
 * reference's rhythm: one dark hero, one dark panel in the middle, one dark
 * close. Three dark bands in the first half made the page feel like it kept
 * starting over.
 *
 * The comparison table is the reference's device for this section, and it is
 * the one place the page states the alternative plainly.
 */

const STATS = [
  { value: '30 sec', label: 'card to saved lead', accent: false },
  { value: '0 bars', label: 'signal required', accent: true },
  { value: '1 tap', label: 'brochure or quote sent', accent: false },
  { value: '₹684', label: 'cost per lead, live', accent: false },
];

const ROWS = [
  {
    label: 'Capturing a lead',
    before: 'A minute of typing, if the pen still works',
    after: 'About thirty seconds, by camera or voice',
  },
  {
    label: 'First follow-up',
    before: 'Days after the show has closed',
    after: 'Before they have left the stall',
  },
  {
    label: 'The data itself',
    before: 'Retyped by hand, duplicated, guessed at',
    after: 'Read off the card, duplicates flagged',
  },
  {
    label: 'Cost per lead',
    before: 'Worked out weeks later, if at all',
    after: 'Live, for the event you are standing in',
  },
  {
    label: 'With no signal',
    before: 'Nothing gets recorded',
    after: 'Captures offline and syncs when it can',
  },
];

const BODY = '[font-family:Figtree,system-ui,sans-serif]';

interface Props {
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function ROISection({ onLayout }: Props) {
  return (
    <Section tone="section" pad="lg" onLayout={onLayout}>
      <SectionHeader
        tone="onLight"
        eyebrow="Built for business leaders"
        title={
          <>
            You paid to get the lead. Know <Mark>what it was worth</Mark>.
          </>
        }
        lede="Every event holds its own venue, stall, dates, organiser and cost. Leads, lists and fields sit inside it, so the report writes itself. Next year you book the show that paid for itself and skip the one that didn't."
      />

      <AutoGrid min={210} gap={16} className="mt-10">
        {STATS.map((stat) => (
          <WebCard key={stat.label} pad="md" className="h-full">
            <Text
              className={`${BODY} [font-weight:800] text-[clamp(26px,2.6vw,36px)] leading-[1.05] tracking-[-0.02em] ${
                stat.accent ? 'text-gold' : 'text-navy'
              }`}
            >
              {stat.value}
            </Text>
            <Text className={`${BODY} text-[14px] leading-[1.5] text-slate mt-[8px]`}>
              {stat.label}
            </Text>
          </WebCard>
        ))}
      </AutoGrid>

      <ComparisonTable
        columns={['', 'Cards and a spreadsheet', 'With Yieldd']}
        rows={ROWS}
        className="mt-[18px]"
      />

      <Text className={`${BODY} text-[13px] text-label mt-[14px]`}>
        Figures are what the product is built to do, measured on a four-day show.
      </Text>
    </Section>
  );
}
