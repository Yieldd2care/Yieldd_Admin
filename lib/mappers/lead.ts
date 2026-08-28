import type { Enums, Tables } from '../db';
import { paiseToRupees } from '../db';
import type { CustomFieldValue, Lead, LeadStatus } from '../../data/leads';

export type LeadRow = Tables<'leads'>;
type DbLeadStatus = Enums<'lead_status'>;

/**
 * The screens say `Qualified`, the column says `qualified`.
 *
 * Both directions are written out rather than lower-cased on the fly: adding a
 * status to one side without the other is then a type error, not a lead that
 * silently renders with no pill.
 */
const STATUS_TO_DB: Record<LeadStatus, DbLeadStatus> = {
  New: 'new',
  Contacted: 'contacted',
  Qualified: 'qualified',
  Won: 'won',
  Lost: 'lost',
};

const STATUS_FROM_DB: Record<DbLeadStatus, LeadStatus> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
};

export function statusToDb(status: LeadStatus): DbLeadStatus {
  return STATUS_TO_DB[status];
}

export function statusFromDb(status: DbLeadStatus): LeadStatus {
  return STATUS_FROM_DB[status];
}

/** `4:12 PM` — how the lead list labels when someone was captured. */
export function captureTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function initialOf(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?';
}

type RowWithVoice = LeadRow & { voice_notes?: { count: number }[] | null };

export function toLead(row: RowWithVoice): Lead {
  return {
    id: row.id,
    initial: initialOf(row.full_name),
    name: row.full_name,
    company: row.company ?? '',
    time: captureTimeLabel(row.created_at),
    status: statusFromDb(row.status),
    hasVoice: (row.voice_notes?.[0]?.count ?? 0) > 0,
    // "Needs a note" is a prompt to go back and say something about the
    // conversation, so it is exactly "there is no note", not a stored flag.
    needsNote: !row.note?.trim(),
    consentGiven: row.consent_given,
    source: row.source,
    capturedAt: row.created_at,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    designation: row.designation ?? undefined,
    note: row.note ?? undefined,
    companyLandline: row.company_landline ?? undefined,
    companyWebsite: row.company_website ?? undefined,
    companyAddress: row.company_address ?? undefined,
    companySummary: row.company_summary ?? undefined,
    customFieldValues: (row.custom_field_values ?? undefined) as
      | Record<string, CustomFieldValue>
      | undefined,
    // Private buckets hand back signed URLs that expire, so the row stores the
    // object key and the URL is built when it is needed.
    imageUri: row.card_image_path ?? undefined,
    followUpDate: row.follow_up_date ?? undefined,
    dealValue: row.deal_value_paisa == null ? undefined : paiseToRupees(row.deal_value_paisa),
    dealClosedAt: row.deal_closed_at ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    assignedToId: row.assigned_to ?? undefined,
  };
}
