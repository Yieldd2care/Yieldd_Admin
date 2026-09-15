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

/** How warm the lead felt, set during the evening review. */
export type LeadTemperature = 'Hot' | 'Warm' | 'Cold';

export const TEMPERATURE_CLASSES: Record<LeadTemperature, string> = {
  Hot: 'bg-[#C23B3B]/[0.12]',
  Warm: 'bg-gold/[0.16]',
  Cold: 'bg-blue/[0.10]',
};

export const TEMPERATURE_TEXT: Record<LeadTemperature, string> = {
  Hot: 'text-[#A32E2E]',
  Warm: 'text-[#8A6100]',
  Cold: 'text-blue',
};

export type CustomFieldValue = string | boolean;

/**
 * How far the card reader has got with this lead.
 *
 * The column has existed since the initial schema and went unread until the
 * capture rework moved extraction out of the confirm screen and into the sync
 * drain. Now it is the only thing that distinguishes "no name yet because the
 * AI has not run" from "no name because the card was unreadable".
 *
 *   pending    queued, or retried until its attempts ran out
 *   completed  read, or hand-typed and so never needing a read
 *   failed     the reader ran and got nothing usable
 */
export type ExtractionStatus = 'pending' | 'completed' | 'failed';

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
  /** A second address printed on the card - branch, works or regional office. */
  branchAddress?: string;
  companySummary?: string;
  customFieldValues?: Record<string, CustomFieldValue>;
  imageUri?: string;
  /**
   * The optional product photo, as an object key in `card-images` — not a URL.
   * Resolved to a signed URL by `useCardImages`, same as `imageUri`.
   */
  extraPhotoUri?: string;
  /**
   * Another lead at the same event with the same number, found when the card
   * was read. Informational only - it has never blocked a capture.
   */
  duplicateOfLeadId?: string;
  /** Defaults to `completed` for anything typed by hand; see the type. */
  extractionStatus?: ExtractionStatus;
  /** Why the card could not be read, shown to the rep verbatim. */
  extractionError?: string;
  /** `'2026-03-04'` — the day this lead is due to be chased. */
  followUpDate?: string;
  /** Rupees. Set when the lead is marked Won — this is what makes ROI real. */
  dealValue?: number;
  dealClosedAt?: string;
  /** Set once the evening review has been through this lead. */
  reviewedAt?: string;
  temperature?: LeadTemperature;
  /**
   * The team member this lead belongs to, as a useTeamStore member id.
   * Undefined means the person who captured it — which for now is always the
   * signed-in user.
   */
  assignedToId?: string;
  /**
   * Whether this lead has been put into the rep's phone contacts.
   *
   * Per-lead in the database, not per-device — so a lead saved on one phone
   * reads as saved on another where the contact does not exist. That is why the
   * action stays available rather than being disabled once set.
   */
  savedToContacts?: boolean;
};
