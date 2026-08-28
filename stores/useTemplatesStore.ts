import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MessageChannel = 'whatsapp' | 'email';

export type TemplateAttachment = {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
};

export type MessageTemplate = {
  id: string;
  name: string;
  subject?: string;
  body: string;
  isDefault: boolean;
  attachment?: TemplateAttachment;
};

type TemplatesState = {
  whatsappTemplates: MessageTemplate[];
  emailTemplates: MessageTemplate[];
  addTemplate: (channel: MessageChannel, input: { name: string; subject?: string; body: string }) => string;
  updateTemplate: (channel: MessageChannel, id: string, patch: Partial<Omit<MessageTemplate, 'id'>>) => void;
  removeTemplate: (channel: MessageChannel, id: string) => void;
  setDefaultTemplate: (channel: MessageChannel, id: string) => void;
};

function templateId() {
  return `tpl_${Math.random().toString(36).slice(2, 10)}`;
}

function key(channel: MessageChannel): 'whatsappTemplates' | 'emailTemplates' {
  return channel === 'whatsapp' ? 'whatsappTemplates' : 'emailTemplates';
}

export const useTemplatesStore = create<TemplatesState>()(
  persist(
    (set) => ({
      whatsappTemplates: [
        {
          id: templateId(),
          name: 'Default follow-up',
          body: "Hi {{name}}, great meeting you at {{event}}. Sharing our brochure — let us know if you'd like a quote.",
          isDefault: true,
        },
      ],
      emailTemplates: [
        {
          id: templateId(),
          name: 'Default follow-up',
          subject: 'Great meeting you at {{event}}',
          body:
            "Hi {{name}}, thank you for stopping by our stall. I've attached our brochure and would love to understand your requirement better.",
          isDefault: true,
        },
      ],
      addTemplate: (channel, input) => {
        const id = templateId();
        const k = key(channel);
        set((state) => {
          const list = state[k];
          const template: MessageTemplate = {
            id,
            name: input.name,
            subject: channel === 'email' ? input.subject ?? '' : undefined,
            body: input.body,
            isDefault: list.length === 0,
          };
          return { [k]: [...list, template] } as Pick<TemplatesState, typeof k>;
        });
        return id;
      },
      updateTemplate: (channel, id, patch) => {
        const k = key(channel);
        set((state) => ({
          [k]: state[k].map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }) as Pick<TemplatesState, typeof k>);
      },
      removeTemplate: (channel, id) => {
        const k = key(channel);
        set((state) => {
          const removingDefault = state[k].find((t) => t.id === id)?.isDefault;
          const remaining = state[k].filter((t) => t.id !== id);
          if (removingDefault && remaining.length > 0 && !remaining.some((t) => t.isDefault)) {
            remaining[0] = { ...remaining[0], isDefault: true };
          }
          return { [k]: remaining } as Pick<TemplatesState, typeof k>;
        });
      },
      setDefaultTemplate: (channel, id) => {
        const k = key(channel);
        set((state) => ({
          [k]: state[k].map((t) => ({ ...t, isDefault: t.id === id })),
        }) as Pick<TemplatesState, typeof k>);
      },
    }),
    {
      name: 'yieldd-templates',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
