import { useState } from 'react';
import { Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Typography } from '../../../components/ui/Typography';
import { ScreenHeader } from '../../../components/app/ScreenHeader';
import { CheckIcon, PlusIcon } from '../../../components/ui/icons';
import { PREDEFINED_CATEGORIES, useCompanyStore } from '../../../stores/useCompanyStore';

export default function ManageCategoryScreen() {
  const customCategories = useCompanyStore((s) => s.customCategories);
  const selectedCategory = useCompanyStore((s) => s.selectedCategory);
  const addCategory = useCompanyStore((s) => s.addCategory);
  const selectCategory = useCompanyStore((s) => s.selectCategory);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const categories = [...PREDEFINED_CATEGORIES, ...customCategories];

  const submitNew = () => {
    if (!draft.trim()) return;
    addCategory(draft);
    setDraft('');
    setAdding(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-section" edges={['top', 'bottom']}>
      <ScreenHeader title="Manage category" />
      <ScrollView contentContainerClassName="px-5 pt-5 pb-10" showsVerticalScrollIndicator={false}>
        <Typography className="text-[13px] leading-[1.55] text-slate mb-5">
          Pick the category that best describes your company. It appears on your events and exports.
        </Typography>

        <View className="bg-white border border-hairline rounded-2xl px-4">
          {categories.map((cat, i) => {
            const selected = cat === selectedCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => selectCategory(cat)}
                className={`flex-row items-center justify-between py-[14px] ${
                  i < categories.length - 1 ? 'border-b border-section' : ''
                }`}
              >
                <Typography className={`text-[13.5px] ${selected ? 'font-bold text-navy' : 'font-semibold text-ink-muted'}`}>
                  {cat}
                </Typography>
                <View
                  className={`w-5 h-5 rounded-full items-center justify-center ${
                    selected ? 'bg-gold' : 'border-[1.5px] border-hairline'
                  }`}
                >
                  {selected ? <CheckIcon size={11} color="#0B132B" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {adding ? (
          <View className="flex-row items-center gap-2 mt-[14px]">
            <RNTextInput
              autoFocus
              className="flex-1 h-[44px] bg-white border border-hairline rounded-md px-3 text-[13.5px] text-navy"
              placeholder="Category name"
              placeholderTextColor="#97A3B8"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitNew}
              returnKeyType="done"
            />
            <Pressable onPress={submitNew} className="w-[44px] h-[44px] rounded-md bg-gold items-center justify-center">
              <PlusIcon color="#0B132B" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
            className="flex-row items-center gap-2 border-[1.5px] border-dashed border-hairline rounded-lg px-4 py-[14px] mt-[14px]"
          >
            <PlusIcon />
            <Typography className="text-[13.5px] font-bold text-gold">Add a category</Typography>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
