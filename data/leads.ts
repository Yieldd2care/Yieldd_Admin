// `Lost` is offered by the status-change sheet, so it has to exist in all three
// maps below. Without it a lost lead renders `className="... undefined"` and
// loses its pill entirely.
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Won' | 'Lost';

export const STATUS_CLASSES: Record<LeadStatus, string> = {
  New: 'bg-surface',
  Contacted: 'bg-blue/[0.10]',
  Qualified: 'bg-gold/[0.14]',
  Won: 'bg-success/[0.14]',
  Lost: 'bg-[#C23B3B]/[0.10]',
};

export const STATUS_TEXT: Record<LeadStatus, string> = {
  New: 'text-slate',
  Contacted: 'text-blue',
  Qualified: 'text-[#8A6100]',
  Won: 'text-[#1F8A50]',
  Lost: 'text-[#A32E2E]',
};

export const STATUS_DOT: Record<LeadStatus, string> = {
  New: 'bg-slate',
  Contacted: 'bg-blue',
  Qualified: 'bg-gold',
  Won: 'bg-success',
  Lost: 'bg-[#C23B3B]',
};

export type CustomFieldValue = string | boolean;

export type Lead = {
  id: string;
  initial: string;
  name: string;
  company: string;
  time: string;
  status: LeadStatus;
  hasVoice: boolean;
  needsNote: boolean;
  /** Consent to follow up, confirmed verbally at the stall. */
  consentGiven: boolean;
  source: 'card_scan' | 'manual';
  /** ISO. When the rep actually captured it, not when it reached the server. */
  capturedAt: string;
  phone?: string;
  email?: string;
  designation?: string;
  note?: string;
  companyLandline?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companySummary?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
  imageUri?: string;
  /** `'2026-03-04'` — the day this lead is due to be chased. */
  followUpDate?: string;
  /** Rupees. Set when the lead is marked Won — this is what makes ROI real. */
  dealValue?: number;
  dealClosedAt?: string;
  /** Set once the evening review has been through this lead. */
  reviewedAt?: string;
  /**
   * The team member this lead belongs to, as a useTeamStore member id.
   * Undefined means the person who captured it — which for now is always the
   * signed-in user.
   */
  assignedToId?: string;
};
