import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Typography } from '../../../../components/ui/Typography';
import { Button } from '../../../../components/ui/Button';
import { ScreenHeader } from '../../../../components/app/ScreenHeader';
import { CustomFieldsEditor } from '../../../../components/app/CustomFieldsEditor';
import { useEventFieldsStore } from '../../../../stores/useEventFieldsStore';
import { fetchEventFields, saveEventFields } from '../../../../lib/api/eventFields';

export default function EventCustomFieldsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const setFields = useEventFieldsStore((s) => s.setFields);
  const customFields = useEventFieldsStore((s) => s.customFields);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded fresh every time. The editor's store is a scratch pad for one event;
  // opening a second event with the first one's fields still in it would save
  // them onto the wrong show.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    fetchEventFields(id)
      .then((fields) => {
        if (!cancelled) setFields(fields);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this event's fields. You may be offline.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, setFields]);

  const save = async () => {
    if (!id || isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      setFields(await saveEventFields(id, customFields));
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Those fields didn't save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Custom fields" />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-8" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
          Add or change what reps capture for this event, any time — even mid-show. Mark a field
          required and every rep has to fill it in before a lead saves.
        </Typography>

        {isLoading ? (
          <ActivityIndicator color="#F4B000" />
        ) : (
          <View>
            <CustomFieldsEditor />
          </View>
        )}

        {error ? (
          <Typography className="mt-4 text-[13px] font-semibold text-[#C23B3B] leading-[1.45]">
            {error}
          </Typography>
        ) : null}
      </ScrollView>
      <View className="bg-white border-t border-hairline px-5 pt-[14px] pb-6">
        <Button
          label={isSaving ? 'Saving…' : 'Save fields'}
          disabled={isLoading || isSaving}
          onPress={save}
        />
      </View>
    </SafeAreaView>
  );
}
