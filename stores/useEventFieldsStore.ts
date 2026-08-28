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
  /**
   * Replaces the whole list — used to load an event's saved fields in, and to
   * write the server's ids back after a save. This store is the editing surface
   * for one event at a time, not a second copy of the truth; the truth is
   * `event_custom_field_defs`.
   */
  setFields: (fields: CustomFieldDef[]) => void;
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
      setFields: (customFields) => set({ customFields }),
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
      // v2: fields are per-event and live in the database now. A v1 cache holds
      // one global list that would otherwise be pushed onto whichever event is
      // opened first.
      version: 2,
      migrate: () => ({ customFields: [] }),
    }
  )
);
