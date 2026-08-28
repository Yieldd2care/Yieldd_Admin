import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

import { LEADS, type CustomFieldValue, type Lead } from '../data/leads';

export type SyncStatus = 'draft' | 'synced';

export type StoredLead = Lead & { syncStatus: SyncStatus };

type NewLeadInput = {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  hasVoice?: boolean;
  designation?: string;
  note?: string;
  companyLandline?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companySummary?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
  imageUri?: string;
};

type LeadsState = {
  leads: StoredLead[];
  addLead: (input: NewLeadInput) => Promise<StoredLead>;
  /** Hand a lead to another team member. `null` gives it back to the signed-in user. */
  reassignLead: (leadId: string, memberId: string | null) => void;
  syncDrafts: () => void;
};

function mockId() {
  return `lead_${Math.random().toString(36).slice(2, 10)}`;
}

function nowTimeLabel() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const useLeadsStore = create<LeadsState>()(
  persist(
    (set) => ({
      leads: LEADS.map((lead) => ({ ...lead, syncStatus: 'synced' as const })),
      addLead: async (input) => {
        let isOnline = true;
        try {
          const net = await Network.getNetworkStateAsync();
          isOnline = Boolean(net.isConnected && net.isInternetReachable !== false);
        } catch {
          isOnline = true;
        }
        const lead: StoredLead = {
          id: mockId(),
          initial: input.name.trim()[0]?.toUpperCase() ?? '?',
          name: input.name,
          company: input.company ?? '',
          time: nowTimeLabel(),
          status: 'New',
          hasVoice: input.hasVoice ?? false,
          needsNote: true,
          phone: input.phone,
          email: input.email,
          designation: input.designation,
          note: input.note,
          companyLandline: input.companyLandline,
          companyWebsite: input.companyWebsite,
          companyAddress: input.companyAddress,
          companySummary: input.companySummary,
          customFieldValues: input.customFieldValues,
          imageUri: input.imageUri,
          syncStatus: isOnline ? 'synced' : 'draft',
        };
        set((state) => ({ leads: [lead, ...state.leads] }));
        return lead;
      },
      reassignLead: (leadId, memberId) =>
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === leadId ? { ...lead, assignedToId: memberId ?? undefined } : lead
          ),
        })),
      syncDrafts: () => {
        set((state) => ({
          leads: state.leads.map((lead) => (lead.syncStatus === 'draft' ? { ...lead, syncStatus: 'synced' } : lead)),
        }));
      },
    }),
    {
      name: 'yieldd-leads',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
