import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PREDEFINED_CATEGORIES = [
  'Agriculture',
  'Apparel',
  'Automotive',
  'Chemicals',
  'Construction & Building Materials',
  'Electronics & Electrical',
  'Food and Beverage',
  'Furniture & Home Decor',
  'Handicrafts',
  'Hospitality & Tourism',
  'Information Technology',
  'Jewellery & Gems',
  'Logistics',
  'Machine Tools & Engineering',
  'Manufacturing',
  'Pharmaceuticals & Healthcare',
  'Plastics & Packaging',
  'Renewable',
  'Retail & E-commerce',
  'Textile',
];

type CompanyState = {
  customCategories: string[];
  selectedCategory: string | null;
  addCategory: (name: string) => void;
  selectCategory: (name: string) => void;
};

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      customCategories: [],
      selectedCategory: null,
      addCategory: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const alreadyExists = [...PREDEFINED_CATEGORIES, ...state.customCategories].some(
            (c) => c.toLowerCase() === trimmed.toLowerCase()
          );
          return {
            customCategories: alreadyExists ? state.customCategories : [...state.customCategories, trimmed],
            selectedCategory: trimmed,
          };
        }),
      selectCategory: (name) => set({ selectedCategory: name }),
    }),
    {
      name: 'yieldd-company',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
