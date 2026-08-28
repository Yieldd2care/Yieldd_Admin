import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { Toggle } from '../../../../components/ui/Toggle';
import { WizardHeader } from '../../../../components/app/WizardHeader';
import { CustomFieldsEditor } from '../../../../components/app/CustomFieldsEditor';
import { ClockIcon } from '../../../../components/ui/icons';
import { useEventDraftStore } from '../../../../stores/useEventDraftStore';
import {
  useEventFieldsStore,
  type CustomFieldDef,
  type CustomFieldType,
} from '../../../../stores/useEventFieldsStore';
import { fetchEventFields, saveEventFields } from '../../../../lib/api/eventFields';

function ListIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#0B132B" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="16" rx="2" />
      <Path d="M7 8h10M7 12h6" />
    </Svg>
  );
}

function BoxIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#0B132B" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="4" y="7" width="16" height="13" rx="2" />
      <Path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
    </Svg>
  );
}

/**
 * Shortcuts, not a separate kind of field.
 *
 * These used to be three toggles with their own local state that wrote nowhere
 * — turning them on changed nothing at the booth. Each one now adds or removes
 * a real field in the list below, which is what actually gets saved, so a
 * ready-made field can be renamed or given options like any other.
 */
type ReadyMade = {
  key: string;
  title: string;
  sub: string;
  icon: ReactNode;
  type: CustomFieldType;
  options: string[];
};

const READY_MADE: ReadyMade[] = [
  { key: 'product', title: 'Product interest', sub: 'Dropdown', icon: <ListIcon />, type: 'Dropdown', options: [] },
  { key: 'qty', title: 'Order quantity', sub: 'Number', icon: <BoxIcon />, type: 'Number', options: [] },
  {
    key: 'timeline',
    title: 'Buying timeline',
    sub: 'Dropdown',
    icon: <ClockIcon size={17} strokeWidth={1.75} />,
    type: 'Dropdown',
    options: ['Immediate', '1–3 months', '3–6 months', '6+ months'],
  },
];

function draftFieldId() {
  return `cf_${Math.random().toString(36).slice(2, 10)}`;
}

export default function CustomFieldsScreen() {
  const eventId = useEventDraftStore((s) => s.eventId);
  const customFields = useEventFieldsStore((s) => s.customFields);
  const setFields = useEventFieldsStore((s) => s.setFields);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whatever is already on the event wins over whatever the editor happens to
  // be holding — the store is a scratch pad for one event, not a second copy
  // of the truth.
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    fetchEventFields(eventId)
      .then((fields) => {
        if (!cancelled && fields.length) setFields(fields);
      })
      .catch(() => {
        /* The editor still works offline; the save below is what reports failure. */
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, setFields]);

  const isOn = (template: ReadyMade) =>
    customFields.some((f) => f.name.trim().toLowerCase() === template.title.toLowerCase());

  const toggleTemplate = (template: ReadyMade) => {
    const match = (f: CustomFieldDef) =>
      f.name.trim().toLowerCase() === template.title.toLowerCase();

    if (customFields.some(match)) {
      setFields(customFields.filter((f) => !match(f)));
      return;
    }
    setFields([
      ...customFields,
      {
        id: draftFieldId(),
        name: template.title,
        type: template.type,
        required: false,
        options: [...template.options],
      },
    ]);
  };

  const continueToTemplates = async () => {
    if (isSaving) return;
    setError(null);

    if (eventId) {
      setIsSaving(true);
      try {
        const saved = await saveEventFields(eventId, customFields);
        // Write the server-assigned ids back, so coming back to this screen
        // edits those rows instead of creating duplicates.
        setFields(saved);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Those fields didn't save.");
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    router.push('/(app)/events/new/templates');
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <WizardHeader title="What do you need to ask?" step={4} />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-5" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
          Turn these on to capture what your industry actually needs at the booth.
        </Typography>

        <Typography variant="caption" className="text-slate mb-[10px]">
          Ready-made fields
        </Typography>
        {READY_MADE.map((t) => {
          const on = isOn(t);
          return (
            <Pressable
              key={t.key}
              onPress={() => toggleTemplate(t)}
              className={`flex-row items-center gap-[14px] bg-white border rounded-lg p-4 mb-[10px] ${
                on ? 'border-gold/[0.45]' : 'border-hairline'
              }`}
              style={on ? { backgroundColor: 'rgba(244,176,0,0.05)' } : undefined}
            >
              <View className="w-9 h-9 rounded-md bg-surface items-center justify-center">{t.icon}</View>
              <View className="flex-1">
                <Typography className="text-[14px] font-bold text-navy">{t.title}</Typography>
                <Typography className="text-[12px] text-slate mt-[2px]">{t.sub}</Typography>
              </View>
              <Toggle value={on} onValueChange={() => toggleTemplate(t)} />
            </Pressable>
          );
        })}

        <View className="mt-5">
          <CustomFieldsEditor />
        </View>

        {error ? (
          <Typography className="mt-4 text-[13px] font-semibold text-[#C23B3B] leading-[1.45]">
            {error}
          </Typography>
        ) : null}
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6 items-center gap-3">
        <Button
          label={isSaving ? 'Saving…' : 'Continue'}
          disabled={isSaving}
          onPress={continueToTemplates}
          className="w-full"
        />
        <Pressable onPress={() => router.push('/(app)/events/new/templates')} disabled={isSaving}>
          <Typography className="text-[13px] font-semibold text-slate">Skip for now</Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
