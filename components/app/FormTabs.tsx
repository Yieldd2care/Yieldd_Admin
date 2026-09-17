import { Pressable, View } from 'react-native';

import { Typography } from '../ui/Typography';

export type LeadFormTab = 'person' | 'company';

interface Props {
  tab: LeadFormTab;
  onChange: (tab: LeadFormTab) => void;
  /** Shown on the tab itself, so a rep can see a section has content without
   *  opening it — the whole risk of hiding half a form behind a switch. */
  personFilled?: number;
  companyFilled?: number;
}

/**
 * Person info / Company info, as two cards the rep picks between.
 *
 * The two groups used to be stacked, one long scroll with a heading notched
 * into each panel. That put the company's landline four screens below the
 * person's name and made the form feel like a questionnaire. Splitting them
 * means the rep only ever sees the half they are filling.
 *
 * Deliberately the same control as `components/auth/AuthTabs.tsx` — a pill
 * track with the selected tab filled in gold — because the app already teaches
 * that shape on the very first screen anyone sees. The colours differ only
 * because this one sits on a light background and that one sits on navy.
 *
 * The count is what makes hiding a section safe. Without it, a rep who filled
 * the company details and switched away has no way to tell, from this screen,
 * that anything is in there.
 */
export function FormTabs({ tab, onChange, personFilled = 0, companyFilled = 0 }: Props) {
  const isPerson = tab === 'person';

  return (
    <View className="flex-row gap-[3px] bg-surface rounded-full p-[4px]">
      <Tab
        label="Person info"
        count={personFilled}
        active={isPerson}
        onPress={() => onChange('person')}
      />
      <Tab
        label="Company info"
        count={companyFilled}
        active={!isPerson}
        onPress={() => onChange('company')}
      />
    </View>
  );
}

function Tab({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count > 0 ? `${label}, ${count} filled in` : label}
      // Only the background and text colours change between the two states.
      // No shadow, no transform, no pseudo-class appearing on one branch only:
      // this control re-renders on every tap, and a class list that gains its
      // first variable-backed utility mid-life is what makes NativeWind throw
      // the bogus "Couldn't find a navigation context" screen — see AGENTS.md.
      className={`flex-1 flex-row items-center justify-center gap-[6px] py-[11px] rounded-full ${
        active ? 'bg-gold' : 'bg-surface'
      }`}
    >
      <Typography className={`text-[13px] font-bold ${active ? 'text-navy' : 'text-slate'}`}>
        {label}
      </Typography>
      {count > 0 ? (
        <View
          className={`min-w-[18px] h-[18px] px-[5px] rounded-full items-center justify-center ${
            active ? 'bg-navy' : 'bg-white'
          }`}
        >
          <Typography
            className={`text-[10.5px] font-bold ${active ? 'text-gold' : 'text-slate'}`}
          >
            {count}
          </Typography>
        </View>
      ) : null}
    </Pressable>
  );
}
