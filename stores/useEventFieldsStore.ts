import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CustomFieldType = 'Text' | 'Number' | 'Dropdown' | 'Checkbox' | 'Radio';

export type CustomFieldDef = {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  options: string[];
};

type EventFieldsState = {
  customFields: CustomFieldDef[];
  addField: () => void;
  updateField: (id: string, patch: Partial<CustomFieldDef>) => void;
  removeField: (id: string) => void;
  addOption: (id: string, option: string) => void;
  removeOption: (id: string, option: string) => void;
};

const MAX_CUSTOM_FIELDS = 5;

function fieldId() {
  return `cf_${Math.random().toString(36).slice(2, 10)}`;
}

export const useEventFieldsStore = create<EventFieldsState>()(
  persist(
    (set) => ({
      customFields: [],
      addField: () =>
        set((state) => {
          if (state.customFields.length >= MAX_CUSTOM_FIELDS) return state;
          return {
            customFields: [
              ...state.customFields,
              { id: fieldId(), name: '', type: 'Text', required: false, options: [] },
            ],
          };
        }),
      updateField: (id, patch) =>
        set((state) => ({
          customFields: state.customFields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      removeField: (id) =>
        set((state) => ({ customFields: state.customFields.filter((f) => f.id !== id) })),
      addOption: (id, option) =>
        set((state) => ({
          customFields: state.customFields.map((f) =>
            f.id === id && option.trim() && !f.options.includes(option.trim())
              ? { ...f, options: [...f.options, option.trim()] }
              : f
          ),
        })),
      removeOption: (id, option) =>
        set((state) => ({
          customFields: state.customFields.map((f) =>
            f.id === id ? { ...f, options: f.options.filter((o) => o !== option) } : f
          ),
        })),
    }),
    {
      name: 'yieldd-event-fields',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
